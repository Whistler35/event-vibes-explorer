import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Upload, User, Building2, Check, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import evendleLogo from '@/assets/evendle-logo.jpeg';
import { cn } from '@/lib/utils';

type UserRole = 'private' | 'professional_host';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
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
        toast.error('Image too large. Maximum 5MB allowed.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
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

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const createHostProfile = async (userId: string) => {
    // Get pay-per-event plan as default
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'pay-per-event')
      .single();

    // Assign professional_host role
    await supabase.from('user_roles').insert({
      user_id: userId,
      role: 'professional_host' as any,
    });

    // Create host profile
    await supabase.from('host_profiles').insert({
      user_id: userId,
      company_name: companyName || null,
      current_plan_id: plan?.id || null,
    } as any);
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
          toast.success('Signed in successfully!', { duration: 1200 });
          navigate('/');
        }
      } else {
        if (selectedRole === 'professional_host') {
          if (!name) {
            toast.error('Please enter your name');
            setLoading(false);
            return;
          }
        } else {
          if (!name || !birthday || !country) {
            toast.error('Please fill in all required fields');
            setLoading(false);
            return;
          }
        }

        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error('Password must be at least 6 characters');
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
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          metadata.birthday = birthday;
          metadata.age = calculatedAge;
          metadata.country = country;
          metadata.bio = bio;
          metadata.fun_fact = funFact;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: metadata,
          },
        });

        if (signUpError) {
          toast.error(signUpError.message);
          setLoading(false);
          return;
        }

        // Upload avatar
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
          }
        }

        // Host profile is created automatically via DB trigger on email confirmation

        toast.success('Sign up successful! Please confirm your email.');
      }
    } catch (error: any) {
      toast.error('An error occurred');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Zurück
      </Button>
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-2xl font-bold">EVENDLE</span>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? 'Sign in' : 'Create your profile'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection for Register */}
          {!isLogin && (
            <RoleSelector selected={selectedRole} onSelect={setSelectedRole} />
          )}

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
                <Label htmlFor="avatar-file" className="text-foreground">Upload profile picture (optional)</Label>
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
                  {avatarFile ? avatarFile.name : 'Choose photo'}
                </Button>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email *</Label>
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
              <Label htmlFor="password" className="text-foreground">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-card border-border text-foreground"
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm password *</Label>
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

                {selectedRole === 'professional_host' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-foreground">Company name (optional)</Label>
                      <Input
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Your Company Ltd."
                        className="bg-card border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hostWebsite" className="text-foreground">Website (optional)</Label>
                      <Input
                        id="hostWebsite"
                        type="url"
                        value={hostWebsite}
                        onChange={(e) => setHostWebsite(e.target.value)}
                        placeholder="https://your-website.com"
                        className="bg-card border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hostInstagram" className="text-foreground">Instagram (optional)</Label>
                      <Input
                        id="hostInstagram"
                        type="text"
                        value={hostInstagram}
                        onChange={(e) => setHostInstagram(e.target.value)}
                        placeholder="@your_handle"
                        className="bg-card border-border text-foreground"
                      />
                    </div>
                  </>
                )}

                {selectedRole !== 'professional_host' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birthday" className="text-foreground">Geburtstag *</Label>
                        <Input
                          id="birthday"
                          type="date"
                          value={birthday}
                          onChange={(e) => setBirthday(e.target.value)}
                          required
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                          min="1900-01-01"
                          className="bg-card border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-foreground">Country *</Label>
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
                      <Label htmlFor="bio" className="text-foreground">About me</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell something about yourself..."
                        className="bg-card border-border text-foreground min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="funFact" className="text-foreground">Fun Fact</Label>
                      <Textarea
                        id="funFact"
                        value={funFact}
                        onChange={(e) => setFunFact(e.target.value)}
                        placeholder="Share an interesting fact about yourself..."
                        className="bg-card border-border text-foreground min-h-[80px]"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Loading...'
              : isLogin
              ? 'Sign in'
              : selectedRole === 'professional_host'
              ? 'Sign up as Professional Host'
              : 'Sign up'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Social Login */}
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
                  toast.error('Google sign-in failed');
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
              Sign in with Google
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
                  toast.error('Apple sign-in failed');
                  console.error(error);
                }
                setSocialLoading(false);
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Sign in with Apple
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
                ? "Don't have an account? Sign up"
                : 'Already registered? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Role selection component
function RoleSelector({
  selected,
  onSelect,
}: {
  selected: UserRole;
  onSelect: (role: UserRole) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">Choose account type</Label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSelect('private')}
          className={cn(
            'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            selected === 'private'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-muted-foreground/40'
          )}
        >
          {selected === 'private' && (
            <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <User className="w-8 h-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">Private</span>
          <span className="text-xs text-muted-foreground">Free</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect('professional_host')}
          className={cn(
            'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            selected === 'professional_host'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-muted-foreground/40'
          )}
        >
          {selected === 'professional_host' && (
            <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <Building2 className="w-8 h-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">Professional Host</span>
          <span className="text-xs text-muted-foreground">From €29.90</span>
        </button>
      </div>
    </div>
  );
}

export default Auth;
