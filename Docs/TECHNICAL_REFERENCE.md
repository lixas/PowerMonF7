# 🔧 TECHNICAL REFERENCE - Quick Lookup

**Location:** `Docs/` folder  
**For:** Quick reference during development

---

## 📍 File Locations & Purposes

### Core Managers (managers/ folder)

| File | Purpose | Key Methods | Status |
|------|---------|------------|--------|
| Application.js | Main orchestrator, coordinates all systems | initialize(), handleBleConnected(), handleUartData() | ✅ |
| BLE.js | Bluetooth communication & packet assembly | connect(), disconnect(), handleUartData(), processPacket() | ✅ |
| Database.js | SQLite operations | insertMeasurement(), getLatestMeasurements(), deleteOldRecords() | ✅ |
| Settings.js | User preferences & persistence | get(), set(), getPowerMethod(), getTheme() | ✅ |
| Log.js | Debug logging system | log(), warn(), error(), getBuffer() | ✅ |

### HTML Pages (UI Layer)

| File | Purpose | Events | Status |
|------|---------|--------|--------|
| PowerMon.html | App entry point, initialization | EvtAppInitialized | ✅ |
| home.html | Main display, live measurements | EvtMeasurementUpdated | ✅ |
| settings.html | User preferences | EvtSettingsChanged | ✅ |
| chart.html | Historical data visualization | EvtDataLoaded | ✅ |
| details.html | Detailed measurement info | EvtDetailsUpdated | ✅ |
| debug.html | Debug console & logs | EvtLogsUpdated | ✅ |
| about.html | About & version info | - | ✅ |

### Utilities (js/ folder)

| File | Purpose | Status |
|------|---------|--------|
| parser.js | Protocol parsing, data extraction | ✅ |
| simulator.js | Test device simulator | ✅ |
| utils.js | Helper functions | ✅ |
| chart.umd.js | Chart.js library | ✅ |

---

## 🔗 COMMON CODE PATTERNS

### 1. Get a Manager (Singleton)
```javascript
const bleMgr = BLEManager.getInstance();
const dbMgr = DatabaseManager.getInstance();
const logMgr = LogManager.getInstance();
const settingsMgr = SettingsManager.getInstance();
const appMgr = ApplicationManager.getInstance();
```

### 2. Emit Event
```javascript
window.F7Evt.emit('EvtMeasurementUpdated', {
    power: 2500,
    voltage: 230,
    current: 10.87,
    timestamp: Date.now()
});
```

### 3. Listen for Event
```javascript
window.F7Evt.on('EvtMeasurementUpdated', (data) => {
    console.log("Power:", data.power);
    updateDisplay(data);
});
```

### 4. Log Message
```javascript
const log = LogManager.getInstance();
log.log("Normal message");
log.info("Info message");
log.warn("Warning message");
log.error("Error message");
```

### 5. Store Data in Database
```javascript
const db = DatabaseManager.getInstance();
await db.insertMeasurement({
    timestamp: Date.now(),
    power: 2500,
    voltage: 230,
    current: 10.87,
    frequency: 50,
    powerFactor: 0.95,
    rawData: hexPacket
});
```

### 6. Retrieve from Database
```javascript
const db = DatabaseManager.getInstance();
const recent = await db.getLatestMeasurements(100);  // Last 100
const range = await db.getMeasurementsByTimeRange(start, end);
```

### 7. Connect to BLE Device
```javascript
const ble = BLEManager.getInstance();
ble.setOnUartData((data) => {
    console.log("Packet received:", data.packet);
});
ble.connect(deviceAddress);
```

### 8. Set Callback
```javascript
const ble = BLEManager.getInstance();
ble.setOnConnected((address) => {
    console.log("Connected to:", address);
});
ble.setOnDisconnected((address) => {
    console.log("Disconnected from:", address);
});
ble.setOnError((message) => {
    console.error("BLE error:", message);
});
```

---

## 📊 DATA STRUCTURES

### Measurement Object
```javascript
{
    id: 1,
    timestamp: 1710907456000,  // milliseconds
    power: 2500,               // watts
    voltage: 230,              // volts
    current: 10.87,            // amps
    frequency: 50,             // Hz
    powerFactor: 0.95,         // 0-1
    reactiveEnergy: 0,         // VAR
    apparentPower: 2625,       // VA
    deviceType: "METER-A1",
    rawData: "FF...XX"         // hex packet
}
```

