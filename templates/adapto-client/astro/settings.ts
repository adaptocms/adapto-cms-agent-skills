// Adapto settings shim for ASTRO → copy to the project ROOT as settings.ts.
// From adapto-astro-client@6cee8e5 (settings.ts), SANITIZED for templating.
// See CLAUDE.md §3.11.
export const ENV = import.meta.env.ENV;
export const API_URL = import.meta.env.ADAPTO_API_URL || "";
export const API_KEY = import.meta.env.ADAPTO_API_KEY || "";
export const TENANT_ID = API_KEY?.split(".")[1] || "";

// Starter default — discover the tenant's real codes via `adapto auth orgs` (CLAUDE.md §8).
export const DEFAULT_LANGUAGE = "en";
export const ARTICLES_PER_PAGE = 2;

// Populate per project: each custom collection you want statically routed.
// ⚠ The upstream starter hardcoded a demo tenant's collection here — removed.
// `adapto:retrofit`/`schema-apply` should fill these from the project's own collections.
export const CUSTOM_COLLECTIONS: { id: string; name: string; slug: string }[] =
  [];
