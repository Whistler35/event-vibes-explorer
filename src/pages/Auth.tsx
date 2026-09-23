import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { COUNTRIES } from '@/lib/countries';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Upload, ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import evendleLogo from '@/assets/evendle-logo.jpeg';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Capacitor } from '@capacitor/core';

const NATIVE_REDIRECT = 'com.evendle.app://login-callback';
const SUPABASE_URL = 'https://yhetszgeflsldahfuwen.supabase.co';
// Key supabase-js reads when exchangeCodeForSession is called
const CODE_VERIFIER_KEY = 'sb-yhetszgeflsldahfuwen-auth-token-code-verifier';

const generateCodeVerifier = (): string => {
  const array = new Uint8Array(96);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const sha256Hex = async (plain: string): Promise<string> => {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
};

const nativeAppleSignIn = async (): Promise<Error | null> => {
  const rawNonce = generateCodeVerifier(); // same CSPRNG — produces a random string
  const hashedNonce = await sha256Hex(rawNonce);

  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
  const result = await SignInWithApple.authorize({
    clientId: 'com.evendle.app',
    redirectURI: '',
    scopes: 'email name',
    nonce: hashedNonce,
  });

  const identityToken = result.response?.identityToken;
  if (!identityToken) return new Error('No identityToken from Apple');

  // Apple only ever sends givenName/familyName on the user's very first
  // authorization for this app — capture it now so handle_new_user() can use
  // a real name instead of falling back to the (often privaterelay) email.
  const fullName = [result.response?.givenName, result.response?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) return error;

  // signInWithIdToken does not accept user metadata in its options, so update
  // the profile directly after a successful Apple sign-in.
  if (fullName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert(
        { user_id: user.id, name: fullName },
        { onConflict: 'user_id' }
      );
    }
  }
  return null;
};

