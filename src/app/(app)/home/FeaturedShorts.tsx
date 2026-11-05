
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import shortsData from '@/lib/youtube-shorts.json';

interface YouTubeShort {
    id: string;
    videoId: string;
    title: string;
}

const shorts: YouTubeShort[] = shortsData.shorts;

function YouTubeShort({ videoId, title }: { videoId: string; title: string }) {
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-[9/16] w-full">
            <iframe
                src={embedUrl}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
            ></iframe>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeaturedShorts() {
  if (!shorts || shorts.length === 0) {
    return null;
  }

  return (
    <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Featured Shorts</h2>
        <Carousel
            opts={{
            align: "start",
            loop: true,
            }}
            className="w-full"
        >
            <CarouselContent>
                {shorts.map(short => (
                    <CarouselItem key={short.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                        <YouTubeShort videoId={short.videoId} title={short.title} />
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="ml-12" />
            <CarouselNext className="mr-12" />
        </Carousel>
    </section>
  );
}
