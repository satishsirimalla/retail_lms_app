'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Building2, Globe, Search, Filter, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useMemoFirebase } from "@/firebase/provider";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuthDomain } from "@/lib/auth-domains";

interface Country {
  id: string;
  name: string;
}

interface RetailerStore {
  id: string;
  retailerName: string;
  countryId?: string;
}

function AddEditDomainDialog({
  domainData,
  countries,
  stores,
  onSave,
  children,
}: {
  domainData?: AuthDomain;
  countries: Country[];
  stores: RetailerStore[];
  onSave: (retailerName: string, domainsInput: string, countryName?: string, countryId?: string, id?: string) => Promise<void> | void;
  children: React.ReactNode;
}) {
  const [selectedCountryId, setSelectedCountryId] = useState<string>('all');
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [customRetailer, setCustomRetailer] = useState('');
  const [isCustomRetailer, setIsCustomRetailer] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map of countryId -> countryName
  const countryMap = useMemo(() => {
    return new Map(countries.map(c => [c.id, c.name]));
  }, [countries]);

  // When dialog opens or domainData changes, set initial state
  useEffect(() => {
    if (domainData) {
      // Try finding countryId from domainData or from matching store
      let matchedCountryId = domainData.countryId;
      if (!matchedCountryId && domainData.countryName) {
        const found = countries.find(c => c.name.toLowerCase() === domainData.countryName?.toLowerCase());
        if (found) matchedCountryId = found.id;
      }
      if (!matchedCountryId && domainData.retailerName) {
        const matchingStore = stores.find(s => s.retailerName.toLowerCase() === domainData.retailerName.toLowerCase() && s.countryId);
        if (matchingStore?.countryId) matchedCountryId = matchingStore.countryId;
      }

      setSelectedCountryId(matchedCountryId || 'all');
      setSelectedRetailer(domainData.retailerName || '');
      setCustomRetailer('');
      setIsCustomRetailer(false);
      setDomainInput(domainData.domain || '');
    } else {
      setSelectedCountryId('all');
      setSelectedRetailer('');
      setCustomRetailer('');
      setIsCustomRetailer(false);
      setDomainInput('');
    }
  }, [domainData, countries, stores, isOpen]);

  // Compute filtered retailers based on the selected country
  const filteredRetailers = useMemo(() => {
    const retailerSet = new Set<string>();

    stores.forEach((s) => {
      if (!s.retailerName?.trim()) return;
      if (selectedCountryId === 'all' || s.countryId === selectedCountryId) {
        retailerSet.add(s.retailerName.trim());
      }
    });

    return Array.from(retailerSet).sort((a, b) => a.localeCompare(b));
  }, [stores, selectedCountryId]);

  // Adjust selectedRetailer if it's no longer in the filtered list
  useEffect(() => {
    if (!isCustomRetailer && filteredRetailers.length > 0) {
      if (!selectedRetailer || !filteredRetailers.includes(selectedRetailer)) {
        // If domainData matches one, keep it, otherwise pick first available
        if (domainData?.retailerName && filteredRetailers.includes(domainData.retailerName)) {
          setSelectedRetailer(domainData.retailerName);
        } else {
          setSelectedRetailer(filteredRetailers[0]);
        }
      }
    } else if (filteredRetailers.length === 0 && !isCustomRetailer) {
      setSelectedRetailer('');
    }
  }, [filteredRetailers, isCustomRetailer, domainData, selectedRetailer]);

  const effectiveRetailer = isCustomRetailer ? customRetailer.trim() : selectedRetailer.trim();

  const handleCountryChange = (countryId: string) => {
    setSelectedCountryId(countryId);
    // When changing country, if custom retailer was enabled, keep it or allow picking from new country
  };

  const handleSave = async () => {
    if (!effectiveRetailer || !domainInput.trim()) return;
    setIsSubmitting(true);
    try {
      const countryName = selectedCountryId !== 'all' ? countryMap.get(selectedCountryId) : undefined;
      const countryId = selectedCountryId !== 'all' ? selectedCountryId : undefined;

      await onSave(effectiveRetailer, domainInput, countryName, countryId, domainData?.id);
      setIsOpen(false);
      if (!domainData) {
        setDomainInput('');
        setCustomRetailer('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCountryName = selectedCountryId !== 'all' ? countryMap.get(selectedCountryId) : 'All Countries';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{domainData ? 'Edit Authorized Domain' : 'Add Authorized Domain'}</DialogTitle>
          <DialogDescription>
            {domainData
              ? 'Update the country, retailer, or domain mapping.'
              : 'Filter by country first to quickly select your retailer, then add the domain(s).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* 1. Country Filter (Above Retailer) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="country-select" className="flex items-center gap-1.5 font-medium">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Country
              </Label>
              <span className="text-xs text-muted-foreground">Filters available retailers</span>
            </div>

            <Select value={selectedCountryId} onValueChange={handleCountryChange}>
              <SelectTrigger id="country-select" className="w-full">
                <SelectValue placeholder="Select a Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Countries ({countries.length > 0 ? `${countries.length} available` : 'All'})
                </SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Retailer Select (Filtered by Country) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="retailer-select" className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Retailer
              </Label>
              <button
                type="button"
                onClick={() => setIsCustomRetailer(!isCustomRetailer)}
                className="text-xs text-primary hover:underline"
              >
                {isCustomRetailer ? '← Choose from country retailers' : '+ Enter custom retailer name'}
              </button>
            </div>

            {!isCustomRetailer ? (
              filteredRetailers.length > 0 ? (
                <Select
                  value={selectedRetailer}
                  onValueChange={(val) => {
                    if (val === '__custom__') {
                      setIsCustomRetailer(true);
                    } else {
                      setSelectedRetailer(val);
                    }
                  }}
                >
                  <SelectTrigger id="retailer-select" className="w-full">
                    <SelectValue placeholder="Select a retailer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRetailers.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-primary font-medium">
                      + Other / Custom Retailer...
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
                  <p>No retailers found for {selectedCountryName}.</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs mt-1"
                    onClick={() => setIsCustomRetailer(true)}
                  >
                    Enter a retailer name manually
                  </Button>
                </div>
              )
            ) : (
              <Input
                id="retailer-input"
                value={customRetailer}
                onChange={(e) => setCustomRetailer(e.target.value)}
                placeholder="e.g. AT&T, Verizon, Best Buy"
                autoFocus={isCustomRetailer}
              />
            )}

            {!isCustomRetailer && filteredRetailers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredRetailers.length} {filteredRetailers.length === 1 ? 'retailer' : 'retailers'} in {selectedCountryName}.
              </p>
            )}
          </div>

          {/* 3. Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="domain-input" className="flex items-center gap-1.5 font-medium">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Domain Name
            </Label>
            <Input
              id="domain-input"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder={domainData ? 'e.g. att.com' : 'e.g. att.com (or comma separated: att.com, wireless.att.com)'}
            />
            <p className="text-xs text-muted-foreground">
              {domainData
                ? 'Work emails ending in @' + (domainInput.replace(/^@/, '').trim() || 'domain.com') + ' will be validated for this retailer.'
                : 'You can add multiple domains for this retailer by separating them with commas (e.g. att.com, wireless.att.com).'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!effectiveRetailer || !domainInput.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : domainData ? 'Save Changes' : 'Add Domain'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ManageAuthDomainsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const domainsCol = useMemoFirebase(() => collection(firestore, 'auth_domains'), [firestore]);
  const { data: domains, isLoading: isDomainsLoading } = useCollection<AuthDomain>(domainsCol);

  const countriesCol = useMemoFirebase(() => collection(firestore, 'countries'), [firestore]);
  const { data: countries, isLoading: isCountriesLoading } = useCollection<Country>(countriesCol);

  const storesCol = useMemoFirebase(() => collection(firestore, 'retailers_stores'), [firestore]);
  const { data: stores, isLoading: isStoresLoading } = useCollection<RetailerStore>(storesCol);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('all');
  const [selectedRetailerFilter, setSelectedRetailerFilter] = useState<string>('all');

  const safeCountries = useMemo(() => countries || [], [countries]);
  const safeStores = useMemo(() => stores || [], [stores]);

  // Country Map: id -> name and name -> id
  const countryNameById = useMemo(() => {
    return new Map(safeCountries.map((c) => [c.id, c.name]));
  }, [safeCountries]);

  // Retailer -> Country Name resolution (from stores)
  const retailerCountryMap = useMemo(() => {
    const map = new Map<string, string>();
    safeStores.forEach((s) => {
      if (s.retailerName && s.countryId) {
        const countryName = countryNameById.get(s.countryId);
        if (countryName) {
          map.set(s.retailerName.toLowerCase().trim(), countryName);
        }
      }
    });
    return map;
  }, [safeStores, countryNameById]);

  // List of retailers available based on the selected country filter in the toolbar
  const availableRetailersForFilter = useMemo(() => {
    const set = new Set<string>();

    safeStores.forEach((s) => {
      if (!s.retailerName?.trim()) return;
      if (selectedCountryFilter === 'all' || s.countryId === selectedCountryFilter) {
        set.add(s.retailerName.trim());
      }
    });

    domains?.forEach((d) => {
      if (!d.retailerName?.trim()) return;
      if (selectedCountryFilter === 'all') {
        set.add(d.retailerName.trim());
      } else {
        const cName = countryNameById.get(selectedCountryFilter);
        if (d.countryId === selectedCountryFilter || (cName && d.countryName === cName)) {
          set.add(d.retailerName.trim());
        }
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [safeStores, domains, selectedCountryFilter, countryNameById]);

  // Reset retailer filter if no longer valid under chosen country filter
  useEffect(() => {
    if (selectedRetailerFilter !== 'all' && !availableRetailersForFilter.includes(selectedRetailerFilter)) {
      setSelectedRetailerFilter('all');
    }
  }, [selectedCountryFilter, availableRetailersForFilter, selectedRetailerFilter]);

  const handleSaveDomain = async (
    retailerName: string,
    domainsInput: string,
    countryName?: string,
    countryId?: string,
    id?: string
  ) => {
    const cleanRetailer = retailerName.trim();

    // If country wasn't provided directly, attempt to resolve from stores
    const resolvedCountryName =
      countryName ||
      retailerCountryMap.get(cleanRetailer.toLowerCase()) ||
      undefined;

    if (id) {
      // Editing single domain
      const cleanDomain = domainsInput.trim().toLowerCase().replace(/^@/, '');
      const domainDoc = doc(firestore, 'auth_domains', id);
      try {
        const updatePayload: Record<string, any> = {
          retailerName: cleanRetailer,
          domain: cleanDomain,
        };
        if (resolvedCountryName) updatePayload.countryName = resolvedCountryName;
        if (countryId) updatePayload.countryId = countryId;

        await updateDoc(domainDoc, updatePayload);
        toast({
          title: "Domain Updated",
          description: `Updated "${cleanDomain}" for retailer "${cleanRetailer}".`,
        });
      } catch (error: any) {
        const permissionError = new FirestorePermissionError({
          path: domainDoc.path,
          operation: 'update',
          requestResourceData: { retailerName: cleanRetailer, domain: cleanDomain },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message || "Could not update authorized domain.",
        });
      }
    } else {
      // Adding new domain(s)
      const rawTokens = domainsInput.split(/[\s,]+/);
      const uniqueCleanDomains = Array.from(
        new Set(rawTokens.map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean))
      );

      if (uniqueCleanDomains.length === 0) return;

      try {
        const batch = writeBatch(firestore);
        const colRef = collection(firestore, 'auth_domains');

        uniqueCleanDomains.forEach((domain) => {
          const newDocRef = doc(colRef);
          const newDocData: Record<string, any> = {
            retailerName: cleanRetailer,
            domain,
            createdAt: new Date(),
          };
          if (resolvedCountryName) newDocData.countryName = resolvedCountryName;
          if (countryId) newDocData.countryId = countryId;

          batch.set(newDocRef, newDocData);
        });

        await batch.commit();

        toast({
          title: uniqueCleanDomains.length > 1 ? "Domains Added" : "Domain Added",
          description: `Added ${uniqueCleanDomains.join(', ')} for retailer "${cleanRetailer}"${
            resolvedCountryName ? ` (${resolvedCountryName})` : ''
          }.`,
        });
      } catch (error: any) {
        const permissionError = new FirestorePermissionError({
          path: 'auth_domains',
          operation: 'create',
          requestResourceData: { retailerName: cleanRetailer, domains: uniqueCleanDomains },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: "destructive",
          title: "Failed to Add Domain",
          description: error.message || "Could not add authorized domain.",
        });
      }
    }
  };

  const handleDeleteDomain = (domainItem: AuthDomain) => {
    const domainDoc = doc(firestore, 'auth_domains', domainItem.id);
    deleteDoc(domainDoc)
      .then(() => {
        toast({
          title: "Domain Deleted",
          description: `"${domainItem.domain}" has been deleted.`,
        });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: domainDoc.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: error.message || "Could not delete domain.",
        });
      });
  };

  // Filter & Search
  const filteredDomains = useMemo(() => {
    if (!domains) return [];
    return domains
      .filter((item) => {
        const itemCountry =
          item.countryName ||
          retailerCountryMap.get(item.retailerName?.toLowerCase().trim() || '') ||
          '';

        const matchesCountry =
          selectedCountryFilter === 'all' ||
          item.countryId === selectedCountryFilter ||
          (countryNameById.get(selectedCountryFilter) &&
            itemCountry.toLowerCase() === countryNameById.get(selectedCountryFilter)?.toLowerCase());

        const matchesRetailer =
          selectedRetailerFilter === 'all' ||
          (item.retailerName || '').toLowerCase() === selectedRetailerFilter.toLowerCase();

        const searchLower = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !searchLower ||
          (item.domain || '').toLowerCase().includes(searchLower) ||
          (item.retailerName || '').toLowerCase().includes(searchLower) ||
          itemCountry.toLowerCase().includes(searchLower);

        return matchesCountry && matchesRetailer && matchesSearch;
      })
      .sort((a, b) => {
        const countryA = a.countryName || retailerCountryMap.get(a.retailerName?.toLowerCase().trim() || '') || '';
        const countryB = b.countryName || retailerCountryMap.get(b.retailerName?.toLowerCase().trim() || '') || '';
        const countryCompare = countryA.localeCompare(countryB);
        if (countryCompare !== 0) return countryCompare;

        const retCompare = (a.retailerName || '').localeCompare(b.retailerName || '');
        if (retCompare !== 0) return retCompare;

        return (a.domain || '').localeCompare(b.domain || '');
      });
  }, [domains, selectedCountryFilter, selectedRetailerFilter, searchTerm, retailerCountryMap, countryNameById]);

  // Unique count stats
  const retailerCounts = useMemo(() => {
    const map = new Map<string, number>();
    domains?.forEach((d) => {
      const name = d.retailerName?.trim() || 'Unassigned';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return map;
  }, [domains]);

  const isLoading = isDomainsLoading || isStoresLoading || isCountriesLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Authorized Domains</h1>
          <p className="text-muted-foreground">
            Filter by country to select retailers and manage authorized email domains for work email verification.
          </p>
        </div>
        <AddEditDomainDialog
          countries={safeCountries}
          stores={safeStores}
          onSave={handleSaveDomain}
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Domain
          </Button>
        </AddEditDomainDialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-headline">{domains?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Total Authorized Domains</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-secondary text-secondary-foreground rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-headline">{retailerCounts.size}</div>
            <div className="text-xs text-muted-foreground">Configured Retailers</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-accent/15 text-accent-foreground rounded-lg">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold font-headline">{safeCountries.length}</div>
            <div className="text-xs text-muted-foreground">Active Countries</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Country, Retailer & Domain Mappings</CardTitle>
              <CardDescription>
                During work email verification, the system matches the domain to the user's retailer and country.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search domain, retailer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              {/* Country Filter Dropdown */}
              <Select value={selectedCountryFilter} onValueChange={setSelectedCountryFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {safeCountries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Retailer Filter Dropdown */}
              <Select value={selectedRetailerFilter} onValueChange={setSelectedRetailerFilter}>
                <SelectTrigger className="h-9 w-[170px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Retailers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Retailers ({availableRetailersForFilter.length})</SelectItem>
                  {availableRetailersForFilter.map((retailer) => (
                    <SelectItem key={retailer} value={retailer}>
                      {retailer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Country</TableHead>
                <TableHead className="w-[35%]">Retailer</TableHead>
                <TableHead>Authorized Domain</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading authorized domains...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredDomains.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {domains && domains.length > 0
                      ? 'No domains match your search or filter.'
                      : 'No authorized domains configured yet. Click "Add Domain" to get started.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredDomains.map((item) => {
                const resolvedCountry =
                  item.countryName ||
                  retailerCountryMap.get(item.retailerName?.toLowerCase().trim() || '') ||
                  'Global / Unspecified';

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{resolvedCountry}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{item.retailerName || <span className="text-muted-foreground italic">Unassigned</span>}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                        @{item.domain}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <AddEditDomainDialog
                            onSave={handleSaveDomain}
                            domainData={item}
                            countries={safeCountries}
                            stores={safeStores}
                          >
                            <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left">
                              Edit
                            </button>
                          </AddEditDomainDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-destructive w-full text-left text-destructive">
                                Delete
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Authorized Domain?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>@{item.domain}</strong> for retailer{' '}
                                  <strong>{item.retailerName || 'Unassigned'}</strong> ({resolvedCountry})?
                                  Users with this email domain will no longer be able to verify employment.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDomain(item)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        {!isLoading && (
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{filteredDomains.length}</strong> of <strong>{domains?.length || 0}</strong> authorized domains
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
