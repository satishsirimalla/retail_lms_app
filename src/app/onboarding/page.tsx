
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Image from 'next/image';
import placeholderImageData from '@/lib/placeholder-images.json';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { validateWorkEmailDomain } from '@/lib/auth-domains';

const steps = [
  { id: 1, title: 'Personal Data' },
  { id: 2, title: 'Work Details' },
  { id: 3, title: 'User Acceptance' },
  { id: 4, title: 'Employment Verification' },
];

const personalSchema = z.object({
  userType: z.string().min(1, 'User type is required.'),
  userCountry: z.string().min(1, 'Country is required.'),
  preferredLanguage: z.string().min(1, 'Language is required.'),
  timezone: z.string().min(1, 'Timezone is required.'),
});

const workSchema = z.object({
  storeTypeId: z.string().optional(),
  retailerName: z.string().optional(),
  storeId: z.string().optional(),
});

const acceptanceSchema = z.object({
  promotionalNotifications: z.boolean().default(false),
  shareTrainingData: z.boolean().default(false),
  termsAndConditions: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions.',
  }),
});

const verificationSchema = z.object({
  workEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
  verificationCode: z.string().optional(),
});

const totalSchema = personalSchema.merge(workSchema).merge(acceptanceSchema).merge(verificationSchema);
type OnboardingData = z.infer<typeof totalSchema>;

const languages = ['English (US)', 'English (UK)', 'French', 'Spanish'];
const timezones = ['(GMT-5) Eastern Time', '(GMT-6) Central Time', '(GMT-8) Pacific Time'];
const userTypes = ["Retail/Call Center Sales Associate (RSA)", "Territory Sales Manager (TSM)", "Business-to-business (B2B)", "Customer Service (gUP)", "Google Store Rep (GSR)", "Googler (Internal)"];

