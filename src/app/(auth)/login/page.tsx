
'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';
import placeholderImageData from '@/lib/placeholder-images.json';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Trophy } from 'lucide-react';

interface AppTheme {
  appName?: string;
  appLogoUrl?: string;
}

export default function LoginPage() {
  const loginImage = placeholderImageData.placeholderImages.find(
    (i) => i.id === 'login-background'
  );

  const firestore = useFirestore();
  const configDocRef = useMemoFirebase(() => doc(firestore, 'config', 'theme'), [firestore]);
  const { data: themeData } = useDoc<AppTheme>(configDocRef);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="relative flex flex-col md:flex-row h-[700px]">
        {/* Left side with image */}
        <div className="relative hidden h-full w-1/2 flex-col justify-end bg-gray-900 p-10 text-white md:flex">
          {loginImage && (
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
                <p className="text-sm">Photo by Alexandr Popadin</p>
           </div>
        </div>

        {/* Right side with form */}
        <div className="flex h-full w-full flex-col justify-center bg-white p-8 shadow-lg md:w-1/2 md:p-16">
          <div className="mx-auto w-full max-w-md">
             <div className="flex items-center gap-4 mb-2">
                {themeData?.appLogoUrl ? (
                    <Image src={themeData.appLogoUrl} alt={themeData.appName || "App Logo"} width={40} height={40} className="h-10 w-10" />
                ) : (
                    <Trophy className="h-10 w-10 text-primary" />
                )}
                <h1 className="text-2xl font-bold font-headline">{themeData?.appName || "Retail Sales Hub"}</h1>
            </div>
            <p className="mb-8 text-gray-500">
              Welcome back! Please enter your details.
            </p>
            <LoginForm />
            <p className="mt-8 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:underline">
                Sign up now
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
