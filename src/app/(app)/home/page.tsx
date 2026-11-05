
'use client';

import { Card } from "@/components/ui/card";
import Image from "next/image";
import placeholderImageData from '@/lib/placeholder-images.json';
import { HomePageClient } from "./HomePageClient";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import Link from 'next/link';

interface AppTheme {
  heroImageUrl?: string;
  heroBackgroundColor?: string;
  heroTextColor?: string;
}

function HeroSection() {
    const firestore = useFirestore();
    const configDocRef = useMemoFirebase(() => doc(firestore, 'config', 'theme'), [firestore]);
    const { data: themeData } = useDoc<AppTheme>(configDocRef);

    const defaultHeroImage = placeholderImageData.placeholderImages.find(i => i.id === 'hero');
    const heroImageUrl = themeData?.heroImageUrl || defaultHeroImage?.imageUrl;
    const heroImageAlt = defaultHeroImage?.description || 'Hero image';
    const heroImageHint = defaultHeroImage?.imageHint || 'retail sales';

    const heroStyle = {
      backgroundColor: themeData?.heroBackgroundColor || '#E8EAF6', // Default to light purple
      color: themeData?.heroTextColor || '#FFFFFF', // Default to white
    };

    const textStyle = {
      color: themeData?.heroTextColor || '#FFFFFF',
    };
     const subTextStyle = {
      color: themeData?.heroTextColor ? `${themeData.heroTextColor}B3` : '#FFFFFFB3', // 70% opacity
    };


    return (
        <Card className="overflow-hidden shadow-none border-none" style={heroStyle}>
         <div className="grid md:grid-cols-2 items-center">
            <div className="p-10 md:p-16">
                <h1 className="font-headline text-3xl font-bold md:text-5xl drop-shadow-md" style={textStyle}>
                    Welcome to Retail Sales Training Hub
                </h1>
                <p className="mt-4 max-w-lg text-base md:text-lg" style={subTextStyle}>
                    Your central place for training, news, and community. Let's get started.
                </p>
                <Link href="/explore">
                    <Button size="lg" className="mt-6">
                        Explore Trainings <ArrowRight className="ml-2"/>
                    </Button>
                </Link>
            </div>
            <div className="relative h-64 w-full md:h-[400px] md:rounded-l-2xl overflow-hidden">
                {heroImageUrl && <Image
                    src={heroImageUrl}
                    alt={heroImageAlt}
                    fill
                    priority
                    className="object-cover"
                    data-ai-hint={heroImageHint}
                />}
            </div>
         </div>
      </Card>
    )
}

export default function HomePage() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <HomePageClient />
    </div>
  );
}
