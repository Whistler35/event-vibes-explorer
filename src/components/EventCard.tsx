interface EventCardProps {
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  category: string;
  description?: string;
  priceCents?: number;
  onClick?: () => void;
}

const formatPrice = (cents?: number) => {
  if (!cents || cents <= 0) return 'Free';
  return `€${(cents / 100).toFixed(2)}`;
};

const EventCard = ({ title, image, date, time, location, category, description, priceCents, onClick }: EventCardProps) => {
  const isFree = !priceCents || priceCents <= 0;
  return (
    <div 
      className="bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 relative"
      onClick={onClick}
    >
      <div className="aspect-video bg-muted overflow-hidden relative">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🔥</div>
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold backdrop-blur-md ${
            isFree
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-card/90 text-foreground border border-border'
          }`}
        >
          {formatPrice(priceCents)}
        </span>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-primary text-sm font-medium">{category}</span>
          <span className="text-muted-foreground text-sm">{date}</span>
        </div>
        <h3 className="text-foreground font-bold text-lg mb-1 line-clamp-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-2">{time}</p>
        <p className="text-muted-foreground text-sm mb-2">{location}</p>
        {description && (
          <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
};

export default EventCard;
