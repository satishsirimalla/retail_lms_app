'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp } from "firebase/firestore";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileClock, Loader2 } from "lucide-react";

interface LegacyTranscript {
    id: string;
    userId: string;
    courseName: string;
    enrolledDate: Timestamp;
    completedDate?: Timestamp;
    status: 'enrolled' | 'completed';
    performance?: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
    }
}

export default function MyLegacyTranscriptsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    const transcriptsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, 'legacy_transcripts'), where('userId', '==', user.uid)) : null, 
    [firestore, user]);
    const { data: transcripts, isLoading } = useCollection<LegacyTranscript>(transcriptsQuery);
    
    const formatDate = (timestamp?: Timestamp) => {
        if (!timestamp) return 'N/A';
        return format(timestamp.toDate(), 'PPP');
    }

    if (isLoading) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold font-headline">Legacy Transcripts</h1>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!transcripts || transcripts.length === 0) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold font-headline">Legacy Transcripts</h1>
                <Card className="text-center py-20">
                    <CardHeader>
                        <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                            <FileClock className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <CardTitle className="mt-4">No Legacy Transcripts Found</CardTitle>
                        <CardDescription>We couldn't find any historical training records for your account.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
  
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Legacy Transcripts</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>My Historical Records</CardTitle>
                    <CardDescription>A list of your completed trainings from previous systems.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Course Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Enrolled</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Performance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transcripts.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.courseName}</TableCell>
                                    <TableCell>{item.status}</TableCell>
                                    <TableCell>{formatDate(item.enrolledDate)}</TableCell>
                                    <TableCell>{formatDate(item.completedDate)}</TableCell>
                                    <TableCell>{item.performance || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{transcripts.length}</strong> {transcripts.length === 1 ? 'record' : 'records'}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
