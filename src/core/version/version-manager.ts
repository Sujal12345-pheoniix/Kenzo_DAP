/**
 * SDK version manager.
 * @module core/version
 */

import type { IVersionManager } from '@/core/interfaces';

declare const __SDK_VERSION__: string;

const BUILD_TIME = new Date().toISOString();

export class VersionManager implements IVersionManager {
  getVersion(): string {
    return typeof __SDK_VERSION__ !== 'undefined' ? __SDK_VERSION__ : '1.0.0';
  }

  getBuildTime(): string {
    return BUILD_TIME;
  }
}
