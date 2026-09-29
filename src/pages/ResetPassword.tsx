import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setSessionReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setSessionReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error(t('auth.errors.passwordShort')); return; }
    if (password !== confirmPassword) { toast.error(t('auth.errors.passwordMismatch')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('auth.success.passwordUpdated'));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--blitz-forest))] text-white flex items-center justify-center p-4 relative" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
      <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/auth')} className="absolute left-4 text-white/70 hover:text-white hover:bg-white/10" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
      </Button>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--bolt))] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[hsl(var(--blitz-forest))] fill-current" />
            </div>
            <span className="text-white text-2xl font-bold">EVENDLE</span>
          </div>
          <h1 className="text-xl font-bold text-white pt-2">{t('auth.newPasswordTitle')}</h1>
        </div>

        {!sessionReady ? (
          <p className="text-center text-white/60 text-sm">{t('auth.verifyingLink')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-white/80">{t('auth.newPassword')} *</Label>
              <div className="relative">
                <Input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white pr-10" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-white/80">{t('auth.confirmPassword')} *</Label>
              <Input id="confirm-new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[hsl(var(--bolt))] hover:bg-[hsl(var(--bolt))]/90 text-[hsl(var(--blitz-forest))] font-bold">
              {loading ? t('auth.saving') : t('auth.updatePassword')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
