/**
 * Z-index allocator — prevents stacking conflicts with host page.
 * @module overlay/z-index-manager
 */

import type { IZIndexManager } from '@/core/interfaces';

export class ZIndexManager implements IZIndexManager {
  private readonly allocated = new Set<number>();
  private counter: number;

  constructor(private readonly base: number) {
    this.counter = base;
  }

  allocate(): number {
    this.counter += 1;
    this.allocated.add(this.counter);
    return this.counter;
  }

  release(id: number): void {
    this.allocated.delete(id);
  }

  getBase(): number {
    return this.base;
  }

  reset(): void {
    this.allocated.clear();
    this.counter = this.base;
  }
}
