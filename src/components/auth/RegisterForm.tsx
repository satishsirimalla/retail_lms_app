
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
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import { handleGoogleSignIn } from './LoginForm';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
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

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useFirebaseAuth();
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const userDocData = {
        uid: user.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        authProvider: 'email',
        onboardingCompleted: false,
        role: 'user', // Default all new email sign-ups to 'user'
        isGoogleAuthUser: false,
      };

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, userDocData).catch((e) => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userDocData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e; 
      });
      
      router.push('/');
    } catch (error: any) {
      if (!(error instanceof FirestorePermissionError)) {
        toast({
            variant: 'destructive',
            title: 'Registration Failed',
            description: error.message || 'An unexpected error occurred.',
        });
      }
    }
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" className="w-full h-11 text-gray-700 font-medium border-gray-300 hover:border-gray-400" onClick={() => handleGoogleSignIn(auth, db, toast, router)}>
          <GoogleIcon />
          <span className="ml-2">Or sign up with Google</span>
      </Button>

       <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-xs text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className='flex gap-4'>
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                    <FormItem className='flex-1'>
                        <FormLabel className="font-semibold">First Name</FormLabel>
                        <FormControl>
                        <Input placeholder="John" {...field} className="bg-gray-100"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                    <FormItem className='flex-1'>
                        <FormLabel className="font-semibold">Last Name</FormLabel>
                        <FormControl>
                        <Input placeholder="Doe" {...field} className="bg-gray-100"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} className="bg-gray-100"/>
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
                  <Input type="password" placeholder="••••••••" {...field} className="bg-gray-100"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Creating Account...' : 'Sign up'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