### UART Data Event Object
```javascript
{
    type: "data",              // data | command | ack
    packet: "FF...XX",         // hex string
    deviceType: "METER-A1",
    timestamp: 1710907456000
}
```

### Settings Object
```javascript
{
    powerMethod: "measured",   // measured | va | pf
    theme: "auto",             // auto | light | dark
    screenOn: true,            // keep screen on
    unit: "W",                 // W | kW
    autoReconnect: true,
    // ... other settings
}
```

---

## 🔴 CRITICAL BLE IMPLEMENTATION DETAILS

### Callback Registration (MUST USE WRAPPER FUNCTIONS)
```javascript
// ❌ WRONG - won't work
ble.SetOnConnect(this.handleConnect.bind(this));

// ✅ CORRECT - use wrapper
const self = this;
ble.SetOnConnect(function() {
    self.handleConnect();
});
```

### UART Configuration (BEFORE CONNECT)
```javascript
// In initialize() method - MUST be before any connection
this.ble.SetUartMode("Hex");
this.ble.SetUartIds(
    "0000FFE0-0000-1000-8000-00805F9B34FB",  // SERVICE
    "0000FFE2-0000-1000-8000-00805F9B34FB",  // TX
    "0000FFE1-0000-1000-8000-00805F9B34FB"   // RX
);

// Later - safe to connect
this.ble.Connect(deviceAddress, "UART");
```

### Packet Assembly & Parsing
```javascript
// Accumulate bytes in buffer
uartBuffer += data;

// Check for complete packet (36 bytes = 72 hex chars)
const PACKET_LENGTH = 72;
if (uartBuffer.endsWith('FF') && uartBuffer.length === PACKET_LENGTH) {
    processPacket(uartBuffer);
    uartBuffer = "";  // Clear for next packet
}

// Parse packet
processPacket(packet) {
    const power = parseInt(packet.substring(2, 10), 16);
    const voltage = parseInt(packet.substring(10, 14), 16) / 100;
    const current = parseInt(packet.substring(14, 18), 16) / 100;
    // ... extract other fields
    return { power, voltage, current, ... };
}
```

---

## 🔍 DEBUGGING CHECKLIST

### Device Not Connecting
- [ ] Bluetooth enabled on device
- [ ] Device in range (max ~30 meters)
- [ ] Device not already connected to another app
- [ ] Check debug.html: "BLE plugin loaded"?
- [ ] Check debug.html: "SetOnConnect callback wrapper called"?

### Data Not Received
- [ ] Check: Device connected (EvtBleConnected fired)?
- [ ] Check: UART IDs set (SetUartIds called in initialize())?
- [ ] Check: UART mode set (SetUartMode called)?
- [ ] Check debug.html: "UART data received"?
- [ ] Check debug.html: "Complete packet received"?

### Measurements Not Displaying
- [ ] Check database has measurements
- [ ] Check parser extracts values correctly
- [ ] Check UI event listeners registered
- [ ] Check for JavaScript errors in console
- [ ] Check home.html receives EvtMeasurementUpdated

### Application Crashes
- [ ] Check all managers initialized
- [ ] Check no syntax errors
- [ ] Check debug.html for error messages
- [ ] Check for missing event listener cleanup

---

## 📈 PERFORMANCE TIPS

### Reduce Memory Usage
```javascript
// Clear old data periodically
const maxAge = 90 * 24 * 60 * 60 * 1000;  // 90 days
const cutoff = Date.now() - maxAge;
db.deleteWhere("timestamp < ?", [cutoff]);
```

### Optimize Database Queries
```javascript
// Use time range queries instead of all records
const start = Date.now() - (7 * 24 * 60 * 60 * 1000);  // 7 days
const measurements = db.getMeasurementsByTimeRange(start, Date.now());
```

### Throttle UI Updates
```javascript
let lastUpdate = 0;
const UPDATE_INTERVAL = 1000;  // 1 second

window.F7Evt.on('EvtUartDataReceived', (data) => {
    if (Date.now() - lastUpdate >= UPDATE_INTERVAL) {
        updateDisplay(data);
        lastUpdate = Date.now();
    }
});
```

