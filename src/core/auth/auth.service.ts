/**
 * Project authentication service.
 * @module core/auth
 */

import type { IApiClient, IAuthService, ILogger, IStorageService } from '@/core/interfaces';
import type { AuthResponse } from '@/types';

const AUTH_CACHE_KEY = 'auth_token';
const AUTH_CACHE_TTL = 55 * 60 * 1000; // 55 minutes

export class AuthService implements IAuthService {
  private token: string | null = null;
  private expiresAt: string | null = null;

  constructor(
    private readonly apiClient: IApiClient,
    private readonly storage: IStorageService,
    private readonly logger: ILogger,
  ) {
    this.restoreFromCache();
  }

  async authenticate(apiKey: string): Promise<AuthResponse> {
    this.logger.info('Authenticating project', { apiKey });
    
    // Clear any stale cached auth token to guarantee fresh authentication for current API key
    this.clear();

    const response = await this.apiClient.post<AuthResponse>('/auth/sdk', {
      apiKey,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    this.token = response.token;
    this.expiresAt = response.expiresAt;

    this.apiClient.setAuthToken(response.token);
    this.storage.set(AUTH_CACHE_KEY, response, AUTH_CACHE_TTL);

    this.logger.info('Authentication successful', { projectId: response.projectId });
    return response;
  }

  getToken(): string | null {
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null && !this.isExpired();
  }

  async refresh(): Promise<void> {
    const cached = this.storage.get<AuthResponse>(AUTH_CACHE_KEY);
    if (!cached) {
      throw new Error('[Kenzo] No cached credentials to refresh');
    }

    this.token = cached.token;
    this.expiresAt = cached.expiresAt;
    this.apiClient.setAuthToken(cached.token);
  }

  clear(): void {
    this.token = null;
    this.expiresAt = null;
    this.apiClient.clearAuthToken();
    this.storage.remove(AUTH_CACHE_KEY);
  }

  private restoreFromCache(): void {
    const cached = this.storage.get<AuthResponse>(AUTH_CACHE_KEY);
    if (cached && !this.isExpiredAt(cached.expiresAt)) {
      this.token = cached.token;
      this.expiresAt = cached.expiresAt;
      this.apiClient.setAuthToken(cached.token);
    }
  }

  private isExpired(): boolean {
    return this.isExpiredAt(this.expiresAt);
  }

  private isExpiredAt(expiresAt: string | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() <= Date.now();
  }
}
