# PowerMon - Integration & Migration Guide

## Overview

This document explains how to complete the migration to the new manager-based architecture and verify the system is working correctly.

---

## Current Status (March 2026)

### ✅ New Architecture (Completed)
- [x] `managers/Application.js` - Main app controller
- [x] `managers/BLE.js` - Bluetooth communication (WORKING with real device) ✅
- [x] `managers/Database.js` - Data persistence
- [x] `managers/Settings.js` - User preferences
- [x] `managers/Log.js` - Debug logging
- [x] All HTML pages refactored and integrated

### ✅ Device Communication (VERIFIED WORKING)
- [x] BLE connection working
- [x] UART IDs and mode set BEFORE connection
- [x] Device sends data automatically (no init command needed)
- [x] 72-byte packet format (starts FF, ends checksum)
- [x] Real device tested and functioning

### ⚠️ Legacy Code (Still in Project)
- [ ] `Logger.js` - Being replaced by `managers/Log.js`
- [ ] `DataProcessor.js` - Utilities scattered across managers
- [ ] `UtilityHelper.js` - Helper functions
- [ ] `UIController.js` - Moved to individual pages
- [ ] `settings-manager.js` - Replaced by `managers/Settings.js`
- [ ] `BleService.js` - Background service (optional)
- [ ] `service-manager.js` - Service lifecycle

**Status:** Legacy code can be removed after verification

---

## Migration Checklist

### Phase 1: Verify New Architecture (COMPLETE)

#### 1.1 Test BLE Connection ✅
```javascript
// Test: Connect to device and receive data
1. Open PowerMon.html
2. Click "Scan for devices"
3. Select power meter device
4. Verify connection succeeds (check logs for "SetOnConnect callback wrapper called")
5. Verify data appears on screen
6. Check debug.html for no errors
```

**Verification Points:**
- [x] Device connects without errors
- [x] UART callback fires
- [x] Data packets received (72 bytes, FF start, checksum end)
- [x] Measurements display on home.html
- [x] Charts update in real-time
- [x] No reference errors in console

#### 1.2 Test Settings ✅
```javascript
// Test: Settings persist across app restart
1. Open settings.html
2. Change theme to Dark
3. Toggle "Screen on while connected"
4. Change power calculation method
5. Close app completely
6. Reopen app
7. Verify all settings persisted
```

**Verification Points:**
- [x] All settings display current values
- [x] Changes save immediately
- [x] Changes persist after restart
- [x] No errors in debug.html

#### 1.3 Test Database ✅
```javascript
// Test: Data storage and retrieval
1. Connect device and collect data for 1 minute
2. Disconnect
3. Open chart.html
4. Verify historical data displays
5. Open debug.html
6. Export logs
7. Reopen app
8. Verify data still there
```

**Verification Points:**
- [x] Measurements save to database
- [x] Chart displays historical data
- [x] Data persists across sessions
- [x] Database queries are fast

#### 1.4 Test All Pages ✅
```
Home page ✓
├─ Device list displays
├─ Connection/disconnect works
└─ Live measurements show

Settings page ✓
├─ All settings display
├─ Changes persist
└─ Reset to defaults works

Chart page ✓
├─ Data visualizes
├─ Date range selector works
└─ Performance acceptable

Details page ✓
├─ Detailed values display
├─ Calculations correct
└─ Updates in real-time

Debug page ✓
├─ Logs display
├─ Filter works
└─ Export to file works

About page ✓
└─ Version info displays
```

---

### Phase 2: Remove Legacy Code

Once all verification passes, remove legacy files:

#### 2.1 Remove Logger.js
```bash
# Remove file
git rm Logger.js

# Verify no imports
grep -r "Logger.js" --include="*.html" --include="*.js"
# Should return nothing
```

**Safe because:** All logging now uses `managers/Log.js`

#### 2.2 Remove DataProcessor.js
```bash
# First verify functionality is in managers
grep -r "DataProcessor" managers/

# Should find implementations in managers/Application.js or managers/Database.js
```

**Safe because:**
- Power calculations now in `managers/Application.js`
- Data validation in `js/parser.js`
- No pages should import DataProcessor directly

#### 2.3 Remove UtilityHelper.js
```bash
# Search for usages
grep -r "UtilityHelper" --include="*.html" --include="*.js"

# Move any utility functions that are still used to appropriate manager
# Remove file
git rm UtilityHelper.js
```

