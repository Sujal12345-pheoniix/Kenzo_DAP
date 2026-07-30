/**
 * Flow loader — fetches published flows from Kenzo backend.
 * @module flow/flow-loader
 */

import type { IApiClient, IFlowLoader, ILogger, IStorageService } from '@/core/interfaces';
import type { Flow, FlowsResponse } from '@/types';

const FLOWS_CACHE_KEY = 'flows_cache';
const FLOWS_CACHE_TTL = 5 * 1000; // 5 seconds fast TTL for fast website synchronization

export class FlowLoader implements IFlowLoader {
  private memoryCache: Flow[] | null = null;

  constructor(
    private readonly apiClient: IApiClient,
    private readonly storage: IStorageService,
    private readonly logger: ILogger,
  ) {}

  async loadAll(forceRefresh = false): Promise<Flow[]> {
    if (forceRefresh) {
      this.invalidate();
    }

    if (this.memoryCache) {
      return this.memoryCache;
    }

    const cached = this.storage.get<Flow[]>(FLOWS_CACHE_KEY);
    if (cached) {
      this.memoryCache = cached;
      return cached;
    }

    this.logger.info('Loading published flows');

    const response = await this.apiClient.get<FlowsResponse>('/flows/published', {
      cache: !forceRefresh,
      cacheTtl: FLOWS_CACHE_TTL,
    });

    const flows = response.flows.filter((f) => f.status === 'published');
    this.memoryCache = flows;
    this.storage.set(FLOWS_CACHE_KEY, flows, FLOWS_CACHE_TTL);

    this.logger.info('Flows loaded', { count: flows.length });
    return flows;
  }

  async loadById(flowId: string): Promise<Flow | null> {
    const flows = await this.loadAll();
    const flow = flows.find((f) => f.id === flowId) ?? null;

    if (!flow) {
      const single = await this.apiClient
        .get<Flow>(`/flows/${flowId}`, { cache: true, cacheTtl: FLOWS_CACHE_TTL })
        .catch(() => null);
      return single;
    }

    return flow;
  }

  getCached(flowId: string): Flow | null {
    return this.memoryCache?.find((f) => f.id === flowId) ?? null;
  }

  invalidate(): void {
    this.memoryCache = null;
    this.storage.remove(FLOWS_CACHE_KEY);
    this.apiClient.clearCache('/flows/published');
  }
}
