import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const EventHangouts = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hangouts = [
    {
      id: 1,
      title: "Namaste, Y'all! – Americans at the Yoga Fest",
      description: "We're a bunch of friendly Americans hanging out at the yoga festival – but hey, everyone's welcome, so bring your mat and your best stretch-face!",
      image: "/lovable-uploads/1f219cc4-7569-43b7-9747-68323b41b3a3.png",
      members: 8
    },
    {
      id: 2,
      title: "🌸 Girls Just Wanna Have Zen – Yoga Hangout for Women Only",
      description: "Hey ladies! Let's unwind, stretch, and share some laughs together at this girls-only yoga session in the park. No pressure, no judgment – just good vibes, fresh air,",
      image: "/lovable-uploads/0a476701-1f3e-4c0f-b23d-e9d052c0b188.png",
      members: 12
    },
    {
      id: 3,
      title: "Beer Yoga – Stretch & Sip!",
      description: "Grab a beer, then grab a mat – in that order. Join us for a not-so-serious yoga session where good vibes and good brews come together.",
      image: "/lovable-uploads/69da9fd1-98bf-4322-8993-cc5e88b359a7.png",
      members: 15
    }
  ];

  return (
    <Layout showBottomNav={true}>
      <div className="relative">
        {/* Header with Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-black/20 backdrop-blur-sm flex items-center"
          >
            <ArrowLeft className="text-evendle-orange" size={24} />
            <span className="text-white ml-2">evendle</span>
          </button>
        </div>

        {/* Event Image */}
        <div className="aspect-video bg-gradient-to-br from-evendle-orange/20 to-evendle-dark-card overflow-hidden">
          <img 
            src="/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png" 
            alt="Namaste for All"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              className="flex-1 bg-evendle-gray hover:bg-evendle-gray/80 text-white py-3 rounded-2xl font-medium"
              onClick={() => {/* Navigate to search hangouts */}}
            >
              {t("eventHangouts.lookFor")}
            </Button>
            <Button 
              className="flex-1 bg-evendle-orange hover:bg-evendle-orange-hover text-white py-3 rounded-2xl font-medium"
              onClick={() => {/* Navigate to create hangout */}}
            >
              {t("eventHangouts.create")}
            </Button>
          </div>

          {/* Hangouts List */}
          <div className="space-y-4">
            {hangouts.map((hangout) => (
              <div 
                key={hangout.id}
                className="bg-card rounded-2xl p-4 cursor-pointer transition-transform duration-200 hover:scale-105"
                onClick={() => navigate(`/chat/${hangout.id}`)}
              >
                <div className="flex space-x-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={hangout.image} 
                      alt={hangout.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {hangout.title}
                    </h3>
                    <p className="text-evendle-light-gray text-sm leading-relaxed line-clamp-3">
                      {hangout.description}
                    </p>
                    <div className="flex items-center space-x-1 text-evendle-gray text-sm">
                      <Users size={16} />
                      <span>{hangout.members} members</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </Layout>
  );
};

export default EventHangouts;