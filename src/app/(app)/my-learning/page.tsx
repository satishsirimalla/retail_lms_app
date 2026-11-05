
'use client';

import { useAuth } from "@/contexts/AuthContext";
import type { Enrollment, Training } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowRight, BookOpen, CheckCircle, Clock } from "lucide-react";
import placeholderImageData from '@/lib/placeholder-images.json';
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { format } from "date-fns";

interface TrainingCardProps {
    enrollment: Enrollment;
}

function TrainingCard({ enrollment }: TrainingCardProps) {
    const training = enrollment.training as Training;
    const isCompleted = enrollment.status === 'completed';

    return (
        <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <Link href={`/learn/${enrollment.trainingId}`} className="flex flex-col flex-grow">
                <div className="relative h-40 w-full">
                    <Image
                        src={training.thumbnailUrl || placeholderImageData.placeholderImages.find(i => i.id === 'training1')?.imageUrl || ''}
                        alt={training.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    {isCompleted && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <CheckCircle className="h-12 w-12 text-white/80" />
                        </div>
                    )}
                </div>
                <CardHeader className="flex-grow">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-bold leading-tight">{training.title}</CardTitle>
                        <Badge variant={training.type === 'Online' ? 'secondary' : training.type === 'VILT' ? 'outline' : 'default'}>{training.type}</Badge>
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground p-4">
                     {training.duration && <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{training.duration}</span></div>}
                     {isCompleted && enrollment.completedDate && (
                         <div className="flex items-center gap-1 font-semibold text-green-600">
                             <CheckCircle className="h-3 w-3" />
                             <span>Completed: {format(enrollment.completedDate.toDate(), 'PP')}</span>
                         </div>
                     )}
                </CardFooter>
            </Link>
        </Card>
    );
}

export default function MyLearningPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    const enrollmentsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid)) : null, [firestore, user]);
    const { data: enrollments, isLoading } = useCollection<Enrollment>(enrollmentsQuery);

    const { inProgressCourses, completedCourses, completionPercentage } = useMemo(() => {
        if (!enrollments) {
            return { inProgressCourses: [], completedCourses: [], completionPercentage: 0 };
        }
        const inProgress = enrollments.filter(e => e.status === 'enrolled');
        const completed = enrollments.filter(e => e.status === 'completed');
        const percentage = enrollments.length > 0 ? (completed.length / enrollments.length) * 100 : 0;
        return { inProgressCourses: inProgress, completedCourses: completed, completionPercentage: percentage };
    }, [enrollments]);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold font-headline">My Learning</h1>
                 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <Skeleton className="h-40 w-full" />
                            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                            <CardFooter><Skeleton className="h-4 w-1/2" /></CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (!enrollments || enrollments.length === 0) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold font-headline">My Learning</h1>
                <Card className="text-center py-20">
                    <CardHeader>
                        <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                            <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <CardTitle className="mt-4">No Courses Yet</CardTitle>
                        <CardDescription>You haven't enrolled in any courses. Explore the home page to find your next learning adventure!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/home">Explore Courses</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
  
    return (
        <div className="space-y-12">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Learning</h1>
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>My Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Progress value={completionPercentage} className="w-full" />
                            <span className="font-bold text-lg whitespace-nowrap">{Math.round(completionPercentage)}% Complete</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">You have completed {completedCourses.length} out of {enrollments.length} enrolled courses.</p>
                    </CardContent>
                </Card>
            </div>

            {inProgressCourses.length > 0 && (
                 <div>
                    <h2 className="text-2xl font-bold font-headline mb-4">In Progress</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {inProgressCourses.map(enrollment => (
                            enrollment.training && <TrainingCard key={enrollment.id} enrollment={enrollment} />
                        ))}
                    </div>
                </div>
            )}

            {completedCourses.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold font-headline mb-4">Completed</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {completedCourses.map(enrollment => (
                           enrollment.training && <TrainingCard key={enrollment.id} enrollment={enrollment} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
