export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "date_range"
  | "boolean"
  | "reference"
  | "image"
  | "file"
  | "url"
  | "email"
  | "color"
  | "rich_text";

export interface ICustomField {
  type: CustomFieldType;
  multiple: boolean;
  related_collection: string | null;
  media_objects_placements: Record<string, unknown>[];
  value?: unknown;
}

export type MediaObjectType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "youtube"
  | "vimeo"
  | "tiktok"
  | "instagram_reel"
  | "instagram_post"
  | "other";

export interface IMediaObject {
  id: string;
  title: string;
  description: string;
  file_id: string;
  url: string;
  type: MediaObjectType;
  created_at: string;
  updated_at: string;
}

export interface IMediaObjectsPlacement {
  placement_key: string;
  media_object: IMediaObject;
  caption?: string;
  alt_text?: string;
  meta_data: unknown;
}
