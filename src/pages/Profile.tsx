import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Instagram, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingEventsCount } from "@/hooks/usePendingEventsCount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const { isAdmin, count: pendingCount } = usePendingEventsCount();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Erfolgreich ausgeloggt');
    navigate('/');
  };


  const profile = {
    name: "Max Mustermann",
    age: 27,
    country: "🇩🇪",
    bio: "Ich liebe es, neue Leute kennenzulernen und spontane Abenteuer zu erleben. Am liebsten bin ich draußen unterwegs – ob beim Wandern, auf Festivals oder in gemütlichen Cafés.",
    fun_fact: "Ich habe mal aus Versehen an einem Marathon teilgenommen, weil ich dachte, es wäre ein 5km-Lauf. 🏃‍♂️",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    instagram_username: "@max.mustermann",
    instagram_followers: "1.2k followers",
  };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-evendle-orange text-2xl font-bold">+</div>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <Button variant="ghost" size="icon" className="relative text-green-400 hover:text-green-300" onClick={() => navigate('/admin/events')}>
                <ShieldCheck className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-evendle-light-gray hover:text-white">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-evendle-orange">
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* User Info */}
          <div className="space-y-1">
            <h1 className="text-white text-2xl font-bold">
              {profile.name}, {profile.age} {profile.country}
            </h1>
          </div>

          {/* About Me */}
          <div className="text-left space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">About me:</h3>
              <p className="text-evendle-light-gray">{profile.bio}</p>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-2">Fun fact:</h3>
              <p className="text-evendle-light-gray">{profile.fun_fact}</p>
            </div>
          </div>

          {/* Instagram Section */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg text-left">Instagram</h3>

            <div className="flex items-center justify-between bg-card rounded-2xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold">{profile.instagram_username}</p>
                  <p className="text-evendle-gray text-sm">{profile.instagram_followers}</p>
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
        </div>
      </div>
    </Layout>
  );
};

export default Profile;