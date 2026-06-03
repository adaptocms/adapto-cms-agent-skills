import { z } from "zod";
import { customFieldTypeSchema, mediaObjectsPlacementSchema } from "../shared";

const customCollectionStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
  "deleted",
]);

const fieldTypeSchema = z.enum([
  ...customFieldTypeSchema.options,
  "select",
  "multi_select",
]);

// We use the shared Type Enum, but keep specific validation for definitions (Name/Label required)
const fieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: fieldTypeSchema,
  required: z.boolean().default(false),
  multiple: z.boolean().default(false),
  description: z.string().nullable().optional(),
  default_value: z.any().optional(),
  related_collection: z.string().nullable().optional(),
  options: z.array(z.record(z.string())).nullable().optional(),
  validation: z.record(z.any()).nullable().optional(),
});

const customCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  language: z.string(),
  fields: z.array(fieldSchema),
  status: customCollectionStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

const customCollectionItemSchema = z.object({
  id: z.string(),
  parentCollectionSlug: z.string().optional(),
  collection_id: z.string(),
  title: z.string(),
  slug: z.string(),
  data: z.record(z.any()),
  language: z.string(),
  status: customCollectionStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
  media_objects_placements: z.array(mediaObjectsPlacementSchema).default([]),
  translation_of_id: z.string().nullable(),
  meta_data: z.record(z.any()).nullable().optional(),
  file_urls: z.record(z.string()).nullable().optional(),
});

const customCollectionItemPreviewSchema = customCollectionItemSchema.omit({
  data: true,
  media_objects_placements: true,
  file_urls: true,
});

export {
  customCollectionStatusSchema,
  customCollectionItemSchema,
  fieldSchema,
  customCollectionSchema,
};

// Type inference
export type ICustomCollection = z.infer<typeof customCollectionSchema>;
export type ICustomCollectionItem = z.infer<typeof customCollectionItemSchema>;
export type ICustomCollectionItemPreview = z.infer<
  typeof customCollectionItemPreviewSchema
>;
export type IField = z.infer<typeof fieldSchema>;
