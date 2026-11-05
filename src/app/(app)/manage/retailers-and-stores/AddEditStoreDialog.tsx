
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Globe, PlusCircle, Star } from 'lucide-react';
import type { RetailerStore } from './page';

interface Country {
  id: string;
  name: string;
}
interface StoreType {
  id: string;
  name: string;
}

const formSchema = z.object({
  countryId: z.string().min(1, 'Country is required.'),
  storeTypeId: z.string().min(1, 'Store type is required.'),
  retailerName: z.string().min(1, 'Retailer name is required.'),
  storeName: z.string().min(1, 'Store name is required.'),
  storeLocation: z.string().min(1, 'Store location is required.'),
  storeId: z.string().min(1, 'Store ID is required.'),
});

type FormData = z.infer<typeof formSchema>;

interface AddEditStoreDialogProps {
    countries: Country[];
    storeTypes: StoreType[];
    storeData?: RetailerStore;
    children?: React.ReactNode;
}

export function AddEditStoreDialog({ countries, storeTypes, storeData, children }: AddEditStoreDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const isEditMode = !!storeData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countryId: storeData?.countryId || '',
      storeTypeId: storeData?.storeTypeId || '',
      retailerName: storeData?.retailerName || '',
      storeName: storeData?.storeName || '',
      storeLocation: storeData?.storeLocation || '',
      storeId: storeData?.storeId || '',
    },
  });
  
  useEffect(() => {
    form.reset({
      countryId: storeData?.countryId || '',
      storeTypeId: storeData?.storeTypeId || '',
      retailerName: storeData?.retailerName || '',
      storeName: storeData?.storeName || '',
      storeLocation: storeData?.storeLocation || '',
      storeId: storeData?.storeId || '',
    });
  }, [storeData, form, isOpen]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditMode && storeData) {
        // Update existing document
        const docRef = doc(firestore, 'retailers_stores', storeData.id);
        await updateDoc(docRef, data).catch((e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: data}));
            throw e;
        });
        
        toast({ title: 'Success!', description: 'Retailer store has been updated.' });

      } else {
        // Create new document
        const colRef = collection(firestore, 'retailers_stores');
        await addDoc(colRef, data).catch((e) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: colRef.path, operation: 'create', requestResourceData: data }));
          throw e;
        });

        toast({ title: 'Success!', description: 'New retailer store has been added.' });
      }

      form.reset();
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Could not save the retailer store. Check permissions and try again.',
      });
    }
  };

  const trigger = children || (
    <Button><PlusCircle className="mr-2" /> Add New</Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Retailer and Store</DialogTitle>
          <DialogDescription>{isEditMode ? 'Edit the retailer, store, and location details.' : 'Add a new retailer and store in one go.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="countryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><div className='flex items-center gap-2'><Globe className='h-4 w-4 text-primary'/><SelectValue placeholder="Select Country" /></div></SelectTrigger></FormControl>
                    <SelectContent>{countries?.map((country) => (<SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="storeTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><div className='flex items-center gap-2'><Star className='h-4 w-4 text-primary fill-current'/><SelectValue placeholder="Select Store Type" /></div></SelectTrigger></FormControl>
                    <SelectContent>{storeTypes?.map((type) => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            
            <div className="space-y-4 rounded-md border p-4">
              <FormField control={form.control} name="retailerName" render={({ field }) => (
                <FormItem className="grid grid-cols-3 items-center gap-4">
                  <FormLabel className="text-right">Retailer</FormLabel>
                  <FormControl className="col-span-2"><Input placeholder="Enter retailer name" {...field} /></FormControl>
                  <FormMessage className="col-span-3 col-start-2" />
                </FormItem>
              )}/>
              <FormField control={form.control} name="storeName" render={({ field }) => (
                <FormItem className="grid grid-cols-3 items-center gap-4">
                  <FormLabel className="text-right">Store Name</FormLabel>
                  <FormControl className="col-span-2"><Input placeholder="Enter store name" {...field} /></FormControl>
                  <FormMessage className="col-span-3 col-start-2" />
                </FormItem>
              )}/>
              <FormField control={form.control} name="storeLocation" render={({ field }) => (
                <FormItem className="grid grid-cols-3 items-center gap-4">
                  <FormLabel className="text-right">Store Location</FormLabel>
                  <FormControl className="col-span-2"><Input placeholder="Enter store location (full address)" {...field} /></FormControl>
                  <FormMessage className="col-span-3 col-start-2" />
                </FormItem>
              )}/>
              <FormField control={form.control} name="storeId" render={({ field }) => (
                <FormItem className="grid grid-cols-3 items-center gap-4">
                  <FormLabel className="text-right">Store ID</FormLabel>
                  <FormControl className="col-span-2"><Input placeholder="Enter unique store ID" {...field} /></FormControl>
                  <FormMessage className="col-span-3 col-start-2" />
                </FormItem>
              )}/>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
