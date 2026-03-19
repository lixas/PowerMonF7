# PowerMon - Master Task Checklist

**Last Updated:** March 19, 2026  
**Total Tasks:** 16  
**Status:** Prioritized and Ready

---

## 🔴 CRITICAL PRIORITY (BLOCKING)

### 1. ❌ Fix Device Data Reception Issue
**Status:** 🔴 BLOCKING  
**Effort:** 4-8 hours (debugging) + 1-2 hours (fix)  
**Assigned To:** [TBD]  
**Priority:** 🔴 CRITICAL

**Description:** Device connects successfully but no measurement data appears on screen.

**Acceptance Criteria:**
- [ ] Device connects without errors
- [ ] "SetOnConnect callback fired" appears in logs
- [ ] UART is configured (SetUartIds, SetUartMode)
- [ ] Data packets received (log shows "Complete packet received")
- [ ] Packets parsed successfully
- [ ] Measurements appear on home.html
- [ ] Debug logs show no errors

**Steps:**
1. [ ] Connect with real device
2. [ ] Check logs against 7-point checklist
3. [ ] Identify where data flow stops
4. [ ] Implement fix
5. [ ] Test with simulator
6. [ ] Test with real device
7. [ ] Verify all logs clean

**Testing Scenarios:**
- [ ] Connect to device and wait 30 seconds
- [ ] Verify data every second
- [ ] Disconnect and reconnect 5 times
- [ ] Check database has measurements
- [ ] Export logs and verify no errors

**Dependencies:**
- Real BLE power meter device
- DroidScript debugger
- Device protocol documentation

**Notes:** This is the main remaining issue preventing app from being fully functional.

---

### 2. ❌ Send Device Initialization Command
**Status:** 🟡 INVESTIGATING  
**Effort:** 2-4 hours  
**Assigned To:** [TBD]  
**Dependent On:** Task 1

**Description:** After UART configuration, device may need explicit command to start streaming data.

**Acceptance Criteria:**
- [ ] Initialization command identified
- [ ] Command sent after SetUartMode succeeds
- [ ] Device confirms command receipt
- [ ] Data starts flowing after command
- [ ] Logs show command was sent

**Steps:**
1. [ ] Document device protocol for initialization
2. [ ] Create sendCommand() method in BLEManager
3. [ ] Call after SetUartMode in handleConnect()
4. [ ] Add logging for command transmission
5. [ ] Test with device

**Testing:**
- [ ] Connect and verify command sent
- [ ] Check device logs show receipt
- [ ] Verify data arrives within 2 seconds

**Dependencies:** Device protocol documentation

**Blocked By:** Task 1 (need working connection first)

---

## 🟠 HIGH PRIORITY (NEXT RELEASE)

### 3. ❌ Implement Auto-Reconnection Logic
**Status:** 🟡 NOT STARTED  
**Effort:** 4-6 hours  
**Assigned To:** [TBD]  
**Priority:** High

**Description:** When device disconnects, app should auto-reconnect instead of requiring manual action.

**Acceptance Criteria:**
- [ ] Auto-reconnect enabled by default
- [ ] Exponential backoff implemented (2s → 4s → 8s...)
- [ ] Max 5 reconnection attempts
- [ ] UI shows "Reconnecting..." status
- [ ] User can cancel reconnection
- [ ] Setting available to disable auto-reconnect
- [ ] Logs show reconnection attempts

**Steps:**
1. [ ] Add reconnect properties to BLEManager
2. [ ] Implement exponential backoff algorithm
3. [ ] Add UI status indicator
4. [ ] Add reconnect toggle in settings
5. [ ] Add cancel button during reconnection
6. [ ] Test all scenarios
7. [ ] Update documentation

**Testing:**
- [ ] Walk out of Bluetooth range
- [ ] Verify auto-reconnect triggers
- [ ] Verify it attempts 5 times
- [ ] Verify each delay increases
- [ ] Verify can cancel
- [ ] Walk back in range and verify reconnect succeeds

**Checklist:**
- [ ] BLEManager: reconnect logic
- [ ] AppManager: coordinate reconnect
- [ ] Settings: add toggle
- [ ] home.html: show status
- [ ] Documentation updated

---

### 4. ❌ Add Multi-Device Support
**Status:** 🟡 NOT STARTED  
**Effort:** 12-16 hours  
**Assigned To:** [TBD]  
**Priority:** High

