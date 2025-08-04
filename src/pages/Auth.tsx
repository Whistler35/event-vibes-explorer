import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [funFact, setFunFact] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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

        const metadata = {
          name,
          age: parseInt(age),
          country,
          bio,
          fun_fact: funFact,
          avatar_url: avatarUrl
        };

        const { error } = await signUp(email, password, metadata);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Registrierung erfolgreich! Bitte bestätige deine E-Mail.');
        }
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
            <div className="text-evendle-orange text-3xl font-bold">+</div>
            <span className="text-white text-2xl font-bold">evendle</span>
          </div>
          <p className="text-evendle-light-gray">
            {isLogin ? 'Melde dich an' : 'Erstelle dein Profil'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture for Register */}
          {!isLogin && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-evendle-dark-card text-evendle-light-gray">
                    {name ? name[0].toUpperCase() : <Camera className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor="avatar" className="text-white">Profilbild URL (optional)</Label>
                <Input
                  id="avatar"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-evendle-dark-card border-evendle-gray text-white"
                />
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-evendle-dark-card border-evendle-gray text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Passwort *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-evendle-dark-card border-evendle-gray text-white"
              />
            </div>

            {/* Additional fields for Register */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-evendle-dark-card border-evendle-gray text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-white">Alter *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      min="16"
                      max="100"
                      className="bg-evendle-dark-card border-evendle-gray text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-white">Land *</Label>
                    <Input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="bg-evendle-dark-card border-evendle-gray text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-white">Über mich</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Erzähle etwas über dich..."
                    className="bg-evendle-dark-card border-evendle-gray text-white min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funFact" className="text-white">Fun Fact</Label>
                  <Textarea
                    id="funFact"
                    value={funFact}
                    onChange={(e) => setFunFact(e.target.value)}
                    placeholder="Teile einen interessanten Fakt über dich..."
                    className="bg-evendle-dark-card border-evendle-gray text-white min-h-[80px]"
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

          {/* Toggle Login/Register */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-evendle-orange hover:underline"
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