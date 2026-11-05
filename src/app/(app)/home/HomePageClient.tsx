
'use client';

import { useAuth } from "@/contexts/AuthContext";
import type { Enrollment, Training } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowRight, Lock, CheckCircle } from "lucide-react";
import placeholderImageData from '@/lib/placeholder-images.json';
import { Badge } from "@/components/ui/badge";
import FeaturedShorts from "./FeaturedShorts";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp, query, where, orderBy } from "firebase/firestore";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainingCard, type TrainingFromDB } from "@/components/trainings/TrainingCard";


function VipContent() {
    const vipImage = placeholderImageData.placeholderImages.find(i => i.id === 'vip-content');
    return (
        <section>
            <h2 className="text-2xl font-bold font-headline mb-4">VIP Content</h2>
             <Card className="overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                 <div className="grid md:grid-cols-2">
                    <div className="p-6 flex flex-col justify-center">
                        <CardHeader>
                            <Badge variant="destructive" className="w-fit">Exclusive Access</Badge>
                            <CardTitle className="text-2xl font-bold mt-2">Early Product Previews</CardTitle>
                            <CardDescription className="mt-2">As a verified employee, get a sneak peek at unreleased products and features before anyone else.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button>Explore Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        </CardFooter>
                    </div>
                    {vipImage && <div className="relative h-64 md:h-full min-h-[200px]">
                        <Image src={vipImage.imageUrl} alt="Exclusive Content" layout="fill" className="object-cover" data-ai-hint={vipImage.imageHint} />
                    </div>}
                 </div>
            </Card>
        </section>
    );
}

export function HomePageClient() {
    const { user, isVerified } = useAuth();
    const firestore = useFirestore();

    const trainingsQuery = useMemoFirebase(() => query(collection(firestore, 'trainings'), orderBy('launchDate', 'desc')), [firestore]);
    const { data: trainings, isLoading: trainingsLoading } = useCollection<TrainingFromDB>(trainingsQuery);

    const enrollmentsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid)) : null, [firestore, user]);
    const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

    const enrollmentStatusByTrainingId = new Map(enrollments?.map(e => [e.trainingId, e.status]) || []);

    const isLoading = trainingsLoading || enrollmentsLoading;
    
    return (
        <div className="space-y-12">
            <section>
                <h2 className="text-2xl font-bold font-headline mb-4">Available Trainings</h2>
                 {isLoading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i}>
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
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {trainings?.slice(0, 4).map(training => (
                                <TrainingCard 
                                    key={training.id} 
                                    training={training}
                                    isEnrolled={enrollmentStatusByTrainingId.has(training.id)}
                                    isCompleted={enrollmentStatusByTrainingId.get(training.id) === 'completed'}
                                />
                            ))}
                        </div>
                         {trainings && trainings.length > 4 && (
                            <div className="text-center">
                                <Button asChild variant="outline">
                                    <Link href="/explore">
                                        Explore More
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </section>
            
            <FeaturedShorts />

            {isVerified && <VipContent />}
        </div>
    );
}
