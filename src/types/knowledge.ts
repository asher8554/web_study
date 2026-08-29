import { z } from "zod";

export const DifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const KnowledgeItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string(),
  summary: z.string().max(1000),
  source: z.string().max(2000),
  difficulty: DifficultySchema,
  tags: z.array(z.string().max(100)).max(20),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

export const KnowledgeStoreSchema = z.object({
  items: z.array(KnowledgeItemSchema),
});
export type KnowledgeStore = z.infer<typeof KnowledgeStoreSchema>;
