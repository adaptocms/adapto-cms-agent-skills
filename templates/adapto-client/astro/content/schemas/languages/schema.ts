import { z } from "zod";

const languageSchema = z.object({
  id: z.string(), // "en-US"
  code: z.string(), // "en-US"
  short: z.string(), // "en"
  label: z.string(), // "English"
  is_default: z.boolean(),
});

export { languageSchema };
export type ILanguage = z.infer<typeof languageSchema>;
