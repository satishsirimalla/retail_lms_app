
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  Auth as FirebaseAuth,
} from 'firebase/auth';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, Firestore, serverTimestamp, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { googleProvider } from '@/lib/firebase';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { Switch } from '../ui/switch';
import { Eye } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
  rememberMe: z.boolean().default(false),
});

function GoogleIcon() {
    return (
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className="h-5 w-5"
      >
        <path
          fill="#4285F4"
          d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20 s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
        ></path>
        <path
          fill="#34A853"
          d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C39.902,36.69,44,30.9,44,24C44,22.659,43.862,21.35,43.611,20.083z"
        ></path>
        <path
          fill="#FBBC05"
          d="M10.21,28.64c-0.63-1.894-1-3.923-1-6.023s0.37-4.129,1-6.023l-6.321-5.426 C2.23,14.022,1,18.84,1,24s1.23,9.978,3.889,13.066L10.21,28.64z"
        ></path>
        <path
          fill="#EA4335"
          d="M24,48c5.964,0,10.925-1.939,14.565-5.225l-6.19-5.238c-2.008,1.36-4.6,2.21-7.375,2.21 c-5.22,0-9.673-3.344-11.25-7.935l-6.522,5.326C6.347,42.06,14.48,48,24,48z"
        ></path>
        <path fill="none" d="M1,1h46v46H1z"></path>
      </svg>
    );
}


export async function handleGoogleSignIn(
  auth: FirebaseAuth, 
  db: Firestore, 
  toast: (options: any) => void, 
  router: ReturnType<typeof useRouter>
) {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const userDocData = {
        uid: user.uid,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        email: user.email,
        photoURL: user.photoURL,
        authProvider: 'google',
        onboardingCompleted: false,
        role: 'user', // Default role to user
        lastLogin: serverTimestamp(),
        isGoogleAuthUser: true,
      };
      
      // Allow user to create their own document
      await setDoc(userDocRef, userDocData).catch(e => {
        const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'create', requestResourceData: userDocData });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
      });
    } else {
        await updateDoc(userDocRef, { 
            lastLogin: serverTimestamp(),
            authProvider: 'google',
            isGoogleAuthUser: true 
        });
    }
    router.push('/');
  } catch (error: any) {
     if (error.code === 'auth/popup-closed-by-user') {
      // Don't show an error toast if the user closed the popup
      return;
    }
     if (!(error instanceof FirestorePermissionError)) {
        toast({
            variant: 'destructive',
            title: 'Google Sign-In Failed',
            description: error.message || 'An unexpected error occurred.',
        });
     }
  }
}

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Email or phone number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email or phone" {...field} className="bg-gray-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter password" {...field} 
                      className="bg-gray-100"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Eye className="h-5 w-5 text-gray-400"/>
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between">
            <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                        <FormControl>
                            <Switch id="remember-me" checked={field.value} onCheckedChange={field.onChange}/>
                        </FormControl>
                        <FormLabel htmlFor="remember-me" className="text-sm font-normal text-gray-600">Remember me</FormLabel>
                    </FormItem>
                )}
            />
            <Link href="#" className="text-sm font-medium text-blue-600 hover:underline">Forgot password?</Link>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing In...' : 'Sign in'}
          </Button>
        </form>
      </Form>
      <Button variant="outline" className="w-full h-11 text-gray-700 font-medium border-gray-300 hover:border-gray-400" onClick={() => handleGoogleSignIn(auth, db, toast, router)}>
          <GoogleIcon />
          <span className="ml-2">Or sign in with Google</span>
      </Button>
    </div>
  );
}
