import { z } from "zod";
import { customFieldSchema } from "../shared";

const microCopySchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  language: z.string(),
  translation_of: z.string().nullable(),
  tags: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  custom_fields: z.record(customFieldSchema).default({}),
  file_urls: z.record(z.string()).nullable().optional(),
});

export { microCopySchema };

export type IMicroCopy = z.infer<typeof microCopySchema>;
