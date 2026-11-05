
'use client';

import { useParams } from "next/navigation";
import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, Timestamp, writeBatch, runTransaction, query, where } from "firebase/firestore";
import type { Training, Enrollment } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import placeholderImageData from '@/lib/placeholder-images.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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

//new

function EnrollmentsTab({ trainingId }: { trainingId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const enrollmentsQuery = useMemoFirebase(() => query(collection(firestore, 'enrollments'), where('trainingId', '==', trainingId)), [firestore, trainingId]);
    const { data: enrollments, isLoading } = useCollection<Enrollment>(enrollmentsQuery);

    const isAllSelected = enrollments ? selectedUsers.length === enrollments.length && enrollments.length > 0 : false;
    const isSomeSelected = enrollments ? selectedUsers.length > 0 && selectedUsers.length < enrollments.length : false;

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true && enrollments) {
            setSelectedUsers(enrollments.map(e => e.id));
        } else {
            setSelectedUsers([]);
        }
    };
    
    const handleUnenroll = async () => {
        if (selectedUsers.length === 0) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                const trainingRef = doc(firestore, 'trainings', trainingId);
                const trainingDoc = await transaction.get(trainingRef);

                if (!trainingDoc.exists()) {
                    throw new Error("Training does not exist.");
                }

                const currentEnrollmentCount = trainingDoc.data().enrollmentCount || 0;
                const newEnrollmentCount = currentEnrollmentCount - selectedUsers.length;

                const deleteBatch = writeBatch(firestore);
                selectedUsers.forEach(enrollmentId => {
                    const enrollmentRef = doc(firestore, 'enrollments', enrollmentId);
                    deleteBatch.delete(enrollmentRef);
                });
                await deleteBatch.commit();
                
                transaction.update(trainingRef, { enrollmentCount: newEnrollmentCount < 0 ? 0 : newEnrollmentCount });
            });

            toast({
                title: "Success",
                description: `${selectedUsers.length} user(s) have been unenrolled.`
            });
            setSelectedUsers([]);
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Unenrollment failed",
                description: error.message
            });
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        // Firestore Timestamps have a toDate() method
        if (typeof timestamp.toDate === 'function') {
            return format(timestamp.toDate(), 'PPP');
        }
        // Fallback for other date objects (though Firestore should provide Timestamps)
        try {
            return format(new Date(timestamp), 'PPP');
        } catch (e) {
            return 'Invalid Date';
        }
    };
    
    if (isLoading) {
        return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Enrolled Users</CardTitle>
                <CardDescription>
                    A list of users currently enrolled in this training.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {selectedUsers.length > 0 && (
                    <div className="mb-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Unenroll Selected ({selectedUsers.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will unenroll {selectedUsers.length} user(s) from this training. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleUnenroll}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px] text-center">
                                <Checkbox
                                    checked={isAllSelected || (isSomeSelected ? 'indeterminate' : false)}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                    disabled={!enrollments || enrollments.length === 0}
                                />
                            </TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Retailer</TableHead>
                            <TableHead>Enrolled Date</TableHead>
                            <TableHead>Completed Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrollments && enrollments.length > 0 ? enrollments.map(enrollment => (
                            <TableRow key={enrollment.id}>
                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={selectedUsers.includes(enrollment.id)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? setSelectedUsers([...selectedUsers, enrollment.id])
                                                : setSelectedUsers(selectedUsers.filter(id => id !== enrollment.id))
                                        }}
                                        aria-label="Select row"
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{enrollment.user?.firstName} {enrollment.user?.lastName}</div>
                                    <div className="text-sm text-muted-foreground">{enrollment.user?.email}</div>
                                </TableCell>
                                <TableCell>{enrollment.user?.userCountry || 'N/A'}</TableCell>
                                <TableCell>{enrollment.user?.retailerName || 'N/A'}</TableCell>
                                <TableCell>{formatDate(enrollment.enrolledDate)}</TableCell>
                                <TableCell>{enrollment.completedDate ? formatDate(enrollment.completedDate) : 'In Progress'}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">No users enrolled yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            {enrollments && enrollments.length > 0 && (
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{enrollments.length}</strong> {enrollments.length === 1 ? 'enrollment' : 'enrollments'}
                    </div>
                </CardFooter>
            )}
        </Card>
    )
}

export default function TrainingDetailPage() {
    const params = useParams();
    const trainingId = params.trainingId as string;
    const firestore = useFirestore();

    const trainingDocRef = useMemoFirebase(() => doc(firestore, 'trainings', trainingId), [firestore, trainingId]);
    const { data: training, isLoading } = useDoc<Training>(trainingDocRef);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (!training) {
        return <div>Training not found</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden">
                <div className="relative h-64 w-full md:h-80">
                    <Image
                        src={training.thumbnailUrl || placeholderImageData.placeholderImages.find(i => i.id === 'training1')?.imageUrl || ''}
                        alt={training.title}
                        fill
                        priority
                        className="object-cover"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                 <CardHeader className="relative -mt-20 z-10 p-6 md:p-8">
                     <Badge variant={training.type === 'Online' ? 'secondary' : training.type === 'VILT' ? 'outline' : 'default'} className="w-fit">
                        {training.type}
                    </Badge>
                    <CardTitle className="text-3xl font-bold font-headline text-white drop-shadow-md">{training.title}</CardTitle>
                    <CardDescription className="text-gray-200 text-base">{training.topic}</CardDescription>
                </CardHeader>
            </Card>

             <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>{training.description}</p>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                {training.duration && <div><strong>Duration:</strong> {training.duration}</div>}
                                {training.launchDate && <div><strong>Launch Date:</strong> {format(training.launchDate.toDate(), 'PPP')}</div>}
                                {training.location && <div><strong>Location:</strong> {training.location}</div>}
                                {training.hostName && <div><strong>Host:</strong> {training.hostName}</div>}
                                {training.slotsAvailable && <div><strong>Slots:</strong> {training.slotsAvailable}</div>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="enrollments">
                   <EnrollmentsTab trainingId={trainingId} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
