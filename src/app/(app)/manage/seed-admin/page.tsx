
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function SeedAdminPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAlreadyAdmin, setIsAlreadyAdmin] = useState(false);
  
  const handleSeedAdmin = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsLoading(true);
    const adminRoleRef = doc(firestore, 'roles_admin', user.uid);

    try {
      // Check if the user is already an admin
      const docSnap = await getDoc(adminRoleRef);
      if (docSnap.exists()) {
        setIsAlreadyAdmin(true);
        toast({ title: 'Already an Admin', description: 'Your user already has the admin role.' });
        return;
      }
      
      // If not, create the admin role document
      await setDoc(adminRoleRef, { admin: true, createdAt: new Date() });
      toast({ title: 'Success!', description: 'Admin role has been assigned to your user account.' });
      setIsAlreadyAdmin(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Seed Admin User</h1>
      <Card>
        <CardHeader>
          <CardTitle>Create Admin Role Document</CardTitle>
          <CardDescription>
            This is a one-time setup step. Click the button below to create the necessary document in Firestore
            that grants your current user (`{user?.email}`) administrative privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This action will create a document in the `roles_admin` collection with your user ID. This is required for the Firestore security rules to recognize you as an administrator.
          </p>
          {isAlreadyAdmin ? (
             <p className="font-bold text-green-600">Admin role is already configured for this user.</p>
          ) : (
            <Button onClick={handleSeedAdmin} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Make Me Admin
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
