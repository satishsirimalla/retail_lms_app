
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useMemo } from 'react';
import { validateWorkEmailDomain } from '@/lib/auth-domains';

const languages = ['English (US)', 'English (UK)', 'French', 'Spanish'];
const timezones = ['(GMT-5) Eastern Time', '(GMT-6) Central Time', '(GMT-8) Pacific Time'];

interface RetailerStore {
  id: string;
  countryId: string;
  storeTypeId: string;
  retailerName: string;
  storeName: string;
  storeLocation: string;
  storeId: string;
}

interface Country {
    id: string;
    name: string;
}

interface StoreType {
    id: string;
    name: string;
}

const profileSchema = z.object({
  displayName: z.string().optional(),
  employeeId: z.string().optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
  storeTypeId: z.string().optional(),
  retailerName: z.string().optional(),
  storeId: z.string().optional(),
  workEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
  communicationEmail: z.enum(['personal', 'work']).optional(),
  promotionalNotifications: z.boolean().optional(),
  shareTrainingData: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
}

export function EditProfileDialog({
  isOpen,
  onOpenChange,
  userProfile,
}: EditProfileDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const retailersStoresCol = useMemoFirebase(() => collection(firestore, 'retailers_stores'), [firestore]);
  const { data: retailerStores } = useCollection<RetailerStore>(retailersStoresCol);

  const countriesCol = useMemoFirebase(() => collection(firestore, 'countries'), [firestore]);
  const { data: countries } = useCollection<Country>(countriesCol);
  
  const storeTypesCol = useMemoFirebase(() => collection(firestore, 'store_types'), [firestore]);
  const { data: storeTypes } = useCollection<StoreType>(storeTypesCol);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile.displayName || '',
      employeeId: userProfile.employeeId || '',
      preferredLanguage: userProfile.preferredLanguage || '',
      timezone: userProfile.timezone || '',
      storeTypeId: userProfile.storeTypeId || '',
      retailerName: userProfile.retailerName || '',
      storeId: userProfile.storeId || '',
      workEmail: userProfile.workEmail || '',
      communicationEmail: userProfile.communicationEmail || 'personal',
      promotionalNotifications: userProfile.promotionalNotifications || false,
      shareTrainingData: userProfile.shareTrainingData || false,
    },
  });

  const { isSubmitting } = form.formState;

  const watchedStoreType = form.watch('storeTypeId');
  const watchedRetailer = form.watch('retailerName');
  const watchedStoreId = form.watch('storeId');

  const userCountryId = useMemo(() => {
    return countries?.find(c => c.name === userProfile.userCountry)?.id;
  }, [countries, userProfile.userCountry]);

  const countryFilteredStores = useMemo(() => {
    if (!retailerStores || !userCountryId) return [];
    return retailerStores.filter(store => store.countryId === userCountryId);
  }, [retailerStores, userCountryId]);

  const storeTypeOptions = useMemo(() => {
    if (countryFilteredStores.length === 0 || !storeTypes) return [];
    const availableStoreTypeIds = new Set(countryFilteredStores.map(s => s.storeTypeId));
    return storeTypes.filter(st => availableStoreTypeIds.has(st.id));
  }, [countryFilteredStores, storeTypes]);

  const retailerOptions = useMemo(() => {
    if (countryFilteredStores.length === 0 || !watchedStoreType) return [];
    const storesForType = countryFilteredStores.filter(store => store.storeTypeId === watchedStoreType);
    const uniqueRetailers = Array.from(new Set(storesForType.map(s => s.retailerName)));
    return uniqueRetailers.map(r => ({ value: r, label: r }));
  }, [countryFilteredStores, watchedStoreType]);

  const storeNameOptions = useMemo(() => {
    if (!watchedRetailer) return [];
    return countryFilteredStores
      .filter(store => store.retailerName === watchedRetailer && store.storeTypeId === watchedStoreType)
      .map(store => ({ value: store.id, label: store.storeName }));
  }, [countryFilteredStores, watchedRetailer, watchedStoreType]);

  const selectedStoreLocation = useMemo(() => {
    if (!watchedStoreId || !retailerStores) return '';
    return retailerStores.find(store => store.id === watchedStoreId)?.storeLocation || '';
  }, [watchedStoreId, retailerStores]);


  useEffect(() => {
    if (isOpen) {
        form.reset({
            displayName: userProfile.displayName || '',
            employeeId: userProfile.employeeId || '',
            preferredLanguage: userProfile.preferredLanguage || '',
            timezone: userProfile.timezone || '',
            storeTypeId: userProfile.storeTypeId || '',
            retailerName: userProfile.retailerName || '',
            storeId: userProfile.storeId || '',
            workEmail: userProfile.workEmail || '',
            communicationEmail: userProfile.communicationEmail || 'personal',
            promotionalNotifications: userProfile.promotionalNotifications || false,
            shareTrainingData: userProfile.shareTrainingData || false,
        });
    }
  }, [isOpen, userProfile, form]);
  
  useEffect(() => {
    if (watchedStoreType !== userProfile.storeTypeId) {
      form.setValue('retailerName', '');
      form.setValue('storeId', '');
    }
  }, [watchedStoreType, userProfile.storeTypeId, form]);

  useEffect(() => {
    if (watchedRetailer !== userProfile.retailerName) {
      form.setValue('storeId', '');
    }
  }, [watchedRetailer, userProfile.retailerName, form]);

  async function onSubmit(values: ProfileFormData) {
    try {
        
      if (values.workEmail && values.workEmail !== userProfile.workEmail) {
        const targetRetailer = values.retailerName || userProfile.retailerName;
        const validation = await validateWorkEmailDomain(firestore, values.workEmail, targetRetailer);
        if (!validation.isValid) {
          toast({
            variant: 'destructive',
            title: 'Unauthorized Domain',
            description: validation.error || 'The domain of your work email is not authorized for your retailer.',
          });
          return;
        }
      }

      const userDocRef = doc(firestore, 'users', userProfile.uid);
      
      const selectedStore = retailerStores?.find(s => s.id === values.storeId);
      const storeTypeName = storeTypes?.find(st => st.id === values.storeTypeId)?.name;

      const updatedValues: Partial<UserProfile> = { 
          ...values,
          storeType: storeTypeName,
          storeName: selectedStore?.storeName,
          storeLocation: selectedStore?.storeLocation,
      };
      
      const retailerHasChanged = values.retailerName !== userProfile.retailerName;

      if (values.workEmail !== userProfile.workEmail || retailerHasChanged) {
        updatedValues.employmentVerified = false;
        updatedValues.isChampion = false;
      }
      
      await updateDoc(userDocRef, updatedValues);
      
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
      if(retailerHasChanged) {
        toast({
          variant: 'destructive',
          title: 'Verification Reset',
          description: 'You changed your retailer, so your employment verification has been reset.',
        })
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>First Name</FormLabel>
                <Input value={userProfile.firstName} disabled />
              </div>
              <div className="space-y-2">
                <FormLabel>Last Name</FormLabel>
                <Input value={userProfile.lastName} disabled />
              </div>
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gamertag</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Gamertag" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Employee ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="retailerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retailer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchedStoreType}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your retailer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {retailerOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={!watchedRetailer}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select store name" /></SelectTrigger></FormControl>
                      <SelectContent>{storeNameOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                 <FormLabel>Store Location</FormLabel>
                 <Input value={selectedStoreLocation} disabled readOnly placeholder="Store location will appear here" />
              </div>
               <FormField
                control={form.control}
                name="workEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. name@work.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="communicationEmail" render={({ field }) => (
                <FormItem>
                    <FormLabel>Communication Email</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select email" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="personal">Personal: {userProfile.email}</SelectItem>
                          {form.watch('workEmail') && <SelectItem value="work">Work: {form.watch('workEmail')}</SelectItem>}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}/>
            </div>
            <div className="flex space-x-4">
              <FormField control={form.control} name="promotionalNotifications" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none"><FormLabel>Promotional Emails</FormLabel></div>
                </FormItem>
              )}/>
              <FormField control={form.control} name="shareTrainingData" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div className="space-y-1 leading-none"><FormLabel>Data Sharing</FormLabel></div>
                </FormItem>
              )}/>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
