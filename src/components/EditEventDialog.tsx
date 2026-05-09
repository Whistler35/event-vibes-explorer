import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Pencil, Globe, Lock, MapPin, Ticket } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsHost } from '@/hooks/useIsHost';
import { useIsAdmin } from '@/hooks/useIsAdmin';
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
    tickets_enabled?: boolean | null;
    external_ticket_url?: string | null;
  };
  onEventUpdated?: () => void;
}

const EditEventDialog: React.FC<EditEventDialogProps> = ({
  open,
  onClose,
  event,
  onEventUpdated,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isHost } = useIsHost();
  const { isAdmin } = useIsAdmin();
  const canManageTickets = isAdmin || isHost;
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
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [ticketMode, setTicketMode] = useState<'qr' | 'link'>('qr');
  const [externalTicketUrl, setExternalTicketUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [skipNextSearch, setSkipNextSearch] = useState(false);

  const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';

  useEffect(() => {
    if (skipNextSearch) {
      setSkipNextSearch(false);
      return;
    }
    if (!locationName || locationName.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const lat = newLatitude ?? event.latitude ?? 47.2692;
        const lng = newLongitude ?? event.longitude ?? 11.4041;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&language=de&proximity=${lng},${lat}`
        );
        const data = await res.json();
        const feats = (data.features || []).map((f: any) => ({
          name: f.place_name as string,
          lng: f.center[0] as number,
          lat: f.center[1] as number,
        }));
        setLocationSuggestions(feats);
      } catch (e) {
        console.error('Geocoding error', e);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [locationName]);

  useEffect(() => {
    if (open && event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocationName(event.location_name);
      setCategory((event.category as EventCategory) || 'other');
      setMaxParticipants(event.max_participants?.toString() || '');
      setPriceEur(event.price_cents && event.price_cents > 0 ? (event.price_cents / 100).toFixed(2) : '');
      setIsPrivate(event.visibility === 'unlisted');
      setTicketsEnabled(!!event.tickets_enabled);
      setExternalTicketUrl(event.external_ticket_url || '');
      setTicketMode(event.external_ticket_url ? 'link' : 'qr');
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

      // Treat the form values as the user's LOCAL time and convert to a
      // UTC ISO string. Otherwise Postgres parses the offset-less string as
      // UTC and the displayed time drifts by the local timezone offset.
      const eventDate = new Date(`${date}T${time}:00`).toISOString();
      const parsedMax = maxParticipants ? parseInt(maxParticipants, 10) : null;
      const parsedPrice = priceEur ? parseFloat(priceEur.replace(',', '.')) : 0;
      const priceCents = !isNaN(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) : 0;

      const updateData: any = {
        title,
        description,
        event_date: eventDate,
        location_name: locationName,
        category: category,
        image_url: imageUrl,
        max_participants: parsedMax,
        visibility: isPrivate ? 'unlisted' : 'public',
        price_cents: priceCents,
        ...(canManageTickets ? {
          tickets_enabled: ticketsEnabled,
          external_ticket_url: ticketsEnabled && ticketMode === 'link' && externalTicketUrl.trim() ? externalTicketUrl.trim() : null,
        } : {}),
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

      toast.success(t('editEvent.successUpdate'));
      onClose();
      onEventUpdated?.();
    } catch (err: any) {
      console.error('Error updating event:', err);
      toast.error(t('editEvent.errorUpdate'));
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
            <span className="text-foreground text-lg font-semibold">{t('editEvent.title')}</span>
          </div>
        </div>

        <div className="p-4 pt-2 space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">{t('editEvent.image')}</Label>
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
                  <span className="text-sm text-muted-foreground mt-2">{t('editEvent.addImage')}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-foreground text-sm">{t('editEvent.fieldTitle')}</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">{t('editEvent.category')}</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as EventCategory)}>
              <SelectTrigger className="bg-transparent border-border text-foreground rounded-xl h-12">
                <SelectValue placeholder={t('editEvent.selectCategory')} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="sports">⚽ {t('categories.sports')}</SelectItem>
                <SelectItem value="community">👥 {t('categories.community')}</SelectItem>
                <SelectItem value="music">🎵 {t('categories.music')}</SelectItem>
                <SelectItem value="culture">🎨 {t('categories.culture')}</SelectItem>
                <SelectItem value="food">🍕 {t('categories.food')}</SelectItem>
                <SelectItem value="nightlife">🎉 {t('categories.nightlife')}</SelectItem>
                <SelectItem value="outdoor">🌲 {t('categories.outdoor')}</SelectItem>
                <SelectItem value="workshop">🔧 {t('categories.workshop')}</SelectItem>
                <SelectItem value="other">📌 {t('categories.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-foreground text-sm">{t('editEvent.description')}</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-transparent border-border text-foreground rounded-xl resize-none" />
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-location" className="text-foreground text-sm">{t('editEvent.location')}</Label>
            <div className="relative">
              <Input
                id="edit-location"
                value={locationName}
                onChange={(e) => { setLocationName(e.target.value); setShowLocationSuggestions(true); }}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                autoComplete="off"
                className="bg-transparent border-border text-foreground rounded-xl h-12"
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {locationSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSkipNextSearch(true);
                        setLocationName(s.name);
                        setNewLatitude(s.lat);
                        setNewLongitude(s.lng);
                        setShowLocationSuggestions(false);
                        setLocationSuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-start gap-2"
                    >
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Map Position Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground text-sm">{t('editEvent.mapPosition')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="text-primary text-xs h-7 px-2"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {showMapPicker ? t('editEvent.hideMap') : t('editEvent.moveOnMap')}
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
              <p className="text-muted-foreground text-xs">{t('editEvent.noCoords')}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="text-foreground text-sm">{t('editEvent.date')}</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time" className="text-foreground text-sm">{t('editEvent.time')}</Label>
              <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
            </div>
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="edit-maxParticipants" className="text-foreground text-sm">{t('editEvent.maxParticipants')}</Label>
            <Input
              id="edit-maxParticipants"
              type="number"
              min={2}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder={t('editEvent.unlimited')}
              className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="edit-price" className="text-foreground text-sm">{t('editEvent.price')}</Label>
            <Input
              id="edit-price"
              type="number"
              min={0}
              step="0.01"
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              placeholder={t('editEvent.pricePlaceholder')}
              className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
            />
            <p className="text-muted-foreground text-xs">
              {priceEur && parseFloat(priceEur.replace(',', '.')) > 0
                ? t('editEvent.pricePerTicket', { price: parseFloat(priceEur.replace(',', '.')).toFixed(2) })
                : t('editEvent.priceFreeHint')}
            </p>
          </div>

          {/* Tickets (Pro Hosts & Admins only) */}
          {canManageTickets && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  <Label className="text-foreground text-sm">{t('editEvent.ticketsEnable')}</Label>
                </div>
                <Switch checked={ticketsEnabled} onCheckedChange={setTicketsEnabled} />
              </div>
              {ticketsEnabled && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTicketMode('qr')}
                      className={`flex-1 h-10 rounded-xl text-xs font-semibold border ${ticketMode === 'qr' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-foreground border-border'}`}
                    >
                      {t('editEvent.ticketsQr')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketMode('link')}
                      className={`flex-1 h-10 rounded-xl text-xs font-semibold border ${ticketMode === 'link' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-foreground border-border'}`}
                    >
                      {t('editEvent.ticketsLink')}
                    </button>
                  </div>
                  {ticketMode === 'link' && (
                    <Input
                      type="url"
                      value={externalTicketUrl}
                      onChange={(e) => setExternalTicketUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-transparent border-border text-foreground rounded-xl h-12"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-primary" />}
              <Label className="text-foreground text-sm">
                {isPrivate ? 'Private' : 'Public'}
              </Label>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!title || !date || !time || loading} className="flex-1 h-12 rounded-xl">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
