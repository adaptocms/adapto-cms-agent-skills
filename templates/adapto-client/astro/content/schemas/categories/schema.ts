import { z } from "zod";
import { customFieldSchema } from "../shared";

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parent_id: z.string().nullable(),
  language: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  translation_of_id: z.string().nullable(),
  custom_fields: z.record(customFieldSchema).default({}),
  file_urls: z.record(z.string()).nullable().optional(),
});

export { categorySchema };

// Type inference
export type ICategory = z.infer<typeof categorySchema>;
