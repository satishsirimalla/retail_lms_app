

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TrainingForm, TrainingFormData } from '../../add/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Training } from '@/lib/types';


export default function EditTrainingPage() {
    const params = useParams();
    const router = useRouter();
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
         <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Edit {training.type} Training</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Content Details</CardTitle>
                    <CardDescription>Update the form below to edit the training content.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TrainingForm
                        type={training.type}
                        onBack={() => router.push('/manage/trainings')}
                        trainingData={training}
                        trainingId={trainingId}
                    />
                </CardContent>
            </Card>
        </div>
    )

}
