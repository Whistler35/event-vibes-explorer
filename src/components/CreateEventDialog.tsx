import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EventCategory } from '@/hooks/useSearchEvents';

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  position: [number, number] | null;
  isAdmin?: boolean;
  onEventCreated?: () => void;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onClose,
  position,
  isAdmin = false,
  onEventCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<EventCategory>('community');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setCategory('community');
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!position || !title || !date || !time || !user) return;

    setLoading(true);
    try {
      // Upload image if present
      let imageUrl: string | null = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const filePath = `events/${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, image);
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          imageUrl = data.publicUrl;
        }
      }

      const eventDate = `${date}T${time}:00`;
      const approvalStatus = isAdmin ? 'approved' : 'pending';

      const { error } = await supabase.from('events').insert({
        title,
        description,
        event_date: eventDate,
        latitude: position[0],
        longitude: position[1],
        location_name: `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`,
        category,
        source: isAdmin ? 'curated' : 'community',
        created_by: user.id,
        image_url: imageUrl,
        approval_status: approvalStatus,
      } as any);

      if (error) throw error;

      if (isAdmin) {
        toast.success('Event erstellt und sofort veröffentlicht! ✅');
      } else {
        toast.success('Event eingereicht! ⏳', {
          description: 'Dein Event wird von einem Admin geprüft und dann freigeschaltet.',
        });
      }

      resetForm();
      onClose();
      onEventCreated?.();
    } catch (err: any) {
      console.error('Error creating event:', err);
      toast.error('Fehler beim Erstellen des Events');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[400px] bg-evendle-dark border-evendle-gray p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-evendle-orange text-xl font-bold">+</span>
            <span className="text-white text-lg font-semibold">Create evendle</span>
          </div>
          {isAdmin ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <Clock className="h-3.5 w-3.5" /> Prüfung nötig
            </span>
          )}
        </div>

        {!isAdmin && (
          <div className="mx-4 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs">
            Dein Event wird nach Admin-Freigabe sichtbar.
          </div>
        )}

        <div className="p-4 pt-2 space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-white text-sm">Bild</Label>
            <div className="relative">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Event" className="w-full h-32 object-cover rounded-xl border border-dashed border-evendle-gray" />
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2 bg-evendle-dark-card/80" onClick={() => { setImage(null); setImagePreview(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-evendle-gray rounded-xl cursor-pointer hover:border-evendle-orange/50 transition-colors bg-transparent">
                  <Camera className="h-8 w-8 text-evendle-gray" />
                  <span className="text-sm text-evendle-gray mt-2">Bild hinzufügen</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white text-sm">Titel *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Was machst du?" className="bg-transparent border-evendle-gray text-white placeholder:text-evendle-gray rounded-xl h-12" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-white text-sm">Kategorie *</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as EventCategory)}>
              <SelectTrigger className="bg-transparent border-evendle-gray text-white rounded-xl h-12">
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="sports">🏀 Sport</SelectItem>
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
            <Label htmlFor="description" className="text-white text-sm">Beschreibung</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibe dein Event..." rows={3} className="bg-transparent border-evendle-gray text-white placeholder:text-evendle-gray rounded-xl resize-none" />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-white text-sm">Datum *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-evendle-gray text-white rounded-xl h-12 [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-white text-sm">Zeit *</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent border-evendle-gray text-white rounded-xl h-12 [color-scheme:dark]" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-12 rounded-xl border-evendle-orange text-evendle-orange hover:bg-evendle-orange/10 hover:text-evendle-orange bg-transparent">
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!title || !date || !time || loading} className="flex-1 h-12 rounded-xl bg-evendle-orange hover:bg-evendle-orange-hover text-white disabled:opacity-50">
              {loading ? 'Erstelle...' : 'Event erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
