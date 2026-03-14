interface EventCardProps {
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  category: string;
  description?: string;
  onClick?: () => void;
}

const EventCard = ({ title, image, date, time, location, category, description, onClick }: EventCardProps) => {
  return (
    <div 
      className="bg-card rounded-2xl shadow-card overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105"
      onClick={onClick}
    >
      <div className="aspect-video bg-muted overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🔥</div>
        )}
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
