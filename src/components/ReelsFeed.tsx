import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReelItem {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  title: string;
  description: string;
  category: string;
  likes: number;
  comments: number;
  author: string;
}

// Demo reels data with free stock videos
const demoReels: ReelItem[] = [
  {
    id: '1',
    videoUrl: 'https://cdn.pixabay.com/video/2024/02/14/200712-912640498_large.mp4',
    posterUrl: '',
    title: 'Sunset Yoga Session 🧘‍♀️',
    description: 'Entspanne bei Sonnenuntergang mit einer geführten Yoga-Session im Park',
    category: 'outdoor',
    likes: 342,
    comments: 28,
    author: 'YogaMarie',
  },
  {
    id: '2',
    videoUrl: 'https://cdn.pixabay.com/video/2020/07/30/45894-446785498_large.mp4',
    posterUrl: '',
    title: 'Street Food Festival 🍜',
    description: 'Die besten Street-Food-Stände der Stadt an einem Ort!',
    category: 'food',
    likes: 891,
    comments: 65,
    author: 'FoodieMax',
  },
  {
    id: '3',
    videoUrl: 'https://cdn.pixabay.com/video/2021/10/10/91367-633049498_large.mp4',
    posterUrl: '',
    title: 'Live DJ Set 🎧',
    description: 'Open-Air DJ Set mit den besten Beats des Sommers',
    category: 'music',
    likes: 1204,
    comments: 89,
    author: 'DJNightOwl',
  },
  {
    id: '4',
    videoUrl: 'https://cdn.pixabay.com/video/2019/11/05/28698-371363413_large.mp4',
    posterUrl: '',
    title: 'Urban Art Walk 🎨',
    description: 'Entdecke versteckte Street Art und Graffiti in der Innenstadt',
    category: 'culture',
    likes: 567,
    comments: 42,
    author: 'ArtExplorer',
  },
  {
    id: '5',
    videoUrl: 'https://cdn.pixabay.com/video/2020/05/25/40130-424930032_large.mp4',
    posterUrl: '',
    title: 'Morning Run Club 🏃',
    description: 'Gemeinsam laufen, gemeinsam stärker werden – jeden Samstag um 7 Uhr',
    category: 'sports',
    likes: 423,
    comments: 31,
    author: 'RunCrew',
  },
];

const categoryEmoji: Record<string, string> = {
  music: '🎵', sports: '⚽', culture: '🎨', food: '🍕',
  nightlife: '🌙', outdoor: '🏔️', community: '👥', workshop: '🔧', other: '📌',
};

const ReelCard: React.FC<{
  reel: ReelItem;
  isActive: boolean;
}> = ({ reel, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <div className="relative w-full h-full snap-start snap-always flex-shrink-0 bg-black rounded-2xl overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onClick={togglePlay}
      />

      {/* Play overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30" onClick={togglePlay}>
          <Play className="w-16 h-16 text-white/80 fill-white/80" />
        </div>
      )}

      {/* Gradient overlay bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      {/* Right side actions */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart className={`w-7 h-7 transition-all ${liked ? 'fill-destructive text-destructive scale-110' : 'text-white'}`} />
          <span className="text-white text-xs font-medium">{likeCount}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-medium">{reel.comments}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Share2 className="w-6 h-6 text-white" />
          <span className="text-white text-xs font-medium">Teilen</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
          {isMuted ?
            <VolumeX className="w-6 h-6 text-white/70" /> :
            <Volume2 className="w-6 h-6 text-white" />
          }
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-16 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
            {reel.author.charAt(0)}
          </div>
          <span className="text-white font-semibold text-sm">{reel.author}</span>
        </div>
        <h3 className="text-white font-bold text-base leading-tight">{reel.title}</h3>
        <p className="text-white/80 text-xs line-clamp-2">{reel.description}</p>
        <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">
          {categoryEmoji[reel.category] || '📌'} {reel.category}
        </Badge>
      </div>
    </div>
  );
};

const ReelsFeed: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-2xl font-bold">🔥 reels</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary text-sm font-medium flex items-center gap-1"
        >
          {isExpanded ? 'Minimieren' : 'Vollbild'}
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <p className="text-muted-foreground text-sm -mt-1">Swipe nach oben für mehr Inspiration ✨</p>

      {/* Reels Container */}
      <div
        ref={containerRef}
        className={`snap-y snap-mandatory overflow-y-auto scrollbar-hide rounded-2xl transition-all duration-300 ${
          isExpanded ? 'h-[80vh]' : 'h-[65vh]'
        }`}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {demoReels.map((reel, index) => (
          <div key={reel.id} className="snap-start snap-always" style={{ height: '100%' }}>
            <ReelCard reel={reel} isActive={index === activeIndex} />
          </div>
        ))}
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 pt-1">
        {demoReels.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === activeIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ReelsFeed;
