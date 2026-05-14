import { Upload } from 'lucide-react';

interface FileDropZoneProps {
  onFileLoaded: (fileName: string, xml: string) => void;
  error?: string;
}

export function FileDropZone({ onFileLoaded, error }: FileDropZoneProps) {
  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.bpmn') && !file.name.toLowerCase().endsWith('.xml')) {
      return;
    }

    onFileLoaded(file.name, await file.text());
  }

  return (
    <section
      className="drop-zone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files.item(0);

        if (file) {
          void handleFile(file);
        }
      }}
    >
      <div className="drop-icon">
        <Upload size={34} strokeWidth={1.8} />
      </div>
      <h1>process2agent</h1>
      <p>Ziehe eine BPMN-Datei hierher oder wähle einen Export aus Signavio, Camunda oder einem anderen BPMN-Tool.</p>
      <label className="primary-button">
        BPMN-Datei auswählen
        <input
          accept=".bpmn,.xml"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.item(0);

            if (file) {
              void handleFile(file);
            }
          }}
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <p className="privacy-note">Client-only: Die Datei bleibt im Browser und wird nicht hochgeladen.</p>
    </section>
  );
}
