
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit, User, Briefcase, Heart, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from '../EditUserDialog';
import { format } from 'date-fns';

function InfoField({ label, value, isBadge = false, badgeVariant = 'secondary' }: { label: string, value?: string | boolean | null, isBadge?: boolean, badgeVariant?: any }) {
  if (value === null || typeof value === 'undefined' || value === '') {
    value = 'N/A';
  }

  let displayValue;
  if (isBadge && typeof value === 'boolean') {
    displayValue = <Badge variant={value ? 'default' : 'destructive'}>{value ? 'Yes' : 'No'}</Badge>;
  } else if (isBadge && typeof value === 'string') {
     displayValue = <Badge variant={badgeVariant}>{value}</Badge>;
  }
   else {
    displayValue = <p className="text-sm text-foreground">{String(value)}</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {displayValue}
    </div>
  );
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => doc(firestore, 'users', userId), [firestore, userId]);
  const { data: user, isLoading } = useDoc<UserProfile>(userDocRef);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <div className="text-center">User not found.</div>;
  }
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return format(date, 'Pp');
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2" /> Back to Users
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary">
            <AvatarImage src={user.photoURL} alt={user.firstName} />
            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold font-headline">{user.firstName} {user.lastName}</h1>
              {user.employmentVerified && <Badge variant="default" className="gap-1"><ShieldCheck className="h-4 w-4" />Verified</Badge>}
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">User ID: {user.uid}</p>
          </div>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2" /> Edit User
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><User />Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoField label="First Name" value={user.firstName} />
            <InfoField label="Last Name" value={user.lastName} />
            <InfoField label="Email" value={user.email} />
            <InfoField label="Gamertag" value={user.displayName} />
            <InfoField label="User Type" value={user.userType} />
            <InfoField label="Country" value={user.userCountry} />
            <InfoField label="Language" value={user.preferredLanguage} />
            <InfoField label="Timezone" value={user.timezone} />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase />Work Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoField label="Employee ID" value={user.employeeId} />
            <InfoField label="Work Email" value={user.workEmail} />
            <InfoField label="Store Type" value={user.storeType} />
            <InfoField label="Retailer" value={user.retailerName} />
            <InfoField label="Store Name" value={user.storeName} />
            <InfoField label="Store Location" value={user.storeLocation} />
             <InfoField label="Store ID" value={user.storeId} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Heart />Status & Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <InfoField label="Role" value={user.role || 'user'} isBadge badgeVariant="secondary" />
            <InfoField label="Account Status" value={user.status || 'active'} isBadge badgeVariant={user.status === 'inactive' ? 'destructive' : 'default'} />
            <InfoField label="Onboarding" value={user.onboardingCompleted ? 'Completed' : 'Pending'} isBadge badgeVariant={user.onboardingCompleted ? 'default' : 'secondary'}/>
            <InfoField label="Employment Verified" value={user.employmentVerified ? 'Verified' : 'Not Verified'} isBadge badgeVariant={user.employmentVerified ? 'default' : 'destructive'} />
            <InfoField label="Is Champion" value={user.isChampion} isBadge />
            <InfoField label="Promotional Emails" value={user.promotionalNotifications} isBadge />
            <InfoField label="Share Training Data" value={user.shareTrainingData} isBadge />
            <InfoField label="Communication Email" value={user.communicationEmail} />
            <InfoField label="Last Login" value={formatDate(user.lastLogin)} />
             <InfoField label="Auth Provider" value={user.isGoogleAuthUser ? 'Google' : 'Email'} isBadge badgeVariant="outline" />
          </CardContent>
        </Card>
      </div>

       {user && (
        <EditUserDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          userProfile={user}
        />
      )}
    </div>
  );
}
