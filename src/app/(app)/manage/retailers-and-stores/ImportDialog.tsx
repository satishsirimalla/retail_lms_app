
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface ImportDialogProps {
  countries: { id: string; name: string }[];
  storeTypes: { id: string; name: string }[];
}

export function ImportDialog({ countries, storeTypes }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected' });
      return;
    }
    if (!firestore) return;

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            toast({ variant: 'destructive', title: 'Empty File', description: 'The selected CSV file is empty or has no data rows.' });
            setIsImporting(false);
            return;
          }

          const batch = writeBatch(firestore);
          const retailerStoresCol = collection(firestore, 'retailers_stores');
          
          const countryMap = new Map(countries.map(c => [c.name.trim().toLowerCase(), c.id]));
          const storeTypeMap = new Map(storeTypes.map(st => [st.name.trim().toLowerCase(), st.id]));
          
          let validRowCount = 0;

          results.data.forEach((row: any, index) => {
            const countryName = row.countryName?.trim().toLowerCase();
            const storeTypeName = row.storeTypeName?.trim().toLowerCase();

            const countryId = countryMap.get(countryName);
            const storeTypeId = storeTypeMap.get(storeTypeName);
            
            if (countryId && storeTypeId && row.retailerName && row.storeName && row.storeLocation && row.storeId) {
                const docRef = doc(retailerStoresCol);
                batch.set(docRef, {
                    countryId,
                    storeTypeId,
                    retailerName: row.retailerName.trim(),
                    storeName: row.storeName.trim(),
                    storeLocation: row.storeLocation.trim(),
                    storeId: row.storeId.trim(),
                });
                validRowCount++;
            } else {
                console.warn(`Skipping invalid row ${index + 2}:`, {
                    ...row,
                    _reason: "Missing or invalid countryName, storeTypeName, or other required fields.",
                    _lookup: { countryId: !!countryId, storeTypeId: !!storeTypeId }
                });
            }
          });

          if (validRowCount > 0) {
            await batch.commit();
            toast({
              title: 'Import Complete',
              description: `${validRowCount} of ${results.data.length} records were successfully imported.`,
            });
          } else {
             toast({
              variant: 'destructive',
              title: 'Import Failed',
              description: `No valid records found to import. Please check your CSV file and ensure country and store type names match existing entries.`,
            });
          }

          setIsOpen(false);
          setFile(null);
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error.message || 'An unexpected error occurred during batch commit.',
          });
        } finally {
          setIsImporting(false);
        }
      },
      error: (error: any) => {
        toast({
          variant: 'destructive',
          title: 'CSV Parsing Error',
          description: error.message,
        });
        setIsImporting(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setFile(null);
        setIsImporting(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="mr-2" /> Import Data</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Data from CSV</DialogTitle>
          <DialogDescription>
            Select a CSV file to import. The file must have the headers: countryName, storeTypeName, retailerName, storeName, storeLocation, storeId.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Input type="file" accept=".csv" onChange={handleFileChange} />
            <p className="text-xs text-muted-foreground">
                Ensure column headers in the CSV match the required fields exactly. The country and store type names must match existing entries in the database (case-insensitive).
            </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
