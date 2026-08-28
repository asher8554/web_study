export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  source: string;
  difficulty: Difficulty;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeStore {
  items: KnowledgeItem[];
}
