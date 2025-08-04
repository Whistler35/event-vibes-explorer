import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || profileLoading) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-white">Lädt...</div>
        </div>
      </Layout>
    );
  }

  if (!user || !profile) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="text-white">Profil nicht gefunden</div>
            <Button onClick={() => navigate('/auth')}>
              Zur Anmeldung
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-evendle-orange text-2xl font-bold">+</div>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="icon"
            className="text-evendle-light-gray hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Info */}
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-evendle-orange/20 to-evendle-dark-card">
            <img 
              src={profile.avatar_url || "https://images.unsplash.com/photo-1494790108755-2616b9b36f21?w=400&h=400&fit=crop&crop=face"} 
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* User Info */}
          <div className="space-y-2">
            <h1 className="text-white text-2xl font-bold">
              {profile.name} {profile.age} {profile.country}
            </h1>
          </div>

          {/* About Me */}
          <div className="text-left space-y-4">
            {profile.bio && (
              <div>
                <h3 className="text-white font-bold text-lg mb-2">About me:</h3>
                <p className="text-evendle-light-gray">{profile.bio}</p>
              </div>
            )}

            {profile.fun_fact && (
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Fun fact:</h3>
                <p className="text-evendle-light-gray">{profile.fun_fact}</p>
              </div>
            )}
          </div>

          {/* Instagram Section */}
          {profile.instagram_username && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg text-left">Instagram</h3>
              
              <div className="flex items-center justify-between bg-card rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      src={profile.avatar_url || "https://images.unsplash.com/photo-1494790108755-2616b9b36f21?w=400&h=400&fit=crop&crop=face"} 
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{profile.instagram_username}</p>
                    <p className="text-evendle-gray text-sm">{profile.instagram_followers || "0 followers"}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="border-evendle-orange text-evendle-orange hover:bg-evendle-orange hover:text-white"
                >
                  View Profile
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;