#### 2.4 Remove UIController.js
```bash
# All UI handling moved to individual pages
git rm UIController.js

# Verify no references
grep -r "UIController" --include="*.html" --include="*.js"
```

#### 2.5 Remove settings-manager.js
```bash
git rm settings-manager.js

# All settings now in managers/Settings.js
```

---

### Phase 3: Cleanup & Optimization

#### 3.1 Update PowerMon.html
```html
<!-- Remove old imports -->
<!-- <script src="Logger.js"></script> -->
<!-- <script src="DataProcessor.js"></script> -->
<!-- <script src="UtilityHelper.js"></script> -->
<!-- <script src="UIController.js"></script> -->

<!-- Keep only manager imports -->
<script src="managers/Log.js"></script>
<script src="managers/Application.js"></script>
<script src="managers/BLE.js"></script>
<script src="managers/Database.js"></script>
<script src="managers/Settings.js"></script>
```

#### 3.2 Verify All Imports
```bash
# Search for any remaining old imports
grep -r "from.*Logger\|from.*DataProcessor\|from.*UtilityHelper" --include="*.js"

# Should return nothing
```

#### 3.3 Code Quality Scan
```bash
# Check for console.log (should use Logger)
grep -r "console.log" --include="*.js" --include="*.html" | grep -v "debug\|test"

# Check for global variables
grep -r "^[a-zA-Z_][a-zA-Z0-9_]* =" --include="*.js" | grep -v "static\|class\|function"

# Check for commented code
grep -r "^[[:space:]]*//.*=" --include="*.js" | grep -v "JSDoc\|@param"
```

---

## Known Working Paths (VERIFIED)

### ✅ App Initialization Path
```
PowerMon.html: OnStart()
    ↓
AppManager.getInstance().initialize()
    ↓
├─ SettingsManager.init()
├─ Logger.init()
├─ Framework7 initialization
├─ BLEManager.init()        ← UART IDs and mode set HERE
├─ DatabaseManager.init()
└─ Emit EvtAppInitialized
    ↓
home.html mounted and ready
```

**KEY CHANGE:** UART configuration happens in BLEManager.initialize(), BEFORE any device connection attempt.

### ✅ BLE Connection Path (FIXED)
```
home.html: connectClick()
    ↓
AppManager.connectToDevice(address)
    ↓
BLEManager.connect(address)
    ↓
ble.Connect() [DroidScript]
    ↓ (~1 second)
SetOnConnect callback fires (using wrapper function)
    ↓
BLEManager.handleConnect()
    ├─ SetUartIds() ← Already done in initialize()
    ├─ SetUartMode("Hex") ← Already done in initialize()
    ├─ isConnected = true
    ├─ Emit EvtBleConnected
    └─ Device starts sending data immediately
        ↓
    SetOnUartReceive fires (wrapper function)
        ↓
    home.html listener updates display
```

**IMPORTANT:** UART is already configured, device sends data immediately after connection.

### ✅ Data Reception Path (CONFIRMED)
```
Device sends 72-byte packet
    ↓ (FF...checksum, 144 hex chars)
SetOnUartReceive callback (wrapper function)
    ↓
BLEManager.handleUartData()
    ├─ Accumulate in buffer
    ├─ Check: endsWith('FF') && length == 144
    └─ processPacket()
        ├─ Extract packet type
        ├─ Parse measurements
        └─ emitUartData()
            ├─ Emit callback
            └─ AppManager.handleUartData()
                ├─ ProtocolParser.ParseUartData()
                ├─ Extract power, voltage, current, etc
                ├─ Save to database
                ├─ Calculate derived values
                └─ Update UI
                    ↓
                home.html displays live values
```

### ✅ Settings Path
```
settings.html: SettingChange()
    ↓
AppManager.setSetting(key, value)
    ↓
SettingsManager.set()
    ├─ Update in-memory
    ├─ Persist to storage
    └─ Emit EvtSettingsChanged
        ↓
Listening pages update UI
```

### ✅ Disconnect Path
```
User clicks disconnect
    ↓
AppManager.disconnectFromDevice()
    ↓
BLEManager.disconnect()
    ↓
ble.Disconnect() [DroidScript]
    ↓
SetOnDisconnect callback
    ↓
BLEManager.handleDisconnect()
    ├─ Set isConnected = false
    └─ Emit EvtBleDisconnected
        ↓
    AppManager.handleBleDisconnected()
        └─ Emit UI update events
            ↓
        home.html listener
            ├─ Clear measurements display
            ├─ Update icon to "disconnected"
            └─ Disable remote controls
```

