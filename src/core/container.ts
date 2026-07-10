/**
 * Lightweight dependency injection container.
 * Supports singleton and transient registrations.
 * @module core/container
 */

import type { IContainer } from '@/core/interfaces';

type Factory<T> = () => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container implements IContainer {
  private readonly registry = new Map<symbol, Registration<unknown>>();

  register<T>(token: symbol, factory: Factory<T>): void {
    this.registry.set(token, { factory, singleton: false });
  }

  registerSingleton<T>(token: symbol, factory: Factory<T>): void {
    this.registry.set(token, { factory, singleton: true });
  }

  resolve<T>(token: symbol): T {
    const registration = this.registry.get(token);
    if (!registration) {
      throw new Error(`[Kenzo] Service not registered: ${String(token.description ?? token)}`);
    }

    if (registration.singleton) {
      if (registration.instance === undefined) {
        registration.instance = registration.factory();
      }
      return registration.instance as T;
    }

    return registration.factory() as T;
  }

  has(token: symbol): boolean {
    return this.registry.has(token);
  }

  clear(): void {
    this.registry.clear();
  }
}
