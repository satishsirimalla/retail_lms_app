
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    BookOpen,
    Users,
    Trophy,
    LogOut,
    Bell,
    Search,
    User as UserIcon,
    Menu,
    Database,
    Globe,
    Building,
    Store,
    Cog,
    Palette,
    BookCopy,
    Tag,
    FileClock,
    Upload,
    Eye,
    ChevronDown,
    LayoutDashboard,
    Compass,
    Shield,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import placeholderImages from '@/lib/placeholder-images.json';
import { Separator } from '../ui/separator';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AppTheme {
    appName?: string;
    appLogoUrl?: string;
}

function AppHeader() {
  const { userProfile, isVerified, logout } = useAuth();
  const avatarPlaceholder = placeholderImages.placeholderImages.find(p => p.id === 'avatar-placeholder');


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shrink-0">
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6"/>
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-none flex flex-col">
                <SheetHeader className='p-4 border-b'>
                    <AppLogo />
                    <SheetTitle className="sr-only">Sidebar</SheetTitle>
                </SheetHeader>
                <AppSidebarContent />
            </SheetContent>
        </Sheet>
        <div className="flex-1">
            <div className="relative md:max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8 bg-background" />
            </div>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={userProfile?.photoURL || avatarPlaceholder?.imageUrl} alt={userProfile?.firstName || ''} data-ai-hint={avatarPlaceholder?.imageHint || ''} />
                            <AvatarFallback>
                                {userProfile?.firstName?.[0]}
                                {userProfile?.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        {isVerified && <Trophy className="absolute bottom-0 right-0 h-5 w-5 fill-yellow-400 text-yellow-500" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                        <p className="font-bold">{userProfile?.firstName} {userProfile?.lastName}</p>
                        <p className="text-xs text-muted-foreground font-normal truncate">{userProfile?.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/profile"><UserIcon className="mr-2" />My Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2" />
                        Log Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </header>
  );
}

function NavLink({ href, children, isActive }: { href: string, children: React.ReactNode, isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function SubNavLink({ href, children, isActive }: { href: string, children: React.ReactNode, isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground",
        isActive && "bg-muted text-foreground"
      )}
    >
      {children}
    </Link>
  );
}


function AppLogo() {
    const firestore = useFirestore();
    const configDocRef = useMemoFirebase(() => doc(firestore, 'config', 'theme'), [firestore]);
    const { data: themeData } = useDoc<AppTheme>(configDocRef);

    return (
        <Link href="/home" className="flex items-center gap-2">
            {themeData?.appLogoUrl ? (
                    <Image src={themeData.appLogoUrl} alt={themeData.appName || "App Logo"} width={32} height={32} className="h-8 w-8" />
            ) : (
                <Trophy className="h-8 w-8 text-primary" />
            )}
            <h1 className="text-xl font-headline font-bold text-foreground">{themeData?.appName || "Retail Sales Hub"}</h1>
        </Link>
    )
}

function AppSidebarContent() {
    const pathname = usePathname();
    const { isVerified, isAdmin, userProfile } = useAuth();
    
    const myLearningSubItems = [
      { href: '/my-learning', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/my-learning/legacy-transcripts', label: 'Legacy Transcripts', icon: FileClock },
    ];
    
    const menuItems = [
        { href: '/home', label: 'Home', icon: Home, visible: true },
        { label: 'My Learning', icon: BookOpen, visible: true, base: '/my-learning', subItems: myLearningSubItems },
        { href: '/explore', label: 'Explore', icon: Compass, visible: true },
        { href: '/social', label: 'Social', icon: Users, visible: isVerified },
        { href: '/champions', label: 'Champions', icon: Trophy, visible: isVerified && userProfile?.isChampion },
    ];

    const transcriptSubItems = [
      { href: '/manage/transcripts/upload', label: 'Upload', icon: Upload },
      { href: '/manage/transcripts/view', label: 'View All', icon: Eye },
    ];
    
    const setupDataSubItems = [
        { href: '/manage/countries', label: 'Countries', icon: Globe },
        { href: '/manage/store-types', label: 'Store Types', icon: Building },
        { href: '/manage/retailers-and-stores', label: 'Retailers & Stores', icon: Store },
        { href: '/manage/topics', label: 'Topics', icon: Tag },
        { href: '/manage/theme', label: 'Theme Config', icon: Palette },
        { href: '/manage/auth-domains', label: 'Auth Domains', icon: Shield },
    ];

    const adminMenuItems = [
        { href: '/manage/users', label: 'Manage Users', icon: Users, visible: isAdmin },
        { href: '/manage/trainings', label: 'Trainings', icon: BookCopy, visible: isAdmin },
        { label: 'User Transcripts', icon: FileClock, visible: isAdmin, base: '/manage/transcripts', subItems: transcriptSubItems },
        { label: 'Setup Data', icon: Database, visible: isAdmin, base: '/manage', subItems: setupDataSubItems, exact: true },
    ];
    
    const isParentActive = (basePath: string, exact?: boolean) => {
        if (exact) {
            const otherAdminBases = ['/manage/users', '/manage/trainings', '/manage/transcripts'];
            return pathname.startsWith(basePath) && !otherAdminBases.some(b => pathname.startsWith(b));
        }
        return pathname.startsWith(basePath);
    };

    const renderMenuItem = (item: any) => {
      if (!item.visible) return null;

      if (item.subItems) {
        return (
          <Collapsible key={item.label} defaultOpen={isParentActive(item.base!, item.exact)}>
             <CollapsibleTrigger className="w-full">
                <div className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", isParentActive(item.base!, item.exact) && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                   <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                   </div>
                   <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </div>
             </CollapsibleTrigger>
             <CollapsibleContent className="py-1 pl-8 pr-2">
                <div className="flex flex-col gap-1">
                    {item.subItems.map((subItem: any) => (
                        <SubNavLink key={subItem.href} href={subItem.href} isActive={pathname === subItem.href}>
                            <subItem.icon className="h-4 w-4" />
                            {subItem.label}
                        </SubNavLink>
                    ))}
                </div>
             </CollapsibleContent>
          </Collapsible>
        )
      }

      return (
        <NavLink key={item.href} href={item.href!} isActive={pathname === item.href!}>
            <item.icon className="h-5 w-5" />
            {item.label}
        </NavLink>
      )
    }

    return (
        <>
            <div className='p-4'>
                <AppLogo />
            </div>

            <div className="flex-1 overflow-auto">
                <nav className="grid items-start p-2 text-sm font-medium">
                    {menuItems.map(renderMenuItem)}
                </nav>
                
                {isAdmin && (
                    <>
                    <Separator className="my-2" />
                    <nav className="grid items-start p-2 text-sm font-medium">
                         <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Admin</p>
                         {adminMenuItems.map(renderMenuItem)}
                    </nav>
                    </>
                )}
            </div>

            <div className="mt-auto p-4 border-t">
                 <nav className="grid items-start gap-1 text-sm font-medium">
                    <NavLink href={'/manage/config'} isActive={pathname === '/manage/config'}>
                        <Cog className="h-5 w-5"/>
                        App Config
                    </NavLink>
                </nav>
            </div>
        </>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
         <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-sidebar md:block">
                <div className="flex h-full max-h-screen flex-col gap-2 fixed w-[280px]">
                    <AppSidebarContent/>
                </div>
            </div>
            <div className="flex flex-col">
                <AppHeader />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
                   {children}
                </main>
            </div>
        </div>
    );
}
