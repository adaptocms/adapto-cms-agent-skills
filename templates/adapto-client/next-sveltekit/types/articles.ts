import type { ICustomField, IMediaObjectsPlacement } from "./shared";

export type ArticleStatus = "draft" | "published" | "archived" | "deleted";
export type SourceType = "internal" | "external" | "user_submitted" | "ai_generated";

export interface ISource {
  type: SourceType;
  name: string;
  url: string | null;
  author: string | null;
  published_date: number | null;
  license: string | null;
}

export interface IArticle {
  id: string;
  title: string;
  content: string;
  slug: string;
  author: string;
  source: ISource;
  categories: string[];
  tags: string[];
  summary: string;
  language: string;
  status: ArticleStatus;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  media_objects_placements: IMediaObjectsPlacement[];
  custom_fields: Record<string, ICustomField>;
  translation_of_id: string | null;
  file_urls?: Record<string, string> | null;
}

export type IArticlePreview = Omit<
  IArticle,
  "content" | "media_objects_placements" | "custom_fields" | "file_urls"
>;
