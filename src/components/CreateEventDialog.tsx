import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, X } from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  position: [number, number] | null;
  onCreateEvent: (event: {
    position: [number, number];
    title: string;
    description: string;
    date: string;
    time: string;
    image?: string;
  }) => void;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onClose,
  position,
  onCreateEvent
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!position || !title || !date || !time) {
      return;
    }

    onCreateEvent({
      position,
      title,
      description,
      date,
      time,
      image: image || undefined
    });

    // Reset form
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setImage(null);
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setImage(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Radix calls onOpenChange(true) when opening.
        // Only run our close/reset logic when the dialog is closing.
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[400px] bg-evendle-dark border-evendle-gray p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-evendle-orange text-xl font-bold">+</span>
            <span className="text-white text-lg font-semibold">Create evendle</span>
          </div>
          <button 
            onClick={handleClose}
            className="text-evendle-light-gray hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 pt-2 space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-white text-sm">Bild</Label>
            <div className="relative">
              {image ? (
                <div className="relative">
                  <img 
                    src={image} 
                    alt="Event" 
                    className="w-full h-32 object-cover rounded-xl border border-dashed border-evendle-gray"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 bg-evendle-dark-card/80"
                    onClick={() => setImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-evendle-gray rounded-xl cursor-pointer hover:border-evendle-orange/50 transition-colors bg-transparent">
                  <Camera className="h-8 w-8 text-evendle-gray" />
                  <span className="text-sm text-evendle-gray mt-2">Bild hinzufügen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white text-sm">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Was machst du?"
              className="bg-transparent border-evendle-gray text-white placeholder:text-evendle-gray rounded-xl h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white text-sm">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe dein Event..."
              rows={3}
              className="bg-transparent border-evendle-gray text-white placeholder:text-evendle-gray rounded-xl resize-none"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-white text-sm">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="tt.mm.jjjj"
                className="bg-transparent border-evendle-gray text-white rounded-xl h-12 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-white text-sm">Zeit *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="--:--"
                className="bg-transparent border-evendle-gray text-white rounded-xl h-12 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1 h-12 rounded-xl border-evendle-orange text-evendle-orange hover:bg-evendle-orange/10 hover:text-evendle-orange bg-transparent"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!title || !date || !time}
              className="flex-1 h-12 rounded-xl bg-evendle-orange hover:bg-evendle-orange-hover text-white disabled:opacity-50"
            >
              Event erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;