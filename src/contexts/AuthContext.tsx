
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        setUserProfile(null);
        setIsAdmin(false);
      }
    });
    
    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (user) {
      setLoading(true); // Start loading when user is available, to wait for profile
      const userDocRef = doc(firestore, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const profile = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
          if (profile.status === 'inactive') {
            toast({
              variant: 'destructive',
              title: 'Account Inactive',
              description: 'Your account is inactive. Please contact an administrator.',
            });
            firebaseSignOut(auth);
          } else {
            setUserProfile(profile);
            setIsAdmin(profile.role === 'admin');
          }
        } else {
          setUserProfile(null);
          setIsAdmin(false);
        }
        setLoading(false); // Stop loading once profile is fetched (or confirmed not to exist)
      }, () => {
        // Handle errors if necessary
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    }
  }, [user, firestore, auth, toast]);

  const logout = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const isVerified = userProfile?.employmentVerified ?? false;

  const value = { user, userProfile, loading, isVerified, isAdmin, logout };

  return (
    <AuthContext.Provider value={value}>
      <FirebaseErrorListener />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