### Buffer Management
```javascript
const MAX_BUFFER_SIZE = 1000;
if (this.uartBuffer.length > MAX_BUFFER_SIZE) {
    Logger.warn("Buffer overflow, clearing");
    this.uartBuffer = "";
}
```

---

## 🧪 TESTING WITH SIMULATOR

**Location:** `js/simulator.js`

**How to use:**
1. Open debug.html in app
2. Click "Start Simulator"
3. Simulator generates fake 72-byte packets
4. Perfect for testing UI without device

**When to use:**
- Testing UI layout
- Testing data display
- Testing charts
- Testing without real device
- Quick feature testing

---

## 📱 DROIDSCRIPT-SPECIFIC NOTES

### Bluetooth Plugin
```javascript
// Load plugin
app.LoadPlugin("BluetoothLE");

// Create BLE object
const ble = app.CreateBluetoothLE();

// Register callbacks (NOT using .bind())
const self = this;
ble.SetOnConnect(function() { self.onConnect(); });
ble.SetOnDisconnect(function() { self.onDisconnect(); });
ble.SetOnUartReceive(function(data) { self.onData(data); });

// Connect
ble.Connect(address, "UART");

// Send UART
ble.SendUart("01,02,03");  // comma-separated hex

// Disconnect
ble.Disconnect();
```

### File Operations
```javascript
// Write to file
app.WriteFile(path, text, "Append", "UTF-8");

// Read from file
const content = app.ReadFile(path);
```

### SQLite Database
```javascript
// Via DroidScript built-in
const db = app.OpenDatabase("PowerMonData.sql");

// Execute query
db.ExecuteSql(sql, params, (cursor) => {
    while (cursor.MoveToNext()) {
        // Process row
    }
});
```

### Framework7 Events
```javascript
// Already global in PowerMon.html as window.F7Evt
// Can emit and listen anywhere
window.F7Evt.emit('EventName', data);
window.F7Evt.on('EventName', callback);
```

---

## 🎯 COMMON TASKS QUICK REFERENCE

### Task: Add New Measurement Field
1. Update `js/parser.js` to extract from packet
2. Add column to `PowerMonData.sql` schema
3. Update `DatabaseManager.insertMeasurement()` parameter
4. Update UI page to display new field
5. Test with simulator

### Task: Change Device Protocol
1. Update packet parsing in `js/parser.js`
2. Document new format
3. Test with simulator first
4. Test with real device

### Task: Add New Setting
1. Add to `SettingsManager.getDefaults()`
2. Add UI control in `settings.html`
3. Add event listener in settings page
4. Use in relevant manager

### Task: Fix BLE Issue
1. Check debug.html logs first
2. Search for error message in code
3. Add more logging statements
4. Test with both simulator and real device
5. Check managers/BLE.js implementation

---

## 📚 DOCUMENTATION QUICK LINKS

| Topic | File | Section |
|-------|------|---------|
| Getting Started | Docs/QUICKSTART.md | Top |
| System Design | Docs/ARCHITECTURE.md | Architecture Diagram |
| BLE Protocol | Docs/ARCHITECTURE_DETAILED.md | BLE Communication |
| Packet Format | Docs/ARCHITECTURE_DETAILED.md | Packet Format |
| Database | Docs/ARCHITECTURE_DETAILED.md | Database Schema |
| Events | Docs/ARCHITECTURE_DETAILED.md | Event System |
| Debugging | Docs/ARCHITECTURE_DETAILED.md | Testing & Debugging |
| Future Tasks | Docs/ROADMAP.md | Task List |
| Verification | Docs/INTEGRATION_GUIDE.md | Testing Scenarios |

---

## ✅ IMPORTANT STATUS FLAGS

- ✅ Device communication: **WORKING**
- ✅ Real device tested: **YES**
- ✅ All measurements: **DISPLAYING**
- ✅ Database: **FUNCTIONAL**
- ✅ Settings: **PERSISTING**
- ✅ No errors: **CONFIRMED**
- 🟠 Auto-reconnect: **NOT IMPLEMENTED**
- 🟠 Multi-device: **NOT IMPLEMENTED**

---

**Created:** March 19, 2026  
**Last Updated:** March 19, 2026  
**Purpose:** Quick reference for continued development