**Description:** Currently supports only one device. Add ability to store and switch between devices.

**Acceptance Criteria:**
- [ ] Database schema updated with device_profiles table
- [ ] Can save multiple device configurations
- [ ] Can switch between devices in UI
- [ ] Each device has separate measurement history
- [ ] Charts filter by device
- [ ] Device info shows last connection time
- [ ] Can rename devices
- [ ] Can delete devices

**Steps:**
1. [ ] Create database migration for device_profiles table
2. [ ] Create DeviceManager class
3. [ ] Update DatabaseManager for device filtering
4. [ ] Add device list UI in home.html
5. [ ] Add device switch functionality
6. [ ] Update charts to filter by device
7. [ ] Add device management in settings
8. [ ] Test all scenarios

**Database Changes:**
```sql
CREATE TABLE device_profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected DATETIME
);

ALTER TABLE measurements ADD device_id INTEGER REFERENCES device_profiles(id);
```

**UI Changes:**
- [ ] Device selector dropdown in home.html
- [ ] Device list in settings
- [ ] Rename device dialog
- [ ] Delete device confirmation
- [ ] Last connected time display

**Testing:**
- [ ] Save 3 different devices
- [ ] Switch between devices
- [ ] Verify data per device
- [ ] Verify charts show correct device
- [ ] Delete device and verify cleanup

---

### 5. ❌ Improve Settings UI
**Status:** 🟡 IN PROGRESS  
**Effort:** 3-5 hours  
**Assigned To:** [TBD]  
**Priority:** High

**Description:** Current settings page is basic. Improve organization and usability.

**Acceptance Criteria:**
- [ ] Settings grouped by category
- [ ] Clear section descriptions
- [ ] Helpful tooltips for each setting
- [ ] Restore defaults with confirmation
- [ ] Visual grouping and styling
- [ ] Responsive on all screen sizes
- [ ] All settings still functional

**Changes:**
- [ ] Group into sections: Device, Display, Data, Advanced
- [ ] Add section descriptions
- [ ] Add setting tooltips
- [ ] Add restore defaults button with confirmation
- [ ] Improve visual styling
- [ ] Add icons for sections

**HTML Structure:**
```html
<div class="settings-section" id="device-section">
    <h3>Device</h3>
    <p class="section-description">
        Configure connected device settings
    </p>
    <ul>
        <li>
            <label>Device Timeout (seconds)
                <span class="info-icon" title="How long to wait for connection"></span>
            </label>
            <input type="number" value="30" />
        </li>
    </ul>
</div>
```

**Testing:**
- [ ] All settings display and work
- [ ] Tooltips visible on hover
- [ ] Restore defaults resets all
- [ ] Responsive on mobile

---

## 🟡 MEDIUM PRIORITY (PLANNED)

### 6. ❌ Advanced Data Visualization
**Status:** 🔵 DESIGN PHASE  
**Effort:** 6-8 hours  
**Assigned To:** [TBD]  
**Priority:** Medium

**Description:** Enhance chart features with multiple visualization types and statistics.

**Features:**
- [ ] Multiple chart types (line, area, bar, gauge)
- [ ] Export chart as image
- [ ] Custom date range selector
- [ ] Statistics panel (avg, min, max, total)
- [ ] Comparison mode (compare date ranges)

**Implementation:**
```javascript
// Add statistics calculation
function calculateStatistics(measurements) {
    return {
        avgPower: avg(measurements.map(m => m.power)),
        maxPower: max(measurements.map(m => m.power)),
        minPower: min(measurements.map(m => m.power)),
        totalEnergy: sum(measurements.map(m => m.energy)),
        peakTime: measurements.find(m => m.power === maxPower).timestamp
    };
}

// Add chart type selector
function switchChartType(type) {
    // 'line' | 'area' | 'bar' | 'gauge'
    chart.options.type = type;
    chart.update();
}
```

**Testing:**
- [ ] Each chart type renders correctly
- [ ] Export creates valid image
- [ ] Date range filters correctly
- [ ] Statistics calculate accurately
- [ ] Comparison view shows both ranges

---

### 7. ❌ Cloud Sync & Remote Access
**Status:** 🔵 DESIGN PHASE  
**Effort:** 20-30 hours  
**Assigned To:** [TBD]  
**Priority:** Medium

