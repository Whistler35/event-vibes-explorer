import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import evendleLogo from '@/assets/evendle-logo.jpeg';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [funFact, setFunFact] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Bild ist zu groß. Maximal 5MB erlaubt.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Bitte wähle eine Bilddatei aus.');
        return;
      }
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
    }
  };

  const uploadAvatar = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Erfolgreich eingeloggt!');
          navigate('/');
        }
      } else {
        if (!name || !age || !country) {
          toast.error('Bitte fülle alle Pflichtfelder aus');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          toast.error('Passwörter stimmen nicht überein');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error('Passwort muss mindestens 6 Zeichen lang sein');
          setLoading(false);
          return;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
              age: parseInt(age),
              country,
              bio,
              fun_fact: funFact
            }
          }
        });

        if (signUpError) {
          toast.error(signUpError.message);
          setLoading(false);
          return;
        }

        let finalAvatarUrl = avatarUrl;
        if (avatarFile && data.user) {
          try {
            finalAvatarUrl = await uploadAvatar(avatarFile, data.user.id);
            
            await supabase
              .from('profiles')
              .update({ avatar_url: finalAvatarUrl })
              .eq('user_id', data.user.id);
              
          } catch (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            toast.error('Profilbild konnte nicht hochgeladen werden, aber Registrierung war erfolgreich');
          }
        }

        toast.success('Registrierung erfolgreich! Bitte bestätige deine E-Mail.');
      }
    } catch (error: any) {
      toast.error('Ein Fehler ist aufgetreten');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-2xl font-bold">EVENDLE</span>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? 'Melde dich an' : 'Erstelle dein Profil'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture for Register */}
          {!isLogin && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {name ? name[0].toUpperCase() : <Camera className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
                  <Upload className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor="avatar-file" className="text-foreground">Profilbild hochladen (optional)</Label>
                <input
                  ref={fileInputRef}
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {avatarFile ? avatarFile.name : 'Foto auswählen'}
                </Button>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-card border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Passwort *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-card border-border text-foreground"
              />
            </div>

            {/* Additional fields for Register */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Passwort bestätigen *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-card border-border text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-foreground">Alter *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      min="16"
                      max="100"
                      className="bg-card border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-foreground">Land *</Label>
                    <Input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="bg-card border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">Über mich</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Erzähle etwas über dich..."
                    className="bg-card border-border text-foreground min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funFact" className="text-foreground">Fun Fact</Label>
                  <Textarea
                    id="funFact"
                    value={funFact}
                    onChange={(e) => setFunFact(e.target.value)}
                    placeholder="Teile einen interessanten Fakt über dich..."
                    className="bg-card border-border text-foreground min-h-[80px]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Lädt...' : isLogin ? 'Anmelden' : 'Registrieren'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">oder</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              disabled={socialLoading || loading}
              className="w-full"
              onClick={async () => {
                setSocialLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast.error('Google Login fehlgeschlagen');
                  console.error(error);
                }
                setSocialLoading(false);
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Mit Google anmelden
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={socialLoading || loading}
              className="w-full"
              onClick={async () => {
                setSocialLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast.error('Apple Login fehlgeschlagen');
                  console.error(error);
                }
                setSocialLoading(false);
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Mit Apple anmelden
            </Button>
          </div>

          {/* Toggle Login/Register */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin 
                ? 'Noch kein Account? Jetzt registrieren' 
                : 'Bereits registriert? Anmelden'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
