import { KnowledgeItem, KnowledgeStore } from "@/types/knowledge";

const STORAGE_KEY = "knowledge-log";

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
  return store.items[index];
}

export function deleteItem(id: string): boolean {
  const store = getStore();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) return false;

  store.items.splice(index, 1);
  saveStore(store);
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
    const data = JSON.parse(jsonString) as KnowledgeStore;
    if (!Array.isArray(data.items)) return false;
    saveStore(data);
    return true;
  } catch {
    return false;
  }
}
