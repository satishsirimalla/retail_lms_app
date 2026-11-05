
'use client';

import { useState } from 'react';
import type { Post, Comment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  runTransaction,
  where
} from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: Post;
}

function CommentSection({ post }: { post: Post }) {
    const { user, userProfile } = useAuth();
    const firestore = useFirestore();
    const [commentContent, setCommentContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const commentsQuery = useMemoFirebase(
        () => query(collection(firestore, `posts/${post.id}/comments`), orderBy('createdAt', 'asc')),
        [firestore, post.id]
    );
    const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile || commentContent.trim() === '') return;

        setIsSubmitting(true);

        const commentData = {
            authorId: user.uid,
            authorName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
            authorAvatar: userProfile.photoURL || '',
            content: commentContent.trim(),
            createdAt: serverTimestamp(),
        };

        const postRef = doc(firestore, 'posts', post.id);
        const commentsColRef = collection(firestore, `posts/${post.id}/comments`);

        runTransaction(firestore, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw new Error("Post does not exist!");
            }
            const newCommentCount = (postDoc.data().commentCount || 0) + 1;
            
            const newCommentRef = doc(commentsColRef);
            transaction.set(newCommentRef, commentData);
            transaction.update(postRef, { commentCount: newCommentCount });
        })
        .then(() => {
             setCommentContent('');
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: commentsColRef.path,
                operation: 'create',
                requestResourceData: commentData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
    };
    
    return (
        <div className="space-y-4 pt-4">
             {user && (
                 <form onSubmit={handleCommentSubmit} className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.photoURL || ''} />
                        <AvatarFallback>{userProfile?.firstName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                        <Textarea
                            placeholder="Write a comment..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            rows={1}
                            className="text-sm"
                        />
                         <div className="flex justify-end mt-2">
                            <Button size="sm" type="submit" disabled={isSubmitting || commentContent.trim() === ''}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Comment
                            </Button>
                        </div>
                    </div>
                </form>
             )}
            <div className="space-y-4">
                {isLoading && <p className="text-sm text-muted-foreground">Loading comments...</p>}
                {comments?.map(comment => (
                     <div key={comment.id} className="flex items-start gap-3 text-sm">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.authorAvatar} />
                            <AvatarFallback>{comment.authorName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{comment.authorName}</p>
                                <p className="text-xs text-muted-foreground">{comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                            </div>
                            <p className="text-foreground/80">{comment.content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


export function PostCard({ post }: PostCardProps) {
  const { user, isAdmin } = useAuth();
  const firestore = useFirestore();
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();

  const likeRef = useMemoFirebase(
    () => (user ? doc(firestore, `posts/${post.id}/likes`, user.uid) : null),
    [firestore, user, post.id]
  );
  
  const likeQuery = useMemoFirebase(
    () => (likeRef ? query(collection(firestore, `posts/${post.id}/likes`), where('__name__', '==', likeRef.id)) : null),
    [firestore, post.id, likeRef]
  );

  const { data: likeDoc } = useCollection(likeQuery);
  const hasLiked = likeDoc?.length > 0;

  const handleLike = async () => {
    if (!user || !likeRef) return;
    
    const postRef = doc(firestore, 'posts', post.id);

    runTransaction(firestore, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
            throw new Error("Post does not exist!");
        }

        const likeDocSnap = await transaction.get(likeRef);
        
        if (likeDocSnap.exists()) { // Unlike
            const newLikeCount = (postDoc.data().likeCount || 1) - 1;
            transaction.delete(likeRef);
            transaction.update(postRef, { likeCount: newLikeCount });
        } else { // Like
            const newLikeCount = (postDoc.data().likeCount || 0) + 1;
            transaction.set(likeRef, { createdAt: serverTimestamp() });
            transaction.update(postRef, { likeCount: newLikeCount });
        }
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: likeRef.path,
            operation: 'write', // Simplified as 'write' for like/unlike toggle
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleDelete = async () => {
    if (!user) return;
    if (user.uid !== post.authorId && !isAdmin) return;

    const postRef = doc(firestore, 'posts', post.id);
    deleteDoc(postRef)
      .then(() => {
        toast({ title: "Post Deleted" });
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({ path: postRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={post.authorAvatar} alt={post.authorName} />
                    <AvatarFallback>{post.authorName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                    {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : '...'}
                    </p>
                </div>
            </div>
             {(user?.uid === post.authorId || isAdmin) && (
                 <Button variant="ghost" size="icon" onClick={handleDelete}>
                     <Trash2 className="h-4 w-4"/>
                 </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center pb-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleLike} disabled={!user}>
                <Heart className={cn("mr-2 h-4 w-4", hasLiked && "fill-red-500 text-red-500")} />
                {post.likeCount || 0}
            </Button>
             <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {post.commentCount || 0}
            </Button>
        </div>
      </CardFooter>
      {showComments && (
        <>
            <Separator />
            <div className="p-4">
                <CommentSection post={post} />
            </div>
        </>
      )}
    </Card>
  );
}
