import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Upload, User, Building2, Check, ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import evendleLogo from '@/assets/evendle-logo.jpeg';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type UserRole = 'private' | 'professional_host';

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [funFact, setFunFact] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('private');
  const [companyName, setCompanyName] = useState('');
  const [hostWebsite, setHostWebsite] = useState('');
  const [hostInstagram, setHostInstagram] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('auth.errors.imgTooLarge'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(t('auth.errors.notImage'));
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
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
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
          toast.success(t('auth.success.signedIn'), { duration: 1200 });
          navigate('/');
        }
      } else {
        if (selectedRole === 'professional_host') {
          if (!name) {
            toast.error(t('auth.errors.enterName'));
            setLoading(false);
            return;
          }
        } else {
          if (!name || !birthday || !country) {
            toast.error(t('auth.errors.fillRequired'));
            setLoading(false);
            return;
          }
        }

        if (password !== confirmPassword) {
          toast.error(t('auth.errors.passwordMismatch'));
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error(t('auth.errors.passwordShort'));
          setLoading(false);
          return;
        }

        const metadata: Record<string, any> = { name };
        if (selectedRole === 'professional_host') {
          metadata.is_professional_host = true;
          if (companyName) metadata.company_name = companyName;
          if (hostWebsite) metadata.website_url = hostWebsite;
          if (hostInstagram) metadata.instagram_username = hostInstagram;
        } else {
          const birthDate = new Date(birthday);
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
          metadata.birthday = birthday;
          metadata.age = calculatedAge;
          metadata.country = country;
          metadata.bio = bio;
          metadata.fun_fact = funFact;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: metadata },
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
            await supabase.from('profiles').update({ avatar_url: finalAvatarUrl }).eq('user_id', data.user.id);
          } catch (uploadError) {
            console.error('Error uploading avatar:', uploadError);
          }
        }

        setSignupSuccessEmail(email);
      }
    } catch (error: any) {
      toast.error(t('auth.errors.generic'));
    }
    setLoading(false);
  };

  if (signupSuccessEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('auth.backToHome')}
        </Button>
        <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex items-center justify-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-2xl font-bold">EVENDLE</span>
          </div>
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{t('auth.thanksTitle')}</h1>
            <p className="text-muted-foreground">{t('auth.thanksBody1', { email: signupSuccessEmail })}</p>
            <p className="text-muted-foreground">{t('auth.thanksBody2')}</p>
            <p className="text-sm text-muted-foreground">{t('auth.thanksHint')}</p>
          </div>
          <div className="space-y-3 pt-2">
            <Button type="button" className="w-full" onClick={() => { setSignupSuccessEmail(null); setIsLogin(true); }}>
              {t('auth.backToLogin')}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/')}>
              {t('auth.backToHome')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isForgotPassword) {
    const handleResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) { toast.error(t('auth.errors.enterEmail')); return; }
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setResetLoading(false);
      if (error) toast.error(error.message);
      else { toast.success(t('auth.success.resetSent')); setIsForgotPassword(false); }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsForgotPassword(false)} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
        </Button>
        <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
              <span className="text-foreground text-2xl font-bold">EVENDLE</span>
            </div>
            <h1 className="text-xl font-bold text-foreground pt-2">{t('auth.forgotTitle')}</h1>
            <p className="text-muted-foreground text-sm">{t('auth.forgotSub')}</p>
          </div>
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-foreground">{t('auth.email')} *</Label>
              <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-card border-border text-foreground" />
            </div>
            <Button type="submit" disabled={resetLoading} className="w-full">
              {resetLoading ? t('auth.sending') : t('auth.sendResetLink')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Button type="button" variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
      </Button>
      <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-2xl font-bold">EVENDLE</span>
          </div>
          <p className="text-muted-foreground">{isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <RoleSelector selected={selectedRole} onSelect={setSelectedRole} />}

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
                <Label htmlFor="avatar-file" className="text-foreground">{t('auth.uploadPhoto')}</Label>
                <input ref={fileInputRef} id="avatar-file" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                  {avatarFile ? avatarFile.name : t('auth.choosePhoto')}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">{t('auth.email')} *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-card border-border text-foreground" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">{t('auth.password')} *</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-card border-border text-foreground pr-10" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isLogin && (
                <div className="text-right">
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-primary hover:underline">
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">{t('auth.confirmPassword')} *</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-card border-border text-foreground pr-10" />
                    <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">{t('auth.name')} *</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="bg-card border-border text-foreground" />
                </div>

                {selectedRole === 'professional_host' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-foreground">{t('auth.companyName')}</Label>
                      <Input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t('auth.companyPh')} className="bg-card border-border text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hostWebsite" className="text-foreground">{t('auth.website')}</Label>
                      <Input id="hostWebsite" type="url" value={hostWebsite} onChange={(e) => setHostWebsite(e.target.value)} placeholder="https://your-website.com" className="bg-card border-border text-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hostInstagram" className="text-foreground">{t('auth.instagram')}</Label>
                      <Input id="hostInstagram" type="text" value={hostInstagram} onChange={(e) => setHostInstagram(e.target.value)} placeholder="@your_handle" className="bg-card border-border text-foreground" />
                    </div>
                  </>
                )}

                {selectedRole !== 'professional_host' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthday" className="text-foreground">{t('auth.birthday')} *</Label>
                        <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]} min="1900-01-01" className="bg-card border-border text-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-foreground">{t('auth.country')} *</Label>
                        <Input id="country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} required className="bg-card border-border text-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-foreground">{t('auth.aboutMe')}</Label>
                      <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('auth.aboutMePlaceholder')} className="bg-card border-border text-foreground min-h-[80px]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="funFact" className="text-foreground">{t('auth.funFact')}</Label>
                      <Textarea id="funFact" value={funFact} onChange={(e) => setFunFact(e.target.value)} placeholder={t('auth.funFactPlaceholder')} className="bg-card border-border text-foreground min-h-[80px]" />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t('common.loading') : isLogin ? t('auth.loginCta') : selectedRole === 'professional_host' ? t('auth.registerHostCta') : t('auth.registerCta')}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('common.or')}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button type="button" variant="outline" disabled={socialLoading || loading} className="w-full"
              onClick={async () => {
                setSocialLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (error) { toast.error(t('auth.errors.googleFailed')); console.error(error); }
                setSocialLoading(false);
              }}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('auth.googleLogin')}
            </Button>

            <Button type="button" variant="outline" disabled={socialLoading || loading} className="w-full"
              onClick={async () => {
                setSocialLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                if (error) { toast.error(t('auth.errors.appleFailed')); console.error(error); }
                setSocialLoading(false);
              }}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {t('auth.appleLogin')}
            </Button>
          </div>

          <div className="text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? t('auth.switchToRegister') : t('auth.switchToLogin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function RoleSelector({ selected, onSelect }: { selected: UserRole; onSelect: (role: UserRole) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{t('auth.roleTitle')}</Label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onSelect('private')}
          className={cn('relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            selected === 'private' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-muted-foreground/40')}>
          {selected === 'private' && (<div className="absolute top-2 right-2 rounded-full bg-primary p-0.5"><Check className="w-3 h-3 text-primary-foreground" /></div>)}
          <User className="w-8 h-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t('auth.rolePrivate')}</span>
          <span className="text-xs text-muted-foreground">{t('auth.rolePrivateSub')}</span>
        </button>
        <button type="button" onClick={() => onSelect('professional_host')}
          className={cn('relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            selected === 'professional_host' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-muted-foreground/40')}>
          {selected === 'professional_host' && (<div className="absolute top-2 right-2 rounded-full bg-primary p-0.5"><Check className="w-3 h-3 text-primary-foreground" /></div>)}
          <Building2 className="w-8 h-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t('auth.roleHost')}</span>
          <span className="text-xs text-muted-foreground">{t('auth.roleHostSub')}</span>
        </button>
      </div>
    </div>
  );
}

export default Auth;
