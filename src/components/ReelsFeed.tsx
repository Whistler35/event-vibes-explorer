import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import neonPartyVideo from '@/assets/reels/neon-party.mp4';
import djSetVideo from '@/assets/reels/dj-set.mp4';
import streetFoodVideo from '@/assets/reels/street-food.mp4';
import sunsetYogaVideo from '@/assets/reels/sunset-yoga.mp4';
import morningRunVideo from '@/assets/reels/morning-run.mp4';
import rooftopConcertVideo from '@/assets/reels/rooftop-concert.mp4';

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

// Demo reels data with AI-generated videos
const demoReels: ReelItem[] = [
  {
    id: '1',
    videoUrl: neonPartyVideo,
    title: 'Neon Nights Party 🪩',
    description: 'Die heißeste Party der Stadt – Lichter, Beats & gute Vibes!',
    category: 'nightlife',
    likes: 1847,
    comments: 134,
    author: 'NightOwl',
  },
  {
    id: '2',
    videoUrl: djSetVideo,
    title: 'DJ Live Set 🎧🔥',
    description: 'Open-Air DJ Session mit fetten Drops – bist du dabei?',
    category: 'music',
    likes: 2341,
    comments: 189,
    author: 'BeatMaster',
  },
  {
    id: '3',
    videoUrl: streetFoodVideo,
    title: 'Street Food Market 🍜✨',
    description: 'Probier dich durch die besten Street-Food-Stände!',
    category: 'food',
    likes: 967,
    comments: 72,
    author: 'FoodieVibes',
  },
  {
    id: '4',
    videoUrl: sunsetYogaVideo,
    title: 'Sunset Yoga Flow 🧘‍♀️🌅',
    description: 'Atme ein, lass los – Yoga bei Sonnenuntergang im Park',
    category: 'outdoor',
    likes: 1205,
    comments: 88,
    author: 'ZenMarie',
  },
  {
    id: '5',
    videoUrl: morningRunVideo,
    title: 'Morning Run Crew 🏃‍♂️💪',
    description: 'Jeden Samstag 7 Uhr – gemeinsam laufen, gemeinsam wachsen',
    category: 'sports',
    likes: 756,
    comments: 45,
    author: 'RunSquad',
  },
  {
    id: '6',
    videoUrl: rooftopConcertVideo,
    title: 'Rooftop Concert 🎶🌃',
    description: 'Live-Musik über den Dächern der Stadt – unvergessliche Nacht!',
    category: 'music',
    likes: 3102,
    comments: 241,
    author: 'LiveScene',
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
