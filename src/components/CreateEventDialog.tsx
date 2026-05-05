import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, ShieldCheck, Clock, Globe, Lock, MapPin as MapPinIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
  defaultPrivate?: boolean;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onClose,
  position,
  isAdmin = false,
  onEventCreated,
  defaultPrivate = false,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringSlots, setRecurringSlots] = useState<Array<{ weekday: number; startTime: string; endTime: string }>>([
    { weekday: 1, startTime: '', endTime: '' },
  ]);
  const [recurringUntil, setRecurringUntil] = useState('');
  const [category, setCategory] = useState<EventCategory>('community');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressCoords, setAddressCoords] = useState<[number, number] | null>(null);
  const [priceEur, setPriceEur] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(defaultPrivate);
  const [loading, setLoading] = useState(false);

  const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';

  useEffect(() => {
    if (!address || address.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const proximity = position ? `&proximity=${position[1]},${position[0]}` : '';
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&language=de${proximity}`
        );
        const data = await res.json();
        const feats = (data.features || []).map((f: any) => ({
          name: f.place_name as string,
          lng: f.center[0] as number,
          lat: f.center[1] as number,
        }));
        setAddressSuggestions(feats);
      } catch (e) {
        console.error('Geocoding error', e);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [address, position]);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (open) setIsPrivate(defaultPrivate);
  }, [open, defaultPrivate]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setEndDate('');
    setEndTime('');
    setIsRecurring(false);
    setRecurringSlots([{ weekday: 1, startTime: '', endTime: '' }]);
    setRecurringUntil('');
    setCategory('community');
    setImage(null);
    setImagePreview(null);
    setMaxParticipants('');
    setAddress('');
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setAddressCoords(null);
    setPriceEur('');
    setIsPrivate(defaultPrivate);
  };

  const handleSubmit = async () => {
    if (!position || !title || !user) return;
    if (!isRecurring && (!date || !time)) return;
    if (isRecurring && (!recurringUntil || recurringSlots.some(s => !s.startTime))) return;

    setLoading(true);
    try {
      let imageUrl: string | null = null;
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
      const approvalStatus = isAdmin ? 'approved' : 'pending';
      const eventCategory = isAdmin ? category : 'community';
      const parsedMax = maxParticipants ? parseInt(maxParticipants, 10) : null;
      const eventVisibility = isPrivate ? 'unlisted' : 'public';
      const parsedPrice = priceEur ? parseFloat(priceEur.replace(',', '.')) : 0;
      const priceCents = !isNaN(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) : 0;

      const { error } = await supabase.from('events').insert({
        title,
        description,
        event_date: eventDate,
        latitude: addressCoords ? addressCoords[0] : position[0],
        longitude: addressCoords ? addressCoords[1] : position[1],
        location_name: address.trim() || `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`,
        category: eventCategory,
        source: isAdmin ? 'curated' : 'community',
        created_by: user.id,
        image_url: imageUrl,
        approval_status: approvalStatus,
        max_participants: !isAdmin && parsedMax && parsedMax >= 2 ? parsedMax : null,
        visibility: eventVisibility,
        price_cents: priceCents,
      } as any);

      if (error) throw error;

      if (isAdmin) {
        toast.success('Event created and published immediately! ✅');
      } else {
        toast.success('Event submitted! ⏳', {
          description: 'Your event will be reviewed by an admin and then published.'
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
      }}>
      
      <DialogContent
        className="sm:max-w-[400px] max-h-[90vh] bg-card border-border p-0 gap-0 flex flex-col overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-primary text-xl font-bold">+</span>
            <span className="text-foreground text-lg font-semibold">Create evendle</span>
          </div>
          {isAdmin ?
          <span className="flex items-center gap-1 text-xs text-green-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </span> :
          <span className="flex items-center gap-1 text-xs text-yellow-600">
              <Clock className="h-3.5 w-3.5" /> Review required
            </span>
          }
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
        {!isAdmin &&
        <div className="mx-4 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs">
            Your event will be visible after admin approval.
          </div>
        }

        <div className="p-4 pt-2 space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Image</Label>
            <div className="relative">
              {imagePreview ?
              <div className="relative">
                  <img src={imagePreview} alt="Event" className="w-full h-32 object-cover rounded-xl border border-dashed border-border" />
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => {setImage(null);setImagePreview(null);}}>
                    <X className="h-4 w-4" />
                  </Button>
                </div> :
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-transparent">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mt-2">Add image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              }
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground text-sm">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you doing?" className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">Category *</Label>
            {isAdmin ?
            <Select value={category} onValueChange={(val) => setCategory(val as EventCategory)}>
                <SelectTrigger className="bg-transparent border-border text-foreground rounded-xl h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="culture">Culture</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="nightlife">Nightlife</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select> :
            <div className="flex items-center gap-2 h-12 px-3 rounded-xl border border-border text-foreground bg-transparent">
                <span>Community</span>
                <span className="text-xs text-muted-foreground ml-auto"></span>
              </div>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground text-sm">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your event..." rows={3} className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none" />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground text-sm">Address (optional)</Label>
            <div className="relative">
              <Input
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setAddressCoords(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. Maria-Theresien-Straße 1, Innsbruck"
                className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
                autoComplete="off"
              />
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAddress(s.name);
                        setAddressCoords([s.lat, s.lng]);
                        setShowSuggestions(false);
                        setAddressSuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-start gap-2"
                    >
                      <MapPinIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {addressCoords
                ? '✓ Address selected — event will appear at this location.'
                : 'Pin location is used by default. Pick a suggestion to use a real address.'}
            </p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-foreground text-sm">Date *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-foreground text-sm">Time *</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
            </div>
          </div>

          {/* Max Participants */}
          {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="maxParticipants" className="text-foreground text-sm">Max. Participants *</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={2}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="e.g. 10 (min. 2)"
                className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
              />
              <p className="text-muted-foreground text-xs">At least 2 participants</p>
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-foreground text-sm">Price (EUR)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              placeholder="0 = Free"
              className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
            />
            <p className="text-muted-foreground text-xs">
              {priceEur && parseFloat(priceEur.replace(',', '.')) > 0
                ? `€${parseFloat(priceEur.replace(',', '.')).toFixed(2)} per ticket`
                : 'Leave empty or 0 for a free event'}
            </p>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-primary" />}
              <Label className="text-foreground text-sm">
                {isPrivate ? 'Private – visible only to you & friends' : 'Public – visible to everyone'}
              </Label>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-12 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!title || !date || !time || loading || (!isAdmin && (!maxParticipants || parseInt(maxParticipants) < 2))} className="flex-1 h-12 rounded-xl">
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>);
};

export default CreateEventDialog;
