
'use client';
import { Eye, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";


export default function ManageTranscriptsPage() {
    const router = useRouter();

    const actions = [
        {
            title: "Upload Transcripts",
            description: "Upload legacy training transcripts for a specific user via CSV file.",
            icon: Upload,
            action: () => router.push('/manage/transcripts/upload')
        },
        {
            title: "View All Transcripts",
            description: "View, search, and filter all legacy transcripts uploaded to the system.",
            icon: Eye,
            action: () => router.push('/manage/transcripts/view')
        }
    ]

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Manage User Transcripts</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Transcript Tools</CardTitle>
                    <CardDescription>Choose an action to manage legacy transcript data.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {actions.map(item => (
                        <Card
                        key={item.title}
                        onClick={item.action}
                        className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-200 flex flex-col"
                        >
                            <CardHeader className="flex-1">
                                <div className="flex items-center gap-4">
                                <item.icon className="w-8 h-8 text-primary" />
                                <CardTitle>{item.title}</CardTitle>
                                </div>
                                <CardDescription className="pt-2">{item.description}</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button variant="outline">Go</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
