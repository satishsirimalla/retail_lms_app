
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ShieldCheck, User, Briefcase, Trophy, Heart, Edit, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import placeholderImages from '@/lib/placeholder-images.json';
import { useState, useRef } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { EditProfileDialog } from './EditProfileDialog';
import { Input } from '@/components/ui/input';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { validateWorkEmailDomain } from '@/lib/auth-domains';

function ChampionsProgramCard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isJoining, setIsJoining] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [localMockCode, setLocalMockCode] = useState('');

  const handleJoinProgram = async (join: boolean) => {
    if (!userProfile) return;
    setIsJoining(true);
    try {
      await updateDoc(doc(firestore, 'users', userProfile.uid), { isChampion: join });
      toast({
        title: 'Success',
        description: join ? 'Welcome to the Champions program!' : 'You have left the Champions program.',
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setIsJoining(false);
  };
  
  const handleSendVerificationCode = async () => {
    if (!userProfile?.workEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please add a work email to your profile first.' });
      return;
    }
    if (!userProfile?.retailerName) {
      toast({
        variant: 'destructive',
        title: 'Retailer Required',
        description: 'Please set your retailer in your profile before verifying your work email.',
      });
      return;
    }
    setIsSendingCode(true);

    try {
      const validation = await validateWorkEmailDomain(
        firestore,
        userProfile.workEmail,
        userProfile.retailerName
      );

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
      setLocalMockCode(mockCode);
      
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
    if (!userProfile) return;
    setIsVerifying(true);
    
    setTimeout(async () => {
      if (verificationCode === localMockCode) {
        try {
            await updateDoc(doc(firestore, 'users', userProfile.uid), { employmentVerified: true });
            toast({ title: 'Success', description: 'Employment verified successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update verification status.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid verification code.' });
      }
      setIsVerifying(false);
    }, 1000);
  };


  if (userProfile?.isChampion) {
    return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy /> Google Champions Program</CardTitle></CardHeader>
          <CardContent>
            <p>You are a member of the Champions program. Keep up the great work!</p>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={() => handleJoinProgram(false)} disabled={isJoining}>
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Leave Program
            </Button>
          </CardFooter>
        </Card>
    )
  }

  if (userProfile?.employmentVerified && !userProfile.isChampion) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Trophy /> Google Champions Program</CardTitle>
                  <CardDescription>Manage your participation in the exclusive Google Champions program.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p>Your employment is verified. Join the Champions program to get exclusive rewards and recognition.</p>
              </CardContent>
              <CardFooter>
                  <Button onClick={() => handleJoinProgram(true)} disabled={isJoining}>
                      {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Join Now
                  </Button>
              </CardFooter>
          </Card>
      )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Google Champions Program</CardTitle>
            <CardDescription>Manage your participation in the exclusive Google Champions program.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p>Verify your work email to become eligible for the Google Champions program. Click the button below to send a verification code to your work email.</p>
            {!codeSent ? (
                 <Button onClick={handleSendVerificationCode} disabled={isSendingCode || !userProfile?.workEmail}>
                    {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Verification Code
                </Button>
            ) : (
                <div className="flex gap-2">
                    <Input 
                        placeholder="5-digit code" 
                        maxLength={5} 
                        value={verificationCode} 
                        onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <Button onClick={handleVerifyCode} disabled={isVerifying || verificationCode.length !== 5}>
                        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify
                    </Button>
                </div>
            )}
            {!userProfile?.workEmail && <p className="text-xs text-destructive">Please add and save a work email in the 'Edit Profile' dialog first.</p>}
        </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  const { user, userProfile, loading, isVerified } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const avatarPlaceholder = placeholderImages.placeholderImages.find(p => p.id === 'avatar-placeholder');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
      });

      toast({
        title: 'Avatar Updated',
        description: 'Your new avatar has been saved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload your avatar.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary">
              <AvatarImage src={userProfile.photoURL || avatarPlaceholder?.imageUrl} alt={userProfile.firstName} data-ai-hint={avatarPlaceholder?.imageHint || ''}/>
              <AvatarFallback className="text-3xl">
                {userProfile.firstName?.[0]}
                {userProfile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleAvatarClick}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold font-headline">{userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`}</h1>
                {isVerified && <Badge variant="default" className='gap-1'><ShieldCheck className="h-4 w-4"/>Verified</Badge>}
            </div>
            <p className="text-muted-foreground">{userProfile.email}</p>
            <p className="text-sm text-muted-foreground">Employee ID: {userProfile.employeeId || 'Not set'}</p>
          </div>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4"/> Edit Profile
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User /> Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>User Type:</strong> {userProfile.userType || 'N/A'}</p>
            <p><strong>Country:</strong> {userProfile.userCountry || 'N/A'}</p>
            <p><strong>Language:</strong> {userProfile.preferredLanguage || 'N/A'}</p>
            <p><strong>Timezone:</strong> {userProfile.timezone || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase /> Work Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Store Type:</strong> {userProfile.storeType || 'N/A'}</p>
            <p><strong>Retailer:</strong> {userProfile.retailerName || 'N/A'}</p>
            <p><strong>Store Name:</strong> {userProfile.storeName || 'N/A'}</p>
            <p><strong>Store Location:</strong> {userProfile.storeLocation || 'N/A'}</p>
            <div className="flex items-center gap-2">
              <strong>Work Email:</strong> {userProfile.workEmail || 'Not provided'} {userProfile.workEmail && <Badge variant={isVerified ? 'default' : 'destructive'}>{isVerified ? 'Verified' : 'Not Verified'}</Badge>}
            </div>
          </CardContent>
        </Card>

        <ChampionsProgramCard />
        
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Heart /> My Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
             <p><strong>Promotional Notifications:</strong> {userProfile.promotionalNotifications ? 'Yes' : 'No'}</p>
             <p><strong>Share Training Data:</strong> {userProfile.shareTrainingData ? 'Yes' : 'No'}</p>
             <p><strong>Communication Email:</strong> {userProfile.communicationEmail || 'Personal'}</p>
          </CardContent>
        </Card>
      </div>

      {userProfile && (
        <EditProfileDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            userProfile={userProfile}
        />
      )}
    </div>
  );
}
