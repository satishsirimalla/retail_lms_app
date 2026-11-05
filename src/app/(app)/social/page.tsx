
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Post } from '@/lib/types';
import { CreatePostForm } from './CreatePostForm';
import { PostCard } from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

function PostSkeleton() {
    return (
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                </div>
            </div>
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-3/4 mt-2" />
            <div className="flex items-center gap-4 mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
            </div>
        </Card>
    )
}

export default function SocialPage() {
  const { isVerified } = useAuth();
  const firestore = useFirestore();

  const postsQuery = useMemoFirebase(
    () => query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  const { data: posts, isLoading } = useCollection<Post>(postsQuery);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold font-headline">Community Feed</h1>
        <p className="text-muted-foreground">Connect with other sales champions, share tips, and build your network.</p>
      </div>
      
      {isVerified ? (
        <CreatePostForm />
      ) : (
        <Card className="text-center p-6">
            <div className="mx-auto bg-muted rounded-full p-3 w-fit">
                <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">Join the Conversation</h3>
            <p className="text-muted-foreground text-sm mt-1">Verify your employment to post, comment, and like.</p>
        </Card>
      )}

      <div className="space-y-6">
        {isLoading && (
            <>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
            </>
        )}
        {posts?.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
         {!isLoading && posts?.length === 0 && (
            <Card className="text-center p-12">
                 <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
            </Card>
        )}
      </div>
    </div>
  );
}
