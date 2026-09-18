import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Globe2, MoreVertical, Trash2, Zap, UserPlus, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FeedPost } from "@/hooks/useBlitzFeed";
import UserActionsMenu from "@/components/moderation/UserActionsMenu";
import TaggedPeopleSheet from "@/components/feed/TaggedPeopleSheet";

interface Props {
  post: FeedPost;
  isOwn: boolean;
  onToggleLike: (postId: string, currentlyLiked: boolean) => void;
  onOpenLikes: (postId: string) => void;
  onOpenComments: (postId: string) => void;
  onDelete: (postId: string, photoUrl: string) => void;
  onTagPeople: (postId: string) => void;
  onSetVisibility: (postId: string, visibility: "friends" | "public") => void;
}

const FeedPostCard = ({
  post,
  isOwn,
  onToggleLike,
  onOpenLikes,
  onOpenComments,
  onDelete,
  onTagPeople,
  onSetVisibility,
}: Props) => {
  const navigate = useNavigate();
  const [burst, setBurst] = useState(false);
  const [showTagged, setShowTagged] = useState(false);

  const handleDoubleTap = () => {
    if (!post.likedByMe) onToggleLike(post.id, post.likedByMe);
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  return (
    <div className="rounded-[28px] bg-card overflow-hidden shadow-[0_10px_30px_-14px_rgba(15,20,16,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(`/user/${post.author_id}`)} className="shrink-0">
          <Avatar className="w-10 h-10 ring-2 ring-[hsl(var(--blitz-forest))]/10">
            <AvatarImage src={post.authorAvatar ?? undefined} />
            <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-xs font-black">
              {post.authorName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <p className="text-sm truncate min-w-0">
              <button onClick={() => navigate(`/user/${post.author_id}`)} className="font-bold text-foreground">
                {post.authorName}
              </button>
              {post.taggedPeople.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  mit{" "}
                  <button
                    onClick={() => navigate(`/user/${post.taggedPeople[0].user_id}`)}
                    className="font-bold text-foreground"
                  >
                    {post.taggedPeople[0].name}
                  </button>
                </span>
              )}
            </p>
            {post.taggedPeople.length > 1 && (
              <button
                onClick={() => setShowTagged(true)}
                className="text-xs font-bold text-muted-foreground shrink-0 underline underline-offset-2"
              >
                +{post.taggedPeople.length - 1}
              </button>
            )}
          </div>
          {post.activity && (
            <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-[hsl(var(--bolt))]/20 text-[hsl(var(--blitz-forest))] text-[10px] font-black uppercase tracking-wide">
              <Zap className="w-2.5 h-2.5 fill-current" /> {post.activity}
            </span>
          )}
        </div>
        {post.visibility === "public" && (
          <Globe2 className="w-4 h-4 text-muted-foreground shrink-0" aria-label="Öffentlich" />
        )}
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 shrink-0" aria-label="Optionen">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTagPeople(post.id)}>
                <UserPlus className="w-4 h-4 mr-2" /> Personen markieren
              </DropdownMenuItem>
              {post.visibility === "public" ? (
                <DropdownMenuItem onClick={() => onSetVisibility(post.id, "friends")}>
                  <Users className="w-4 h-4 mr-2" /> Nur für Freunde sichtbar machen
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onSetVisibility(post.id, "public")}>
                  <Globe2 className="w-4 h-4 mr-2" /> Öffentlich machen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(post.id, post.photo_url)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!isOwn && (
          <UserActionsMenu
            targetUserId={post.author_id}
            targetUserName={post.authorName}
            context="feed_post"
            reportedMessageId={post.id}
            className="p-1 shrink-0 text-muted-foreground"
          />
        )}
      </div>

      {/* Photo */}
      <div className="relative select-none" onDoubleClick={handleDoubleTap}>
        <img src={post.photo_url} alt="" className="w-full aspect-[4/5] object-cover" loading="lazy" />
        {burst && (
          <Heart
            className="absolute inset-0 m-auto w-20 h-20 text-white fill-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] animate-heart-burst pointer-events-none"
          />
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-2.5 pb-1 flex items-center gap-4">
        <button
          onClick={() => onToggleLike(post.id, post.likedByMe)}
          className="flex items-center gap-1.5 active:scale-95 transition"
          aria-label="Like"
        >
          <Heart
            className={`w-6 h-6 transition-colors ${
              post.likedByMe ? "fill-red-500 text-red-500" : "text-foreground"
            }`}
          />
        </button>
        <button onClick={() => onOpenComments(post.id)} className="flex items-center gap-1.5 active:scale-95 transition" aria-label="Kommentare">
          <MessageCircle className="w-6 h-6 text-foreground" />
        </button>
      </div>

      {/* Like count / caption / comment count */}
      <div className="px-4 pb-4 space-y-1">
        {post.likeCount > 0 && (
          <button onClick={() => onOpenLikes(post.id)} className="text-sm font-bold text-foreground block">
            {post.likeCount === 1 ? "1 Like" : `${post.likeCount} Likes`}
          </button>
        )}
        {post.caption && (
          <p className="text-sm text-foreground">
            <span className="font-semibold">{post.authorName}</span> {post.caption}
          </p>
        )}
        {post.commentCount > 0 && (
          <button onClick={() => onOpenComments(post.id)} className="text-sm text-muted-foreground block">
            {post.commentCount === 1 ? "1 Kommentar ansehen" : `Alle ${post.commentCount} Kommentare ansehen`}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide pt-0.5">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de })}
        </p>
      </div>

      <TaggedPeopleSheet open={showTagged} onOpenChange={setShowTagged} people={post.taggedPeople} />
    </div>
  );
};

export default FeedPostCard;
