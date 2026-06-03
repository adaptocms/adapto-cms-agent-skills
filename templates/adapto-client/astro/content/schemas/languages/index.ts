type ILanguagePathParams = {
  params: { lang: string | undefined };
  props?: Record<string, any>;
};

type ILanguageLink = {
  lang: string;
  href: string;
};

export * from "./schema.ts";
export type { ILanguagePathParams, ILanguageLink };
