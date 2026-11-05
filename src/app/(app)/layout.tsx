"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user && !userProfile?.onboardingCompleted && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    }
  }, [user, userProfile, loading, router, pathname]);

  if (loading || !user || (!userProfile?.onboardingCompleted && pathname !== '/onboarding')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading Your Experience...</p>
        </div>
      </div>
    );
  }
  
  if (userProfile?.status === 'inactive') {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background p-4">
          <Card className="max-w-md text-center">
            <CardHeader>
               <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit mb-4">
                <ShieldX className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Account Inactive</CardTitle>
              <CardDescription>
                Your account has been marked as inactive and you cannot access the application. Please contact an administrator for assistance.
              </CardDescription>
            </CardHeader>
          </Card>
       </div>
    )
  }

  return <AppShell>{children}</AppShell>;
}
