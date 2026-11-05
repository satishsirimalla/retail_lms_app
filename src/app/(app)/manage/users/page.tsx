
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useMemoFirebase } from "@/firebase/provider";
import { collection } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Loader2, Filter, ArrowUpDown, Download, User as UserIcon, ShieldCheck, Mail, CheckCircle2, XCircle, Hourglass, UserCog, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

type SortDirection = 'ascending' | 'descending';
interface SortConfig {
    key: keyof UserProfile | 'fullName';
    direction: SortDirection;
}

function GoogleIcon() {
    return (
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className="h-4 w-4"
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

export default function ManageUsersPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const usersCol = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersCol);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [employmentFilter, setEmploymentFilter] = useState<string[]>([]);
  const [onboardingFilter, setOnboardingFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [authProviderFilter, setAuthProviderFilter] = useState<string[]>([]);
  const [retailerFilter, setRetailerFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'lastName', direction: 'ascending' });

   const filteredData = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      
      const searchMatch = !searchTerm || name.includes(searchLower) || email.includes(searchLower);

      const roleMatch = roleFilter.length === 0 || roleFilter.includes(user.role || 'user');
      const employmentStatus = user.employmentVerified ? 'Verified' : 'Not Verified';
      const employmentMatch = employmentFilter.length === 0 || employmentFilter.includes(employmentStatus);
      const onboardingStatus = user.onboardingCompleted ? 'Completed' : 'Pending';
      const onboardingMatch = onboardingFilter.length === 0 || onboardingFilter.includes(onboardingStatus);
      const userStatus = user.status === 'inactive' ? 'Inactive' : 'Active';
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(userStatus);
      const authProviderStatus = user.isGoogleAuthUser ? 'Google' : 'Email';
      const authProviderMatch = authProviderFilter.length === 0 || authProviderFilter.includes(authProviderStatus);
      const retailerMatch = retailerFilter.length === 0 || (user.retailerName && retailerFilter.includes(user.retailerName));
      const countryMatch = countryFilter.length === 0 || (user.userCountry && countryFilter.includes(user.userCountry));

      return searchMatch && roleMatch && employmentMatch && onboardingMatch && statusMatch && authProviderMatch && retailerMatch && countryMatch;
    });
  }, [users, searchTerm, roleFilter, employmentFilter, onboardingFilter, statusFilter, authProviderFilter, retailerFilter, countryFilter]);
  
  const getDynamicOptions = (key: keyof UserProfile) => {
    return Array.from(new Set(filteredData.map(u => u[key]).filter(Boolean) as string[])).sort();
  };

  const filteredAndSortedUsers = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'fullName') {
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else {
          aValue = a[sortConfig.key as keyof UserProfile];
          bValue = b[sortConfig.key as keyof UserProfile];
        }
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const roleOptions = ['user', 'admin'];
  const employmentOptions = ['Verified', 'Not Verified'];
  const onboardingOptions = ['Completed', 'Pending'];
  const statusOptions = ['Active', 'Inactive'];
  const authProviderOptions = ['Google', 'Email'];
  const uniqueRetailers = getDynamicOptions('retailerName');
  const uniqueCountries = getDynamicOptions('userCountry');

  const handleFilterChange = (filterSetter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    filterSetter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  }
  
  const requestSort = (key: keyof UserProfile | 'fullName') => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: keyof UserProfile | 'fullName') => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return format(date, 'Pp');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedUsers.map(user => ({
        UID: user.uid,
        FirstName: user.firstName,
        LastName: user.lastName,
        DisplayName: user.displayName,
        Email: user.email,
        PhotoURL: user.photoURL,
        EmployeeID: user.employeeId,
        UserType: user.userType,
        Country: user.userCountry,
        PreferredLanguage: user.preferredLanguage,
        Timezone: user.timezone,
        WorkEmail: user.workEmail,
        StoreType: user.storeType,
        Retailer: user.retailerName,
        StoreName: user.storeName,
        StoreLocation: user.storeLocation,
        StoreID: user.storeId,
        Role: user.role || 'user',
        AuthProvider: user.isGoogleAuthUser ? 'Google' : 'Email',
        Status: user.status === 'inactive' ? 'Inactive' : 'Active',
        EmploymentStatus: user.employmentVerified ? 'Verified' : 'Not Verified',
        IsChampion: user.isChampion ? 'Yes' : 'No',
        Onboarding: user.onboardingCompleted ? 'Completed' : 'Pending',
        CommunicationEmail: user.communicationEmail,
        PromotionalNotifications: user.promotionalNotifications ? 'Yes' : 'No',
        ShareTrainingData: user.shareTrainingData ? 'Yes' : 'No',
        LastLogin: formatDate(user.lastLogin),
    }));

    if (dataToExport.length === 0) return;

    const csv = [
      Object.keys(dataToExport[0]).join(','),
      ...dataToExport.map(row => 
        Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'users.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
            <Button variant="outline" onClick={handleExport} disabled={filteredAndSortedUsers.length === 0}>
                <Download className="mr-2" /> Export Data
            </Button>
        </div>

       <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-start gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Role</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setRoleFilter([])}>All Roles</DropdownMenuItem><DropdownMenuSeparator />
                        {roleOptions.map(r => <DropdownMenuCheckboxItem key={r} checked={roleFilter.includes(r)} onCheckedChange={() => handleFilterChange(setRoleFilter, r)}>{r}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Employment</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setEmploymentFilter([])}>All Statuses</DropdownMenuItem><DropdownMenuSeparator />
                        {employmentOptions.map(r => <DropdownMenuCheckboxItem key={r} checked={employmentFilter.includes(r)} onCheckedChange={() => handleFilterChange(setEmploymentFilter, r)}>{r}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Onboarding</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setOnboardingFilter([])}>All Statuses</DropdownMenuItem><DropdownMenuSeparator />
                        {onboardingOptions.map(s => <DropdownMenuCheckboxItem key={s} checked={onboardingFilter.includes(s)} onCheckedChange={() => handleFilterChange(setOnboardingFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Status</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setStatusFilter([])}>All Statuses</DropdownMenuItem><DropdownMenuSeparator />
                        {statusOptions.map(s => <DropdownMenuCheckboxItem key={s} checked={statusFilter.includes(s)} onCheckedChange={() => handleFilterChange(setStatusFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Provider</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setAuthProviderFilter([])}>All Providers</DropdownMenuItem><DropdownMenuSeparator />
                        {authProviderOptions.map(s => <DropdownMenuCheckboxItem key={s} checked={authProviderFilter.includes(s)} onCheckedChange={() => handleFilterChange(setAuthProviderFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Country</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setCountryFilter([])}>All Countries</DropdownMenuItem><DropdownMenuSeparator />
                        {uniqueCountries.map(s => <DropdownMenuCheckboxItem key={s} checked={countryFilter.includes(s)} onCheckedChange={() => handleFilterChange(setCountryFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Retailer</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setRetailerFilter([])}>All Retailers</DropdownMenuItem><DropdownMenuSeparator />
                        {uniqueRetailers.map(s => <DropdownMenuCheckboxItem key={s} checked={retailerFilter.includes(s)} onCheckedChange={() => handleFilterChange(setRetailerFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-1/3"
                />
            </div>
       </div>

      <Card>
        <CardContent className="p-0">
         <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Button variant="ghost" onClick={() => requestSort('fullName')} className="font-bold px-2">Full Name {getSortIndicator('fullName')}</Button></TableHead>
                <TableHead><Button variant="ghost" onClick={() => requestSort('userCountry')} className="font-bold px-2">Country {getSortIndicator('userCountry')}</Button></TableHead>
                <TableHead><Button variant="ghost" onClick={() => requestSort('retailerName')} className="font-bold px-2">Retailer {getSortIndicator('retailerName')}</Button></TableHead>
                <TableHead><Button variant="ghost" onClick={() => requestSort('lastLogin')} className="font-bold px-2">Last Login {getSortIndicator('lastLogin')}</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAndSortedUsers?.map(user => (
                <TableRow key={user.uid} onClick={() => router.push(`/manage/users/${user.uid}`)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{`${user.firstName} ${user.lastName}`}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="gap-1 px-2">
                            {user.role === 'admin' ? <UserCog className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Role: <span className="capitalize">{user.role || 'user'}</span></TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Badge variant={user.isGoogleAuthUser ? 'outline' : 'secondary'} className="gap-1 px-2">
                                {user.isGoogleAuthUser ? <GoogleIcon /> : <Mail className="h-3.5 w-3.5" />}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Auth Provider: {user.isGoogleAuthUser ? 'Google' : 'Email'}</TooltipContent>
                      </Tooltip>
                      
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={user.status === 'inactive' ? 'destructive' : 'default'} className="gap-1 px-2 bg-green-600 hover:bg-green-700">
                             <CheckCircle2 className="h-3.5 w-3.5" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Account Status: <span className="capitalize">{user.status === 'inactive' ? 'Inactive' : 'Active'}</span></TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Badge variant={user.employmentVerified ? 'default' : 'destructive'} className="gap-1 px-2">
                            {user.employmentVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                           </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Employment: {user.employmentVerified ? 'Verified' : 'Not Verified'}</TooltipContent>
                      </Tooltip>

                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={user.onboardingCompleted ? 'default' : 'secondary'} className="gap-1 px-2">
                            {user.onboardingCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Hourglass className="h-3.5 w-3.5" />}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Onboarding: {user.onboardingCompleted ? 'Completed' : 'Pending'}</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell>{user.userCountry}</TableCell>
                  <TableCell>{user.retailerName}</TableCell>
                  <TableCell>{formatDate(user.lastLogin)}</TableCell>
                </TableRow>
              ))}
               {!isLoading && filteredAndSortedUsers?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}

    