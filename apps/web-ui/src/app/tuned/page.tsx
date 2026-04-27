import { quotes } from "@/lib/quotes";
import TunedPlayer from "@/components/TunedPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function TunedPage() {
  return (
    <ErrorBoundary>
      <TunedPlayer quotes={quotes} />
    </ErrorBoundary>
  );
}
