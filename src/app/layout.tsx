
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { FirebaseClientProvider, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';

interface AppTheme {
    appName?: string;
    appLogoUrl?: string;
    font?: string;
    loginImageUrl?: string;
    appTitleColor?: string;
    backgroundColor?: string;
    leftMenuColor?: string;
    sidebarForegroundColor?: string;
    sidebarAccentColor?: string;
    heroBackgroundColor?: string;
    heroTextColor?: string;
}

function ThemeLoader() {
  const firestore = useFirestore();
  const configDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'config', 'theme') : null, [firestore]);
  const { data: themeData } = useDoc<AppTheme>(configDocRef);

  useEffect(() => {
    const root = document.documentElement;

    const hexToHsl = (hex: string): string | null => {
        if (!hex) return null;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        let r = parseInt(result[1], 16) / 255, g = parseInt(result[2], 16) / 255, b = parseInt(result[3], 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
    };

    if (themeData) {
        if (themeData.appTitleColor) {
            const primaryHsl = hexToHsl(themeData.appTitleColor);
            if (primaryHsl) root.style.setProperty('--primary', primaryHsl);
        }
        if (themeData.backgroundColor) {
            const backgroundHsl = hexToHsl(themeData.backgroundColor);
            if (backgroundHsl) root.style.setProperty('--background', backgroundHsl);
        }
        if (themeData.leftMenuColor) {
            const menuHsl = hexToHsl(themeData.leftMenuColor);
            if (menuHsl) root.style.setProperty('--sidebar-background', menuHsl);
        }
        if (themeData.sidebarForegroundColor) {
            const sidebarFgHsl = hexToHsl(themeData.sidebarForegroundColor);
            if (sidebarFgHsl) root.style.setProperty('--sidebar-foreground', sidebarFgHsl);
        }
        if (themeData.sidebarAccentColor) {
            const sidebarAccentHsl = hexToHsl(themeData.sidebarAccentColor);
            if (sidebarAccentHsl) root.style.setProperty('--sidebar-accent', sidebarAccentHsl);
        }

        if (themeData.font) {
            root.style.setProperty('--font-headline', themeData.font);

            // Dynamically load Google Font
            const fontUrl = `https://fonts.googleapis.com/css2?family=${themeData.font.replace(/ /g, '+')}:wght@400;500;700&display=swap`;
            let link = document.querySelector(`link[href="${fontUrl}"]`);
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('href', fontUrl);
                document.head.appendChild(link);
            }
        }
         if (themeData.appName) {
            document.title = themeData.appName;
        }
    }
  }, [themeData]);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Retail Sales Training Hub</title>
        <meta name="description" content="Training and community for retail sales champions." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Static fonts as fallback */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
            <ThemeLoader />
            <AuthProvider>
                {children}
                <Toaster />
            </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
