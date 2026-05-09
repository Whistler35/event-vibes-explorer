import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, ShieldCheck, Clock, Globe, Lock, MapPin as MapPinIcon, Ticket } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsHost } from '@/hooks/useIsHost';
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isHost } = useIsHost();
  const canManageTickets = isAdmin || isHost;
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
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [ticketMode, setTicketMode] = useState<'qr' | 'link'>('qr');
  const [externalTicketUrl, setExternalTicketUrl] = useState('');
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
    setTicketsEnabled(false);
    setTicketMode('qr');
    setExternalTicketUrl('');
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

      const approvalStatus = isAdmin ? 'approved' : 'pending';
      const eventCategory = isAdmin ? category : 'community';
      const parsedMax = maxParticipants ? parseInt(maxParticipants, 10) : null;
      const eventVisibility = isPrivate ? 'unlisted' : 'public';
      const parsedPrice = priceEur ? parseFloat(priceEur.replace(',', '.')) : 0;
      const priceCents = !isNaN(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) : 0;

      const baseRow = {
        title,
        description,
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
        tickets_enabled: canManageTickets ? ticketsEnabled : false,
        external_ticket_url: canManageTickets && ticketsEnabled && ticketMode === 'link' && externalTicketUrl.trim()
          ? externalTicketUrl.trim()
          : null,
      };

      // Build list of (start, end) datetime pairs
      const occurrences: Array<{ start: string; end: string | null }> = [];
      if (isRecurring) {
        const untilDate = new Date(`${recurringUntil}T23:59:59`);
        const startFrom = new Date();
        startFrom.setHours(0, 0, 0, 0);
        // Iterate day by day from today to untilDate, match weekdays
        for (let d = new Date(startFrom); d <= untilDate; d.setDate(d.getDate() + 1)) {
          const wd = d.getDay(); // 0=Sun..6=Sat
          for (const slot of recurringSlots) {
            if (slot.weekday !== wd) continue;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const startIso = `${yyyy}-${mm}-${dd}T${slot.startTime}:00`;
            const endIso = slot.endTime ? `${yyyy}-${mm}-${dd}T${slot.endTime}:00` : null;
            occurrences.push({ start: startIso, end: endIso });
          }
        }
        if (occurrences.length === 0) {
          toast.error(t('createEvent.errorWeekdays'));
          setLoading(false);
          return;
        }
      } else {
        const startIso = `${date}T${time}:00`;
        const endIso = endDate && endTime ? `${endDate}T${endTime}:00` : null;
        occurrences.push({ start: startIso, end: endIso });
      }

      const rows = occurrences.map(o => ({
        ...baseRow,
        event_date: o.start,
        end_time: o.end,
      }));

      const { error } = await supabase.from('events').insert(rows as any);

      if (error) throw error;

      if (isAdmin) {
        toast.success(t('createEvent.successAdmin', { count: rows.length }));
      } else {
        toast.success(t('createEvent.successUser', { count: rows.length }), {
          description: t('createEvent.successUserDesc'),
        });
      }

      resetForm();
      onClose();
      onEventCreated?.();
    } catch (err: any) {
      console.error('Error creating event:', err);
      toast.error(t('createEvent.errorCreate'));
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
            <span className="text-foreground text-lg font-semibold">{t('createEvent.title')}</span>
          </div>
          {isAdmin ?
          <span className="flex items-center gap-1 text-xs text-green-600">
              <ShieldCheck className="h-3.5 w-3.5" /> {t('createEvent.adminBadge')}
            </span> :
          <span className="flex items-center gap-1 text-xs text-yellow-600">
              <Clock className="h-3.5 w-3.5" /> {t('createEvent.reviewBadge')}
            </span>
          }
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
        {!isAdmin &&
        <div className="mx-4 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs">
            {t('createEvent.approvalNotice')}
          </div>
        }

        <div className="p-4 pt-2 space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">{t('createEvent.image')}</Label>
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
                  <span className="text-sm text-muted-foreground mt-2">{t('createEvent.addImage')}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              }
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground text-sm">{t('createEvent.fieldTitle')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('createEvent.titlePlaceholder')} className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-foreground text-sm">{t('createEvent.category')}</Label>
            {isAdmin ?
            <Select value={category} onValueChange={(val) => setCategory(val as EventCategory)}>
                <SelectTrigger className="bg-transparent border-border text-foreground rounded-xl h-12">
                  <SelectValue placeholder={t('createEvent.selectCategory')} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="sports">{t('categories.sports')}</SelectItem>
                  <SelectItem value="community">{t('categories.community')}</SelectItem>
                  <SelectItem value="music">{t('categories.music')}</SelectItem>
                  <SelectItem value="culture">{t('categories.culture')}</SelectItem>
                  <SelectItem value="food">{t('categories.food')}</SelectItem>
                  <SelectItem value="nightlife">{t('categories.nightlife')}</SelectItem>
                  <SelectItem value="outdoor">{t('categories.outdoor')}</SelectItem>
                  <SelectItem value="workshop">{t('categories.workshop')}</SelectItem>
                  <SelectItem value="other">{t('categories.other')}</SelectItem>
                </SelectContent>
              </Select> :
            <div className="flex items-center gap-2 h-12 px-3 rounded-xl border border-border text-foreground bg-transparent">
                <span>{t('categories.community')}</span>
                <span className="text-xs text-muted-foreground ml-auto"></span>
              </div>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground text-sm">{t('createEvent.description')}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('createEvent.descriptionPlaceholder')} rows={3} className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none" />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground text-sm">{t('createEvent.address')}</Label>
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
                placeholder={t('createEvent.addressPlaceholder')}
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
                ? t('createEvent.addressSelected')
                : t('createEvent.addressDefault')}
            </p>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between py-2 px-1">
            <Label className="text-foreground text-sm">{t('createEvent.recurringToggle')}</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {!isRecurring ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-foreground text-sm">{t('createEvent.startDate')}</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-foreground text-sm">{t('createEvent.startTime')}</Label>
                  <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-foreground text-sm">{t('createEvent.endDate')}</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={date || undefined} className="bg-transparent border-border text-foreground rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-foreground text-sm">{t('createEvent.endTime')}</Label>
                  <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent border-border text-foreground rounded-xl h-12" />
                </div>
              </div>
              <p className="text-muted-foreground text-xs -mt-2">{t('createEvent.endTimeOptional')}</p>
            </>
          ) : (
            <div className="space-y-3">
              <Label className="text-foreground text-sm">{t('createEvent.weekdaySlots')}</Label>
              {recurringSlots.map((slot, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{t('createEvent.slotDay')}</Label>
                    <Select
                      value={String(slot.weekday)}
                      onValueChange={(v) => {
                        const next = [...recurringSlots];
                        next[i] = { ...next[i], weekday: parseInt(v, 10) };
                        setRecurringSlots(next);
                      }}
                    >
                      <SelectTrigger className="bg-transparent border-border text-foreground rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="1">{t('weekdays.monday')}</SelectItem>
                        <SelectItem value="2">{t('weekdays.tuesday')}</SelectItem>
                        <SelectItem value="3">{t('weekdays.wednesday')}</SelectItem>
                        <SelectItem value="4">{t('weekdays.thursday')}</SelectItem>
                        <SelectItem value="5">{t('weekdays.friday')}</SelectItem>
                        <SelectItem value="6">{t('weekdays.saturday')}</SelectItem>
                        <SelectItem value="0">{t('weekdays.sunday')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{t('createEvent.slotStart')}</Label>
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => {
                        const next = [...recurringSlots];
                        next[i] = { ...next[i], startTime: e.target.value };
                        setRecurringSlots(next);
                      }}
                      className="bg-transparent border-border text-foreground rounded-xl h-10 w-[110px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{t('createEvent.slotEnd')}</Label>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => {
                        const next = [...recurringSlots];
                        next[i] = { ...next[i], endTime: e.target.value };
                        setRecurringSlots(next);
                      }}
                      className="bg-transparent border-border text-foreground rounded-xl h-10 w-[110px]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRecurringSlots(recurringSlots.filter((_, idx) => idx !== i))}
                    disabled={recurringSlots.length === 1}
                    className="h-10 w-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecurringSlots([...recurringSlots, { weekday: 1, startTime: '', endTime: '' }])}
                className="rounded-xl"
              >
                {t('createEvent.addSlot')}
              </Button>
              <div className="space-y-2">
                <Label htmlFor="recurringUntil" className="text-foreground text-sm">{t('createEvent.repeatUntil')}</Label>
                <Input
                  id="recurringUntil"
                  type="date"
                  value={recurringUntil}
                  onChange={(e) => setRecurringUntil(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="bg-transparent border-border text-foreground rounded-xl h-12"
                />
                <p className="text-muted-foreground text-xs">{t('createEvent.recurringHint')}</p>
              </div>
            </div>
          )}

          {/* Max Participants */}
          {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="maxParticipants" className="text-foreground text-sm">{t('createEvent.maxParticipants')}</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={2}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder={t('createEvent.maxParticipantsPlaceholder')}
                className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
              />
              <p className="text-muted-foreground text-xs">{t('createEvent.maxParticipantsHint')}</p>
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-foreground text-sm">{t('createEvent.price')}</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              placeholder={t('createEvent.pricePlaceholder')}
              className="bg-transparent border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
            />
            <p className="text-muted-foreground text-xs">
              {priceEur && parseFloat(priceEur.replace(',', '.')) > 0
                ? t('createEvent.pricePerTicket', { price: parseFloat(priceEur.replace(',', '.')).toFixed(2) })
                : t('createEvent.priceFreeHint')}
            </p>
          </div>

          {/* Tickets (Pro Hosts & Admins only) */}
          {canManageTickets && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  <Label className="text-foreground text-sm">{t('createEvent.ticketsEnable')}</Label>
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
                      {t('createEvent.ticketsQr')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketMode('link')}
                      className={`flex-1 h-10 rounded-xl text-xs font-semibold border ${ticketMode === 'link' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-foreground border-border'}`}
                    >
                      {t('createEvent.ticketsLink')}
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
                  <p className="text-muted-foreground text-xs">
                    {ticketMode === 'qr'
                      ? t('createEvent.ticketsHintQr')
                      : t('createEvent.ticketsHintLink')}
                  </p>
                </div>
              )}
            </div>
          )}

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
            <Button onClick={handleSubmit} disabled={!title || loading || (!isRecurring && (!date || !time)) || (isRecurring && (!recurringUntil || recurringSlots.some(s => !s.startTime))) || (!isAdmin && (!maxParticipants || parseInt(maxParticipants) < 2))} className="flex-1 h-12 rounded-xl">
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>);
};

export default CreateEventDialog;
