import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Pencil, Globe, Lock, MapPin } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EventCategory } from '@/hooks/useSearchEvents';
import MapPositionPicker from '@/components/MapPositionPicker';

interface EditEventDialogProps {
  open: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    location_name: string;
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    image_url?: string | null;
    max_participants: number | null;
    visibility?: string | null;
    price_cents?: number | null;
  };
  onEventUpdated?: () => void;
}

const EditEventDialog: React.FC<EditEventDialogProps> = ({
  open,
  onClose,
  event,
  onEventUpdated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<EventCategory>('other');
  const [locationName, setLocationName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [priceEur, setPriceEur] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);

  useEffect(() => {
    if (open && event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocationName(event.location_name);
      setCategory((event.category as EventCategory) || 'other');
      setMaxParticipants(event.max_participants?.toString() || '');
      setIsPrivate(event.visibility === 'unlisted');
      setImagePreview(event.image_url || null);
      setImage(null);
      setNewLatitude(event.latitude);
      setNewLongitude(event.longitude);
      setShowMapPicker(false);

      const d = new Date(event.event_date);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  }, [open, event]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title || !date || !time || !user) return;

    setLoading(true);
    try {
      let imageUrl = event.image_url;

      if (image) {
        const fileExt = image.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, image);
        if (!uploadError) {
          const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
          imageUrl = data.publicUrl;
        }
      }

      const eventDate = `${date}T${time}:00`;
      const parsedMax = maxParticipants ? parseInt(maxParticipants, 10) : null;

      const updateData: any = {
        title,
        description,
        event_date: eventDate,
        location_name: locationName,
        category: category,
        image_url: imageUrl,
        max_participants: parsedMax,
        visibility: isPrivate ? 'unlisted' : 'public',
      };

      // Include position update if changed
      if (newLatitude !== null && newLongitude !== null) {
        updateData.latitude = newLatitude;
        updateData.longitude = newLongitude;
      }

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Event erfolgreich aktualisiert! ✅');
      onClose();
      onEventUpdated?.();
    } catch (err: any) {
      console.error('Error updating event:', err);
      toast.error('Fehler beim Aktualisieren des Events');
    } finally {
      setLoading(false);
    }
  };

  const hasValidPosition = newLatitude !== null && newLongitude !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-[400px] bg-card border-border p-0 gap-0 max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <span className="text-foreground text-lg font-semibold">Event bearbeiten</span>
          </div>
        </div>

        <div className="p-4 pt-2 space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Bild</Label>
            <div className="relative">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Event" className="w-full h-32 object-cover rounded-xl border border-dashed border-border" />
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => { setImage(null); setImagePreview(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-transparent">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mt-2">Bild hinzufügen</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-foreground text-sm">Titel *</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Kategorie</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as EventCategory)}>
              <SelectTrigger className="bg-transparent border-border text-foreground rounded-xl h-12">
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="sports">⚽ Sport</SelectItem>
                <SelectItem value="community">👥 Community</SelectItem>
                <SelectItem value="music">🎵 Musik</SelectItem>
                <SelectItem value="culture">🎨 Kultur</SelectItem>
                <SelectItem value="food">🍕 Food</SelectItem>
                <SelectItem value="nightlife">🎉 Nightlife</SelectItem>
                <SelectItem value="outdoor">🌲 Outdoor</SelectItem>
                <SelectItem value="workshop">🔧 Workshop</SelectItem>
                <SelectItem value="other">📌 Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-foreground text-sm">Beschreibung</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-transparent border-border text-foreground rounded-xl resize-none" />
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-location" className="text-foreground text-sm">Ort</Label>
            <Input id="edit-location" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
          </div>

          {/* Map Position Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-sm">Position auf der Karte</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="text-primary text-xs h-7 px-2"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {showMapPicker ? 'Karte ausblenden' : 'Auf Karte verschieben'}
              </Button>
            </div>
            {showMapPicker && hasValidPosition && (
              <MapPositionPicker
                key={`${event.id}-${open}`}
                initialPosition={[newLatitude!, newLongitude!]}
                onPositionChange={([lat, lng]) => {
                  setNewLatitude(lat);
                  setNewLongitude(lng);
                }}
                height="200px"
              />
            )}
            {!hasValidPosition && showMapPicker && (
              <p className="text-muted-foreground text-xs">Keine Koordinaten vorhanden.</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="text-foreground text-sm">Datum *</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time" className="text-foreground text-sm">Zeit *</Label>
              <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
            </div>
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="edit-maxParticipants" className="text-foreground text-sm">Max. Teilnehmer</Label>
            <Input
              id="edit-maxParticipants"
              type="number"
              min={2}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder="Unbegrenzt"
              className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-primary" />}
              <Label className="text-foreground text-sm">
                {isPrivate ? 'Privat' : 'Öffentlich'}
              </Label>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl">
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!title || !date || !time || loading} className="flex-1 h-12 rounded-xl">
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
