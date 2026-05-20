/**
 * HardwareAdapter — router / factory
 *
 * In v1, always returns MockHardwareAdapter.
 * In future versions, this will select the appropriate concrete adapter
 * based on runtime capability detection.
 */
export { MockHardwareAdapter as HardwareAdapter } from './MockHardwareAdapter';
export { MockHardwareAdapter } from './MockHardwareAdapter';
export type { IHardwareAdapter } from './types';
