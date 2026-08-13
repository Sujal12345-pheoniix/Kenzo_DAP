/**
 * SDK configuration service with defaults and validation.
 * @module core/config
 */

import type { IConfigService, ILogger } from '@/core/interfaces';
import type { KenzoConfig, KenzoInitOptions } from '@/types';
import { deepMerge } from '@/utils/deep-merge';

const DEFAULT_API_BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '/api/v1';
const DEFAULT_LOCALE = 'en';
const DEFAULT_Z_INDEX_BASE = 2147483000;
const DEFAULT_ELEMENT_WAIT_RETRIES = 30;
const DEFAULT_ELEMENT_WAIT_INTERVAL = 200;

function buildDefaults(apiKey: string): KenzoConfig {
  return {
    apiKey,
    apiBaseUrl: DEFAULT_API_BASE_URL,
    debug: false,
    locale: DEFAULT_LOCALE,
    darkMode: false,
    disableAnalytics: false,
    zIndexBase: DEFAULT_Z_INDEX_BASE,
    userTraits: {},
    elementWaitRetries: DEFAULT_ELEMENT_WAIT_RETRIES,
    elementWaitInterval: DEFAULT_ELEMENT_WAIT_INTERVAL,
  };
}

export class ConfigService implements IConfigService {
  private config: KenzoConfig | null = null;

  constructor(private readonly logger: ILogger) {}

  init(options: KenzoInitOptions): KenzoConfig {
    if (!options.apiKey || options.apiKey.trim() === '') {
      throw new Error('[Kenzo] apiKey is required for initialization');
    }

    const merged = deepMerge(
      buildDefaults(options.apiKey.trim()) as unknown as Record<string, unknown>,
      options as unknown as Record<string, unknown>,
    ) as unknown as KenzoConfig;

    this.config = merged;

    this.logger.debug('Configuration initialized', {
      apiBaseUrl: merged.apiBaseUrl,
      locale: merged.locale,
    });

    return merged;
  }

  get(): KenzoConfig {
    if (!this.config) {
      throw new Error('[Kenzo] SDK not configured. Call Kenzo.init() first.');
    }
    return this.config;
  }

  update(partial: Partial<KenzoInitOptions>): KenzoConfig {
    if (!this.config) {
      throw new Error('[Kenzo] SDK not configured. Call Kenzo.init() first.');
    }
    const merged = deepMerge(
      this.config as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>,
    ) as unknown as KenzoConfig;

    this.config = merged;
    return merged;
  }

  isReady(): boolean {
    return this.config !== null;
  }
}
