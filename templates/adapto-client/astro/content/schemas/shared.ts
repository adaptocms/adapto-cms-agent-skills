import { z } from "zod";

const customFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "date",
  "date_range",
  "boolean",
  "reference",
  "image",
  "file",
  "url",
  "email",
  "color",
  "rich_text",
]);

const customFieldSchema = z.object({
  type: customFieldTypeSchema,
  multiple: z.boolean().default(false),
  related_collection: z.string().nullable(),
  media_objects_placements: z.array(z.record(z.any())).default([]),
  value: z.any().optional(),
});

const mediaObject = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  file_id: z.string(),
  url: z.string(),
  type: z.enum([
    "image",
    "video",
    "audio",
    "document",
    "youtube",
    "vimeo",
    "tiktok",
    "instagram_reel",
    "instagram_post",
    "other",
  ]),
  created_at: z.string(),
  updated_at: z.string(),
});

const mediaObjectsPlacementSchema = z.object({
  placement_key: z.string(),
  media_object: mediaObject,
  caption: z.string().optional().or(z.literal("")),
  alt_text: z.string().optional().or(z.literal("")),
  meta_data: z.any(),
});

export {
  customFieldTypeSchema,
  customFieldSchema,
  mediaObject,
  mediaObjectsPlacementSchema,
};
export type ICustomField = z.infer<typeof customFieldSchema>;
export type ICustomFieldType = z.infer<typeof customFieldTypeSchema>;
export type IMediaObject = z.infer<typeof mediaObject>;
export type IMediaObjectsPlacement = z.infer<
  typeof mediaObjectsPlacementSchema
>;
