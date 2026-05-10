import { useEventTranslation } from "@/hooks/useEventTranslation";
import { useTranslation } from "react-i18next";

interface Props {
  event: { id: string; description?: string | null } | null | undefined;
  className?: string;
}

const TranslatedDescription = ({ event, className }: Props) => {
  const { t } = useTranslation();
  const { description, isTranslating } = useEventTranslation(event ?? undefined);
  if (!description) return null;
  return (
    <div>
      <p className={`text-muted-foreground whitespace-pre-line ${className ?? ""}`}>{description}</p>
      {isTranslating && (
        <span className="text-xs text-muted-foreground/70 italic">{t("common.translating")}</span>
      )}
    </div>
  );
};

export default TranslatedDescription;
