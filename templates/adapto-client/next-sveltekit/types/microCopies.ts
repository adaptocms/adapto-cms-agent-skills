import type { ICustomField } from "./shared";

export interface IMicroCopy {
  id: string;
  key: string;
  value: string;
  language: string;
  translation_of: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  custom_fields: Record<string, ICustomField>;
  file_urls?: Record<string, string> | null;
}
