
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, writeBatch, doc, Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Papa from "papaparse";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Filter, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

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

interface TranscriptRow {
  'Course Name': string;
  'Enrolled Date': string;
  'Completion Date'?: string;
  'Status': 'enrolled' | 'completed';
  'Performance'?: string;
}

function ImportTranscriptDialog({ selectedUser }: { selectedUser: UserProfile }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<TranscriptRow[]>([]);
    const { toast } = useToast();
    const firestore = useFirestore();
    const [courseFilter, setCourseFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const selectedFile = event.target.files[0];
            setFile(selectedFile);
            Papa.parse<TranscriptRow>(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if(results.errors.length > 0) {
                        toast({ variant: 'destructive', title: 'CSV Parsing Error', description: results.errors.map(e => e.message).join(', ') });
                        return;
                    }
                    setParsedData(results.data);
                },
                error: (error) => toast({ variant: 'destructive', title: 'CSV Error', description: error.message }),
            });
        }
    };

    const handleImport = async () => {
        if (parsedData.length === 0) {
            toast({ variant: 'destructive', title: 'No data to import' });
            return;
        }
        setIsImporting(true);
        const batch = writeBatch(firestore);
        const legacyTranscriptsCol = collection(firestore, 'legacy_transcripts');

        parsedData.forEach(row => {
            const docRef = doc(legacyTranscriptsCol);
            const transcriptData = {
                userId: selectedUser.uid,
                user: {
                    firstName: selectedUser.firstName,
                    lastName: selectedUser.lastName,
                    email: selectedUser.email,
                },
                courseName: row['Course Name'],
                enrolledDate: new Date(row['Enrolled Date']),
                completedDate: row['Completion Date'] ? new Date(row['Completion Date']) : null,
                status: row['Status'],
                performance: row['Performance'] || null,
            };
            batch.set(docRef, transcriptData);
        });

        try {
            await batch.commit();
            toast({ title: 'Import Successful', description: `${parsedData.length} records imported.` });
            setIsOpen(false);
            setFile(null);
            setParsedData([]);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        } finally {
            setIsImporting(false);
        }
    };
    
    const uniqueCourses = useMemo(() => Array.from(new Set(parsedData.map(item => item['Course Name']))), [parsedData]);
    const uniqueStatuses = useMemo(() => Array.from(new Set(parsedData.map(item => item.Status))), [parsedData]);

    const handleFilterChange = (filterSetter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        filterSetter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
    }

    const filteredData = useMemo(() => {
        return parsedData.filter(item => {
            const courseMatch = courseFilter.length === 0 || courseFilter.includes(item['Course Name']);
            const statusMatch = statusFilter.length === 0 || statusFilter.includes(item.Status);
            return courseMatch && statusMatch;
        });
    }, [parsedData, courseFilter, statusFilter]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button disabled={!selectedUser}><Upload className="mr-2 h-4 w-4" /> Upload Transcript</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Import Transcript for {selectedUser.firstName} {selectedUser.lastName}</DialogTitle>
                    <DialogDescription>
                        Select a CSV file with columns: Course Name, Enrolled Date, Completion Date, Status, Performance.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Input type="file" accept=".csv" onChange={handleFileChange} />
                    {parsedData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Preview Data</CardTitle>
                                    <div className="flex gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Course</Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => setCourseFilter([])}>All Courses</DropdownMenuItem><DropdownMenuSeparator />
                                                {uniqueCourses.map(c => <DropdownMenuCheckboxItem key={c} checked={courseFilter.includes(c)} onCheckedChange={() => handleFilterChange(setCourseFilter, c)}>{c}</DropdownMenuCheckboxItem>)}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Status</Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => setStatusFilter([])}>All Statuses</DropdownMenuItem><DropdownMenuSeparator />
                                                {uniqueStatuses.map(s => <DropdownMenuCheckboxItem key={s} checked={statusFilter.includes(s)} onCheckedChange={() => handleFilterChange(setStatusFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Course Name</TableHead>
                                            <TableHead>Enrolled</TableHead>
                                            <TableHead>Completed</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Performance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{row['Course Name']}</TableCell>
                                                <TableCell>{row['Enrolled Date']}</TableCell>
                                                <TableCell>{row['Completion Date'] || 'N/A'}</TableCell>
                                                <TableCell>{row.Status}</TableCell>
                                                <TableCell>{row.Performance || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={isImporting || parsedData.length === 0}>
                        {isImporting && <Loader2 className="mr-2 animate-spin" />}
                        Import Data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ExistingTranscripts({ userId, userName }: { userId: string, userName: string }) {
    const firestore = useFirestore();
    const transcriptsQuery = useMemoFirebase(() => query(collection(firestore, 'legacy_transcripts'), where('userId', '==', userId)), [firestore, userId]);
    const { data: transcripts, isLoading } = useCollection<LegacyTranscript>(transcriptsQuery);

    const formatDate = (timestamp?: Timestamp) => {
        if (!timestamp) return 'N/A';
        return format(timestamp.toDate(), 'PPP');
    }

    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><User /> Existing Legacy Transcripts</CardTitle>
                <CardDescription>
                    A list of historical training records for <strong>{userName}</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : !transcripts || transcripts.length === 0 ? (
                    <div className='text-center text-muted-foreground py-12'>
                        <p>No legacy transcripts found for this user.</p>
                    </div>
                ) : (
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
                                    <TableCell>{item.courseName}</TableCell>
                                    <TableCell>{item.status}</TableCell>
                                    <TableCell>{formatDate(item.enrolledDate)}</TableCell>
                                    <TableCell>{formatDate(item.completedDate)}</TableCell>
                                    <TableCell>{item.performance || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

export default function UploadTranscriptsPage() {
    const firestore = useFirestore();
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    
    const usersCol = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCol);

    const userOptions = useMemo(() => {
        if (!users) return [];
        return users.map(user => ({
            value: user.uid,
            label: `${user.firstName} ${user.lastName} (${user.email})`
        }));
    }, [users]);
    
    const selectedUser = useMemo(() => {
        return users?.find(u => u.uid === selectedUserId);
    }, [users, selectedUserId]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Upload User Transcripts</h1>
                    <p className="text-muted-foreground">Upload and manage historical training data for users.</p>
                </div>
                {selectedUser && <ImportTranscriptDialog selectedUser={selectedUser} />}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select a User</CardTitle>
                    <CardDescription>Choose a user to view or upload their transcript data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md">
                        <Combobox
                            options={userOptions}
                            value={selectedUserId}
                            onChange={setSelectedUserId}
                            placeholder="Search for a user..."
                            disabled={usersLoading}
                        />
                    </div>
                </CardContent>
            </Card>

            {selectedUser && (
                <ExistingTranscripts userId={selectedUser.uid} userName={`${selectedUser.firstName} ${selectedUser.lastName}`} />
            )}
        </div>
    );
}
