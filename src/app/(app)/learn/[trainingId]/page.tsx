
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, serverTimestamp, updateDoc, writeBatch, query, where, collection, getDocs } from 'firebase/firestore';
import type { Enrollment, Training } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function StarRating({ rating, onRatingChange, disabled = false }: { rating: number, onRatingChange: (rating: number) => void, disabled?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`cursor-pointer h-8 w-8 transition-colors ${
                        rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    } ${disabled ? 'cursor-not-allowed' : ''}`}
                    onClick={() => !disabled && onRatingChange(star)}
                />
            ))}
        </div>
    );
}

function YouTubeEmbed({ url }: { url: string }) {
    const videoIdMatch = url.match(/(?:v=|\/embed\/|\/)([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) {
        return <p>Invalid YouTube URL</p>;
    }
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return (
        <div className="aspect-video w-full">
            <iframe
                src={embedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full rounded-lg"
            ></iframe>
        </div>
    );
}


function GeneralEmbed({ url }: { url: string }) {
    return (
        <div className="aspect-video w-full">
             <iframe src={url} className="w-full h-full rounded-lg border" title="Embedded Content" />
        </div>
    );
}

export default function LearnTrainingPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const trainingId = params.trainingId as string;
    const firestore = useFirestore();

    const trainingDocRef = useMemoFirebase(() => doc(firestore, 'trainings', trainingId), [firestore, trainingId]);
    const { data: training, isLoading: isTrainingLoading } = useDoc<Training>(trainingDocRef);

    const enrollmentQuery = useMemoFirebase(() => (user ? query(collection(firestore, 'enrollments'), where('userId', '==', user.uid), where('trainingId', '==', trainingId)) : null), [firestore, user, trainingId]);
    const { data: enrollments, isLoading: isEnrollmentLoading } = useCollection<Enrollment>(enrollmentQuery);
    const enrollment = enrollments?.[0];

    const [rating, setRating] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);

    const isCompleted = enrollment?.status === 'completed';

    useEffect(() => {
        if (enrollment?.rating) {
            setRating(enrollment.rating);
        }
    }, [enrollment]);


    const handleMarkComplete = async () => {
        if (!user || !enrollment) return;
        setIsCompleting(true);
        
        const enrollmentDocRef = doc(firestore, 'enrollments', enrollment.id);
        
        const completionData = {
            status: 'completed',
            completedDate: serverTimestamp(),
            rating: rating || null,
        };

        try {
            await updateDoc(enrollmentDocRef, completionData);

            toast({
                title: 'Congratulations!',
                description: 'You have completed this training.',
            });
            router.push('/my-learning');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsCompleting(false);
        }
    };
    
    const isLoading = isTrainingLoading || isEnrollmentLoading;

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!training) {
        return <div>Training not found.</div>;
    }


    const renderContent = () => {
        if (!training.contentUrl) {
            return <p>No content available for this training.</p>;
        }
        if (training.contentUrl.includes('youtube.com') || training.contentUrl.includes('youtu.be')) {
            return <YouTubeEmbed url={training.contentUrl} />;
        }
        return <GeneralEmbed url={training.contentUrl} />;
    };

    return (
        <div className="space-y-6">
             <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-bold font-headline">{training.title}</CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <Badge variant="outline">{training.topic}</Badge>
                                {training.duration && <div className="flex items-center gap-1"><Clock className="h-4 w-4" /><span>{training.duration}</span></div>}
                            </div>
                        </div>
                         <Badge variant={training.type === 'Online' ? 'secondary' : 'default'}>{training.type}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                    <p className="mt-6 text-foreground/80">{training.description}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4 border-t pt-6">
                     <h3 className="font-semibold">{isCompleted ? "Your Rating" : "Rate this training"}</h3>
                     <StarRating rating={rating} onRatingChange={setRating} disabled={isCompleted} />
                     
                     {isCompleted ? (
                        <div className="flex items-center gap-2 text-green-600 font-semibold mt-4">
                            <CheckCircle className="h-5 w-5" />
                            <span>You have completed this training.</span>
                        </div>
                     ) : (
                        <Button onClick={handleMarkComplete} disabled={isCompleting || rating === 0}>
                            {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Mark as Complete
                        </Button>
                     )}
                </CardFooter>
            </Card>
        </div>
    );
}
