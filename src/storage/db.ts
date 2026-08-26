import { openDB, type DBSchema } from 'idb';
import { deriveStatus, normalizeStatus } from '../engine/processSummary';
import type { ProcessEntry, ProcessStatus, Workspace } from '../types/workspace';

const DB_NAME = 'process2agent';
const DB_VERSION = 1;
const WORKSPACE_KEY = 'default';

interface P2ADatabase extends DBSchema {
  workspace: {
    key: string;
    value: Workspace;
  };
  processes: {
    key: string;
    value: ProcessEntry;
    indexes: {
      'by-area': string;
      'by-status': ProcessStatus;
      'by-updated': string;
    };
  };
}

const dbPromise = openDB<P2ADatabase>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('workspace')) {
      db.createObjectStore('workspace');
    }

    if (!db.objectStoreNames.contains('processes')) {
      const store = db.createObjectStore('processes', { keyPath: 'id' });
      store.createIndex('by-area', 'areaId');
      store.createIndex('by-status', 'status');
      store.createIndex('by-updated', 'updatedAt');
    }
  },
});

export async function getWorkspace(): Promise<Workspace | undefined> {
  const db = await dbPromise;
  return db.get('workspace', WORKSPACE_KEY);
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const db = await dbPromise;
  await db.put('workspace', { ...workspace, updatedAt: new Date().toISOString() }, WORKSPACE_KEY);
}

export async function getProcess(id: string): Promise<ProcessEntry | undefined> {
  const db = await dbPromise;
  return db.get('processes', id);
}

export async function saveProcess(process: ProcessEntry): Promise<ProcessEntry> {
  const db = await dbPromise;
  const nextStatus = deriveStatus(process.status, process.steps, process.suggestions, process.decisions);
  const nextProcess: ProcessEntry = { ...process, status: nextStatus, updatedAt: new Date().toISOString() };
  await db.put('processes', nextProcess);
  return nextProcess;
}export async function deleteProcess(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('processes', id);
}

export async function getProcessesByArea(areaId: string): Promise<ProcessEntry[]> {
  const db = await dbPromise;
  return db.getAllFromIndex('processes', 'by-area', areaId);
}

export async function getAllProcesses(): Promise<ProcessEntry[]> {
  const db = await dbPromise;
  const processes = await db.getAll('processes');
  return processes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function exportAll(): Promise<string> {
  const workspace = await getWorkspace();
  const processes = await getAllProcesses();

  return JSON.stringify({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    workspace,
    processes,
  }, null, 2);
}

export async function importAll(json: string): Promise<void> {
  const parsed = JSON.parse(json) as { version?: string; workspace?: Workspace; processes?: ProcessEntry[] };

  if (!parsed.workspace || !Array.isArray(parsed.processes)) {
    throw new Error('Die Datei ist kein gültiger process2agent-Export.');
  }

  if (parsed.version !== undefined && !parsed.version.startsWith('1.') && !parsed.version.startsWith('2.')) {
    throw new Error(`Nicht unterstützte Export-Version: ${parsed.version}`);
  }

  const normalizedProcesses = parsed.processes.map((process) => ({
    ...process,
    status: normalizeStatus(process.status),
  }));

  const db = await dbPromise;
  const tx = db.transaction(['workspace', 'processes'], 'readwrite');
  await tx.objectStore('workspace').put(parsed.workspace, WORKSPACE_KEY);
  await tx.objectStore('processes').clear();

  for (const process of normalizedProcesses) {
    await tx.objectStore('processes').put(process);
  }

  await tx.done;
}
