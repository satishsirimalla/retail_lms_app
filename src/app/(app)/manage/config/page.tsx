
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Helper to convert hex to HSL string 'H S% L%'
function hexToHsl(hex: string): string | null {
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

// Helper to convert HSL string 'H S% L%' to hex
function hslToHex(hslString: string): string {
    const [h, s, l] = hslString.replace(/%/g, '').split(' ').map(Number);
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { [r, g, b] = [c, x, 0]; } 
    else if (h >= 60 && h < 120) { [r, g, b] = [x, c, 0]; } 
    else if (h >= 120 && h < 180) { [r, g, b] = [0, c, x]; } 
    else if (h >= 180 && h < 240) { [r, g, b] = [0, x, c]; } 
    else if (h >= 240 && h < 300) { [r, g, b] = [x, 0, c]; } 
    else if (h >= 300 && h < 360) { [r, g, b] = [c, 0, x]; }

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


export default function ManageConfigPage() {
    const { toast } = useToast();
    
    // Default values matching globals.css
    const [primaryColor, setPrimaryColor] = useState('#3F51B5');
    const [backgroundColor, setBackgroundColor] = useState('#E8EAF6');
    const [accentColor, setAccentColor] = useState('#7E57C2');
    const [headlineFont, setHeadlineFont] = useState('Space Grotesk');
    const [isMounted, setIsMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        setIsMounted(true);
        const savedPrimary = localStorage.getItem('theme-primary');
        const savedBackground = localStorage.getItem('theme-background');
        const savedAccent = localStorage.getItem('theme-accent');
        const savedFont = localStorage.getItem('theme-headline');

        if (savedPrimary) setPrimaryColor(savedPrimary);
        if (savedBackground) setBackgroundColor(savedBackground);
        if (savedAccent) setAccentColor(savedAccent);
        if (savedFont) setHeadlineFont(savedFont);
    }, []);

    // Apply colors to CSS variables
    useEffect(() => {
        if (!isMounted) return;
        const root = document.documentElement;
        
        const primaryHsl = hexToHsl(primaryColor);
        if (primaryHsl) root.style.setProperty('--primary', primaryHsl);
        
        const backgroundHsl = hexToHsl(backgroundColor);
        if (backgroundHsl) root.style.setProperty('--background', backgroundHsl);

        const accentHsl = hexToHsl(accentColor);
        if (accentHsl) root.style.setProperty('--accent', accentHsl);

        root.style.setProperty('--font-headline', headlineFont);

    }, [primaryColor, backgroundColor, accentColor, headlineFont, isMounted]);

    const handleSaveChanges = () => {
        localStorage.setItem('theme-primary', primaryColor);
        localStorage.setItem('theme-background', backgroundColor);
        localStorage.setItem('theme-accent', accentColor);
        localStorage.setItem('theme-headline', headlineFont);

        toast({
            title: "Theme Saved",
            description: "Your new theme settings have been saved locally.",
        });
    };

    const handleReset = () => {
        // Reset to default values from globals.css
        const defaultPrimary = '#3F51B5';
        const defaultBackground = '#E8EAF6';
        const defaultAccent = '#7E57C2';
        const defaultFont = 'Space Grotesk';

        setPrimaryColor(defaultPrimary);
        setBackgroundColor(defaultBackground);
        setAccentColor(defaultAccent);
        setHeadlineFont(defaultFont);

        localStorage.removeItem('theme-primary');
        localStorage.removeItem('theme-background');
        localStorage.removeItem('theme-accent');
        localStorage.removeItem('theme-headline');
        
        toast({
            title: "Theme Reset",
            description: "Theme has been reset to its default settings.",
        });
    };
    
    if (!isMounted) {
        return null; // or a loading skeleton
    }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">App Configuration</h1>
            <p className="text-muted-foreground">Changes are applied in real-time and saved to your browser.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>Reset to Default</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>Manage the application's visual appearance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 p-1"
                    />
                    <Input 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)} 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Background Color</Label>
                 <div className="flex items-center gap-2">
                    <Input 
                        type="color" 
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 p-1"
                    />
                    <Input 
                        value={backgroundColor} 
                        onChange={(e) => setBackgroundColor(e.target.value)} 
                    />
                </div>
            </div>
             <div className="space-y-2">
                <Label>Accent Color</Label>
                 <div className="flex items-center gap-2">
                    <Input 
                        type="color" 
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-16 p-1"
                    />
                    <Input 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)} 
                    />
                </div>
            </div>
             <div className="space-y-2">
                <Label>Headline Font</Label>
                <Input 
                    value={headlineFont}
                    onChange={(e) => setHeadlineFont(e.target.value)} 
                />
                 <p className="text-xs text-muted-foreground">
                    Try "Inter", "Georgia", or any other font available on Google Fonts.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
