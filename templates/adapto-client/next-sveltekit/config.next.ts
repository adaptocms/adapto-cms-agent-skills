// Adapto config shim for NEXT → copy to src/config.ts. From adapto-next-client@2a151d7 (src/config.ts).
// Note: DEFAULT_LANGUAGE is a starter default; discover real codes via 'adapto auth orgs' (CLAUDE.md §8).

export const API_URL = process.env.ADAPTO_API_URL ?? '';
export const API_KEY = process.env.ADAPTO_API_KEY ?? '';
export const TENANT_ID = API_KEY.split('.')[1] ?? '';

export const IS_DEV = process.env.DEV === 'true';
export const DEFAULT_LANGUAGE = 'en-US';
export const PAGE_SIZE = 10;
