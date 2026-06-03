import type { ICustomField, IMediaObjectsPlacement } from "./shared";

export type PageStatus = "draft" | "published" | "archived" | "deleted";

export interface IPage {
  id: string;
  title: string;
  content: string;
  slug: string;
  menu_label: string | null;
  parent_id: string | null;
  language: string;
  tags: string[];
  status: PageStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  media_objects_placements: IMediaObjectsPlacement[];
  translation_of_id: string | null;
  custom_fields: Record<string, ICustomField>;
  file_urls?: Record<string, string> | null;
}

export type IPagePreview = Omit<
  IPage,
  "content" | "media_objects_placements" | "custom_fields" | "file_urls"
>;
