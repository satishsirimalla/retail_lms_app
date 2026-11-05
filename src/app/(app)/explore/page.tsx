
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, where } from 'firebase/firestore';
import type { Enrollment, Training, Topic } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import { TrainingCard, type TrainingFromDB } from '@/components/trainings/TrainingCard';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface GroupedTrainings {
    [topic: string]: TrainingFromDB[];
}

export default function ExplorePage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    const topicsCol = useMemoFirebase(() => collection(firestore, 'topics'), [firestore]);
    const { data: topics, isLoading: topicsLoading } = useCollection<Topic>(topicsCol);

    const trainingsCol = useMemoFirebase(() => collection(firestore, 'trainings'), [firestore]);
    const { data: trainings, isLoading: trainingsLoading } = useCollection<TrainingFromDB>(trainingsCol);

    const enrollmentsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid)) : null, [firestore, user]);
    const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

    const enrollmentStatusByTrainingId = new Map(enrollments?.map(e => [e.trainingId, e.status]) || []);

    const groupedTrainings = useMemo(() => {
        if (!trainings) return {};
        return trainings.reduce((acc, training) => {
            const topic = training.topic || 'General';
            if (!acc[topic]) {
                acc[topic] = [];
            }
            acc[topic].push(training);
            return acc;
        }, {} as GroupedTrainings);
    }, [trainings]);

    const isLoading = topicsLoading || trainingsLoading || enrollmentsLoading;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Explore Courses</h1>
            {isLoading ? (
                <div className="space-y-8">
                    {[...Array(2)].map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-8 w-1/4 mb-4" />
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {[...Array(4)].map((_, j) => (
                                    <Card key={j}>
                                        <Skeleton className="h-48 w-full" />
                                        <CardHeader>
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </CardHeader>
                                        <CardContent className="flex-grow" />
                                        <CardFooter className="flex justify-between items-center p-4">
                                            <Skeleton className="h-5 w-1/4" />
                                            <Skeleton className="h-9 w-1/3" />
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : topics?.map(topic => (
                <section key={topic.id}>
                    <h2 className="text-2xl font-bold font-headline mb-4">{topic.name}</h2>
                    {groupedTrainings[topic.name] && groupedTrainings[topic.name].length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {groupedTrainings[topic.name].map(training => (
                                <TrainingCard
                                    key={training.id}
                                    training={training}
                                    isEnrolled={enrollmentStatusByTrainingId.has(training.id)}
                                    isCompleted={enrollmentStatusByTrainingId.get(training.id) === 'completed'}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No courses available in this topic yet.</p>
                    )}
                </section>
            ))}
        </div>
    );
}
