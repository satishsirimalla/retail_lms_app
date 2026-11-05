import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function ChampionsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Champions Program</h1>
      <Card className="text-center py-20">
        <CardHeader>
          <div className="mx-auto bg-muted rounded-full p-4 w-fit">
            <Trophy className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">Welcome, Champion!</CardTitle>
          <CardDescription>Your hub for exclusive rewards, leaderboards, and challenges is under construction.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Get ready to climb the ranks!</p>
        </CardContent>
      </Card>
    </div>
  );
}
