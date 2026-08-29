import { KnowledgeItem, KnowledgeStore, KnowledgeStoreSchema } from "@/types/knowledge";
import {
  isGitHubConfigured,
  fetchFromGitHub,
  commitToGitHub,
} from "./github";

const STORAGE_KEY = "knowledge-log";
const SYNC_LOCK_KEY = "knowledge-sync-lock";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getStore(): KnowledgeStore {
  if (!isClient()) return { items: [] };

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { items: [] };
    return JSON.parse(data) as KnowledgeStore;
  } catch {
    return { items: [] };
  }
}

export function saveStore(store: KnowledgeStore): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function acquireSyncLock(): boolean {
  if (!isClient()) return false;
  const lock = sessionStorage.getItem(SYNC_LOCK_KEY);
  if (lock) return false;
  sessionStorage.setItem(SYNC_LOCK_KEY, "1");
  return true;
}

function releaseSyncLock(): void {
  sessionStorage.removeItem(SYNC_LOCK_KEY);
}

export async function syncFromGitHub(): Promise<boolean> {
  if (!isGitHubConfigured()) return false;
  if (!acquireSyncLock()) return false;

  try {
    const remote = await fetchFromGitHub();
    if (!remote) return false;

    const local = getStore();

    const merged = mergeStores(local, remote);
    saveStore(merged);
    return true;
  } finally {
    releaseSyncLock();
  }
}

export async function syncToGitHub(): Promise<boolean> {
  if (!isGitHubConfigured()) return false;

  try {
    const store = getStore();
    return await commitToGitHub(store);
  } catch {
    return false;
  }
}

async function syncToGitHubBackground(): Promise<void> {
  if (!isGitHubConfigured()) return;
  if (!acquireSyncLock()) return;

  try {
    const store = getStore();
    await commitToGitHub(store);
  } finally {
    releaseSyncLock();
  }
}

function mergeStores(local: KnowledgeStore, remote: KnowledgeStore): KnowledgeStore {
  const map = new Map<string, KnowledgeItem>();

  for (const item of remote.items) {
    map.set(item.id, item);
  }

  for (const item of local.items) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      map.set(item.id, item);
    }
  }

  const items = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { items };
}

export function getAllItems(): KnowledgeItem[] {
  return getStore().items;
}

export function getItemById(id: string): KnowledgeItem | undefined {
  return getStore().items.find((item) => item.id === id);
}

export function createItem(
  item: Omit<KnowledgeItem, "id" | "createdAt" | "updatedAt">
): KnowledgeItem {
  const store = getStore();
  const newItem: KnowledgeItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.items.unshift(newItem);
  saveStore(store);
  syncToGitHubBackground();
  return newItem;
}

export function updateItem(
  id: string,
  updates: Partial<Omit<KnowledgeItem, "id" | "createdAt">>
): KnowledgeItem | null {
  const store = getStore();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  store.items[index] = {
    ...store.items[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  syncToGitHubBackground();
  return store.items[index];
}

export function deleteItem(id: string): boolean {
  const store = getStore();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) return false;

  store.items.splice(index, 1);
  saveStore(store);
  syncToGitHubBackground();
  return true;
}

export function getAllTags(): string[] {
  const items = getStore().items;
  const tagSet = new Set<string>();
  items.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export function searchItems(query: string): KnowledgeItem[] {
  const items = getStore().items;
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.content.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export function exportToJSON(): string {
  const store = getStore();
  return JSON.stringify(store, null, 2);
}

export function importFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    const result = KnowledgeStoreSchema.safeParse(data);
    if (!result.success) {
      console.error("JSON validation failed:", result.error.flatten());
      return false;
    }
    saveStore(result.data);
    syncToGitHubBackground();
    return true;
  } catch {
    return false;
  }
}
