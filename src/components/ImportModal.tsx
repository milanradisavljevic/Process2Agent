import { useState } from 'react';
import type { Area } from '../types/workspace';

interface ImportModalProps {
  fileName: string;
  areas: Area[];
  targetAreaId?: string;
  onCancel: () => void;
  onImport: (areaId: string, processName: string, startAnalysis: boolean) => void;
  onCreateArea: (name: string) => Area | null;
}

export function ImportModal({ fileName, areas, targetAreaId, onCancel, onImport, onCreateArea }: ImportModalProps) {
  const [areaId, setAreaId] = useState(targetAreaId ?? areas[0]?.id ?? '');
  const [processName, setProcessName] = useState(fileName.replace(/\.(bpmn|xml)$/i, ''));
  const [newAreaName, setNewAreaName] = useState('');

  function handleImport(startAnalysis: boolean) {
    let selectedAreaId = areaId;

    if (areaId === '__new__') {
      const name = newAreaName.trim();
      if (!name) return;
      const created = onCreateArea(name);
      if (!created) return;
      selectedAreaId = created.id;
    }

    const name = processName.trim();
    if (!selectedAreaId || !name) return;
    onImport(selectedAreaId, name, startAnalysis);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>BPMN importieren</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          <label className="config-label">
            Prozessname
            <input value={processName} onChange={(event) => setProcessName(event.target.value)} />
          </label>
          <label className="config-label">
            Bereich
            <select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              <option value="__new__">Neuen Bereich erstellen</option>
            </select>
          </label>
          {areaId === '__new__' ? (
            <label className="config-label">
              Neuer Bereich
              <input value={newAreaName} onChange={(event) => setNewAreaName(event.target.value)} placeholder="z.B. Finance" />
            </label>
          ) : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={() => handleImport(false)}>Nur importieren</button>
          <button type="button" className="primary-button compact" onClick={() => handleImport(true)}>Importieren & analysieren</button>
        </div>
      </div>
    </div>
  );
}
