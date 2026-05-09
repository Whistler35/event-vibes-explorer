import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import EventChat from "@/components/EventChat";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EventChatPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    if (id) {
      supabase
        .from("events")
        .select("title")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setEventTitle(data.title);
        });
    }
  }, [id]);

  if (!id) return null;

  return (
    <Layout showBottomNav={false}>
      <div className="flex flex-col h-[100dvh]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-foreground font-bold truncate">{eventTitle || "Gruppenchat"}</h1>
            <p className="text-muted-foreground text-xs">Gruppenchat</p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 min-h-0">
          <EventChat eventId={id} eventTitle={eventTitle} />
        </div>
      </div>
    </Layout>
  );
};

export default EventChatPage;
