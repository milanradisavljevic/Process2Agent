import { useState } from 'react';
import { FileText, ScanSearch, ShieldCheck, Upload } from 'lucide-react';

interface FileDropZoneProps {
  onFileLoaded: (fileName: string, xml: string) => void;
  onDemoLoaded?: () => void;
  error?: string;
}

const STEPS = [
  { icon: Upload, title: '1 · Importieren', text: 'BPMN 2.0 aus Signavio, Camunda oder bpmn.io — per Drag & Drop.' },
  { icon: ScanSearch, title: '2 · Bewerten', text: 'Jeder Schritt erhält Pattern-, Datenschutz- und Komplexitätsvorschlag.' },
  { icon: FileText, title: '3 · Report', text: 'Druckfertiger AI-Readiness-Report mit Begründungen und offenen Punkten.' },
];

export function FileDropZone({ onFileLoaded, onDemoLoaded, error }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.bpmn') && !file.name.toLowerCase().endsWith('.xml')) {
      return;
    }
    onFileLoaded(file.name, await file.text());
  }

  return (
    <section
      className="drop-zone"
      onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files.item(0);
        if (file) void handleFile(file);
      }}
    >
      <p className="brand">PROCESS2AGENT</p>
      <h1>process<span className="brand-accent">2</span>agent</h1>
      <p className="drop-subtitle">KI-Readiness Assessment für Geschäftsprozesse — direkt im Browser.</p>

      <div className={dragOver ? 'drop-zone-card drag-over' : 'drop-zone-card'}>
        <label className="primary-button">
          BPMN-Datei auswählen
          <input
            accept=".bpmn,.xml"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.item(0);
              if (file) void handleFile(file);
            }}
          />
        </label>
        {onDemoLoaded && (
          <button type="button" className="secondary-button drop-demo-button" onClick={onDemoLoaded}>
            Demo-Prozess laden
          </button>
        )}
        <p className="drop-hint">
          oder Datei hierher ziehen · .bpmn / .xml
        </p>
      </div>

      <div className="drop-steps">
        {STEPS.map((step) => (
          <div key={step.title} className="drop-step">
            <span className="drop-step-icon"><step.icon size={17} strokeWidth={1.8} /></span>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </div>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      <div className="privacy-badge">
        <ShieldCheck size={13} strokeWidth={2.5} />
        Client-only — Dateien verlassen nicht den Browser
      </div>
    </section>
  );
}
