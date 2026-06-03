import { z } from "zod";
import { customFieldSchema, mediaObjectsPlacementSchema } from "../shared";

const pageStatusSchema = z.enum(["draft", "published", "archived", "deleted"]);

const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  slug: z.string(),
  menu_label: z.string().nullable(),
  parent_id: z.string().nullable(),
  language: z.string(),
  tags: z.array(z.string()).default([]),
  status: pageStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
  media_objects_placements: z.array(mediaObjectsPlacementSchema),
  translation_of_id: z.string().nullable(),
  custom_fields: z.record(customFieldSchema).default({}),
  file_urls: z.record(z.string()).nullable().optional(),
});

const pagePreviewSchema = pageSchema.omit({
  content: true,
  media_objects_placements: true,
  custom_fields: true,
  file_urls: true,
});

export { pageStatusSchema, pageSchema, pagePreviewSchema };

// Type inference
export type IPage = z.infer<typeof pageSchema>;
export type IPagePreview = z.infer<typeof pagePreviewSchema>;
