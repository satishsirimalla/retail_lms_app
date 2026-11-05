
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
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
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";

interface Country {
    id: string;
    name: string;
}

function AddEditCountryDialog({
    country,
    onSave,
    children
}: {
    country?: Country,
    onSave: (name: string, id?: string) => void,
    children: React.ReactNode
}) {
    const [name, setName] = useState(country?.name || '');
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        onSave(name, country?.id);
        setIsOpen(false);
        if (!country) setName(''); // Reset only for new entries
    };
    
    // Update name if country prop changes
    useEffect(() => {
        if (country) {
            setName(country.name);
        } else {
            setName('');
        }
    }, [country]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{country ? 'Edit Country' : 'Add a new Country'}</DialogTitle>
                    <DialogDescription>
                        {country ? 'Make changes to the country name.' : 'Add a new country to your list. Click save when you\'re done.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={!name}>Save Country</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ManageCountriesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const countriesCol = useMemoFirebase(() => collection(firestore, 'countries'), [firestore]);
  const { data: countries, isLoading } = useCollection<Country>(countriesCol);

  const handleSaveCountry = (name: string, id?: string) => {
    if (id) { // Editing
        const countryDoc = doc(firestore, 'countries', id);
        updateDoc(countryDoc, { name })
            .then(() => {
                toast({ title: "Country Updated", description: `Country has been updated to "${name}".` });
            })
            .catch(error => {
                const permissionError = new FirestorePermissionError({ path: countryDoc.path, operation: 'update', requestResourceData: { name } });
                errorEmitter.emit('permission-error', permissionError);
            });
    } else { // Adding
        const countriesCollection = collection(firestore, 'countries');
        addDoc(countriesCollection, { name })
            .then(() => {
                toast({ title: "Country Added", description: `"${name}" has been added.` });
            })
            .catch(error => {
                const permissionError = new FirestorePermissionError({ path: countriesCollection.path, operation: 'create', requestResourceData: { name } });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
  };

  const handleDeleteCountry = (country: Country) => {
    const countryDoc = doc(firestore, 'countries', country.id);
    deleteDoc(countryDoc)
        .then(() => {
            toast({ title: "Country Deleted", description: `"${country.name}" has been deleted.` });
        })
        .catch(error => {
            const permissionError = new FirestorePermissionError({ path: countryDoc.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Manage Countries</h1>
            <p className="text-muted-foreground">A list of all countries in the system.</p>
        </div>
        <AddEditCountryDialog onSave={handleSaveCountry}>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Country</Button>
        </AddEditCountryDialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Countries</CardTitle>
          <CardDescription>View and manage all countries available for user selection.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country Name</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                  </TableRow>
              )}
              {!isLoading && countries?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="text-center">No countries found.</TableCell>
                </TableRow>
              )}
              {countries?.sort((a, b) => a.name.localeCompare(b.name)).map(country => (
                <TableRow key={country.id}>
                  <TableCell className="font-medium">{country.name}</TableCell>
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
                            <AddEditCountryDialog onSave={handleSaveCountry} country={country}>
                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">
                                    Edit
                                </button>
                            </AddEditCountryDialog>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive">
                                    Delete
                                 </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the country: <strong>{country.name}</strong>.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCountry(country)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {!isLoading && <CardFooter>
            <div className="text-xs text-muted-foreground">
                Showing <strong>{countries?.length || 0}</strong> {countries?.length === 1 ? 'country' : 'countries'}
            </div>
        </CardFooter>}
      </Card>
    </div>
  );
}
