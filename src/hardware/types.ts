import type { RailCommand } from '../control/types';

/**
 * Hardware adapter interface.
 * All adapters — mock, Bluetooth, Serial — must implement this.
 */
export interface IHardwareAdapter {
  sendCommand(command: RailCommand): Promise<void>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  isConnected(): boolean;
}
