
'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Upload, Download, Filter, MoreHorizontal, Edit, Trash2, ArrowUpDown } from 'lucide-react';
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
import { AddEditStoreDialog } from './AddEditStoreDialog';
import { useToast } from '@/hooks/use-toast';
import { ImportDialog } from './ImportDialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Country {
  id: string;
  name: string;
}
interface StoreType {
  id: string;
  name: string;
}

export interface RetailerStore {
  id: string;
  countryId: string;
  storeTypeId: string;
  retailerName: string;
  storeName: string;
  storeLocation: string;
  storeId: string;
}

interface CombinedData extends RetailerStore {
  countryName: string;
  storeTypeName: string;
}

type SortDirection = 'ascending' | 'descending';
interface SortConfig {
    key: keyof CombinedData;
    direction: SortDirection;
}

export default function ManageRetailersAndStoresPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const countriesCol = useMemoFirebase(() => collection(firestore, 'countries'), [firestore]);
  const { data: countries } = useCollection<Country>(countriesCol);

  const storeTypesCol = useMemoFirebase(() => collection(firestore, 'store_types'), [firestore]);
  const { data: storeTypes } = useCollection<StoreType>(storeTypesCol);

  const retailerStoresCol = useMemoFirebase(() => collection(firestore, 'retailers_stores'), [firestore]);
  const { data: retailerStores, isLoading } = useCollection<RetailerStore>(retailerStoresCol);
  
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [retailerFilter, setRetailerFilter] = useState<string[]>([]);
  const [storeNameFilter, setStoreNameFilter] = useState<string[]>([]);

  const combinedData: CombinedData[] = useMemo(() => {
    if (!countries || !storeTypes || !retailerStores) return [];
    
    const countryMap = new Map(countries.map(c => [c.id, c.name]));
    const storeTypeMap = new Map(storeTypes.map(st => [st.id, st.name]));

    return retailerStores.map(rs => ({
      ...rs,
      countryName: countryMap.get(rs.countryId) || 'N/A',
      storeTypeName: storeTypeMap.get(rs.storeTypeId) || 'N/A',
    }));
  }, [countries, storeTypes, retailerStores]);

  const filteredAndSortedData = useMemo(() => {
    let sortableItems = [...combinedData];

    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return sortableItems.filter(item => {
      const countryMatch = countryFilter.length === 0 || countryFilter.includes(item.countryName);
      const retailerMatch = retailerFilter.length === 0 || retailerFilter.includes(item.retailerName);
      const storeNameMatch = storeNameFilter.length === 0 || storeNameFilter.includes(item.storeName);
      return countryMatch && retailerMatch && storeNameMatch;
    });
  }, [combinedData, countryFilter, retailerFilter, storeNameFilter, sortConfig]);
  
  const requestSort = (key: keyof CombinedData) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (filterSetter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    filterSetter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  }

  const handleDelete = async (item: RetailerStore) => {
    try {
      const docRef = doc(firestore, 'retailers_stores', item.id);
      await deleteDoc(docRef).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        throw e;
      });

      toast({
        title: 'Success!',
        description: 'The retailer store has been deleted.',
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Could not delete the retailer store. Check permissions and try again.',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    const batch = writeBatch(firestore);
    selectedRows.forEach(id => {
        const docRef = doc(firestore, 'retailers_stores', id);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        toast({
            title: 'Success!',
            description: `${selectedRows.length} item(s) have been deleted.`
        });
        setSelectedRows([]);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: 'Could not delete the selected items. Please try again.'
        });
    }
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedData.map(({ id, countryId, storeTypeId, ...rest }) => rest);
    if(dataToExport.length === 0) return;
    const csv = [
      Object.keys(dataToExport[0]).join(','),
      ...dataToExport.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'retailers_and_stores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const uniqueCountries = useMemo(() => Array.from(new Set(combinedData.map(item => item.countryName))), [combinedData]);
  const uniqueRetailers = useMemo(() => Array.from(new Set(combinedData.map(item => item.retailerName))), [combinedData]);
  const uniqueStoreNames = useMemo(() => Array.from(new Set(combinedData.map(item => item.storeName))), [combinedData]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRows(filteredAndSortedData.map(item => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const isAllSelected = selectedRows.length > 0 && selectedRows.length === filteredAndSortedData.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < filteredAndSortedData.length;

  const getSortIndicator = (key: keyof CombinedData) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline">Manage Retailers and Stores</h1>
        <div className="flex flex-wrap items-center gap-2">
          {selectedRows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="destructive"><Trash2 className="mr-2"/> Delete ({selectedRows.length})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete {selectedRows.length} store record(s).
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ImportDialog countries={countries || []} storeTypes={storeTypes || []} />
          <Button variant="outline" onClick={handleExport} disabled={filteredAndSortedData.length === 0}><Download className="mr-2" /> Export Data</Button>
          <AddEditStoreDialog countries={countries || []} storeTypes={storeTypes || []}/>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline"><Filter className="mr-2" /> Filter by Country</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setCountryFilter([])}>All Countries</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {uniqueCountries.map(c => <DropdownMenuCheckboxItem key={c} checked={countryFilter.includes(c)} onCheckedChange={() => handleFilterChange(setCountryFilter, c)}>{c}</DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
              </DropdownMenu>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline"><Filter className="mr-2" /> Filter by Retailer</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setRetailerFilter([])}>All Retailers</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {uniqueRetailers.map(r => <DropdownMenuCheckboxItem key={r} checked={retailerFilter.includes(r)} onCheckedChange={() => handleFilterChange(setRetailerFilter, r)}>{r}</DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline"><Filter className="mr-2" /> Filter by Store Name</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setStoreNameFilter([])}>All Stores</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {uniqueStoreNames.map(s => <DropdownMenuCheckboxItem key={s} checked={storeNameFilter.includes(s)} onCheckedChange={() => handleFilterChange(setStoreNameFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                   <Checkbox
                        checked={isAllSelected || (isSomeSelected && 'indeterminate')}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                    />
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('countryName')} className="font-bold">Country Name {getSortIndicator('countryName')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('storeTypeName')} className="font-bold">Store Type Name {getSortIndicator('storeTypeName')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('retailerName')} className="font-bold">Retailer Name {getSortIndicator('retailerName')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('storeName')} className="font-bold">Store Name {getSortIndicator('storeName')}</Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('storeLocation')} className="font-bold">Store Location {getSortIndicator('storeLocation')}</Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('storeId')} className="font-bold">Store ID {getSortIndicator('storeId')}</Button>
                </TableHead>
                <TableHead className="font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Loading data...</TableCell></TableRow>
              ) : filteredAndSortedData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center">No data found.</TableCell></TableRow>
              ) : (
                filteredAndSortedData.map((item) => (
                  <TableRow key={item.id} data-state={selectedRows.includes(item.id) && "selected"}>
                    <TableCell className="text-center">
                        <Checkbox
                            checked={selectedRows.includes(item.id)}
                            onCheckedChange={(checked) => {
                                return checked
                                    ? setSelectedRows([...selectedRows, item.id])
                                    : setSelectedRows(selectedRows.filter(id => id !== item.id))
                            }}
                            aria-label="Select row"
                        />
                    </TableCell>
                    <TableCell>{item.countryName}</TableCell>
                    <TableCell>{item.storeTypeName}</TableCell>
                    <TableCell>{item.retailerName}</TableCell>
                    <TableCell>{item.storeName}</TableCell>
                    <TableCell>{item.storeLocation}</TableCell>
                    <TableCell>{item.storeId}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <AddEditStoreDialog
                            countries={countries || []}
                            storeTypes={storeTypes || []}
                            storeData={item}
                          >
                            <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                              <Edit className="mr-2"/> Edit
                            </button>
                          </AddEditStoreDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                <Trash2 className="mr-2"/> Delete
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the store <strong>{item.storeName}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item)}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
