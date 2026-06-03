// ─────────────────────────────────────────────────────────────────────────────
// Adapto read-client — VENDORED TEMPLATE. Do not hand-edit; refresh from upstream.
// Source : github.com/adaptocms/adapto-next-client :: src/lib/adapto-sdk.ts (≡ adapto-sveltekit-client)
// Commit : 2a151d7d8996c95267bfc1b52d99cbfe2a66e819 (main, fetched 2026-06-03)
// Usage  : adapto:retrofit / adapto:scaffold — see CLAUDE.md §3.11.
// ⚠ No npm package; this DRIFTS if Adapto's Public API changes. Periodically
//   re-diff against the pinned commit; adapto:doctor should smoke-check shapes.
// ─────────────────────────────────────────────────────────────────────────────

import { API_URL, API_KEY, IS_DEV } from '../config';
import type { IArticle, IArticlePreview } from '../types/articles';
import type { ICategory } from '../types/categories';
import type { IPage, IPagePreview } from '../types/pages';
import type { ICustomCollection, ICustomCollectionItem, ICustomCollectionItemPreview } from '../types/collections';
import type { IMicroCopy } from '../types/microCopies';

export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface IBaseQueryParams {
    page?: number;
    limit?: number;
    field?: string;
    order?: 'asc' | 'desc';
    language?: string;
}

export interface IArticleQueryParams extends IBaseQueryParams {
    status?: 'draft' | 'published' | 'archived' | 'deleted';
    category?: string;
    tag?: string;
    keyword?: string;
}

export interface ICategoryQueryParams extends IBaseQueryParams {
    parent_id?: string;
    keyword?: string;
}

export interface ICustomCollectionItemQueryParams extends IBaseQueryParams {
    status?: 'draft' | 'published' | 'archived' | 'deleted';
    translation_of_id?: string;
}

export interface IPageQueryParams extends IBaseQueryParams {
    status?: 'draft' | 'published' | 'archived' | 'deleted';
}

export class AdaptoSDK {
    private baseUrl: string;
    private apiKey: string;
    private maxRetries = 3;
    private cache: Map<string, any> = new Map();

