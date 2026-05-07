import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import evendleLogo from '@/assets/evendle-logo.jpeg';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash automatically and emits a SIGNED_IN / PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Passwort erfolgreich aktualisiert');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => navigate('/auth')}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Zurück
      </Button>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-2xl font-bold">EVENDLE</span>
          </div>
          <h1 className="text-xl font-bold text-foreground pt-2">Neues Passwort wählen</h1>
        </div>

        {!sessionReady ? (
          <p className="text-center text-muted-foreground text-sm">
            Link wird überprüft...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">Neues Passwort *</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-card border-border text-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-foreground">Passwort bestätigen *</Label>
              <Input
                id="confirm-new-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-card border-border text-foreground"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Speichere...' : 'Passwort aktualisieren'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
