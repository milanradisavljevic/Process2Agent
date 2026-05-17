import { Download, Upload } from 'lucide-react';

interface ExportImportProps {
  onExport: () => void;
  onImport: (file: File) => void;
}

export function ExportImport({ onExport, onImport }: ExportImportProps) {
  return (
    <div className="export-import-actions">
      <button type="button" className="secondary-button" onClick={onExport}>
        <Download size={15} /> Exportieren
      </button>
      <label className="secondary-button">
        <Upload size={15} /> Importieren
        <input
          accept=".p2a.json,application/json"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.item(0);
            if (file) onImport(file);
            event.currentTarget.value = '';
          }}
        />
      </label>
    </div>
  );
}
