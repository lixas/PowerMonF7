# PowerMon - Complete Architecture Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Data Flow](#data-flow)
7. [Design Patterns](#design-patterns)
8. [Configuration](#configuration)
9. [Deployment](#deployment)
10. [Known Issues & Limitations](#known-issues--limitations)

---

## Project Overview

**PowerMon** is a mobile power meter monitoring application built for DroidScript, enabling real-time monitoring of electrical power consumption via Bluetooth Low Energy (BLE) connectivity.

### Purpose
- Connect to BLE-enabled power meters
- Capture real-time power consumption data
- Display measurements on mobile device
- Store historical data in SQLite database
- Support multiple power calculation methods
- Provide data visualization via charts

### Target Platform
- **DroidScript** - JavaScript runtime for Android
- **Framework7** - Mobile UI framework
- **Android 5.0+** with Bluetooth LE support

### Key Features
- ✅ BLE device discovery and connection
- ✅ Real-time power, voltage, current measurements
- ✅ Multiple power calculation methods (Measured, VA, VA*PF)
- ✅ Data persistence with SQLite
- ✅ Historical charts and detailed measurements
- ✅ Theme support (Light/Dark/Auto)
- ✅ Remote device control
- ✅ Debug logging with file export
- ✅ Settings persistence

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PowerMon.html (Entry Point)              │
│              Global Framework7 & Event Bus Setup            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐    ┌────────▼─────────┐
│  HTML Pages      │    │  Manager Classes │
├──────────────────┤    ├──────────────────┤
│ • home.html      │    │ • Application.js │
│ • settings.html  │    │ • BLE.js         │
│ • chart.html     │    │ • Database.js    │
│ • details.html   │    │ • Settings.js    │
│ • debug.html     │    │ • Log.js         │
│ • about.html     │    │                  │
└──────────────────┘    └────────┬─────────┘
        │                        │
        │         ┌──────────────┴──────────────┐
        │         │                             │
        │    ┌────▼──────────┐    ┌────────▼──────────┐
        │    │  BLE Device   │    │  SQLite Database  │
        │    │               │    │                   │
        │    │ • UART Comm   │    │ • Measurements    │
        │    │ • Packets     │    │ • Metadata        │
        │    │ • Parsing     │    │                   │
        └────┼───────────────┘    └───────────────────┘
             │
        ┌────▼──────────┐
        │  Data Pipeline│
        ├───────────────┤
        │ Receive → Parse
        │ → Validate
        │ → Calculate
        │ → Display/Store
        └───────────────┘
```

---

## Technology Stack

### Runtime Environment
| Component | Version | Purpose |
|-----------|---------|---------|
| DroidScript | Latest | JavaScript runtime for Android |
| Framework7 | 7.x | Mobile UI framework with routing |
| Android | 5.0+ | Target OS with BLE support |
| Node.js | N/A | Development/build tools only |

### Core Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| BluetoothLE Plugin | DroidScript | BLE communication (built-in) |
| Chart.js | 3.x | Data visualization charts |
| Framework7-Icons | 3.x | Icon library |
| SQLite | Built-in | Data persistence (via DroidScript) |

### Development Tools
- **VS Code** - Code editor
- **Git** - Version control
- **DroidScript IDE** - Runtime & debugging

---

## Project Structure

### Root Directory
```
PowerMon/
├── PowerMon.html                    ← Entry point (APP INIT)
├── home.html                        ← Main UI screen
├── settings.html                    ← Settings page
├── chart.html                       ← Data visualization
├── details.html                     ← Detailed metrics
├── debug.html                       ← Debug console
├── about.html                       ← About/version
├── managers/                        ← ⭐ Core controllers
│   ├── Application.js               ← Main app orchestrator
│   ├── BLE.js                       ← Bluetooth manager (CRITICAL)
│   ├── Database.js                  ← SQLite manager
│   ├── Settings.js                  ← Preferences manager
│   └── Log.js                       ← Logging system
├── js/
│   ├── parser.js                    ← Protocol parser
│   ├── simulator.js                 ← Test device simulator
│   ├── utils.js                     ← Utility functions
│   ├── chart.umd.js                 ← Chart.js library
│   ├── framework7-bundle.min.js     ← Framework7 library
│   └── unused/                      ← Deprecated files
├── css/
│   ├── framework7-bundle.min.css    ← Framework7 styles
│   └── framework7-icons.css         ← Icon styles
├── Img/                             ← Application images
├── Docs/                            ← 📚 Documentation
│   ├── ARCHITECTURE.md              ← System design (THIS FILE)
│   ├── ARCHITECTURE_DETAILED.md     ← Technical deep-dive
│   ├── QUICKSTART.md                ← Getting started guide
│   ├── ROADMAP.md                   ← Future tasks & timeline
│   ├── INTEGRATION_GUIDE.md         ← Migration procedures
│   ├── DOCUMENTATION_INDEX.md       ← Doc navigation
│   ├── TASK_CHECKLIST.md            ← Detailed task list
│   ├── HANDOVER_PACKAGE.md          ← Handover overview
│   └── DOCUMENTATION_DELIVERY_REPORT.md ← Delivery summary
├── app_settings.json                ← App configuration
├── README.md                        ← Project readme
├── MIGRATION_GUIDE.md               ← Legacy code migration
├── InternalNotes.txt                ← Development notes
└── PowerMonData.sql                 ← SQLite database

```

---

## Core Components

### 1. Application.js (Main Orchestrator)
**Role:** Central coordinator of all subsystems

```javascript
// Initialization sequence
PowerMonApp
  ├── Initialize Framework7
  ├── Create event bus (F7Evt)
  ├── Initialize managers in order:
  │   ├── LogManager
  │   ├── SettingsManager
  │   ├── DatabaseManager
  │   └── BLEManager
  ├── Setup route handlers
  └── Start UI

// Coordinates:
// - BLE connection/disconnection events
// - Device data reception
// - UI state updates
// - Error handling
```

**Key Methods:**
- `initialize()` - App startup sequence
- `handleBleConnected()` - On device connection
- `handleBleDisconnected()` - On device disconnection
- `handleUartData()` - On data reception from device

### 2. BLE.js (Bluetooth Manager) ⭐ CRITICAL
**Role:** All Bluetooth Low Energy operations

**Key Features:**
- Singleton pattern (only one instance)
- Wrapper functions for callbacks (NOT .bind())
- Automatic packet assembly
- Device type detection

**UART Protocol Details:**
- Service UUID: `0000FFE0-0000-1000-8000-00805F9B34FB`
- TX Characteristic: `0000FFE2-0000-1000-8000-00805F9B34FB` (write to device)
- RX Characteristic: `0000FFE1-0000-1000-8000-00805F9B34FB` (receive from device)

**Initialization Sequence (CORRECTED):**
```javascript
1. Load BluetoothLE plugin
2. Register all callbacks (SetOnConnect, SetOnDisconnect, SetOnUartReceive)
3. SetUartMode("Hex")          ← SET BEFORE CONNECTING
4. SetUartIds(SERVICE, TX, RX) ← SET BEFORE CONNECTING
5. Ready for connections
```

**Connection Flow:**
```javascript
connect(deviceAddress)
  └─> ble.Connect(address, "UART")
      └─> SetOnConnect fires (auto)
          ├─ isConnected = true
          ├─ Emit EvtBleConnected event
          └─ UART already configured (from init)
             └─ Device sends data immediately
```

**Data Packet Structure:**
- **Length:** Exactly 36 bytes (72 hex ASCII characters)
- **Start:** `FF` hex marker
- **Checksum:** Last byte (variable)
- **Format:** Hex ASCII encoded (each byte = 2 ASCII chars)
- **Example:** `FF[34 bytes data]XX` where XX = checksum
- **Timing:** Device sends automatically after connection (no init command needed)

**Key Methods:**
- `initialize()` - Setup plugin and callbacks
- `connect(address)` - Connect to device
- `disconnect()` - Disconnect from device
- `handleUartData(data)` - Receive and buffer data
- `processPacket(packet)` - Parse complete packet
- `setOnUartData(callback)` - Register data callback

### 3. Database.js (Data Storage)
**Role:** SQLite database operations

**Schema:**
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
    deviceType TEXT,
    rawData TEXT
);
```

**Operations:**
- Insert measurements
- Query historical data
- Clear old data
- Export to CSV

### 4. Settings.js (Preferences)
**Role:** User configuration management

**Settings Stored:**
- Power calculation method
- Theme (Light/Dark/Auto)
- Measurement units
- UI preferences
- Device settings

### 5. Log.js (Debug Logging)
**Role:** Application logging system

**Features:**
- Multiple log levels (log, warn, error, info)
- In-memory buffer (1000 max entries)
- Console output
- File export capability
- Filtering and search

---

## Data Flow

### Complete User Journey

```
User Opens App
    │
    ├─> PowerMon.html loads
    │   ├─ Initialize Framework7
    │   ├─ Create global F7Evt bus
    │   └─ Load Application.js
    │
    ├─> Application.initialize()
    │   ├─ Load LogManager
    │   ├─ Load SettingsManager
    │   ├─ Load DatabaseManager
    │   └─ Load BLEManager
    │       ├─ Load BluetoothLE plugin
    │       ├─ Register callbacks (SetOnConnect, etc.)
    │       ├─ SetUartMode("Hex")
    │       └─ SetUartIds(...) ← CRITICAL: Before any connection!
    │
    ├─> Route to home.html
    │   ├─ Display "Scan for devices"
    │   └─ Listen to home page events
    │
    ├─> User clicks "Scan" button
    │   └─> BLEManager.startScan()
    │       ├─ ble.StartScan() for 30 seconds
    │       ├─ Emit device list to UI
    │       └─ UI displays found devices
    │
    ├─> User selects device
    │   └─> BLEManager.connect(address)
    │       ├─ ble.Connect(address, "UART")
    │       ├─ Wait for SetOnConnect callback
    │       └─ SetOnConnect fires automatically:
    │           ├─ isConnected = true
    │           ├─ UART already configured (from init)
    │           ├─ Emit EvtBleConnected
    │           └─ Device sends data immediately
    │
    ├─> Data Reception Loop
    │   └─> Device sends 72-byte packet
    │       └─> SetOnUartReceive fires
    │           └─> handleUartData(hexData)
    │               ├─ Accumulate in buffer
    │               ├─ Check for packet complete (FF ending + 72 bytes)
    │               ├─ processPacket(packet)
    │               │   ├─ Parse hex data
    │               │   ├─ Extract measurements
    │               │   ├─ Emit UartData callback
    │               │   └─ Emit EvtUartDataReceived
    │               │
    │               └─> Application.handleUartData()
    │                   ├─ Parse packet with ProtocolParser
    │                   ├─ Extract power/voltage/current/etc
    │                   ├─ Calculate derived values
    │                   ├─ Store in database
    │                   ├─ Update UI display
    │                   └─ Emit EvtMeasurementUpdated
    │
    └─> UI displays live measurements
        └─> User can:
            ├─ View real-time values
            ├─ Check historical charts
            ├─ Adjust settings
            └─ View debug logs
```

### BLE Packet Flow (Detailed)

```
Device sends raw bytes
    │
    └─> DroidScript BLE plugin
        ├─ Converts to hex ASCII
        ├─ May send in multiple chunks
        │
        └─> SetOnUartReceive callback fires with hex string
            │
            └─> BLEManager.handleUartData(hexData)
                ├─ Concatenate to uartBuffer
                ├─ Check if complete: endsWith('FF') && length >= 144
                │   (72 bytes * 2 hex chars = 144 chars)
                │
                └─> processPacket(completeHexPacket)
                    ├─ Extract packet type (bytes 4-5)
                    ├─ Route by type (01=data, 11=cmd echo, 02=ack)
                    │
                    └─> emitUartData(type, packet)
                        └─> Application.handleUartData()
                            ├─ ProtocolParser.ParseUartData()
                            ├─ Extract field values
                            ├─ Store in database
                            └─ Update UI
```

---

## Design Patterns

### 1. Singleton Pattern (BLEManager)
```javascript
static getInstance() {
    if (!BLEManager.#instance) {
        BLEManager.#instance = new BLEManager();
    }
    return BLEManager.#instance;
}
```

**Why:** Ensures single BLE connection, prevents resource conflicts

### 2. Event Bus Pattern (Global F7Evt)
```javascript
// Emit event
window.F7Evt.emit('EventName', { data: value });

// Listen for event
window.F7Evt.on('EventName', (data) => {
    // Handle event
});
```

**Why:** Decouples components, enables communication between pages/managers

### 3. Callback Registry Pattern (BLEManager)
```javascript
ble.setOnUartData(function(data) {
    // Called on packet received
});
```

**Why:** Provides standard interface for async operations

### 4. Manager Pattern (Application Orchestration)
```javascript
// Each subsystem is a manager
const logMgr = LogManager.getInstance();
const bleMgr = BLEManager.getInstance();
const dbMgr = DatabaseManager.getInstance();

// Managers coordinate via events
window.F7Evt.on('EvtBleConnected', () => {
    logMgr.log("Device connected");
});
```

**Why:** Organizes code by responsibility, enables reuse

---

## Configuration

### app_settings.json
```json
{
    "app": {
        "name": "PowerMon",
        "version": "1.0.0",
        "minAndroidVersion": "5.0",
        "permissions": [
            "BLUETOOTH",
            "BLUETOOTH_ADMIN",
            "BLUETOOTH_SCAN",
            "BLUETOOTH_CONNECT",
            "LOCATION"
        ]
    },
    "ble": {
        "scanTimeout": 30000,
        "connectionTimeout": 10000,
        "packetSize": 72
    },
    "database": {
        "name": "PowerMonData.sql",
        "maxRecords": 10000
    },
    "logging": {
        "level": "DEBUG",
        "maxBuffer": 1000
    }
}
```

---

## Deployment

### Build Process
1. In DroidScript IDE: File → Build
2. Select signing certificate
3. APK generated in output folder
4. Copy to device or upload to Play Store

### Installation
```
On Device:
1. Enable "Unknown Sources" in Settings
2. Install APK
3. Grant Bluetooth & Location permissions
4. Launch PowerMon
```

### Testing Before Release
- ✅ Test with real power meter device
- ✅ Verify data accuracy
- ✅ Check battery consumption
- ✅ Test on Android 5.0, 7.0, 10.0, 12.0+
- ✅ Verify BLE reconnection
- ✅ Test database persistence
- ✅ Check UI responsiveness

---

## Known Issues & Limitations

### ✅ RESOLVED Issues
- **BLE Callback Binding:** Fixed by using wrapper functions instead of .bind()
- **UART Configuration Timing:** Fixed by moving SetUartIds/SetUartMode to initialize()
- **Settings Page Error:** Fixed by removing duplicate code blocks
- **Device Data Reception:** ✅ WORKING - Device sends data automatically after connection

### Current Limitations
- **Single Device:** Only one device connection at a time
- **Auto-reconnect:** Not yet implemented
- **Cloud Sync:** Not available
- **Offline Mode:** Requires real-time connection
- **Multi-user:** Single user profile

### Performance Notes
- Database auto-cleanup after 10,000 records
- Log buffer limited to 1000 entries
- BLE scanning timeout: 30 seconds
- UI update frequency: ~1 second (adjustable)

### Future Improvements
See [ROADMAP.md](ROADMAP.md) for 16 planned enhancements including:
- Auto-reconnection logic
- Multi-device support
- Advanced visualization
- Cloud synchronization
- Unit test suite
- Performance optimization

---

## Quick Reference

### Common Tasks

**Connect to Device:**
```javascript
const bleMgr = BLEManager.getInstance();
bleMgr.connect("AA:BB:CC:DD:EE:FF");
```

**Listen for Data:**
```javascript
const bleMgr = BLEManager.getInstance();
bleMgr.setOnUartData((data) => {
    console.log("Packet received:", data.packet);
});
```

**Store Measurement:**
```javascript
const dbMgr = DatabaseManager.getInstance();
await dbMgr.insertMeasurement({
    timestamp: Date.now(),
    power: 2500,
    voltage: 230,
    current: 10.87
});
```

**Log Message:**
```javascript
const logMgr = LogManager.getInstance();
logMgr.log("Device connected successfully");
logMgr.warn("Low battery detected");
logMgr.error("Connection failed");
```

**Emit Event:**
```javascript
window.F7Evt.emit('CustomEvent', { value: 123 });
```

**Listen for Event:**
```javascript
window.F7Evt.on('CustomEvent', (data) => {
    console.log("Event fired:", data.value);
});
```

---

## For More Information

- See [QUICKSTART.md](QUICKSTART.md) for development setup
- See [ARCHITECTURE_DETAILED.md](ARCHITECTURE_DETAILED.md) for technical implementation details
- See [TASK_CHECKLIST.md](TASK_CHECKLIST.md) for development roadmap
- See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for complete guide index