function OnboardingForm({
  currentStep,
  onNext,
  onPrev,
  isSubmitting,
  onSubmit,
  isVerified,
  setIsVerified,
  formData
}: {
  currentStep: number;
  onNext: (data: Partial<OnboardingData>) => void;
  onPrev: () => void;
  isSubmitting: boolean;
  onSubmit: (data: OnboardingData) => void;
  isVerified: boolean;
  setIsVerified: (isVerified: boolean) => void;
  formData: Partial<OnboardingData>;
}) {
  const { user, userProfile } = useAuth();
  const firestore = useFirestore();
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [localVerificationCode, setLocalVerificationCode] = useState('');
  const { toast } = useToast();

  const countriesCol = useMemoFirebase(() => collection(firestore, 'countries'), [firestore]);
  const { data: countries } = useCollection<{id: string, name: string}>(countriesCol);

  const retailersStoresCol = useMemoFirebase(() => collection(firestore, 'retailers_stores'), [firestore]);
  const { data: retailerStores } = useCollection<{id: string, retailerName: string, storeName: string, storeLocation: string, countryId: string, storeTypeId: string, storeId: string}>(retailersStoresCol);
  
  const storeTypesCol = useMemoFirebase(() => collection(firestore, 'store_types'), [firestore]);
  const { data: storeTypes } = useCollection<{id: string, name: string}>(storeTypesCol);

  const schemas = [personalSchema, workSchema, acceptanceSchema, verificationSchema];
  
  const form = useForm<OnboardingData>({
    resolver: zodResolver(schemas[currentStep - 1]),
    defaultValues: {
      userType: userProfile?.userType || '',
      userCountry: userProfile?.userCountry || '',
      preferredLanguage: userProfile?.preferredLanguage || '',
      timezone: userProfile?.timezone || '',
      storeTypeId: '',
      retailerName: '',
      storeId: '',
      termsAndConditions: userProfile?.termsAndConditions || false,
      promotionalNotifications: userProfile?.promotionalNotifications || false,
      shareTrainingData: userProfile?.shareTrainingData || false,
      workEmail: userProfile?.workEmail || '',
      verificationCode: '',
    },
    mode: 'onChange',
  });
  
  const handleTriggerSubmit: SubmitHandler<OnboardingData> = data => {
    if (currentStep === steps.length) {
      onSubmit(data);
    } else {
      onNext(data);
    }
  };

  const handleSkip = () => {
    onSubmit(form.getValues());
  };

  const handleSendCode = async () => {
    const workEmail = form.getValues('workEmail');
    if (!workEmail || !user) return;
    
    setIsSendingCode(true);

    try {
        const userRetailer = formData.retailerName || form.getValues('retailerName') || userProfile?.retailerName;
        const validation = await validateWorkEmailDomain(firestore, workEmail, userRetailer);

        if (!validation.isValid) {
            toast({
                variant: 'destructive',
                title: 'Unauthorized Domain',
                description: validation.error || 'The domain of your work email is not authorized for your retailer.',
            });
            setIsSendingCode(false);
            return;
        }

        const mockCode = Math.floor(10000 + Math.random() * 90000).toString();
        setLocalVerificationCode(mockCode);
        
        // Simulate API call delay
        setTimeout(() => {
            toast({ title: 'Verification code sent', description: `For testing, your code is: ${mockCode}` });
            setCodeSent(true);
            setIsSendingCode(false);
        }, 1000);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || "An unexpected error occurred." });
        setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsVerifying(true);
    const enteredCode = form.getValues('verificationCode');
    
    // Simulate API call delay
    setTimeout(() => {
        if (enteredCode && enteredCode === localVerificationCode) {
            toast({ title: 'Success', description: 'Employment verified successfully.' });
            setIsVerified(true);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid verification code.' });
            form.setError('verificationCode', { type: 'manual', message: 'Invalid verification code.' });
        }
        setIsVerifying(false);
    }, 1000);
  };
  
  const watchedCountryName = form.watch('userCountry') || formData.userCountry;
  const watchedStoreType = form.watch('storeTypeId');
  const watchedRetailer = form.watch('retailerName');
  const watchedStoreId = form.watch('storeId');

  const selectedCountryId = useMemo(() => {
    return countries?.find(c => c.name === watchedCountryName)?.id;
  }, [countries, watchedCountryName]);

  const countryFilteredStores = useMemo(() => {
    if (!retailerStores || !selectedCountryId) return [];
    return retailerStores.filter(store => store.countryId === selectedCountryId);
  }, [retailerStores, selectedCountryId]);

  const storeTypeOptions = useMemo(() => {
    if (!storeTypes || !countryFilteredStores) return [];
    const availableStoreTypeIds = new Set(countryFilteredStores.map(s => s.storeTypeId));
    return storeTypes.filter(st => availableStoreTypeIds.has(st.id));
  }, [countryFilteredStores, storeTypes]);

  const retailerOptions = useMemo(() => {
    if (!watchedStoreType || !countryFilteredStores) return [];
    const storesForType = countryFilteredStores.filter(store => store.storeTypeId === watchedStoreType);
    const uniqueRetailers = Array.from(new Set(storesForType.map(s => s.retailerName)));
    return uniqueRetailers.map(r => ({ value: r, label: r }));
  }, [countryFilteredStores, watchedStoreType]);

  const storeNameOptions = useMemo(() => {
    if (!watchedStoreType || !watchedRetailer || !countryFilteredStores) return [];
    return countryFilteredStores
      .filter(store => store.storeTypeId === watchedStoreType && store.retailerName === watchedRetailer)
      .map(store => ({
        value: store.id,
        label: store.storeName,
      }));
  }, [countryFilteredStores, watchedStoreType, watchedRetailer]);
  
  const selectedStoreLocation = useMemo(() => {
    if (!watchedStoreId || !retailerStores) return '';
    const selectedStore = retailerStores.find(s => s.id === watchedStoreId);
    return selectedStore?.storeLocation || '';
  }, [watchedStoreId, retailerStores]);


  useEffect(() => {
      form.setValue('retailerName', '');
      form.setValue('storeId', '');
  }, [watchedStoreType, form]);

  useEffect(() => {
      form.setValue('storeId', '');
  }, [watchedRetailer, form]);


  return (
    <Card className="w-full max-w-2xl border-none shadow-none bg-transparent">
        <CardHeader>
          <Progress value={(currentStep / steps.length) * 100} className="mb-4" />
          <CardTitle className="font-headline text-2xl">
            {steps[currentStep-1].title}
          </CardTitle>
          <CardDescription>
            Step {currentStep} of {steps.length}. Let's get your profile ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTriggerSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in-0 duration-500">
                  <FormField control={form.control} name="userType" render={({ field }) => (
                      <FormItem>
                          <FormLabel>User Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger></FormControl>
                              <SelectContent>{userTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="userCountry" render={({ field }) => (
                      <FormItem>
                          <FormLabel>User Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger></FormControl>
                              <SelectContent>{countries?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="preferredLanguage" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Preferred Language</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select your language" /></SelectTrigger></FormControl>
                              <SelectContent>{languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select your timezone" /></SelectTrigger></FormControl>
                              <SelectContent>{timezones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in-0 duration-500">
                  <FormField control={form.control} name="storeTypeId" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Store Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select store type" /></SelectTrigger></FormControl>
                              <SelectContent>{storeTypeOptions?.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="retailerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retailer or Partner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchedStoreType}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select retailer" /></SelectTrigger></FormControl>
                        <SelectContent>{retailerOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="storeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Name</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchedRetailer}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select store name" /></SelectTrigger></FormControl>
                        <SelectContent>{storeNameOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormItem>
                      <FormLabel>Store Location</FormLabel>
                      <Input value={selectedStoreLocation} readOnly disabled placeholder="Store location will appear here" />
                  </FormItem>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in-0 duration-500">
                  <FormField control={form.control} name="promotionalNotifications" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Accept to receive promotional notifications</FormLabel></div>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="shareTrainingData" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Accept to share training data with Store Management</FormLabel></div>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>I agree to the <a href="#" className="text-primary hover:underline">Terms and Service Agreement</a></FormLabel><FormMessage /></div>
                    </FormItem>
                  )}/>
                </div>
              )}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in-0 duration-500">
                  <FormField control={form.control} name="workEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email Address (Optional)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input placeholder="work.email@example.com" {...field} disabled={codeSent || isVerified} /></FormControl>
                        <Button type="button" onClick={handleSendCode} disabled={!field.value || codeSent || isVerified || isSendingCode}>
                          {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {codeSent ? 'Sent' : 'Send Code'}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  {codeSent && !isVerified && (
                    <FormField control={form.control} name="verificationCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="5-digit code" {...field} maxLength={5} />
                          </FormControl>
                          <Button type="button" onClick={handleVerifyCode} disabled={isVerifying || !field.value || (field.value?.length || 0) !== 5}>
                              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Verify
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  )}
                  {isVerified && <p className="text-sm font-medium text-green-600">✓ Employment Verified Successfully!</p>}
                </div>
              )}
              <CardFooter className="mt-8 flex justify-between px-0">
                <Button variant="outline" onClick={onPrev} disabled={currentStep === 1 || isSubmitting} type="button">
                  Previous
                </Button>
                <div className="flex items-center gap-4">
                  {currentStep === 4 && <Button type="button" variant="ghost" onClick={handleSkip} disabled={isSubmitting}>Skip for now</Button>}
                  <Button 
                    type={'submit'}
                    disabled={isSubmitting || (currentStep === 4 && !!form.getValues('workEmail') && !isVerified)}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentStep === steps.length ? 'Finish Setup' : 'Next'}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
    </Card>
  );
}

interface AppTheme {
  appName?: string;
  appLogoUrl?: string;
  loginImageUrl?: string;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({});
  const [isVerified, setIsVerified] = useState(false);

  const retailersStoresCol = useMemoFirebase(() => collection(firestore, 'retailers_stores'), [firestore]);
  const { data: retailerStores } = useCollection<{id: string, retailerName: string, storeName: string, storeLocation: string, storeTypeId: string, storeId: string}>(retailersStoresCol);

  const storeTypesCol = useMemoFirebase(() => collection(firestore, 'store_types'), [firestore]);
  const { data: storeTypes } = useCollection<{id: string, name: string}>(storeTypesCol);

  const configDocRef = useMemoFirebase(() => doc(firestore, 'config', 'theme'), [firestore]);
  const { data: themeData } = useDoc<AppTheme>(configDocRef);

  const loginImage = placeholderImageData.placeholderImages.find(
    (i) => i.id === 'login-background'
  );

  const handleNext = (data: Partial<OnboardingData>) => {
    setFormData(prev => ({...prev, ...data}));
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (finalStepData: Partial<OnboardingData>) => {
    setIsSubmitting(true);
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      setIsSubmitting(false);
      return;
    }
    
    const combinedData = {...formData, ...finalStepData};

    const userDocRef = doc(firestore, 'users', user.uid);
    
    const selectedStore = retailerStores?.find(s => s.id === combinedData.storeId);
    const storeTypeName = storeTypes?.find(st => st.id === combinedData.storeTypeId)?.name;
    
    const userData: any = {
        userType: combinedData.userType,
        userCountry: combinedData.userCountry,
        preferredLanguage: combinedData.preferredLanguage,
        timezone: combinedData.timezone,
        promotionalNotifications: combinedData.promotionalNotifications,
        shareTrainingData: combinedData.shareTrainingData,
        workEmail: combinedData.workEmail,
        storeType: storeTypeName || 'N/A',
        retailerName: selectedStore?.retailerName,
        storeName: selectedStore?.storeName,
        storeLocation: selectedStore?.storeLocation,
        employmentVerified: isVerified,
        onboardingCompleted: true,
        storeTypeId: combinedData.storeTypeId,
        storeId: selectedStore?.storeId,
    };
    
    setDoc(userDocRef, userData, { merge: true })
      .then(() => {
        toast({ title: 'Welcome!', description: 'Your profile has been set up.' });
        router.push('/home');
      })
      .catch((error: any) => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: userData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save profile. Check console for details.' });
      })
      .finally(() => {
          setIsSubmitting(false);
      });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl">
        <div className="relative flex flex-col md:flex-row min-h-[700px]">
          {/* Left side with image */}
          <div className="relative hidden h-auto w-1/2 flex-col justify-between bg-gray-900 p-10 text-white md:flex">
            <div className="z-10 flex items-center gap-4">
               {themeData?.appLogoUrl ? (
                    <Image src={themeData.appLogoUrl} alt={themeData.appName || "App Logo"} width={40} height={40} className="h-10 w-10" />
                ) : (
                    <Trophy className="h-10 w-10 text-primary" />
                )}
                <h1 className="text-2xl font-bold font-headline">{themeData?.appName || "Retail Sales Hub"}</h1>
            </div>
            {themeData?.loginImageUrl ? (
              <Image
                src={themeData.loginImageUrl}
                alt={themeData.appName || ''}
                fill
                priority
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : loginImage && (
                 <Image
                    src={loginImage.imageUrl}
                    alt={loginImage.description}
                    fill
                    priority
                    className="absolute inset-0 h-full w-full object-cover"
                    data-ai-hint={loginImage.imageHint}
                />
            )}
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="relative z-10">
              <h2 className="font-headline text-4xl font-bold">Welcome Aboard</h2>
              <p className="mt-2 text-gray-200">Just a few more steps to unlock your full potential.</p>
            </div>
          </div>

          {/* Right side with form */}
          <div className="flex h-full w-full flex-col justify-center bg-white p-8 shadow-lg md:w-1/2 md:p-16">
            <OnboardingForm
                currentStep={currentStep}
                onNext={handleNext}
                onPrev={handlePrev}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                isVerified={isVerified}
                setIsVerified={setIsVerified}
                formData={formData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
