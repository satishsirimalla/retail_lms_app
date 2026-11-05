'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                if (userProfile?.onboardingCompleted) {
                    router.replace('/home');
                } else {
                    router.replace('/onboarding');
                }
            } else {
                router.replace('/login');
            }
        }
    }, [user, userProfile, loading, router]);

    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading Your Experience...</p>
        </div>
      </div>
    );
}