    constructor(config: { baseUrl: string; apiKey: string }) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
    }

    private async request<T>(endpoint: string, params: Record<string, any> = {}, attempt = 1): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        }

        if (this.cache.has(url.toString())) {
            if (IS_DEV) console.log(`[adapto] Cache HIT: ${url.toString()}`);
            return this.cache.get(url.toString());
        }

        if (IS_DEV) console.log(`[adapto] Cache MISS: ${url.toString()} (Attempt ${attempt})`);

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                },
            });

            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    throw new Error(`Transient error: ${response.status}`);
                }
                throw new Error(`Adapto API error: ${response.status} ${response.statusText} (${endpoint})`);
            }

            const result = await response.json();
            this.cache.set(url.toString(), result);
            return result;
        } catch (error) {
            if (attempt <= this.maxRetries) {
                const delay = 1000 * 2 ** (attempt - 1);
                if (IS_DEV) console.warn(`[adapto] Attempt ${attempt} failed for ${endpoint}. Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.request<T>(endpoint, params, attempt + 1);
            }
            throw error;
        }
    }

    private async fetchAllPages<T>(fetcher: (params: IBaseQueryParams) => Promise<IPaginatedResponse<T>>, baseParams: IBaseQueryParams = {}): Promise<T[]> {
        const MAX_PAGES_SAFEGUARD = 1000;
        const allItems: T[] = [];
        const limit = typeof baseParams.limit === 'number' && baseParams.limit > 0 ? baseParams.limit : 100;
        let page = 1;
        let totalExpected: number | null = null;

        try {
            while (page <= MAX_PAGES_SAFEGUARD) {
                const response = await fetcher({ ...baseParams, page, limit });

                if (!response?.items?.length) break;

                allItems.push(...response.items);

                if (totalExpected === null && typeof response.total === 'number') {
                    totalExpected = response.total;
                }

                if (totalExpected !== null && allItems.length >= totalExpected) break;

                const totalPages = typeof response.pages === 'number' && response.pages > 0 ? response.pages : null;

                if (totalPages !== null && page >= totalPages) break;

                page++;
            }

            if (page >= MAX_PAGES_SAFEGUARD && IS_DEV) {
                console.warn(`[adapto] fetchAllPages reached MAX_PAGES_SAFEGUARD (${MAX_PAGES_SAFEGUARD}).`);
            }
        } catch (error) {
            if (IS_DEV) console.error(`[adapto] Fatal error in fetchAllPages at page ${page}:`, error);
            throw error;
        }

        return allItems;
    }

    private transformFileUrls<T extends { file_urls?: Record<string, string> | null }>(item: T): T {
        if (!item.file_urls) return item;

        const file_urls: Record<string, string> = {};

        for (const [key, url] of Object.entries(item.file_urls)) {
            if (url) {
                file_urls[key] = url.replace('https://adapto-cms-files.s3.amazonaws.com', 'https://media.adaptocms.com');
            }
        }

        return { ...item, file_urls };
    }

    private processArticle(article: IArticle): IArticle {
        let summary = '';

        if (article.content) {
            const match = article.content.match(/<p[^>]*>(.*?)<\/p>/i);
            if (match?.[1]) {
                const text = match[1].replace(/<[^>]*>/g, '');
                summary = text.length > 200 ? `${text.substring(0, 200)}...` : text;
            }
        }

        return this.transformFileUrls({ ...article, summary });
    }

    public articles = {
        list: async (params?: IArticleQueryParams) => {
            const response = await this.request<IPaginatedResponse<IArticle>>('/articles', params);
            response.items = response.items.map((item) => this.processArticle(item));
            return response;
        },

        get: async (id: string) => {
            const article = await this.request<IArticle>(`/articles/${id}`);
            return this.processArticle(article);
        },

        getBySlug: async (slug: string) => {
            const article = await this.request<IArticle>(`/articles/by-slug/${slug}`);
            return this.processArticle(article);
        },

        preview: (params?: IBaseQueryParams) => this.request<IPaginatedResponse<IArticlePreview>>('/articles/preview', params),

        listAll: (params?: Omit<IArticleQueryParams, 'page' | 'limit'>) => this.fetchAllPages((p) => this.articles.list(p as IArticleQueryParams), params),
    };

    public categories = {
        list: async (params?: ICategoryQueryParams) => {
            const response = await this.request<IPaginatedResponse<ICategory>>('/categories', params);
            response.items = response.items.map((item) => this.transformFileUrls(item));
            return response;
        },

        get: async (id: string) => {
            const category = await this.request<ICategory>(`/categories/${id}`);
            return this.transformFileUrls(category);
        },

        getBySlug: async (slug: string) => {
            const category = await this.request<ICategory>(`/categories/by-slug/${slug}`);
            return this.transformFileUrls(category);
        },

        getSubcategories: async (id: string) => {
            const items = await this.request<ICategory[]>(`/categories/${id}/subcategories`);
            return items.map((item) => this.transformFileUrls(item));
        },

        listAll: (params?: Omit<ICategoryQueryParams, 'page' | 'limit'>) => this.fetchAllPages((p) => this.categories.list(p as ICategoryQueryParams), params),
    };

    public collections = {
        list: (params?: IBaseQueryParams) => this.request<IPaginatedResponse<ICustomCollection>>('/custom-collections', params),

        get: (id: string) => this.request<ICustomCollection>(`/custom-collections/${id}`),

        getBySlug: (slug: string) => this.request<ICustomCollection>(`/custom-collections/by-slug/${slug}`),

        listAll: (params?: Omit<IBaseQueryParams, 'page' | 'limit'>) => this.fetchAllPages((p) => this.collections.list(p as IBaseQueryParams), params),

        listItems: async (collectionId: string, params?: ICustomCollectionItemQueryParams) => {
            const response = await this.request<IPaginatedResponse<ICustomCollectionItem>>(`/custom-collections/${collectionId}/items`, params);
            response.items = response.items.map((item) => this.transformFileUrls(item));
            return response;
        },

        previewItems: (collectionId: string, params?: ICustomCollectionItemQueryParams) =>
            this.request<IPaginatedResponse<ICustomCollectionItemPreview>>(`/custom-collections/${collectionId}/items/preview`, params),

        getItem: async (collectionId: string, itemId: string) => {
            const item = await this.request<ICustomCollectionItem>(`/custom-collections/${collectionId}/items/${itemId}`);
            return this.transformFileUrls(item);
        },

        getItemBySlug: async (collectionId: string, slug: string) => {
            const item = await this.request<ICustomCollectionItem>(`/custom-collections/${collectionId}/items/by-slug/${slug}`);
            return this.transformFileUrls(item);
        },

        listAllItems: (collectionId: string, params?: Omit<ICustomCollectionItemQueryParams, 'page' | 'limit'>) =>
            this.fetchAllPages((p) => this.collections.listItems(collectionId, p as ICustomCollectionItemQueryParams), params),
    };

    public pages = {
        list: async (params?: IPageQueryParams) => {
            const response = await this.request<IPaginatedResponse<IPage>>('/pages', params);
            response.items = response.items.map((item) => this.transformFileUrls(item));
            return response;
        },

        get: async (id: string) => {
            const page = await this.request<IPage>(`/pages/${id}`);
            return this.transformFileUrls(page);
        },

        getBySlug: async (slug: string) => {
            const page = await this.request<IPage>(`/pages/by-slug/${slug}`);
            return this.transformFileUrls(page);
        },

        preview: (params?: IBaseQueryParams) => this.request<IPaginatedResponse<IPagePreview>>('/pages/preview', params),

        listAll: (params?: Omit<IPageQueryParams, 'page' | 'limit'>) => this.fetchAllPages((p) => this.pages.list(p as IPageQueryParams), params),
    };

    public microCopy = {
        list: async (params?: { language?: string; tags?: string }) => {
            const items = await this.request<IMicroCopy[]>('/micro-copy', params);
            return items.map((item) => this.transformFileUrls(item));
        },

        getByKey: async (key: string, language?: string) => {
            const item = await this.request<IMicroCopy>(`/micro-copy/by-key/${key}`, { language });
            return this.transformFileUrls(item);
        },

        getDictionary: async (language: string): Promise<Record<string, string>> => {
            const items = await this.microCopy.list({ language });
            return Object.fromEntries(items.map((item) => [item.key, item.value]));
        },
    };

    public languages = {
        list: (tenantId: string) =>
            this.request<string[]>('/available-languages', {
                tenant_id: tenantId,
            }),
    };
}

export const adapto = new AdaptoSDK({
    baseUrl: API_URL,
    apiKey: API_KEY,
});
