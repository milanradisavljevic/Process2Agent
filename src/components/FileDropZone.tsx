import { useState } from 'react';
import { Upload, ShieldCheck, Sparkles } from 'lucide-react';

interface FileDropZoneProps {
  onFileLoaded: (fileName: string, xml: string) => void;
  onDemoLoaded?: () => void;
  error?: string;
}

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
      <div className="drop-icon">
        <Upload size={32} strokeWidth={1.6} />
      </div>
      <h1>process2agent</h1>
      <p>KI-Readiness Assessment für Geschäftsprozesse — direkt im Browser.</p>
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
            <Sparkles size={15} /> Demo-Prozess laden
          </button>
        )}
        <p className="drop-hint">
          Oder BPMN-Datei hierher ziehen · Signavio, Camunda, BPMN.io
        </p>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="privacy-badge">
        <ShieldCheck size={13} strokeWidth={2.5} />
        Client-only — Dateien verlassen nicht den Browser
      </div>
    </section>
  );
}
