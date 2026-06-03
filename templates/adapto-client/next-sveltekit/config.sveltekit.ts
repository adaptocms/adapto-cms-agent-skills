// Adapto config shim for SVELTEKIT → copy to src/config.ts. From adapto-sveltekit-client@4f96ce4 (src/config.ts).
// Note: DEFAULT_LANGUAGE is a starter default; discover real codes via 'adapto auth orgs' (CLAUDE.md §8).

import { env } from '$env/dynamic/private';

export const API_URL = env.ADAPTO_API_URL ?? '';
export const API_KEY = env.ADAPTO_API_KEY ?? '';
export const TENANT_ID = API_KEY.split('.')[1] ?? '';

export const IS_DEV = env.DEV === 'true';
export const DEFAULT_LANGUAGE = 'en-US';
export const PAGE_SIZE = 10;
