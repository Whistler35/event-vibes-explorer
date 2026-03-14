import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markConversationRead } from "@/hooks/useUnreadDMCount";

const welcomeMessages = [
  {
    id: "1",
    message: "Hey! 👋 Willkommen bei Evendle!",
    time: "09:00",
  },
  {
    id: "2",
    message:
      "Wir freuen uns riesig, dass du hier bist! 🎉 Evendle hilft dir dabei, spannende Events, Veranstaltungen und Unternehmungen in deiner Umgebung zu entdecken.",
    time: "09:00",
  },
  {
    id: "3",
    message:
      "Ob Konzerte, Sport-Events, Food-Märkte oder spontane Hangouts – hier findest du alles, was in deiner Stadt passiert. 🌆",
    time: "09:01",
  },
  {
    id: "4",
    message:
      "Das Beste daran? Du kannst dich mit anderen Leuten verabreden und gemeinsam Offline-Erlebnisse schaffen. Denn die besten Momente passieren im echten Leben! 🤝✨",
    time: "09:01",
  },
  {
    id: "5",
    message:
      "Starte jetzt: Erkunde Events in deiner Nähe, tritt einer Veranstaltung bei und lerne neue Leute kennen. Viel Spaß! 🚀",
    time: "09:02",
  },
];

const EvenldeWelcomeChat = () => {
  const navigate = useNavigate();

  return (
    <Layout showBottomNav={false}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messenger")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <h1 className="text-foreground font-bold text-lg">EVENDLE</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {welcomeMessages.map((msg) => (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card text-foreground px-4 py-2">
                <p className="text-sm">{msg.message}</p>
                <p className="text-[10px] mt-1 text-muted-foreground">
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Info footer */}
        <div className="p-4 border-t border-border bg-background">
          <p className="text-muted-foreground text-xs text-center">
            Dies ist eine automatische Willkommensnachricht von Evendle.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EvenldeWelcomeChat;