const nativeOAuth = async (provider: 'google' | 'apple') => {
  toast(`[1] OAuth gestartet (${provider})`, { duration: 15000 });

  // Generate PKCE pair ourselves — supabase.signInWithOAuth with skipBrowserRedirect
  // does NOT write code_verifier to localStorage before returning, so we own it.
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Save to native Preferences before SFSafariViewController opens (isolated process).
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key: CODE_VERIFIER_KEY, value: codeVerifier });
  console.log('[nativeOAuth] code_verifier saved to Preferences:', codeVerifier.slice(0, 20) + '...');
  toast(`[2] code_verifier gesichert (${codeVerifier.slice(0, 12)}…)`, { duration: 15000 });

  // Build Supabase authorize URL with our code_challenge
  const params = new URLSearchParams({
    provider,
    redirect_to: NATIVE_REDIRECT,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
  console.log('[nativeOAuth] Opening URL:', authUrl.slice(0, 80) + '...');

  toast(`[2] Browser öffnet…`, { duration: 15000 });
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: authUrl });
  return null;
};

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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // After OAuth deep-link callback, exchangeCodeForSession fires onAuthStateChange
  // which sets `user` in AuthContext. Navigate to home as soon as that happens.
  useEffect(() => {
    if (user) navigate('/');
  }, [user]);

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
        if (!name || !birthday || !country) {
          toast.error(t('auth.errors.fillRequired'));
          setLoading(false);
          return;
        }

        if (!termsAccepted) {
          toast.error(t('auth.errors.termsRequired'));
          setLoading(false);
          return;
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

        const birthDate = new Date(birthday);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
        const metadata: Record<string, any> = {
          name,
          birthday,
          age: calculatedAge,
          country,
          bio,
        };

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

        // Supabase never returns an error for signUp with an email that's
        // already registered (avoids leaking which emails exist) — instead
        // it returns a "successful" response whose user has no identities.
        // Without this check, re-registering with an existing email showed
        // the same "check your inbox" success screen as a real signup, even
        // though no account was created and no email was sent.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error(t('auth.errors.emailAlreadyRegistered'));
          setIsLogin(true);
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute left-4 text-muted-foreground hover:text-foreground"
          style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('auth.backToHome')}
        </Button>
        <div className="absolute right-4" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}><LanguageSwitcher /></div>
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsForgotPassword(false)} className="absolute left-4 text-muted-foreground hover:text-foreground" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
          <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
        </Button>
        <div className="absolute right-4" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}><LanguageSwitcher /></div>
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
      <Button type="button" variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="absolute left-4 text-muted-foreground hover:text-foreground" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
        <ArrowLeft className="w-4 h-4 mr-1" />{t('common.back')}
      </Button>
      <div className="absolute right-4" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}><LanguageSwitcher /></div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-2xl font-bold">EVENDLE</span>
          </div>
          <p className="text-muted-foreground">{isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthday" className="text-foreground">{t('auth.birthday')} *</Label>
                    <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required max={new Date(new Date().setFullYear(new Date().getFullYear() - 12)).toISOString().split('T')[0]} min="1900-01-01" className="bg-card border-border text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-foreground">{t('auth.country')} *</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country" className="bg-card border-border text-foreground">
                        <SelectValue placeholder={t('auth.country')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">{t('auth.aboutMe')}</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('auth.aboutMePlaceholder')} className="bg-card border-border text-foreground min-h-[80px]" />
                </div>
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(c) => setTermsAccepted(c === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                    {t('auth.termsPrefix')}{' '}
                    <a href="https://www.evendle.com/agb.html" target="_blank" rel="noopener" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {t('auth.termsLinkAgb')}
                    </a>{' '}
                    {t('common.and')}{' '}
                    <a href="https://www.evendle.com/datenschutz.html" target="_blank" rel="noopener" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {t('auth.termsLinkPrivacy')}
                    </a>{' '}
                    {t('auth.termsSuffix')}
                  </Label>
                </div>
              </>
            )}
          </div>

          <Button type="submit" disabled={loading || (!isLogin && !termsAccepted)} className="w-full">
            {loading ? t('common.loading') : isLogin ? t('auth.loginCta') : t('auth.registerCta')}
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
                if (!isLogin && !termsAccepted) {
                  toast.error(t('auth.errors.termsRequired'));
                  return;
                }
                setSocialLoading(true);
                if (Capacitor.isNativePlatform()) {
                  const err = await nativeOAuth('google');
                  if (err) console.error(err);
                } else {
                  // Web: go straight through Supabase. The Lovable auth wrapper
                  // routes via a proxy path that 404s on the custom domain.
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                  });
                  if (error) { toast.error(t('auth.errors.googleFailed')); console.error(error); setSocialLoading(false); }
                  return; // browser is redirecting away
                }
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

            {Capacitor.getPlatform() !== 'android' && (
              <Button type="button" variant="outline" disabled={socialLoading || loading} className="w-full"
                onClick={async () => {
                  if (!isLogin && !termsAccepted) {
                    toast.error(t('auth.errors.termsRequired'));
                    return;
                  }
                  setSocialLoading(true);
                  if (Capacitor.isNativePlatform()) {
                    const err = await nativeAppleSignIn();
                    if (err) { toast.error(t('auth.errors.appleFailed')); console.error(err); }
                  } else {
                    // Web: go straight through Supabase (see Google button above).
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'apple',
                      options: { redirectTo: `${window.location.origin}/auth/callback` },
                    });
                    if (error) { toast.error(t('auth.errors.appleFailed')); console.error(error); setSocialLoading(false); }
                    return; // browser is redirecting away
                  }
                  setSocialLoading(false);
                }}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {t('auth.appleLogin')}
              </Button>
            )}
          </div>

          <div className="text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? t('auth.switchToRegister') : t('auth.switchToLogin')}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            <a href="https://www.evendle.com/datenschutz.html" target="_blank" rel="noopener" className="hover:underline">Datenschutz</a>
            <span className="mx-1.5">·</span>
            <a href="https://www.evendle.com/agb.html" target="_blank" rel="noopener" className="hover:underline">AGB</a>
            <span className="mx-1.5">·</span>
            <a href="https://www.evendle.com/impressum.html" target="_blank" rel="noopener" className="hover:underline">Impressum</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
