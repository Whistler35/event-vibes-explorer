import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markConversationRead } from "@/hooks/useUnreadDMCount";

const messageTimes = ["09:00", "09:00", "09:01", "09:01", "09:02"];

const EvenldeWelcomeChat = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const messages = (t("welcomeChat.messages", { returnObjects: true }) as string[]) ?? [];

  useEffect(() => {
    markConversationRead("evendle-welcome");
  }, []);

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
          {messages.map((msg, i) => (
            <div key={i} className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card text-foreground px-4 py-2">
                <p className="text-sm">{msg}</p>
                <p className="text-[10px] mt-1 text-muted-foreground">
                  {messageTimes[i]}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Info footer */}
        <div className="p-4 border-t border-border bg-background">
          <p className="text-muted-foreground text-xs text-center">
            {t("welcomeChat.footer")}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EvenldeWelcomeChat;
