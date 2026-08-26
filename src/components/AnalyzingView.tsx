interface AnalyzingViewProps {
  elementCount?: number;
  variant?: 'loading' | 'analyzing';
}

const LOADING_TEXT = 'Workspace wird geladen…';
const ANALYZING_TEXT = 'KI-Analyse läuft…';

export function AnalyzingView({ elementCount = 0, variant = 'loading' }: AnalyzingViewProps) {
  const title = variant === 'analyzing' ? ANALYZING_TEXT : LOADING_TEXT;
  const detail = variant === 'analyzing' && elementCount > 0
    ? `${elementCount} Schritte werden durch das konfigurierte LLM bewertet. Dies dauert je nach Provider und Modell einige Sekunden.`
    : 'Einen Moment bitte.';

  return (
    <div className="analyzing-view view-transition">
      <div className="analyzing-card">
        <div className="analyzing-spinner" aria-hidden="true" />
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </div>
  );
}
