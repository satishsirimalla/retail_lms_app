

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookCopy, MoreHorizontal, PlusCircle, Users } from "lucide-react";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Training {
    id: string;
    title: string;
    type: 'Online' | 'ILT' | 'VILT';
    topic: string;
    launchDate: Timestamp;
    enrollmentCount?: number;
}

export default function ManageTrainingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const trainingsCol = useMemoFirebase(() => collection(firestore, 'trainings'), [firestore]);
  const { data: trainings, isLoading } = useCollection<Training>(trainingsCol);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return format(timestamp.toDate(), 'PPP');
  }
  
  const handleDelete = async (trainingId: string, trainingTitle: string) => {
      try {
        await deleteDoc(doc(firestore, "trainings", trainingId));
        toast({
            title: "Training Deleted",
            description: `"${trainingTitle}" has been deleted.`
        });
      } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error deleting training",
            description: error.message
         })
      }
  }

  const handleRowClick = (trainingId: string) => {
    router.push(`/trainings/${trainingId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Trainings</h1>
          <p className="text-muted-foreground">Create, edit, and manage all training content.</p>
        </div>
        <Button asChild>
          <Link href="/manage/trainings/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Training
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Trainings</CardTitle>
          <CardDescription>A list of all training content in the system.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="text-center py-20">
                <p>Loading trainings...</p>
             </div>
          ) : trainings && trainings.length > 0 ? (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Launch Date</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map(training => (
                    <TableRow key={training.id} onClick={() => handleRowClick(training.id)} className="cursor-pointer">
                      <TableCell className="font-medium">{training.title}</TableCell>
                      <TableCell>
                        <Badge variant={training.type === 'Online' ? 'secondary' : training.type === 'VILT' ? 'outline' : 'default'}>
                          {training.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{training.topic}</TableCell>
                      <TableCell>{formatDate(training.launchDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Users className="h-4 w-4 text-muted-foreground"/> 
                           <span>{training.enrollmentCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild><Link href={`/manage/trainings/edit/${training.id}`}>Edit</Link></DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left text-destructive">Delete</button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the training: <strong>{training.title}</strong>.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(training.id, training.title)}>Continue</AlertDialogAction>
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
          ) : (
            <div className="text-center py-20">
              <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                  <BookCopy className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Trainings Found</h3>
              <p className="text-muted-foreground mt-2">Get started by creating a new training course.</p>
              <Button asChild className="mt-4">
                  <Link href="/manage/trainings/add"><PlusCircle className="mr-2"/>Create Training</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