---

## Architecture Verification Checklist

### Application Manager ✅
- [x] Singleton instance management
- [x] Framework7 initialization
- [x] BLE lifecycle coordination
- [x] Event bus management
- [x] Settings coordination
- [x] Database coordination
- [x] Error handling

### BLE Manager ✅ (TESTED WITH REAL DEVICE)
- [x] Device discovery
- [x] Connection management
- [x] UART callback registration (wrapper functions, NOT .bind())
- [x] Packet assembly and parsing (72 bytes, FF start, checksum end)
- [x] Data transmission
- [x] Disconnection handling
- [x] Error recovery
- [x] Automatic data reception (no init command needed)

### Database Manager ✅
- [x] SQLite initialization
- [x] Query execution (async)
- [x] Measurement storage
- [x] Data retrieval
- [x] Cleanup operations
- [x] Error handling

### Settings Manager ✅
- [x] Settings persistence
- [x] Default values
- [x] Get/set operations
- [x] Event emission
- [x] Theme management
- [x] Power calculation method

### Logger ✅
- [x] Multiple log levels
- [x] In-memory buffering
- [x] Filtering capabilities
- [x] Export functionality
- [x] Performance (no lag)

---

## Testing Scenarios

### Scenario 1: Fresh App Start ✅
```
1. Delete app data
2. Launch app
3. Verify:
   - [x] No errors in startup
   - [x] All pages load
   - [x] Settings have defaults
   - [x] Database initialized
   - [x] No measurements yet
```

### Scenario 2: Device Connection & Data ✅
```
1. Start app
2. Scan for devices
3. Connect to power meter
4. Wait 30 seconds
5. Verify:
   - [x] Connection succeeds
   - [x] Data appears in ~2 seconds
   - [x] Live updates every 1 second
   - [x] No lag or stuttering
   - [x] Chart updates
   - [x] Debug logs clean
```

### Scenario 3: Settings Persistence ✅
```
1. Change 3 different settings
2. Restart app
3. Verify:
   - [x] All 3 settings retained
   - [x] Theme applied
   - [x] Power calc method in use
   - [x] Other settings active
```

### Scenario 4: Data Persistence ✅
```
1. Connect device for 2 minutes
2. Collect ~30 measurements
3. Close app
4. Wait 5 minutes
5. Reopen app
6. Open chart
7. Verify:
   - [x] Historical data shows
   - [x] Data from before reopening
   - [x] Database queries fast
```

### Scenario 5: Error Recovery ✅
```
1. Connect device
2. Walk out of Bluetooth range
3. Wait for disconnect
4. Walk back into range
5. Verify:
   - [x] Disconnect detected
   - [x] UI updates
   - [x] Can reconnect manually
   - [x] Data resumes
```

---

## Performance Benchmarks

After completing migration, measured performance:

| Metric | Target | Status |
|--------|--------|--------|
| App startup time | <2s | ✅ Fast |
| BLE connection time | <2s | ✅ ~1-2s |
| Data display latency | <500ms | ✅ <500ms |
| Chart render time | <500ms | ✅ Smooth |
| Memory footprint | <50MB | ✅ Low |
| Database query time | <100ms | ✅ Fast |
| Settings save time | <100ms | ✅ Instant |
| Packet reception interval | ~1-2s | ✅ Automatic |

---

## Rollback Plan

If issues encountered, rollback to last working state:

```bash
# List recent commits
git log --oneline -10

# Rollback to previous version
git revert <commit-hash>

# Or checkout previous branch
git checkout previous-branch

# Or reset to tag
git reset --hard v2.0.0
```

---

## Sign-Off Checklist

Before declaring migration complete:

- [x] All tests pass
- [x] All verification scenarios complete
- [x] Performance benchmarks acceptable
- [x] No debug errors
- [ ] Legacy code removed
- [x] Documentation updated
- [ ] Code reviewed
- [ ] Release notes written
- [ ] APK built and tested
- [ ] User communication sent

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [ARCHITECTURE_DETAILED.md](./ARCHITECTURE_DETAILED.md) - Deep technical details
- [QUICKSTART.md](./QUICKSTART.md) - For new developers
- [ROADMAP.md](./ROADMAP.md) - Future tasks

---

**Document Version:** 2.0  
**Last Updated:** March 19, 2026  
**Status:** Real Device Testing Complete ✅  
**Device Communication:** Working ✅
