/**
 * REST API client with auth, retry, caching, and timeout.
 * @module api/api-client
 */

import type { IApiClient, ILogger } from '@/core/interfaces';
import type { ApiError, ApiRequestOptions } from '@/types';
import { MemoryCache } from '@/storage/cache';
import { sleep } from '@/utils/sleep';

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
const RETRY_BASE_DELAY = 500;

export class ApiClient implements IApiClient {
  private authToken: string | null = null;
  private readonly cache = new MemoryCache();

  constructor(
    private readonly baseUrl: string,
    private readonly logger: ILogger,
  ) {}

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  clearCache(path?: string): void {
    if (path) {
      this.cache.invalidate(`GET:${path}`);
    } else {
      this.cache.invalidate();
    }
  }

  async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = options?.retries ?? DEFAULT_RETRIES;
    const cacheKey = method === 'GET' && options?.cache ? `${method}:${path}` : null;

    if (cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { path });
        return cached.data;
      }
    }

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(method, path, body, timeout, options);

        if (!response.ok) {
          const error = await this.createApiError(response);
          if (!error.retryable || attempt === maxRetries) {
            throw error;
          }
          lastError = error;
          await sleep(RETRY_BASE_DELAY * Math.pow(2, attempt));
          continue;
        }

        const data = (await response.json()) as T;

        if (cacheKey) {
          const etag = response.headers.get('etag') ?? undefined;
          this.cache.set(cacheKey, data, options?.cacheTtl ?? DEFAULT_CACHE_TTL, etag);
        }

        return data;
      } catch (err) {
        const apiError = this.normalizeError(err);
        if (!apiError.retryable || attempt === maxRetries) {
          throw apiError;
        }
        lastError = apiError;
        await sleep(RETRY_BASE_DELAY * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('[Kenzo] Request failed after retries');
  }

  private async fetchWithTimeout(
    method: string,
    path: string,
    body: unknown,
    timeout: number,
    options?: ApiRequestOptions,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (options?.cache) {
      const cached = this.cache.get(path);
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }
    }

    try {
      const url = `${this.baseUrl}${path}`;
      return await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'omit',
        mode: 'cors',
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async createApiError(response: Response): Promise<ApiError> {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string; code?: string };
      message = body.message ?? message;
    } catch {
      // Response body may not be JSON
    }

    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.retryable = response.status >= 500 || response.status === 429;
    return error;
  }

  private normalizeError(err: unknown): ApiError {
    if ((err as ApiError).retryable !== undefined) {
      return err as ApiError;
    }

    const error = new Error(
      err instanceof Error ? err.message : '[Kenzo] Unknown request error',
    ) as ApiError;
    error.retryable = err instanceof DOMException && err.name === 'AbortError';
    return error;
  }
}
