import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface AnalyzingViewProps {
  elementCount: number;
}

export function AnalyzingView({ elementCount }: AnalyzingViewProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (elementCount === 0) return;
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [elementCount]);

  const steps = [
    { label: 'BPMN-Struktur parsen', done: step >= 0, active: step === 0 },
    { label: 'Schritte extrahieren', done: step >= 1, active: step === 1 },
    { label: 'KI-Analyse ausführen', done: step >= 2, active: step === 2 },
    { label: 'Empfehlungen aufbereiten', done: step >= 3, active: step === 3 },
  ];

  return (
    <div className="analyzing-view view-transition">
      <div className="analyzing-card">
        <div className="analyzing-spinner" />
        <h2>Prozess wird analysiert…</h2>
        <p>{elementCount} Schritte werden von der KI bewertet. Das dauert ca. 10–15 Sekunden.</p>
        <div className="analyzing-steps">
          {steps.map((s, i) => (
            <div key={i} className={`analyzing-step ${s.done ? 'done' : ''} ${s.active ? 'active' : ''}`}>
              <span className="analyzing-step-dot" />
              {s.done && !s.active ? <Check size={14} /> : null}
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
