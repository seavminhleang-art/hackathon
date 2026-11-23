// Client-side offline queue and retry manager for Emergency & Incident submissions.
// Ensures reports and SOS dispatches are never silently lost on network dropouts.

export interface QueuedSubmission {
  id: string;
  kind: "SOS" | "REPORT";
  payload: any;
  status: "FAILED_RETRYING" | "PENDING";
  retryCount: number;
  lastAttemptAt: string;
  errorMessage?: string;
  createdAt: string;
}

const STORAGE_KEY = "emergency_offline_queue_v1";

let inMemoryQueue: QueuedSubmission[] = [];

function loadQueue(): QueuedSubmission[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined" || !localStorage?.getItem) {
    return inMemoryQueue;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : inMemoryQueue;
  } catch {
    return inMemoryQueue;
  }
}

function saveQueue(queue: QueuedSubmission[]) {
  inMemoryQueue = queue;
  if (typeof window === "undefined" || typeof localStorage === "undefined" || !localStorage?.setItem) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    // ignore storage quota errors in test/dev
  }
}

export const offlineQueue = {
  add(kind: "SOS" | "REPORT", payload: any, error?: Error): QueuedSubmission {
    const queue = loadQueue();
    const entry: QueuedSubmission = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      payload,
      status: "FAILED_RETRYING",
      retryCount: 0,
      lastAttemptAt: new Date().toISOString(),
      errorMessage: error?.message,
      createdAt: new Date().toISOString(),
    };
    queue.push(entry);
    saveQueue(queue);
    return entry;
  },

  getAll(): QueuedSubmission[] {
    return loadQueue();
  },

  remove(id: string): void {
    const queue = loadQueue().filter((q) => q.id !== id);
    saveQueue(queue);
  },

  clear(): void {
    inMemoryQueue = [];
    if (typeof window !== "undefined" && typeof localStorage !== "undefined" && localStorage?.removeItem) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  },

  async retryAll(
    submitFn: (item: QueuedSubmission) => Promise<any>
  ): Promise<{ successful: string[]; failed: string[] }> {
    const queue = loadQueue();
    const successful: string[] = [];
    const failed: string[] = [];

    for (const item of queue) {
      try {
        await submitFn(item);
        successful.push(item.id);
      } catch (err: any) {
        item.retryCount++;
        item.lastAttemptAt = new Date().toISOString();
        item.errorMessage = err?.message || "Retry failed";
        failed.push(item.id);
      }
    }

    const remaining = queue.filter((q) => !successful.includes(q.id));
    saveQueue(remaining);

    return { successful, failed };
  },
};
