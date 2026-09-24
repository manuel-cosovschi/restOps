/**
 * RestOps · Cola offline
 *
 * El wifi de una cocina se cae. Si el empleado pierde 10 minutos de checklist
 * porque se cortó la señal, no vuelve a usar la app. Esto no es opcional.
 *
 * Diseño:
 *  - Cada respuesta se escribe PRIMERO en IndexedDB y se muestra al instante.
 *  - Un worker drena la cola cuando hay red.
 *  - Cada item lleva `clientUuid`: el índice UNIQUE (run_id, client_uuid) en
 *    Postgres hace que reintentar el mismo POST no duplique nada.
 *  - Backoff exponencial con tope. Los 4xx no se reintentan (son bugs, no red).
 *  - Las fotos van por separado: se guarda el Blob y se sube con presigned URL.
 */

const DB_NAME = 'restops';
const DB_VERSION = 1;
const STORE_QUEUE = 'outbox';
const STORE_BLOBS = 'blobs';
const STORE_CACHE = 'runs';

const MAX_ATTEMPTS = 8;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 5 * 60_000;

export type QueueKind = 'response' | 'corrective_action' | 'incident' | 'handoff' | 'attachment';

export interface QueueItem {
  id: string;
  kind: QueueKind;
  endpoint: string;
  payload: unknown;
  /** Idempotencia: el servidor deduplica por esto */
  clientUuid: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  /** Si es attachment, la key del Blob en STORE_BLOBS */
  blobKey?: string;
}

// ------------------------------------------------------------
// IndexedDB
// ------------------------------------------------------------
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        store.createIndex('nextAttemptAt', 'nextAttemptAt');
        store.createIndex('kind', 'kind');
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// ------------------------------------------------------------
// API pública
// ------------------------------------------------------------

/** Encola una operación. Devuelve al instante: la UI no espera a la red. */
export async function enqueue(
  kind: QueueKind,
  endpoint: string,
  payload: unknown,
  opts: { clientUuid?: string; blob?: Blob } = {},
): Promise<QueueItem> {
  const clientUuid = opts.clientUuid ?? crypto.randomUUID();
  const id = crypto.randomUUID();

  let blobKey: string | undefined;
  if (opts.blob) {
    blobKey = `blob:${id}`;
    await tx(STORE_BLOBS, 'readwrite', (s) => s.put(opts.blob!, blobKey!));
  }

  const item: QueueItem = {
    id,
    kind,
    endpoint,
    payload,
    clientUuid,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    blobKey,
  };

  await tx(STORE_QUEUE, 'readwrite', (s) => s.put(item));
  void flush();
  return item;
}

export async function pending(): Promise<QueueItem[]> {
  return tx<QueueItem[]>(STORE_QUEUE, 'readonly', (s) => s.getAll());
}

export async function pendingCount(): Promise<number> {
  return tx<number>(STORE_QUEUE, 'readonly', (s) => s.count());
}

async function remove(id: string, blobKey?: string): Promise<void> {
  await tx(STORE_QUEUE, 'readwrite', (s) => s.delete(id));
  if (blobKey) await tx(STORE_BLOBS, 'readwrite', (s) => s.delete(blobKey));
}

// ------------------------------------------------------------
// Drenaje
// ------------------------------------------------------------
let flushing = false;

export async function flush(): Promise<{ sent: number; failed: number }> {
  if (flushing || typeof navigator !== 'undefined' && !navigator.onLine) {
    return { sent: 0, failed: 0 };
  }

  flushing = true;
  let sent = 0;
  let failed = 0;

  try {
    const items = (await pending())
      .filter((i) => i.nextAttemptAt <= Date.now())
      .sort((a, b) => a.createdAt - b.createdAt); // orden preservado

    for (const item of items) {
      try {
        await send(item);
        await remove(item.id, item.blobKey);
        sent++;
        notify();
      } catch (err) {
        const status = (err as { status?: number }).status;

        // 4xx (salvo 408/429) = bug de payload, no problema de red.
        // Reintentar es inútil y llena la cola para siempre.
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          console.error('[outbox] descartado por 4xx', item.kind, status, err);
          await remove(item.id, item.blobKey);
          failed++;
          continue;
        }

        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.error('[outbox] agotados los reintentos', item.kind);
          await remove(item.id, item.blobKey);
          failed++;
          continue;
        }

        const delay = Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
        const jitter = Math.random() * delay * 0.25;

        await tx(STORE_QUEUE, 'readwrite', (s) =>
          s.put({
            ...item,
            attempts,
            nextAttemptAt: Date.now() + delay + jitter,
            lastError: err instanceof Error ? err.message : String(err),
          }),
        );
        failed++;
      }
    }
  } finally {
    flushing = false;
  }

  return { sent, failed };
}

async function send(item: QueueItem): Promise<void> {
  if (item.kind === 'attachment') return sendAttachment(item);

  const res = await fetch(item.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': item.clientUuid,
    },
    body: JSON.stringify(item.payload),
  });

  if (!res.ok) {
    const error = new Error(`${res.status} ${res.statusText}`) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
}

/**
 * Las fotos no pasan por la API: presigned URL y PUT directo a Storage.
 * Paso 1: pedir la URL firmada. Paso 2: subir. Paso 3: registrar metadata.
 */
async function sendAttachment(item: QueueItem): Promise<void> {
  const blob = await tx<Blob>(STORE_BLOBS, 'readonly', (s) => s.get(item.blobKey!));
  if (!blob) throw new Error('Blob perdido de IndexedDB');

  const presignRes = await fetch('/api/attachments/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(item.payload as object), sizeBytes: blob.size }),
  });

  if (!presignRes.ok) {
    const error = new Error(`presign ${presignRes.status}`) as Error & { status: number };
    error.status = presignRes.status;
    throw error;
  }

  const { uploadUrl, storageKey } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type },
  });
  if (!putRes.ok) throw new Error(`upload ${putRes.status}`);

  await fetch('/api/attachments/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(item.payload as object), storageKey, sizeBytes: blob.size }),
  });
}

// ------------------------------------------------------------
// Compresión: una foto de Android barato pesa 6 MB y la cocina tiene 3G
// ------------------------------------------------------------
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.75 } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

// ------------------------------------------------------------
// Cache de runs para trabajar sin red
// ------------------------------------------------------------
export async function cacheRun(run: { id: string; [k: string]: unknown }): Promise<void> {
  await tx(STORE_CACHE, 'readwrite', (s) => s.put({ ...run, cachedAt: Date.now() }));
}

export async function getCachedRun<T>(id: string): Promise<T | undefined> {
  return tx<T>(STORE_CACHE, 'readonly', (s) => s.get(id));
}

// ------------------------------------------------------------
// Suscripción para el indicador de la UI
// ------------------------------------------------------------
type Listener = (count: number) => void;
const listeners = new Set<Listener>();

export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn);
  void pendingCount().then(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  void pendingCount().then((n) => listeners.forEach((fn) => fn(n)));
}

/** Llamar una vez desde un provider en el layout del kiosco. */
export function startQueueWorker(intervalMs = 15_000): () => void {
  if (typeof window === 'undefined') return () => {};

  const onOnline = () => void flush();
  window.addEventListener('online', onOnline);

  const timer = setInterval(() => void flush(), intervalMs);
  void flush();

  return () => {
    window.removeEventListener('online', onOnline);
    clearInterval(timer);
  };
}
