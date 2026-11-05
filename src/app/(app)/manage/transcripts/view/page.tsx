
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Loader2, Filter, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
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

type SortDirection = 'ascending' | 'descending';
interface SortConfig {
    key: keyof LegacyTranscript | 'fullName';
    direction: SortDirection;
}


export default function ViewTranscriptsPage() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [courseFilter, setCourseFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const transcriptsCol = useMemoFirebase(() => collection(firestore, 'legacy_transcripts'), [firestore]);
    const { data: transcripts, isLoading } = useCollection<LegacyTranscript>(transcriptsCol);

    const filteredData = useMemo(() => {
        if (!transcripts) return [];
        return transcripts.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const fullName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.toLowerCase();
            const email = item.user?.email?.toLowerCase() || '';
            const courseName = item.courseName.toLowerCase();
            
            const searchMatch = !searchTerm || fullName.includes(searchLower) || email.includes(searchLower) || courseName.includes(searchLower);
            const courseMatch = courseFilter.length === 0 || courseFilter.includes(item.courseName);
            const statusMatch = statusFilter.length === 0 || statusFilter.includes(item.status);
            
            return searchMatch && courseMatch && statusMatch;
        })
    }, [transcripts, searchTerm, courseFilter, statusFilter]);

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any, bValue: any;
                if (sortConfig.key === 'fullName') {
                    aValue = `${a.user?.firstName} ${a.user?.lastName}`.toLowerCase();
                    bValue = `${b.user?.firstName} ${b.user?.lastName}`.toLowerCase();
                } else {
                    aValue = a[sortConfig.key as keyof LegacyTranscript];
                    bValue = b[sortConfig.key as keyof LegacyTranscript];
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const requestSort = (key: keyof LegacyTranscript | 'fullName') => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof LegacyTranscript | 'fullName') => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const handleFilterChange = (filterSetter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        filterSetter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
    };

    const uniqueCourses = useMemo(() => Array.from(new Set(transcripts?.map(t => t.courseName) || [])), [transcripts]);
    const uniqueStatuses = ['enrolled', 'completed'];
    
    const formatDate = (timestamp?: Timestamp) => {
        if (!timestamp) return 'N/A';
        return format(timestamp.toDate(), 'PPP');
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">View All Transcripts</h1>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by user, email, or course..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full md:w-80"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><Filter className="mr-2" /> Filter by Course</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-80 overflow-y-auto">
                            {uniqueCourses.map(c => <DropdownMenuCheckboxItem key={c} checked={courseFilter.includes(c)} onCheckedChange={() => handleFilterChange(setCourseFilter, c)}>{c}</DropdownMenuCheckboxItem>)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline"><Filter className="mr-2" /> Filter by Status</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {uniqueStatuses.map(s => <DropdownMenuCheckboxItem key={s} checked={statusFilter.includes(s)} onCheckedChange={() => handleFilterChange(setStatusFilter, s)}>{s}</DropdownMenuCheckboxItem>)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Legacy Transcripts</CardTitle>
                    <CardDescription>A complete list of all uploaded historical training records.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('fullName')}>User {getSortIndicator('fullName')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('courseName')}>Course Name {getSortIndicator('courseName')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('status')}>Status {getSortIndicator('status')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('enrolledDate')}>Enrolled {getSortIndicator('enrolledDate')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('completedDate')}>Completed {getSortIndicator('completedDate')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('performance')}>Performance {getSortIndicator('performance')}</Button></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : sortedData.length > 0 ? (
                                sortedData.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.user?.firstName} {item.user?.lastName}</div>
                                            <div className="text-sm text-muted-foreground">{item.user?.email}</div>
                                        </TableCell>
                                        <TableCell>{item.courseName}</TableCell>
                                        <TableCell>{item.status}</TableCell>
                                        <TableCell>{formatDate(item.enrolledDate)}</TableCell>
                                        <TableCell>{formatDate(item.completedDate)}</TableCell>
                                        <TableCell>{item.performance || 'N/A'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">No transcripts found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