**Description:** Upload data to cloud and access from web dashboard.

**Features:**
- [ ] Upload data to backend
- [ ] Web dashboard to view data
- [ ] Remote on/off control
- [ ] Data backup & restore

**Architecture Decision Needed:**
- [ ] Option 1: Firebase (quick, limited)
- [ ] Option 2: Custom Node.js (full control, complex)
- [ ] Option 3: AWS (scalable, expensive)

**Steps (Firebase approach):**
1. [ ] Set up Firebase project
2. [ ] Create authentication
3. [ ] Create Firestore data schema
4. [ ] Implement sync in AppManager
5. [ ] Create React web app
6. [ ] Build dashboard UI
7. [ ] Implement remote control
8. [ ] Add backup/restore

**Testing:**
- [ ] Data uploads to cloud
- [ ] Dashboard shows current data
- [ ] Dashboard shows historical data
- [ ] Remote control works
- [ ] Backup creates valid file
- [ ] Restore loads backup

---

### 8. ❌ Power Usage Reports
**Status:** 🔵 DESIGN PHASE  
**Effort:** 8-10 hours  
**Assigned To:** [TBD]  
**Priority:** Medium

**Description:** Generate usage reports with daily breakdown and cost estimates.

**Features:**
- [ ] Daily usage reports
- [ ] Weekly/monthly summaries
- [ ] Cost estimation (based on rate)
- [ ] Export as PDF
- [ ] Email delivery (future)

**Implementation:**
```javascript
function generateReport(startDate, endDate) {
    const measurements = getMeasurementsBetween(startDate, endDate);
    
    return {
        period: { start: startDate, end: endDate },
        statistics: {
            avgPower: calculateAvg(measurements),
            totalEnergy: calculateTotal(measurements),
            estimatedCost: calculateCost(measurements)
        },
        dailyBreakdown: groupByDay(measurements),
        hourlyBreakdown: groupByHour(measurements)
    };
}
```

**UI Changes:**
- [ ] Reports page with date selector
- [ ] Report display formatted
- [ ] Export button
- [ ] Cost rate setting

**Testing:**
- [ ] Report generates correctly
- [ ] Statistics accurate
- [ ] Breakdown accurate
- [ ] PDF exports properly
- [ ] Can view report

---

## 🟢 LOW PRIORITY (NICE TO HAVE)

### 9. ❌ Widget Support
**Status:** 🔵 CONCEPT  
**Effort:** 6-8 hours  
**Assigned To:** [TBD]  

**Description:** Android home screen widget showing current power usage.

**Features:**
- [ ] Real-time power display
- [ ] Quick on/off toggle
- [ ] Last updated timestamp
- [ ] Click to open app

**Testing:**
- [ ] Widget appears on home screen
- [ ] Updates in real-time
- [ ] Toggle works
- [ ] Tap opens app

---

### 10. ❌ Voice Control
**Status:** 🔵 CONCEPT  
**Effort:** 12-16 hours  
**Assigned To:** [TBD]  

**Description:** Google Assistant voice commands.

**Features:**
- [ ] "Ask PowerMon for current power"
- [ ] "Tell PowerMon to turn off"
- [ ] "What's my power consumption?"

**Testing:**
- [ ] Each command works
- [ ] Responses accurate
- [ ] Integrates with Assistant

---

### 11. ❌ Geolocation Features
**Status:** 🔵 CONCEPT  
**Effort:** 4-6 hours  
**Assigned To:** [TBD]  

**Description:** Location-aware monitoring.

**Features:**
- [ ] Auto-enable when home
- [ ] Geofence alerts
- [ ] Location history

---

### 12. ❌ Dark Mode Refinement
**Status:** 🟡 PARTIAL  
**Effort:** 2-3 hours  
**Assigned To:** [TBD]  

**Description:** Improve dark mode implementation.

**Changes:**
- [ ] Better contrast ratios
- [ ] Dark chart optimization
- [ ] System theme detection
- [ ] Smooth theme transitions

---

## 🛠️ TECHNICAL DEBT

### 13. ❌ Remove Legacy Code
**Status:** 🟠 IN PROGRESS  
**Effort:** 3-4 hours  
**Assigned To:** [TBD]  

