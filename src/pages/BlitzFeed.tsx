import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNavigation from "@/components/BottomNavigation";
import NotificationBell from "@/components/NotificationBell";
import FeedPostCard from "@/components/feed/FeedPostCard";
import FeedLikesSheet from "@/components/feed/FeedLikesSheet";
import FeedCommentsSheet from "@/components/feed/FeedCommentsSheet";
import ComposeFeedPostSheet from "@/components/feed/ComposeFeedPostSheet";
import TagPeopleSheet from "@/components/feed/TagPeopleSheet";
import { useBlitzFeed } from "@/hooks/useBlitzFeed";

const BlitzFeed = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { posts, isLoading, toggleLike, deletePost, setPostTags, setPostVisibility } = useBlitzFeed(user?.id);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMatchId, setComposeMatchId] = useState<string | null>(null);
  const [likesPostId, setLikesPostId] = useState<string | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [tagPeoplePostId, setTagPeoplePostId] = useState<string | null>(null);

  const tagPeoplePost = posts.find((p) => p.id === tagPeoplePostId);

  useEffect(() => {
    const preselect = (location.state as { composeMatchId?: string } | null)?.composeMatchId;
    if (preselect) {
      setComposeMatchId(preselect);
      setComposeOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  if (!authLoading && !user) return null;

  return (
    <div className="min-h-screen bg-background pb-28" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md w-full mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[hsl(var(--blitz-forest))] text-lg font-black tracking-tight">FEED</span>
            <p className="text-xs text-muted-foreground -mt-0.5">Was eure Blitze so drauf hatten</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setComposeMatchId(null);
                setComposeOpen(true);
              }}
              className="w-10 h-10 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(30,51,35,0.5)] active:scale-95 transition"
              aria-label="Foto teilen"
            >
              <Plus className="w-5 h-5 text-[hsl(var(--bolt))]" strokeWidth={3} />
            </button>
            <NotificationBell />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-[28px] bg-muted animate-pulse h-96" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-20 px-6">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--blitz-forest))]/10 flex items-center justify-center">
              <Camera className="w-7 h-7 text-[hsl(var(--blitz-forest))]" />
            </div>
            <p className="font-bold text-foreground">Noch nichts im Feed</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Sobald einer deiner Blitze vorbei ist, kannst du ein Foto davon teilen – ihr wart schließlich
              offline unterwegs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                isOwn={post.author_id === user?.id}
                onToggleLike={toggleLike}
                onOpenLikes={setLikesPostId}
                onOpenComments={setCommentsPostId}
                onDelete={deletePost}
                onTagPeople={setTagPeoplePostId}
                onSetVisibility={setPostVisibility}
              />
            ))}
          </div>
        )}
      </div>

      <ComposeFeedPostSheet
        open={composeOpen}
        onOpenChange={setComposeOpen}
        userId={user?.id}
        preselectedMatchId={composeMatchId}
      />
      <FeedLikesSheet open={!!likesPostId} onOpenChange={(o) => !o && setLikesPostId(null)} postId={likesPostId} />
      <FeedCommentsSheet
        open={!!commentsPostId}
        onOpenChange={(o) => !o && setCommentsPostId(null)}
        postId={commentsPostId}
        userId={user?.id}
      />
      <TagPeopleSheet
        open={!!tagPeoplePostId}
        onOpenChange={(o) => !o && setTagPeoplePostId(null)}
        matchId={tagPeoplePost?.match_id}
        currentUserId={user?.id}
        initialSelected={tagPeoplePost?.taggedPeople.map((t) => t.user_id) ?? []}
        onSave={(ids) => {
          if (tagPeoplePostId) setPostTags(tagPeoplePostId, ids);
          setTagPeoplePostId(null);
        }}
      />

      <BottomNavigation />
    </div>
  );
};

export default BlitzFeed;
