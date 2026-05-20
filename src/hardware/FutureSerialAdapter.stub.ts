/**
 * FutureSerialAdapter — STUB (not used in v1)
 *
 * When ready to implement (for USB/wired connection to ESP32):
 *
 *  1. Check for Web Serial API support:
 *       if (!navigator.serial) throw new Error('Web Serial not supported');
 *
 *  2. Request port from browser:
 *       const port = await navigator.serial.requestPort();
 *       await port.open({ baudRate: 115200 });
 *
 *  3. Get writer:
 *       const writer = port.writable!.getWriter();
 *
 *  4. In sendCommand(), encode and write:
 *       const byte0 = direction === 'LEFT' ? 0x01 : direction === 'RIGHT' ? 0x02 : 0x00;
 *       const byte1 = Math.round(speed * 255);
 *       await writer.write(new Uint8Array([byte0, byte1]));
 *
 *  5. In disconnect(), release writer and close port:
 *       writer.releaseLock();
 *       await port.close();
 *
 *  6. ESP32 firmware should read 2 bytes per command over Serial and drive
 *     the motor accordingly (same byte encoding as Bluetooth adapter).
 *
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
 *  - https://web.dev/articles/serial
 *
 * This class deliberately exports nothing functional in v1.
 */

export {};
