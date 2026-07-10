/**
 * Typed publish/subscribe event bus.
 * @module utils/event-bus
 */

import type { IEventBus } from '@/core/interfaces';
import type { KenzoEventMap } from '@/types';

type EventHandler<T> = (payload: T) => void;

export class EventBus implements IEventBus {
  private readonly handlers = new Map<keyof KenzoEventMap, Set<EventHandler<unknown>>>();

  on<K extends keyof KenzoEventMap>(
    event: K,
    handler: (payload: KenzoEventMap[K]) => void,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const wrapped = handler as EventHandler<unknown>;
    this.handlers.get(event)!.add(wrapped);
    return () => this.off(event, handler);
  }

  once<K extends keyof KenzoEventMap>(
    event: K,
    handler: (payload: KenzoEventMap[K]) => void,
  ): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  emit<K extends keyof KenzoEventMap>(event: K, payload: KenzoEventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    for (const handler of eventHandlers) {
      try {
        handler(payload);
      } catch {
        // Isolated handler failures must not break the bus
      }
    }
  }

  off<K extends keyof KenzoEventMap>(
    event: K,
    handler: (payload: KenzoEventMap[K]) => void,
  ): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;
    eventHandlers.delete(handler as EventHandler<unknown>);
  }

  clear(): void {
    this.handlers.clear();
  }
}
