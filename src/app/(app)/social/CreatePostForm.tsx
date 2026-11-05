
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function CreatePostForm() {
  const { user, userProfile } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || content.trim().length === 0) return;

    setIsSubmitting(true);

    const postData = {
      authorId: user.uid,
      authorName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
      authorAvatar: userProfile.photoURL || '',
      content: content.trim(),
      createdAt: serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
    };
    
    const postsCollection = collection(firestore, 'posts');

    addDoc(postsCollection, postData)
      .then(() => {
        setContent('');
        toast({
          title: 'Post Created!',
          description: 'Your post is now live on the feed.',
        });
      })
      .catch(() => {
         const permissionError = new FirestorePermissionError({ path: postsCollection.path, operation: 'create', requestResourceData: postData });
         errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={userProfile?.photoURL || ''} alt={userProfile?.displayName} />
            <AvatarFallback>{userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <form onSubmit={handleSubmit} className="w-full">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[80px]"
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" disabled={isSubmitting || content.trim().length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post
              </Button>
            </div>
          </form>
        </div>
      </CardHeader>
    </Card>
  );
}
