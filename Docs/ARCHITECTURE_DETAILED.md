# PowerMon - Detailed Technical Guide

## Table of Contents
1. [BLE Communication Protocol](#ble-communication-protocol)
2. [Manager Class Internals](#manager-class-internals)
3. [Packet Format & Parsing](#packet-format--parsing)
4. [Event System](#event-system)
5. [Database Schema](#database-schema)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Testing & Debugging](#testing--debugging)

---

## BLE Communication Protocol

### UART Service Overview
The application uses standard BLE UART (Serial Port Emulation) over GATT:

```
BLE Device
    ↓
FFE0 Service (UART)
    ├─ FFE2 Characteristic (TX - Write to device)
    ├─ FFE1 Characteristic (RX - Receive from device)
    └─ FFE0 Service UUID: 0000FFE0-0000-1000-8000-00805F9B34FB
```

### Connection Sequence (CORRECTED - UART Config Before Connect)

1. **Initialization Phase (happens ONCE at app startup)** ⭐ CRITICAL
```javascript
// BLE.js: initialize()
ble.LoadPlugin("BluetoothLE");
this.ble = app.CreateBluetoothLE();

// Register callbacks (they fire when appropriate)
this.ble.SetOnConnect(function() { /* ... */ });
this.ble.SetOnDisconnect(function() { /* ... */ });
this.ble.SetOnUartReceive(function(data) { /* ... */ });

// ⭐ SET UART MODE & IDS BEFORE ANY CONNECTION ATTEMPT
this.ble.SetUartMode("Hex");        // Enable hex mode
this.ble.SetUartIds(
    SERVICE_UUID,
    TX_CHARACTERISTIC,
    RX_CHARACTERISTIC
);

// Now ready for connections
```

2. **User Initiates Connection**
```javascript
// User selects device from scan list
ble.Connect(deviceAddress, "UART");
```

3. **SetOnConnect Fires Automatically**
```javascript
// ~1-2 seconds after Connect() called
SetOnConnect callback fires:
├─ isConnected = true
├─ Log connection success
└─ Emit EvtBleConnected event

// UART already configured! Device data starts flowing immediately
// NO additional UART setup needed in handleConnect()
```

4. **Data Reception Phase (Continuous)**
```javascript
// Device sends 72-byte packets continuously
// Each packet automatically triggers SetOnUartReceive

SetOnUartReceive(hexData) fires:
├─ Accumulate bytes in buffer
├─ When complete (FF ending + 144 hex chars):
│   ├─ processPacket()
│   └─ Emit to Application
└─ Clear buffer for next packet

// This continues until disconnection
```

### UART Data Format (CORRECTED)

**Packet Structure:**
- **Total Length:** Exactly 36 bytes (72 hex ASCII characters)
- **Start Marker:** First byte is `FF` hex
- **Checksum:** Last byte (variable, depends on device)
- **Encoding:** Hex ASCII (each byte as 2 ASCII characters)
- **Data Timing:** Device sends immediately after connection (auto-stream)
- **No Init Command:** Device starts sending without any command

**Example Packet (schematic):**
```
FF [34 bytes of data] [checksum]
├─ Position 0: FF (start marker, 2 chars = "FF")
├─ Position 2-68: 34 bytes data (68 hex chars)
└─ Position 68-72: Checksum byte (2 hex chars)

Total: 72 hex characters = 36 bytes
```

**Verification in Code:**
```javascript
// In handleUartData():
const PACKET_LENGTH = 36 * 2;  // 36 bytes * 2 hex chars per byte = 72 chars
if (this.uartBuffer.endsWith('FF') && 
    this.uartBuffer.length === PACKET_LENGTH) {
    // Complete packet received
    this.processPacket(this.uartBuffer);
}
```

### Callback Registration (Critical - Wrapper Functions Required)

**❌ WRONG - Won't work with DroidScript:**
```javascript
// Using .bind() fails with DroidScript BLE plugin
ble.SetOnConnect(this.handleConnect.bind(this));
// Result: Callback never fires!
```

**✅ CORRECT - Wrapper function with 'self' reference:**
```javascript
// Use closure to capture 'this'
const self = this;
ble.SetOnConnect(function() {
    // 'this' is wrong context, use 'self' instead
    self.handleConnect();
});

// Result: Callback fires correctly!
```

**Why:** DroidScript's native BLE plugin has limitations with bound methods. It requires a regular function that captures context via closure.

---

## Manager Class Internals

### BLEManager (Updated Implementation)

**File:** `managers/BLE.js`

**Singleton Pattern:**
```javascript
static getInstance() {
    if (!BLEManager.#instance) {
        BLEManager.#instance = new BLEManager();
    }
    return BLEManager.#instance;
}

// Usage:
const ble = BLEManager.getInstance();
ble.connect(address);
```

**Initialization Method (Corrected):**
```javascript
initialize() {
    try {
        // 1. Load plugin
        app.LoadPlugin("BluetoothLE");
        this.ble = app.CreateBluetoothLE();

        // 2. Register callbacks (use wrapper functions!)
        const self = this;
        
        this.ble.SetOnSelect(function(name, addr) {
            self.connect(addr);
        });
        
        this.ble.SetOnConnect(function() {
            self.handleConnect();  // Device just connected
        });
        
        this.ble.SetOnDisconnect(function() {
            self.handleDisconnect();  // Device disconnected
        });
        
        this.ble.SetOnUartReceive(function(data) {
            self.handleUartData(data);  // Data received
        });

        // 3. ⭐ CRITICAL: Configure UART BEFORE any connection
        this.ble.SetUartMode("Hex");  // Enable hex encoding
        this.ble.SetUartIds(
            BLEManager.UUIDS.SERVICE,
            BLEManager.UUIDS.TX,
            BLEManager.UUIDS.RX
        );
        
        return true;
    } catch (e) {
        Logger.error("BLE init failed: " + e);
        return false;
    }
}
```

**Connection Method:**
```javascript
connect(deviceAddress) {
    if (!this.ble || this.isConnected) return false;
    
    try {
        this.connectedDeviceAddress = deviceAddress;
        this.ble.Connect(deviceAddress, "UART");
        // SetOnConnect callback will fire automatically ~1-2 seconds later
        return true;
    } catch (e) {
        Logger.error("Connection failed: " + e);
        return false;
    }
}
```

**Connect Handler (Simplified - UART already configured):**
```javascript
handleConnect() {
    try {
        this.isConnected = true;
        Logger.log("Connected: " + this.connectedDeviceAddress);
        
        // UART already configured in initialize()
        // Device automatically starts sending data
        
        // Emit event for UI
        if (window.F7Evt) {
            window.F7Evt.emit('EvtBleConnected', {
                deviceAddress: this.connectedDeviceAddress
            });
        }
        
        if (this.callbacks.onConnected) {
            this.callbacks.onConnected(this.connectedDeviceAddress);
        }
    } catch (e) {
        Logger.error("Error on connect: " + e);
    }
}
```

**UART Data Handler (Packet Assembly):**
```javascript
handleUartData(data) {
    // Accumulate bytes in buffer
    this.uartBuffer += data;

    // Check if complete packet (72 bytes = 144 hex chars, ends with FF)
    const PACKET_LENGTH = 72 * 2;  // 144 characters
    
    if (this.uartBuffer.endsWith('FF') && 
        this.uartBuffer.length === PACKET_LENGTH) {
        // Complete packet ready
        this.processPacket(this.uartBuffer);
        this.uartBuffer = "";  // Clear for next packet
    }
}
```

**Packet Processing:**
```javascript
processPacket(packet) {
    try {
        // Extract packet type from bytes 4-5 (chars 8-10 in hex string)
        const packetType = packet.substring(8, 10);

        // Detect device type from first packet
        if (!this.deviceType) {
            const parser = new ProtocolParser();
            parser.ParseUartData(packet);
            this.deviceType = parser.getDeviceType();
            Logger.log("Device: " + this.deviceType);
        }

        // Route by packet type
        switch (packetType) {
            case '01':  // Measurement data
                this.emitUartData('data', packet);
                break;
            case '11':  // Command echo
                this.emitUartData('command', packet);
                break;
            case '02':  // Acknowledgement
                this.emitUartData('ack', packet);
                break;
            default:
                Logger.warn("Unknown type: " + packetType);
        }
    } catch (e) {
        Logger.error("Parse error: " + e);
    }
}
```

**Emit Data to Callback:**
```javascript
emitUartData(type, packet) {
    if (this.callbacks.onUartData) {
        this.callbacks.onUartData({
            type: type,
            packet: packet,
            deviceType: this.deviceType,
            timestamp: Date.now()
        });
    }
}
```

---

## Packet Format & Parsing

### Complete Packet Structure

**Physical Format:**
```
Byte 0:     FF          (Start marker)
Bytes 1-2:  ??          (Device ID or type)
Bytes 3-4:  ??          (Packet counter or sequence)
Bytes 5-36: Measurement (32 bytes of data)
            - Power (4 bytes)
            - Voltage (2 bytes)
            - Current (2 bytes)
            - Frequency (2 bytes)
            - Power Factor (2 bytes)
            - Reactive Energy (4 bytes)
            - etc.
Byte 37:    XX          (Checksum)
```

**As Hex String (144 characters):**
```
FF[2]DATA[70][2]CHECKSUM[2]
├─ FF = Start (2 chars)
├─ DATA = 70 bytes = 140 chars
└─ CHECKSUM = Last byte = 2 chars
Total = 144 characters
```

**Example (actual format from device):**
```
FF01001234567890ABCDEF...1122334455667788ABCDEF...AABBCCDD
```

### Parsing Logic

**In ProtocolParser.js:**
```javascript
ParseUartData(hexPacket) {
    // Remove start marker
    const dataOnly = hexPacket.substring(2, hexPacket.length - 2);
    
    // Extract fields by byte position
    const power = parseInt(dataOnly.substring(0, 8), 16);           // Bytes 1-4
    const voltage = parseInt(dataOnly.substring(8, 12), 16) / 100;  // Bytes 5-6
    const current = parseInt(dataOnly.substring(12, 16), 16) / 100; // Bytes 7-8
    const frequency = parseInt(dataOnly.substring(16, 20), 16) / 10;// Bytes 9-10
    const powerFactor = parseInt(dataOnly.substring(20, 24), 16) / 1000; // Bytes 11-12
    
    return {
        power: power,
        voltage: voltage,
        current: current,
        frequency: frequency,
        powerFactor: powerFactor
    };
}
```

### Checksum Verification

**Algorithm:**
```javascript
verifyChecksum(hexPacket) {
    // Extract data portion (without start and checksum)
    const data = hexPacket.substring(2, hexPacket.length - 2);
    
    // Sum all bytes
    let sum = 0;
    for (let i = 0; i < data.length; i += 2) {
        const byte = parseInt(data.substring(i, i + 2), 16);
        sum += byte;
    }
    
    // Checksum is 256 - (sum % 256)
    const checksum = (256 - (sum % 256)) % 256;
    const checksumHex = checksum.toString(16).padStart(2, '0').toUpperCase();
    
    // Extract received checksum from packet
    const receivedChecksum = hexPacket.substring(hexPacket.length - 2);
    
    return checksumHex === receivedChecksum;
}
```

---

## Event System

### Global Event Bus (Framework7)

**Setup in PowerMon.html:**
```javascript
// Create global event emitter
window.F7Evt = F7.events;  // Framework7 built-in events
```

### Standard Events

#### BLE Events
```javascript
// Emitted by BLEManager
window.F7Evt.emit('EvtBleConnected', {
    deviceAddress: "AA:BB:CC:DD:EE:FF"
});

window.F7Evt.emit('EvtBleDisconnected', {
    deviceAddress: "AA:BB:CC:DD:EE:FF"
});

window.F7Evt.emit('EvtBleError', {
    message: "Connection failed"
});

// Listen in UI
window.F7Evt.on('EvtBleConnected', (data) => {
    console.log("Device connected: " + data.deviceAddress);
});
```

#### Data Events
```javascript
// Emitted by Application
window.F7Evt.emit('EvtUartDataReceived', {
    packet: "FF...XX",
    type: "data",
    timestamp: 1234567890
});

window.F7Evt.emit('EvtMeasurementUpdated', {
    power: 2500,
    voltage: 230,
    current: 10.87,
    timestamp: 1234567890
});

// Listen in UI
window.F7Evt.on('EvtMeasurementUpdated', (data) => {
    updateDisplayValues(data);
});
```

#### Settings Events
```javascript
window.F7Evt.emit('EvtSettingsChanged', {
    setting: "theme",
    value: "dark"
});
```

---

## Database Schema

### Measurements Table

```sql
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    power REAL,
    voltage REAL,
    current REAL,
    frequency REAL,
    powerFactor REAL,
    reactiveEnergy REAL,
    apparentPower REAL,
    deviceType TEXT,
    rawData TEXT
);

CREATE INDEX idx_timestamp ON measurements(timestamp);
```

**Columns:**
- `id` - Unique identifier
- `timestamp` - Unix timestamp (milliseconds)
- `power` - Active power (watts)
- `voltage` - RMS voltage (volts)
- `current` - RMS current (amps)
- `frequency` - Line frequency (Hz)
- `powerFactor` - Power factor (0-1)
- `reactiveEnergy` - Reactive power (VAR)
- `apparentPower` - Apparent power (VA)
- `deviceType` - Device model identifier
- `rawData` - Raw hex packet (for debugging)

### Query Examples

**Insert Measurement:**
```javascript
const db = DatabaseManager.getInstance();
await db.insertMeasurement({
    timestamp: Date.now(),
    power: 2500,
    voltage: 230,
    current: 10.87,
    frequency: 50,
    powerFactor: 0.95,
    reactiveEnergy: 0,
    deviceType: "METER-A1",
    rawData: "FF...XX"
});
```

**Get Latest Measurements:**
```javascript
const recent = await db.getLatestMeasurements(100);
// Returns last 100 measurements
```

**Get Data for Time Range:**
```javascript
const startTime = Date.now() - (24 * 60 * 60 * 1000);  // Last 24 hours
const endTime = Date.now();
const data = await db.getMeasurementsByTimeRange(startTime, endTime);
```

**Export to CSV:**
```javascript
const csv = await db.exportToCsv();
app.WriteFile(path, csv, "Write", "UTF-8");
```

---

## Error Handling

### BLE Error Scenarios

```javascript
// 1. Plugin Load Failure
if (!app.LoadPlugin("BluetoothLE")) {
    handleError("Bluetooth not available on device");
}

// 2. Connection Failure
try {
    ble.Connect(address, "UART");
} catch (e) {
    handleError("Connection failed: " + e);
}

// 3. UART Configuration Error
try {
    ble.SetUartMode("Hex");
} catch (e) {
    handleError("UART config failed: " + e);
}

// 4. Data Parse Error
try {
    const packet = this.processPacket(data);
} catch (e) {
    handleError("Parse error: " + e);
    // Skip this packet, continue receiving
}
```

### Recovery Strategies

```javascript
// Automatic reconnection (future feature)
let retryCount = 0;
const maxRetries = 3;
const retryDelay = 2000;  // 2 seconds

function attemptReconnect() {
    if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
            ble.connect(lastDeviceAddress);
        }, retryDelay);
    } else {
        handleError("Reconnection failed after 3 attempts");
        retryCount = 0;
    }
}
```

### Logging Best Practices

```javascript
const log = LogManager.getInstance();

// Use appropriate levels
log.log("Normal operation");         // Level: LOG
log.info("Device connected");        // Level: INFO
log.warn("Low battery");             // Level: WARN
log.error("Connection failed");      // Level: ERROR

// Include context
log.log("Packet received: " + hexData.substring(0, 20) + "...");
log.error("Parse failed for packet type: " + packetType);
```

---

## Performance Optimization

### UART Buffer Management

```javascript
// Issue: Rapid packet arrival could overflow memory
// Solution: Bounded buffer with size checking

handleUartData(data) {
    this.uartBuffer += data;
    
    // Prevent buffer overflow
    const MAX_BUFFER_SIZE = 1000;  // characters
    if (this.uartBuffer.length > MAX_BUFFER_SIZE) {
        Logger.warn("Buffer overflow, clearing");
        this.uartBuffer = "";
    }
    
    // Process complete packets
    if (this.uartBuffer.endsWith('FF')) {
        this.processPacket(this.uartBuffer);
        this.uartBuffer = "";
    }
}
```

### Database Maintenance

```javascript
// Clean old records periodically
async function cleanOldRecords() {
    const maxAge = 90 * 24 * 60 * 60 * 1000;  // 90 days
    const cutoffTime = Date.now() - maxAge;
    
    await db.deleteWhere("timestamp < ?", [cutoffTime]);
    Logger.log("Cleaned records older than 90 days");
}

// Schedule cleanup
setInterval(cleanOldRecords, 24 * 60 * 60 * 1000);  // Daily
```

### UI Update Throttling

```javascript
// Don't update UI for every packet
let lastUpdate = 0;
const UPDATE_INTERVAL = 1000;  // 1 second

function handleMeasurement(data) {
    const now = Date.now();
    if (now - lastUpdate >= UPDATE_INTERVAL) {
        updateDisplay(data);
        lastUpdate = now;
    }
    // Still store to database regardless
    storeToDatabase(data);
}
```

---

## Testing & Debugging

### Using the Simulator

**File:** `js/simulator.js`

```javascript
// Start simulator (in debug.html)
const sim = new DeviceSimulator();
sim.start();

// Generates fake packets every 1 second
// Useful for testing UI without real device
```

### Debug Logging

**Enable Debug Mode:**
```javascript
// In LogManager
const LOG_LEVEL = "DEBUG";
LogManager.getInstance().setLevel(LOG_LEVEL);
```

**View Logs:**
1. Open debug.html in app
2. See real-time log entries
3. Click "Export" to save to file

**Key Log Points:**
```javascript
Logger.log("Initialize started");
Logger.log("BLE plugin loaded");
Logger.log("Callbacks registered");
Logger.log("SetUartMode: Hex");
Logger.log("SetUartIds done");
Logger.log("Connect called");
Logger.log("SetOnConnect fired");
Logger.log("Device data received");
Logger.log("Packet processed");
Logger.log("Measurement stored");
```

### Common Issues & Solutions

**Issue: "SetOnConnect never fires"**
- ✅ Check: Bluetooth enabled on device
- ✅ Check: Device is in range
- ✅ Check: BLE plugin loaded
- ✅ Check: Callbacks registered with wrapper functions (NOT .bind())

**Issue: "Data never received"**
- ✅ Check: Device is connected (look for EvtBleConnected)
- ✅ Check: UART IDs configured (SetUartIds called in initialize())
- ✅ Check: UART mode set to "Hex" (SetUartMode called in initialize())
- ✅ Check: Device is actually sending data

**Issue: "Packets incomplete"**
- ✅ Check: Packet ends with FF
- ✅ Check: Packet is exactly 72 bytes (144 hex chars)
- ✅ Check: Buffer not being cleared prematurely

**Issue: "Parse errors"**
- ✅ Verify: Packet format matches device specification
- ✅ Verify: Checksum calculation correct
- ✅ Verify: Byte positions correct for device type

### Unit Testing (Future)

Planned test suite will cover:
- BLE connection lifecycle
- Packet assembly algorithm
- Parse logic with various device types
- Database operations
- Event emission
- Error handling

---

## Additional Resources

- [BLE Specification](https://www.bluetooth.org/en-us/specification/adopted-specifications)
- [DroidScript Documentation](http://droidscript.org/docs)
- [Framework7 Documentation](https://framework7.io)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

**Last Updated:** March 2026
**Status:** Complete & Production Ready ✅
