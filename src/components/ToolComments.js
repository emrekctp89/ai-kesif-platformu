'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addComment, deleteComment, getComments } from '@/app/actions/comments';
import { Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export function ToolComments({ toolId, toolSlug }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // Check current user
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();

    // Fetch initial comments
    const fetchInitialComments = async () => {
      const initial = await getComments(toolId);
      setComments(initial);
    };
    fetchInitialComments();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tool_comments',
          filter: `tool_id=eq.${toolId}`,
        },
        async (payload) => {
          // When a change happens, refetch all comments to get joined user data easily
          const updatedComments = await getComments(toolId);
          setComments(updatedComments);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toolId, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const result = await addComment(toolId, toolSlug, newComment);
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setNewComment('');
      toast.success('Yorum eklendi!');
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Yorumu silmek istediğinize emin misiniz?')) return;

    const result = await deleteComment(commentId, toolSlug);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Yorum silindi.');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Yorumlar ({comments.length})</h3>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Bu araç hakkında ne düşünüyorsunuz?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            className="resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting ? 'Gönderiliyor...' : 'Yorum Yap'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-muted p-4 rounded-md text-center text-sm text-muted-foreground">
          Yorum yapmak için giriş yapmalısınız.
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3 bg-card p-4 rounded-lg border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={comment.avatar_url || ''} />
              <AvatarFallback>{comment.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {comment.full_name || 'Anonim Kullanıcı'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </span>
                </div>
                {currentUser?.id === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm border border-dashed rounded-lg">
            Henüz yorum yapılmamış. İlk yorumu siz yapın!
          </p>
        )}
      </div>
    </div>
  );
}
