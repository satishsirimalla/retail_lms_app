
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

interface StoreType {
    id: string;
    name: string;
}

function AddEditStoreTypeDialog({
    storeType,
    onSave,
    children
}: {
    storeType?: StoreType,
    onSave: (name: string, id?: string) => void,
    children: React.ReactNode
}) {
    const [name, setName] = useState(storeType?.name || '');
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        onSave(name, storeType?.id);
        setIsOpen(false);
        if (!storeType) setName('');
    };

    useEffect(() => {
        if (storeType) {
            setName(storeType.name);
        } else {
            setName('');
        }
    }, [storeType]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{storeType ? 'Edit Store Type' : 'Add a new Store Type'}</DialogTitle>
                    <DialogDescription>
                        {storeType ? 'Make changes to the store type name.' : 'Add a new store type. Click save when you\'re done.'}
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
                    <Button onClick={handleSave} disabled={!name}>Save Store Type</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ManageStoreTypesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const storeTypesCol = useMemoFirebase(() => collection(firestore, 'store_types'), [firestore]);
  const { data: storeTypes, isLoading } = useCollection<StoreType>(storeTypesCol);

  const handleSave = (name: string, id?: string) => {
    if (id) {
        const docRef = doc(firestore, 'store_types', id);
        updateDoc(docRef, { name })
            .then(() => toast({ title: "Store Type Updated" }))
            .catch(() => {
                const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { name } });
                errorEmitter.emit('permission-error', permissionError);
            });
    } else {
        const colRef = collection(firestore, 'store_types');
        addDoc(colRef, { name })
            .then(() => toast({ title: "Store Type Added", description: `"${name}" has been added.` }))
            .catch(() => {
                const permissionError = new FirestorePermissionError({ path: colRef.path, operation: 'create', requestResourceData: { name } });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
  };

  const handleDelete = (item: StoreType) => {
    const docRef = doc(firestore, 'store_types', item.id);
    deleteDoc(docRef)
        .then(() => toast({ title: "Store Type Deleted", description: `"${item.name}" has been deleted.` }))
        .catch(() => {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Manage Store Types</h1>
            <p className="text-muted-foreground">A list of all store types in the system.</p>
        </div>
        <AddEditStoreTypeDialog onSave={handleSave}>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Store Type</Button>
        </AddEditStoreTypeDialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Store Types</CardTitle>
          <CardDescription>View and manage all store types available for user selection.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>}
              {!isLoading && storeTypes?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">No store types found.</TableCell></TableRow>}
              {storeTypes?.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <AddEditStoreTypeDialog onSave={handleSave} storeType={item}>
                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">Edit</button>
                            </AddEditStoreTypeDialog>
                             <AlertDialog>
                              <AlertDialogTrigger asChild><button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive">Delete</button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This action will permanently delete: <strong>{item.name}</strong>.</AlertDialogDescription>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {!isLoading && <CardFooter>
            <div className="text-xs text-muted-foreground">Showing <strong>{storeTypes?.length || 0}</strong> {storeTypes?.length === 1 ? 'store type' : 'store types'}</div>
        </CardFooter>}
      </Card>
    </div>
  );
}
