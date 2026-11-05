
'use client';

import type { Training } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowRight, CheckCircle } from "lucide-react";
import placeholderImageData from '@/lib/placeholder-images.json';
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, runTransaction, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import Link from "next/link";

export interface TrainingFromDB extends Omit<Training, 'launchDate' | 'endDate'> {
    launchDate?: Timestamp;
    endDate?: Timestamp;
}

interface TrainingCardProps {
    training: TrainingFromDB,
    isEnrolled: boolean,
    isCompleted: boolean
}

export function TrainingCard({ training, isEnrolled, isCompleted }: TrainingCardProps) {
  const { user, userProfile } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleEnroll = async () => {
    if (!user || !userProfile) {
        toast({ variant: "destructive", title: "You must be logged in to enroll."});
        return;
    };

    const trainingRef = doc(firestore, 'trainings', training.id);
    const enrollmentsColRef = collection(firestore, 'enrollments');

    try {
      await runTransaction(firestore, async (transaction) => {
        const trainingDoc = await transaction.get(trainingRef);
        if (!trainingDoc.exists()) {
          throw "This training does not exist anymore.";
        }
        
        const newEnrollmentRef = doc(enrollmentsColRef);

        transaction.set(newEnrollmentRef, {
            userId: user.uid,
            trainingId: training.id,
            enrolledDate: serverTimestamp(),
            status: 'enrolled',
            user: { 
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                email: userProfile.email,
                userCountry: userProfile.userCountry,
                retailerName: userProfile.retailerName,
            },
            training: { 
                title: training.title,
                thumbnailUrl: training.thumbnailUrl,
                type: training.type,
                topic: training.topic,
            }
        });
        
        const currentEnrollmentCount = trainingDoc.data().enrollmentCount || 0;
        transaction.update(trainingRef, { enrollmentCount: currentEnrollmentCount + 1 });
      });

      toast({ title: "Enrolled!", description: `You have successfully enrolled in ${training.title}.`});
    } catch (error: any) {
        toast({ variant: "destructive", title: "Enrollment failed", description: error.message });
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="relative h-48 w-full">
        <Image 
          src={training.thumbnailUrl || placeholderImageData.placeholderImages.find(i => i.id === 'training1')?.imageUrl || ''} 
          alt={training.title} 
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {isCompleted && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-white/80" />
            </div>
        )}
      </div>
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold leading-tight">{training.title}</CardTitle>
            <Badge variant={training.type === 'Online' ? 'secondary' : training.type === 'VILT' ? 'outline' : 'default'}>{training.type}</Badge>
        </div>
        <CardDescription className="text-sm line-clamp-2 pt-1">{training.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter className="flex justify-between items-center bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground font-medium">{training.duration}</p>
        {isEnrolled ? (
            <Button size="sm" asChild variant="secondary">
                <Link href={`/learn/${training.id}`}>
                    {isCompleted ? 'View' : 'Launch'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        ) : (
            <Button size="sm" onClick={handleEnroll}>
                Enroll
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
