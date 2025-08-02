import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const user = {
    name: "James Cook",
    age: 34,
    country: "USA",
    avatar: "/lovable-uploads/c5cfa817-d10d-4311-808f-e2d1cb7de838.png",
    bio: "Outgoing urban explorer and travel lover 🌍 📸",
    funFact: "I've backpacked across three continents.",
    instagram: {
      username: "jamescook",
      followers: "2.1k followers",
      photos: [
        "/lovable-uploads/b5f1b986-aaa0-4148-933c-cabcd3bb5e00.png",
        "/lovable-uploads/69da9fd1-98bf-4322-8993-cc5e88b359a7.png", 
        "/lovable-uploads/0a476701-1f3e-4c0f-b23d-e9d052c0b188.png"
      ]
    }
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
        </div>

        {/* Profile Info */}
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-evendle-orange/20 to-evendle-dark-card">
            <img 
              src="https://images.unsplash.com/photo-1494790108755-2616b9b36f21?w=400&h=400&fit=crop&crop=face" 
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* User Info */}
          <div className="space-y-2">
            <h1 className="text-white text-2xl font-bold">
              {user.name} {user.age} {user.country}
            </h1>
          </div>

          {/* About Me */}
          <div className="text-left space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">About me:</h3>
              <p className="text-evendle-light-gray">{user.bio}</p>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-2">Fun fact:</h3>
              <p className="text-evendle-light-gray">{user.funFact}</p>
            </div>
          </div>

          {/* Instagram Section */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg text-left">Instagram</h3>
            
            <div className="flex items-center justify-between bg-card rounded-2xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold">{user.instagram.username}</p>
                  <p className="text-evendle-gray text-sm">{user.instagram.followers}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-evendle-orange text-evendle-orange hover:bg-evendle-orange hover:text-white"
              >
                View Profile
              </Button>
            </div>

            {/* Instagram Photos */}
            <div className="grid grid-cols-3 gap-2">
              {user.instagram.photos.map((photo, index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden">
                  <img 
                    src={photo} 
                    alt={`Instagram photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;