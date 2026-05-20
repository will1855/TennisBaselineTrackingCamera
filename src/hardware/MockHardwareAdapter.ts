import type { RailCommand } from '../control/types';
import type { IHardwareAdapter } from './types';

/**
 * MockHardwareAdapter
 *
 * Used in v1. Logs every command to the console and calls optional
 * onCommand callback so the UI can build the command log.
 */
export class MockHardwareAdapter implements IHardwareAdapter {
  private _onCommand?: (cmd: RailCommand) => void;
  private _connected = true;

  constructor(onCommand?: (cmd: RailCommand) => void) {
    this._onCommand = onCommand;
  }

  async sendCommand(command: RailCommand): Promise<void> {
    console.log(
      `[MockHardwareAdapter] ${command.direction} speed=${command.speed.toFixed(3)} reason=${command.reason ?? ''}`,
    );
    this._onCommand?.(command);
  }

  isConnected(): boolean {
    return this._connected;
  }

  setOnCommand(fn: (cmd: RailCommand) => void): void {
    this._onCommand = fn;
  }
}
