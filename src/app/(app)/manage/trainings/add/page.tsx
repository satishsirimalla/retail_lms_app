

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FileUp, Monitor, Users, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';

type ContentType = 'Online' | 'ILT' | 'VILT';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  duration: z.string().optional(),
  launchDate: z.date().optional(),
  endDate: z.date().optional(),
  topic: z.string().min(1, 'Topic is required'),
  thumbnailUrl: z.string().url('Must be a valid URL'),
  contentUrl: z.string().url('Must be a valid URL').optional(),
  location: z.string().optional(),
  eventDetails: z.string().optional(),
  selfRegistration: z.boolean().default(false),
  slotsAvailable: z.coerce.number().optional(),
  hostName: z.string().optional(),
});

export type TrainingFormData = z.infer<typeof formSchema>;

export function TrainingForm({ type, onBack, trainingData: existingTrainingData, trainingId }: { type: ContentType, onBack: () => void, trainingData?: any, trainingId?: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();

  const isEditMode = !!trainingId;

  const topicsCol = useMemoFirebase(() => collection(firestore, 'topics'), [firestore]);
  const { data: topics, isLoading: topicsLoading } = useCollection<{id: string, name: string}>(topicsCol);

  const form = useForm<TrainingFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        title: existingTrainingData?.title || '',
        description: existingTrainingData?.description || '',
        duration: existingTrainingData?.duration || '',
        topic: existingTrainingData?.topic || '',
        thumbnailUrl: existingTrainingData?.thumbnailUrl || '',
        contentUrl: existingTrainingData?.contentUrl || '',
        location: existingTrainingData?.location || '',
        eventDetails: existingTrainingData?.eventDetails || '',
        selfRegistration: existingTrainingData?.selfRegistration || false,
        slotsAvailable: existingTrainingData?.slotsAvailable || 0,
        hostName: existingTrainingData?.hostName || '',
        launchDate: existingTrainingData?.launchDate?.toDate(),
        endDate: existingTrainingData?.endDate?.toDate(),
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit: SubmitHandler<TrainingFormData> = async (data) => {
    try {
        let trainingData: any = { 
            type: type,
            title: data.title,
            description: data.description,
            topic: data.topic,
            thumbnailUrl: data.thumbnailUrl,
        };

        if (type === 'Online') {
            trainingData = {
                ...trainingData,
                duration: data.duration,
                launchDate: data.launchDate,
                endDate: data.endDate,
                contentUrl: data.contentUrl,
            };
        } else if (type === 'ILT') {
            trainingData = {
                ...trainingData,
                selfRegistration: data.selfRegistration,
                slotsAvailable: data.slotsAvailable,
                location: data.location,
                hostName: data.hostName,
            };
        } else if (type === 'VILT') {
             trainingData = {
                ...trainingData,
                duration: data.duration,
                launchDate: data.launchDate,
                endDate: data.endDate,
                eventDetails: data.eventDetails,
                contentUrl: data.contentUrl,
            };
        }
        
        if(isEditMode) {
          const docRef = doc(firestore, 'trainings', trainingId);
          await updateDoc(docRef, trainingData);
          toast({
              title: 'Training Updated!',
              description: `${data.title} has been successfully updated.`,
          });

        } else {
           trainingData.enrollmentCount = 0;
           await addDoc(collection(firestore, 'trainings'), trainingData);
           toast({
               title: 'Training Created!',
               description: `${data.title} has been successfully created.`,
           });
        }
        
        router.push('/manage/trainings');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error saving training',
            description: error.message,
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Content Title</FormLabel><FormControl><Input placeholder="e.g., Mastering Pixel 9 Pro" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          {type !== 'ILT' && (
            <FormField control={form.control} name="duration" render={({ field }) => (
              <FormItem><FormLabel>Duration</FormLabel><FormControl><Input placeholder="e.g., 45 minutes" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          )}
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Content Description</FormLabel><FormControl><Textarea placeholder="Describe the course content..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        
        {type !== 'ILT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="launchDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Launch Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                      </FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover>
                  <FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>End Date (Optional)</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                      </FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover>
                  <FormMessage /></FormItem>
              )}/>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="topic" render={({ field }) => (
                <FormItem><FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={topicsLoading}>
                        <FormControl><SelectTrigger><SelectValue placeholder={topicsLoading ? "Loading topics...": "Select a topic"} /></SelectTrigger></FormControl>
                        <SelectContent>{topics?.map(topic => <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>)}</SelectContent>
                    </Select>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (
                <FormItem><FormLabel>Thumbnail Image URL</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        {type === 'Online' && (
            <FormField control={form.control} name="contentUrl" render={({ field }) => (
                <FormItem><FormLabel>Content URL (YouTube, Document, etc.)</FormLabel><FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        )}

        {type === 'ILT' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Google HQ, Mountain View, CA" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="hostName" render={({ field }) => (
                    <FormItem><FormLabel>Host Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="slotsAvailable" render={({ field }) => (
                  <FormItem><FormLabel>Slots Available</FormLabel><FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField
                control={form.control}
                name="selfRegistration"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                          <FormLabel className="text-base">Self Registration</FormLabel>
                          <p className="text-sm text-muted-foreground">
                              Allow users to register themselves.
                          </p>
                      </div>
                      <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        {type === 'VILT' && (
          <>
            <FormField control={form.control} name="eventDetails" render={({ field }) => (
                <FormItem><FormLabel>Event Details</FormLabel><FormControl><Textarea placeholder="Add details about the event, agenda, prerequisites, etc." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contentUrl" render={({ field }) => (
                <FormItem><FormLabel>Meeting URL</FormLabel><FormControl><Input placeholder="https://meet.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
        )}
        
        <CardFooter className="px-0 pt-6 flex justify-between">
          <Button variant="outline" onClick={onBack} type="button">Back</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Content"}</Button>
        </CardFooter>
      </form>
    </Form>
  );
}


export default function AddTrainingPage() {
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const router = useRouter();

  const contentTypeOptions = [
    { type: 'Online' as ContentType, title: 'Online Content', description: 'Link to external files, videos, or web pages.', icon: Monitor },
    { type: 'ILT' as ContentType, title: 'Instructor-Led Training', description: 'In-person, physical location-based training event.', icon: Users },
    { type: 'VILT' as ContentType, title: 'Virtual Instructor-Led Training', description: 'Live, online training session with an instructor.', icon: Video },
  ];

  if (contentType) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold font-headline">Create New {contentType} Training</h1>
        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
            <CardDescription>Fill out the form below to create the new training content.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrainingForm type={contentType} onBack={() => setContentType(null)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Create New Content</h1>
      <Card>
        <CardHeader>
          <CardTitle>Choose Content Type</CardTitle>
          <CardDescription>What kind of training content would you like to create?</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          {contentTypeOptions.map(option => (
            <Card
              key={option.type}
              onClick={() => setContentType(option.type)}
              className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-200 flex flex-col"
            >
              <CardHeader className="flex-1">
                <div className="flex items-center gap-4">
                  <option.icon className="w-8 h-8 text-primary" />
                  <CardTitle>{option.title}</CardTitle>
                </div>
                <CardDescription className="pt-2">{option.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
