import type { ICustomField } from "./shared";

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  language: string;
  created_at: string;
  updated_at: string;
  translation_of_id: string | null;
  custom_fields: Record<string, ICustomField>;
  file_urls?: Record<string, string> | null;
}
