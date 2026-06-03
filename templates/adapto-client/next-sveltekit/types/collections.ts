import type { CustomFieldType, IMediaObjectsPlacement } from "./shared";

export type CollectionStatus = "draft" | "published" | "archived" | "deleted";
export type CollectionFieldType = CustomFieldType | "select" | "multi_select";

export interface ICollectionField {
  name: string;
  label: string;
  type: CollectionFieldType;
  required: boolean;
  multiple: boolean;
  description?: string | null;
  default_value?: unknown;
  related_collection?: string | null;
  options?: Record<string, string>[] | null;
  validation?: Record<string, unknown> | null;
}

export interface ICustomCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  language: string;
  fields: ICollectionField[];
  status: CollectionStatus;
  created_at: string;
  updated_at: string;
}

export interface ICustomCollectionItem {
  id: string;
  parentCollectionSlug?: string;
  collection_id: string;
  title: string;
  slug: string;
  data: Record<string, unknown>;
  language: string;
  status: CollectionStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  media_objects_placements: IMediaObjectsPlacement[];
  translation_of_id: string | null;
  meta_data?: Record<string, unknown> | null;
  file_urls?: Record<string, string> | null;
}

export type ICustomCollectionItemPreview = Omit<
  ICustomCollectionItem,
  "data" | "media_objects_placements" | "file_urls"
>;
