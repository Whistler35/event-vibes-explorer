import { Component, type ErrorInfo, type ReactNode } from "react";
import { Zap } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Without this, any uncaught render error (bad data shape, null ref, etc.)
// takes the whole app down to a blank white screen with no way back.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center">
          <Zap className="w-9 h-9 text-white fill-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase">Etwas ist schiefgelaufen</h1>
          <p className="text-white/70 max-w-xs mx-auto text-sm">
            Bitte lade die App neu. Falls das öfter passiert, sag uns kurz Bescheid.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] font-black uppercase tracking-wider active:scale-95 transition"
        >
          Neu laden
        </button>
      </div>
    );
  }
}
