import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setAppLanguage } from "@/i18n";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = (i18n.language || "en").startsWith("de") ? "de" : "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 h-9 rounded-full hover:bg-muted/60 transition-colors"
          aria-label="Sprache wählen"
        >
          <Languages className="w-5 h-5 text-foreground/80" />
          <span className="text-xs font-bold uppercase text-foreground/80">{current}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => setAppLanguage("de", true)}>
          🇩🇪 Deutsch {current === "de" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAppLanguage("en", true)}>
          🇬🇧 English {current === "en" && "✓"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
