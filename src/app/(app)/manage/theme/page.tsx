

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { Loader2 } from "lucide-react";

// Helper to convert hex to HSL string 'H S% L%'
function hexToHsl(hex: string): string | null {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

interface AppTheme {
    appName?: string;
    appLogoUrl?: string;
    font?: string;
    loginImageUrl?: string;
    heroImageUrl?: string;
    appTitleColor?: string;
    backgroundColor?: string;
    leftMenuColor?: string;
    sidebarForegroundColor?: string;
    sidebarAccentColor?: string;
    heroBackgroundColor?: string;
    heroTextColor?: string;
}

const googleFonts = [
    "Inter",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Space Grotesk",
    "Source Code Pro"
];

export default function ManageThemePage() {
    const { toast } = useToast();
    const firestore = useFirestore();

    const configDocRef = useMemoFirebase(() => doc(firestore, 'config', 'theme'), [firestore]);
    const { data: themeData, isLoading } = useDoc<AppTheme>(configDocRef);

    const [appName, setAppName] = useState('');
    const [appLogoUrl, setAppLogoUrl] = useState('');
    const [font, setFont] = useState('Inter');
    const [loginImageUrl, setLoginImageUrl] = useState('');
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [appTitleColor, setAppTitleColor] = useState('#3F51B5');
    const [backgroundColor, setBackgroundColor] = useState('#E8EAF6');
    const [leftMenuColor, setLeftMenuColor] = useState('#283593');
    const [sidebarForegroundColor, setSidebarForegroundColor] = useState('#E8EAF6');
    const [sidebarAccentColor, setSidebarAccentColor] = useState('#3F51B5');
    const [heroBackgroundColor, setHeroBackgroundColor] = useState('#E8EAF6');
    const [heroTextColor, setHeroTextColor] = useState('#FFFFFF');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (themeData) {
            setAppName(themeData.appName || '');
            setAppLogoUrl(themeData.appLogoUrl || '');
            setFont(themeData.font || 'Inter');
            setLoginImageUrl(themeData.loginImageUrl || '');
            setHeroImageUrl(themeData.heroImageUrl || '');
            setAppTitleColor(themeData.appTitleColor || '#3F51B5');
            setBackgroundColor(themeData.backgroundColor || '#E8EAF6');
            setLeftMenuColor(themeData.leftMenuColor || '#283593');
            setSidebarForegroundColor(themeData.sidebarForegroundColor || '#E8EAF6');
            setSidebarAccentColor(themeData.sidebarAccentColor || '#3F51B5');
            setHeroBackgroundColor(themeData.heroBackgroundColor || '#E8EAF6');
            setHeroTextColor(themeData.heroTextColor || '#FFFFFF');
        }
    }, [themeData]);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        const newTheme: AppTheme = {
            appName,
            appLogoUrl,
            font,
            loginImageUrl,
            heroImageUrl,
            appTitleColor,
            backgroundColor,
            leftMenuColor,
            sidebarForegroundColor,
            sidebarAccentColor,
            heroBackgroundColor,
            heroTextColor,
        };

        try {
            await setDoc(configDocRef, newTheme, { merge: true }).catch(e => {
                const permissionError = new FirestorePermissionError({ path: configDocRef.path, operation: 'write', requestResourceData: newTheme });
                errorEmitter.emit('permission-error', permissionError);
                throw e;
            });
            toast({
                title: "Theme Saved",
                description: "Your new theme settings have been saved.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "You do not have permission to save the theme.",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Live preview
    useEffect(() => {
        const root = document.documentElement;
        
        const titleHsl = hexToHsl(appTitleColor);
        if (titleHsl) root.style.setProperty('--primary', titleHsl);
        
        const backgroundHsl = hexToHsl(backgroundColor);
        if (backgroundHsl) root.style.setProperty('--background', backgroundHsl);

        const menuHsl = hexToHsl(leftMenuColor);
        if (menuHsl) root.style.setProperty('--sidebar-background', menuHsl);
        
        const sidebarFgHsl = hexToHsl(sidebarForegroundColor);
        if (sidebarFgHsl) root.style.setProperty('--sidebar-foreground', sidebarFgHsl);

        const sidebarAccentHsl = hexToHsl(sidebarAccentColor);
        if (sidebarAccentHsl) root.style.setProperty('--sidebar-accent', sidebarAccentHsl);

        root.style.setProperty('--font-headline', font);
    }, [appTitleColor, backgroundColor, leftMenuColor, sidebarForegroundColor, sidebarAccentColor, font]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Theme Configuration</h1>
            <p className="text-muted-foreground">Customize the look and feel of the application.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Branding and Appearance</CardTitle>
          <CardDescription>Manage application name, logos, and fonts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Application Name</Label>
                    <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g. Retail Sales Hub" />
                </div>
                <div className="space-y-2">
                    <Label>Application Logo URL</Label>
                    <Input value={appLogoUrl} onChange={(e) => setAppLogoUrl(e.target.value)} placeholder="https://example.com/logo.png"/>
                </div>
                <div className="space-y-2">
                    <Label>Login Screen Image URL</Label>
                    <Input value={loginImageUrl} onChange={(e) => setLoginImageUrl(e.target.value)} placeholder="https://example.com/login-bg.jpg"/>
                </div>
                <div className="space-y-2">
                    <Label>Homepage Hero Image URL</Label>
                    <Input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} placeholder="https://example.com/hero-bg.jpg"/>
                </div>
                <div className="space-y-2">
                    <Label>Font</Label>
                    <Select value={font} onValueChange={setFont}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {googleFonts.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>Adjust the application's color palette.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <Label>App Title Color (Primary)</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={appTitleColor} onChange={(e) => setAppTitleColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={appTitleColor} onChange={(e) => setAppTitleColor(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Left Menu Color</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={leftMenuColor} onChange={(e) => setLeftMenuColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={leftMenuColor} onChange={(e) => setLeftMenuColor(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Left Menu Text Color</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={sidebarForegroundColor} onChange={(e) => setSidebarForegroundColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={sidebarForegroundColor} onChange={(e) => setSidebarForegroundColor(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Left Menu Selected BG</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={sidebarAccentColor} onChange={(e) => setSidebarAccentColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={sidebarAccentColor} onChange={(e) => setSidebarAccentColor(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Hero Background Color</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={heroBackgroundColor} onChange={(e) => setHeroBackgroundColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={heroBackgroundColor} onChange={(e) => setHeroBackgroundColor(e.target.value)} />
                </div>
            </div>
             <div className="space-y-2">
                <Label>Hero Text Color</Label>
                <div className="flex items-center gap-2">
                    <Input type="color" value={heroTextColor} onChange={(e) => setHeroTextColor(e.target.value)} className="w-16 p-1"/>
                    <Input value={heroTextColor} onChange={(e) => setHeroTextColor(e.target.value)} />
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
