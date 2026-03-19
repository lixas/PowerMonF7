# PowerMon - Quick Start Guide for New Developers

## Welcome! 👋

This guide helps you quickly understand and work with the PowerMon codebase.

---

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Understanding the Code Structure](#understanding-the-code-structure)
3. [Running the App](#running-the-app)
4. [Common Tasks](#common-tasks)
5. [Debugging](#debugging)
6. [Key Concepts](#key-concepts)

---

## Environment Setup

### Prerequisites
- **DroidScript IDE** - Download from http://droidscript.org/
- **Android Device or Emulator** - Android 5.0+
- **Text Editor** - VS Code recommended
- **Git** - For version control

### Initial Setup

1. **Clone the repository:**
```bash
cd /path/to/droidscript/projects
git clone <repo-url> PowerMon
```

2. **Open in DroidScript IDE:**
   - Launch DroidScript
   - Projects → Open → Select PowerMon folder
   - Project should load with all files visible

3. **Check Dependencies:**
   - All external libraries already included
   - No npm install needed
   - Chart.js and Framework7 in `js/` folder

---

## Understanding the Code Structure

### Quick Tour

```
PowerMon/                          ← Root directory
├── PowerMon.html                  ← App entry point - START HERE
├── managers/                      ← Core business logic
│   ├── Application.js             ← Main app controller
│   ├── BLE.js                     ← Bluetooth Low Energy
│   ├── Database.js                ← Data storage
│   ├── Settings.js                ← User preferences
│   └── Log.js                     ← Debug logging
├── home.html                      ← Main user interface
├── settings.html                  ← Settings page
├── chart.html                     ← Data visualization
├── debug.html                     ← Debug logs viewer
├── js/
│   ├── parser.js                  ← Parse device data
│   ├── simulator.js               ← Test device
│   └── utils.js                   ← Utilities
└── Docs/                          ← Documentation (READ THESE!)
    ├── ARCHITECTURE.md            ← System design
    ├── ARCHITECTURE_DETAILED.md   ← Technical deep-dive
    └── QUICKSTART.md              ← This file
```

### File Purposes

| File | Purpose | When to Edit |
|------|---------|--------------|
| `PowerMon.html` | App initialization | Global setup changes |
| `managers/Application.js` | Central coordinator | App-wide logic |
| `managers/BLE.js` | Device communication | BLE issues |
| `home.html` | Main UI | Display changes |
| `settings.html` | User settings | Settings/preferences |
| `debug.html` | Debug viewer | Logging changes |

---

## Running the App

### Step 1: Start in DroidScript
```
In DroidScript IDE:
1. Projects → PowerMon
2. Click "Run" button (or Press F5)
3. Choose device/emulator
4. App launches on device
```

### Step 2: Test Connection
```
On device:
1. Allow location permission
2. Click "Scan for devices"
3. Select your power meter device
```

### Step 3: View Live Data
```
After connection:
1. Power reading updates in real-time
2. Check "Chart" for historical data
3. Check "Debug" for packet logs
```

### Step 4: Use Simulator (No Device Needed)
```
If no real device:
1. Open debug.html
2. Click "Start Simulator"
3. Generates fake packets
4. Test UI without hardware
```

---

## Common Tasks

### Task 1: Add a New Measurement Field

**Scenario:** Device now sends additional data (e.g., reactive power)

**Steps:**

1. **Update Packet Parser** (`js/parser.js`):
```javascript
ParseUartData(hexPacket) {
    // ... existing code ...
    const reactiveEnergy = parseInt(
        dataOnly.substring(28, 36), 16
    ) / 100;  // Extract bytes at position 14-18
    
    return {
        power: power,
        voltage: voltage,
        // ... other fields ...
        reactiveEnergy: reactiveEnergy  // ← Add new field
    };
}
```

2. **Update Database Schema** (`managers/Database.js`):
```javascript
// Update CREATE TABLE statement to include new column
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    power REAL,
    voltage REAL,
    // ... other fields ...
    reactiveEnergy REAL,  // ← Add new column
    // ...
);
```

3. **Update UI Display** (`home.html`):
```html
<!-- Add new display element -->
<div class="measurement">
    <div class="label">Reactive Energy</div>
    <div class="value" id="reactiveEnergyValue">0 VAR</div>
</div>
```

4. **Update UI Script**:
```javascript
// In home.html script
function handleMeasurementUpdate(data) {
    // ... existing updates ...
    document.getElementById('reactiveEnergyValue').innerHTML = 
        data.reactiveEnergy.toFixed(2) + ' VAR';
}
```

### Task 2: Change BLE Device Protocol

**Scenario:** New power meter uses different packet format

**Steps:**

1. **Document New Format:**
   - Create `DEVICE_PROTOCOL.md`
   - Document: Start marker, end marker, field positions, data types

2. **Update Parser** (`js/parser.js`):
```javascript
ParseUartData(hexPacket) {
    // Extract based on NEW device format
    const header = hexPacket.substring(0, 4);     // New start
    const power = parseInt(hexPacket.substring(4, 12), 16);  // New position
    // ... adjust all positions for new format
    return { power: power, /* ... */ };
}
```

3. **Test with Simulator** (`js/simulator.js`):
```javascript
// Update simulator to generate NEW packet format
generatePacket() {
    // Generate packet in NEW format
    let packet = "NEW_START_MARKER";
    packet += "POWER_DATA";
    packet += "VOLTAGE_DATA";
    // ... etc
    return packet;
}
```

4. **Run Tests:**
   - Start simulator
   - Verify packets parse correctly
   - Check values display in UI

### Task 3: Add Settings Option

**Scenario:** User needs option to change power calculation method

**Steps:**

1. **Add Setting** (`managers/Settings.js`):
```javascript
getSettings() {
    return {
        powerMethod: "measured",    // or "va" or "pf"
        theme: "auto",
        // ... existing settings ...
    };
}

setPowerMethod(method) {
    this.data.powerMethod = method;
    this.save();
}
```

2. **Add UI Control** (`settings.html`):
```html
<select id="powerMethodSelect">
    <option value="measured">Measured Power</option>
    <option value="va">VA Power</option>
    <option value="pf">VA×PF Power</option>
</select>
```

3. **Connect UI to Setting**:
```javascript
document.getElementById('powerMethodSelect').addEventListener('change', (e) => {
    const settingsMgr = SettingsManager.getInstance();
    settingsMgr.setPowerMethod(e.target.value);
    
    // Recalculate and update display
    window.F7Evt.emit('EvtSettingsChanged', { setting: 'powerMethod' });
});
```

4. **Use Setting in Calculation**:
```javascript
// In parser or Application.js
function calculatePower(data) {
    const settingsMgr = SettingsManager.getInstance();
    const method = settingsMgr.getPowerMethod();
    
    switch (method) {
        case 'measured':
            return data.power;
        case 'va':
            return data.voltage * data.current;
        case 'pf':
            return data.voltage * data.current * data.powerFactor;
        default:
            return data.power;
    }
}
```

### Task 4: View and Analyze Logs

**In App:**
```
1. Open "Debug" tab
2. See all logged messages
3. Each log entry shows:
   - Timestamp
   - Log level (LOG, INFO, WARN, ERROR)
   - Message text

Useful logs to check:
- "SetOnConnect callback wrapper called" - Device connected
- "UART data received" - Packets arriving
- "Device type detected" - Parser identified device
- Error messages - Something went wrong
```

**Export Logs:**
```
1. In debug.html, click "Export Logs"
2. File saved to device storage
3. Download file to computer
4. Open in text editor to analyze
```

---

## Debugging

### Step 1: Enable Debug Mode

In `PowerMon.html`:
```javascript
// Set log level to DEBUG
LogManager.getInstance().setLevel("DEBUG");
```

### Step 2: Key Log Points to Check

**Connection Issues:**
- Look for: "SetOnConnect callback wrapper called"
- If missing: BLE plugin not loaded correctly

**Data Reception Issues:**
- Look for: "UART data received: FF..."
- If missing: SetUartIds or SetUartMode not called before connection

**Parse Errors:**
- Look for: "Parse error" messages
- Check packet format matches device spec

**Database Issues:**
- Look for: "Measurement stored" success message
- If missing: Database query failed

### Step 3: Common Problems & Solutions

**Problem: App crashes on startup**
- Check: All manager classes initialized
- Check: No JavaScript syntax errors
- Check: All required plugins available

**Problem: Can't find BLE device**
- Check: Bluetooth enabled on Android device
- Check: Device in range (max ~30 meters)
- Check: Device not already connected to another app

**Problem: Connected but no data**
- Check: UART IDs set correctly (FFE0, FFE2, FFE1)
- Check: Device sending data (use real device or simulator)
- Check: Parser correctly extracts fields

**Problem: UI not updating**
- Check: Event callbacks registered
- Check: No JavaScript errors in console
- Check: Data actually arriving (check logs)

### Step 4: Manual Testing Checklist

```
□ App starts without errors
□ "Scan for Devices" shows devices in range
□ Can select and connect to device
□ After connection, live values update
□ Chart shows historical data
□ Settings page loads without errors
□ Settings persist after app restart
□ Debug logs can be exported
□ About page displays version
```

---

## Key Concepts

### 1. Singleton Pattern
Each manager exists only once:
```javascript
// Always get same instance
const ble1 = BLEManager.getInstance();
const ble2 = BLEManager.getInstance();
// ble1 === ble2  (same object)
```

### 2. Event System
Components communicate via events:
```javascript
// Component A emits
window.F7Evt.emit('MyEvent', { data: value });

// Component B listens
window.F7Evt.on('MyEvent', (data) => {
    console.log(data.value);
});
```

### 3. Callbacks
BLE operations are asynchronous:
```javascript
// Register callback ONCE
ble.setOnUartData(function(data) {
    console.log("Data received:", data.packet);
});

// Called automatically when data arrives
// (No need to call it yourself)
```

### 4. Wrapper Functions (Critical!)
DroidScript requires wrapper functions:
```javascript
// ✅ Correct - Uses wrapper function
const self = this;
ble.SetOnConnect(function() {
    self.handleConnect();  // 'self' refers to correct object
});

// ❌ Wrong - Won't work
ble.SetOnConnect(this.handleConnect.bind(this));  // 'this' lost
```

### 5. Async Operations
Database and BLE are asynchronous:
```javascript
// Must await database operations
await db.insertMeasurement({...});

// Or use callbacks
ble.setOnUartData((data) => {
    // This runs when data arrives
});
```

---

## Next Steps

### For New Features:
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand system
2. Look for similar code in existing features
3. Follow the pattern
4. Test with simulator first
5. Test with real device

### For Bug Fixes:
1. Enable debug logging
2. Reproduce the issue
3. Check logs for error messages
4. Read relevant manager code
5. Make minimal changes
6. Test thoroughly

### For Performance:
1. Check log buffer size
2. Check database record count
3. Check UI update frequency
4. Profile with device developer tools

---

## Getting Help

**Check Documentation:**
1. [ARCHITECTURE.md](ARCHITECTURE.md) - System design
2. [ARCHITECTURE_DETAILED.md](ARCHITECTURE_DETAILED.md) - Technical details
3. [ROADMAP.md](ROADMAP.md) - Planned features
4. Code comments - Inline documentation

**Debug Issues:**
1. Enable DEBUG logging
2. Check for error messages
3. Search codebase for error text
4. Test with simulator

**Understand Code:**
1. Find function definition (Ctrl+F)
2. Read comments above function
3. Check how it's called elsewhere
4. Trace through event flow

---

## File Organization Best Practices

**When adding new file:**
```
✅ DO:
- Put business logic in managers/
- Put UI in HTML files
- Put utilities in js/utils.js
- Put tests in Docs/TASK_CHECKLIST.md

❌ DON'T:
- Mix UI and logic in one file
- Create new directory without discussion
- Use inline code in HTML files
```

**When modifying existing:**
```
✅ DO:
- Keep related code together
- Add comments for complex logic
- Use existing patterns
- Test before committing

❌ DON'T:
- Scatter related code across files
- Remove comments
- Create new patterns
- Commit untested code
```

---

## Quick Commands

**View Log Messages:**
```javascript
LogManager.getInstance().getBuffer().forEach(entry => {
    console.log(entry.level + ": " + entry.message);
});
```

**Get Current BLE Status:**
```javascript
const ble = BLEManager.getInstance();
console.log("Connected:", ble.getConnectionState());
console.log("Device:", ble.getConnectedDeviceAddress());
```

**Manually Trigger Update:**
```javascript
window.F7Evt.emit('EvtMeasurementUpdated', {
    power: 1000,
    voltage: 230,
    current: 4.35
});
```

**Clear All Data:**
```javascript
const db = DatabaseManager.getInstance();
await db.deleteAll();
LogManager.getInstance().log("All data cleared");
```

---

## Additional Resources

- [DroidScript API Docs](http://droidscript.org/docs)
- [Framework7 Docs](https://framework7.io)
- [BluetoothLE Plugin Docs](http://droidscript.org/docs/en/objects/object_BluetoothLE.html)
- [SQLite Reference](https://www.sqlite.org/docs.html)

---

**Ready to start coding?** 🚀

1. Read [ARCHITECTURE.md](ARCHITECTURE.md)
2. Try running the simulator
3. Make your first change
4. Check [TASK_CHECKLIST.md](TASK_CHECKLIST.md) for tasks