**Files to Remove:**
- [ ] Logger.js (→ managers/Log.js)
- [ ] DataProcessor.js (→ managers)
- [ ] UtilityHelper.js (→ scattered)
- [ ] UIController.js (→ pages)
- [ ] settings-manager.js (→ managers/Settings.js)

**Steps:**
1. [ ] Verify no imports of legacy files
2. [ ] Update any remaining references
3. [ ] Delete files
4. [ ] Test complete app flow
5. [ ] Verify no broken links in docs

---

### 14. ❌ Unit Test Suite
**Status:** 🔵 NOT STARTED  
**Effort:** 8-10 hours  
**Assigned To:** [TBD]  

**Test Coverage:**
- [ ] DataProcessor calculations
- [ ] ProtocolParser parsing
- [ ] SettingsManager persistence
- [ ] DatabaseManager queries
- [ ] Event bus emit/listen

**Framework:** Jest or Mocha

**Testing:**
- [ ] All tests pass
- [ ] >80% code coverage
- [ ] CI/CD integration

---

### 15. ❌ Complete Documentation
**Status:** ✅ DONE  
**Effort:** 8 hours  
**Assigned To:** [TBD]  

**Completed:**
- [x] ARCHITECTURE.md (5000 words)
- [x] ARCHITECTURE_DETAILED.md (7500 words)
- [x] QUICKSTART.md (4000 words)
- [x] ROADMAP.md (5000 words)
- [x] INTEGRATION_GUIDE.md (3500 words)
- [x] DOCUMENTATION_INDEX.md (2000 words)

**Status:** ✅ Complete

---

### 16. ❌ Performance Optimization
**Status:** 🟡 ONGOING  
**Effort:** 2-3 hours per optimization  
**Assigned To:** [TBD]  

**Areas:**
- [ ] App startup time (target: <2s)
- [ ] Chart render time (target: <500ms)
- [ ] Database query time (target: <100ms)
- [ ] Memory footprint (target: <50MB)

**Profiling Tools:**
- [ ] Chrome DevTools
- [ ] DroidScript debugger
- [ ] Performance API

**Testing:**
- [ ] Measure baseline
- [ ] Implement optimization
- [ ] Measure improvement
- [ ] Document findings

---

## 📊 Task Summary

| Priority | Count | Total Effort |
|----------|-------|--------------|
| 🔴 Critical | 2 | 6-12 hours |
| 🟠 High | 3 | 19-27 hours |
| 🟡 Medium | 3 | 34-48 hours |
| 🟢 Low | 4 | 24-38 hours |
| 🛠️ Debt | 4 | 21-25 hours |
| **Total** | **16** | **104-150 hours** |

---

## 🗓️ Suggested Timeline

### Sprint 1 (Week 1-2)
**Focus:** Critical Issues
- [x] Task 1: Fix data reception
- [x] Task 2: Send init command
**Effort:** 6-14 hours
**Status:** In Progress

### Sprint 2 (Week 3-4)
**Focus:** High Priority
- [ ] Task 3: Auto-reconnection
- [ ] Task 5: Improve settings
**Effort:** 7-11 hours

### Sprint 3 (Week 5-6)
**Focus:** High Priority + Debt
- [ ] Task 4: Multi-device support
- [ ] Task 13: Remove legacy code
**Effort:** 15-20 hours

### Sprint 4 (Week 7-8)
**Focus:** Medium Priority
- [ ] Task 6: Advanced visualization
- [ ] Task 8: Reports
**Effort:** 14-18 hours

### Sprint 5+ (Future)
**Focus:** Cloud, Testing, Optimization
- [ ] Task 7: Cloud sync
- [ ] Task 14: Unit tests
- [ ] Task 16: Performance
- [ ] Task 9-12: Nice to have

---

## ✅ Completion Checklist

Before marking task complete:
- [ ] Code implemented
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Peer review approved
- [ ] QA verified
- [ ] Merged to main branch
- [ ] Released to users

---

## 📞 Task Assignment

Assign tasks based on:
1. **Expertise:** Who knows the code best?
2. **Availability:** Who has capacity?
3. **Priority:** What's blocking others?
4. **Learning:** What will help growth?

---

**Generated:** March 19, 2026  
**Status:** Ready for Implementation  
**Total Tasks:** 16  
**Estimated Completion:** 6-8 months (with 1-2 developers)
