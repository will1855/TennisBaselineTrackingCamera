/**
 * FutureBluetoothAdapter — STUB (not used in v1)
 *
 * When ready to implement:
 *
 *  1. Check for Web Bluetooth API support:
 *       if (!navigator.bluetooth) throw new Error('Web Bluetooth not supported');
 *
 *  2. Request device with relevant service UUID:
 *       const device = await navigator.bluetooth.requestDevice({
 *         filters: [{ namePrefix: 'CourtSideRail' }],
 *         optionalServices: ['battery_service', '<custom-UUID>'],
 *       });
 *
 *  3. Connect to GATT server and get the characteristic:
 *       const server = await device.gatt!.connect();
 *       const service = await server.getPrimaryService('<custom-UUID>');
 *       const characteristic = await service.getCharacteristic('<cmd-char-UUID>');
 *
 *  4. In sendCommand(), encode direction + speed into a 2-byte packet:
 *       const byte0 = direction === 'LEFT' ? 0x01 : direction === 'RIGHT' ? 0x02 : 0x00;
 *       const byte1 = Math.round(speed * 255);
 *       await characteristic.writeValue(new Uint8Array([byte0, byte1]));
 *
 *  5. ESP32 firmware should expose a custom BLE service with a writable
 *     characteristic that interprets these bytes and drives the motor.
 *
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
 *  - https://web.dev/articles/bluetooth
 *
 * This class deliberately exports nothing functional in v1.
 */

export {};
