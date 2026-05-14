interface AnalyzingViewProps {
  elementCount: number;
}

export function AnalyzingView({ elementCount }: AnalyzingViewProps) {
  return (
    <div className="analyzing-view">
      <div className="analyzing-card">
        <div className="analyzing-spinner" />
        <h2>Prozess wird analysiert…</h2>
        <p>{elementCount} Schritte werden von der KI bewertet. Das dauert ca. 10–15 Sekunden.</p>
      </div>
    </div>
  );
}
