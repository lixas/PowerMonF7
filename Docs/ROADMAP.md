# PowerMon - Development Roadmap & Future Tasks

## Overview

This document outlines planned features, improvements, and known tasks for future development. Tasks are organized by priority and complexity.

**STATUS UPDATE (March 19, 2026):**
✅ Device data reception is now WORKING with real hardware
✅ Device sends data automatically after connection (no init command needed)
✅ UART IDs and mode configured before connecting (not after)
✅ 36-byte packet format confirmed (72 hex chars, starts with FF, ends with checksum)

---

## 🟢 Recently Completed

### ✅ Device Data Reception
**Status:** ✅ RESOLVED  
**What Was Fixed:** Device connection and automatic data reception  
**How It Works Now:**
- UART IDs and mode set during `initialize()` BEFORE any connection
- Device connects and automatically starts sending 72-byte packets
- No initialization command needed - data flows immediately
- Packets start with FF marker, end with checksum
- Exact format: 72 bytes (144 hex ASCII characters)

**Verification:**
- ✅ Real device tested and working
- ✅ All measurements display correctly
- ✅ No data reception issues
- ✅ Automatic data streaming confirmed

---

## 🟠 High Priority (Next Release)

### 3. Automatic Reconnection Logic
**Status:** 🟡 NOT STARTED  
**Issue:** When device disconnects, app doesn't reconnect automatically  
**Current Behavior:** User must manually reconnect  
**Desired Behavior:** Auto-reconnect with exponential backoff

**Implementation:**
```javascript
// BLE.js - Add auto-reconnect
startAutoReconnect() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 2000;  // Start at 2 seconds
}

handleDisconnect() {
    if (this.lastConnectedDevice && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);  // Exponential backoff
        
        Logger.log("Auto-reconnect attempt " + this.reconnectAttempts + 
                   " in " + delay + "ms");
        
        setTimeout(() => {
            this.connect(this.lastConnectedDevice);
        }, delay);
    }
}
```

**UI Changes Needed:**
- [ ] Add "Auto-reconnect enabled/disabled" toggle in settings
- [ ] Show reconnection status (connecting, attempt #X of 5)
- [ ] Add "Stop reconnection" button during attempts

**Estimated Effort:** 4-6 hours  
**Dependencies:** None  

---

### 4. Multi-Device Support
**Status:** 🟡 NOT STARTED  
**Issue:** Currently only supports one device connection  
**Desired:** Store multiple devices, switch between them

**Implementation Plan:**
1. Extend database to store device profiles:
```sql
CREATE TABLE device_profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected DATETIME
);

CREATE TABLE measurements (
    ... existing fields ...,
    device_id INTEGER FOREIGN KEY REFERENCES device_profiles(id)
);
```

2. Add device profile manager
3. Update UI to show device selector
4. Update charts/details to filter by device

**UI Changes:**
- [ ] Device list with "Last connected" info
- [ ] Device settings (rename, remove)
- [ ] Device switcher in home.html

**Estimated Effort:** 12-16 hours  
**Dependencies:** Database schema migration  

---

### 5. Improved Settings UI
**Status:** 🟡 IN PROGRESS  
**Current:** Basic toggle/select controls  
**Desired:** Better organization, grouping, descriptions

**Changes Needed:**
- [ ] Group settings by category (Device, Display, Data, Advanced)
- [ ] Add tooltips explaining each setting
- [ ] Add "Restore Defaults" confirmation dialog
- [ ] Add setting descriptions at top of section

**Example:**
```html
<!-- New structure -->
<div class="settings-section">
    <h3>Data Management</h3>
    <p class="section-description">
        Configure how your measurement data is stored and managed
    </p>
    <ul>
        <li>
            <label>Data Retention (days)</label>
            <input type="number" value="90" />
            <span class="hint">Old data is automatically deleted</span>
        </li>
    </ul>
</div>
```

**Estimated Effort:** 3-5 hours  
**Dependencies:** None  

---

## 🟡 Medium Priority (Planned)

### 6. Advanced Data Visualization
**Status:** 🔵 DESIGN PHASE  
**Current:** Basic power graph  
**Desired Features:**
- [ ] Multiple chart types (line, area, bar, gauge)
- [ ] Export chart as image/PDF
- [ ] Custom date range selection
- [ ] Comparison mode (compare two date ranges)
- [ ] Statistics panel (avg, min, max, total energy)

**Implementation:**
```javascript
// Add statistics to details.html
const stats = {
    avgPower: measurements.reduce((a,b) => a + b.power, 0) / measurements.length,
    maxPower: Math.max(...measurements.map(m => m.power)),
    minPower: Math.min(...measurements.map(m => m.power)),
    totalEnergy: measurements.reduce((a,b) => a + b.energy, 0)
};

// Display in UI
displayStatistics(stats);
```

**Chart Options:**
- Chart.js already supports multiple types
- Add dropdown to chart.html for chart selection
- Use date picker for range selection

**Estimated Effort:** 6-8 hours  
**Dependencies:** Chart.js library (already included)  

---

### 7. Cloud Sync & Remote Access
**Status:** 🔵 DESIGN PHASE  
**Desired Features:**
- [ ] Upload data to cloud backend
- [ ] View data from web dashboard
- [ ] Remote control of device
- [ ] Data backup & restore

**Architecture:**
```
PowerMon App
    ↓ (HTTPS)
Cloud Backend (Node.js/Firebase)
    ├─ Data storage
    ├─ Web dashboard
    └─ Remote control API
    
Web Dashboard
    ├─ View historical data
    ├─ Remote on/off
    └─ Export reports
```

**Backend Options:**
1. Firebase - Quick setup, limited control
2. Custom Node.js - Full control, requires hosting
3. AWS Lambda + DynamoDB - Scalable, complex

**Estimated Effort:** 20-30 hours (including backend setup)  
**Dependencies:** Cloud infrastructure decision  

---

### 8. Power Usage Reports
**Status:** 🔵 DESIGN PHASE  
**Desired Features:**
- [ ] Daily usage reports
- [ ] Weekly/monthly summaries
- [ ] Cost estimation (based on electricity rate)
- [ ] Export as PDF

**Implementation:**
```javascript
// Generate report
generateReport(startDate, endDate) {
    const measurements = dbMgr.getMeasurementsBetween(startDate, endDate);
    
    const report = {
        period: { start: startDate, end: endDate },
        statistics: {
            avgPower: calculateAvg(measurements),
            totalEnergy: calculateTotal(measurements),
            estimatedCost: calculateCost(measurements)
        },
        dailyBreakdown: groupByDay(measurements)
    };
    
    return report;
}

// Export as PDF
exportReportAsPDF(report) {
    // Use jsPDF or similar library
    const pdf = new jsPDF();
    pdf.text("Power Usage Report", 10, 10);
    // ... format report into PDF
    pdf.save("report-" + today() + ".pdf");
}
```

**UI Changes:**
- [ ] Add "Reports" page with date range picker
- [ ] Display formatted report
- [ ] Export button

**Estimated Effort:** 8-10 hours  
**Dependencies:** PDF library (need to add)  

---

## 🟢 Low Priority (Nice to Have)

### 9. Widget Support
**Status:** 🔵 DESIGN PHASE  
**Android Home Screen Widget:**
- [ ] Show current power usage at a glance
- [ ] Quick on/off control
- [ ] Real-time updates

**Implementation:** Use DroidScript widget API

**Estimated Effort:** 6-8 hours  
**Dependencies:** DroidScript widget documentation  

---

### 10. Voice Control
**Status:** 🔵 CONCEPT  
**Desired:** Voice commands to device
- "Hey Google, ask PowerMon for current power"
- "Hey Google, tell PowerMon to turn off"

**Implementation:** Google Assistant integration

**Estimated Effort:** 12-16 hours  
**Dependencies:** Google Assistant API  

---

### 11. Geolocation-Based Features
**Status:** 🔵 CONCEPT  
**Features:**
- [ ] Auto-enable power monitoring when home
- [ ] Notifications based on location
- [ ] Geofencing alerts

**Estimated Effort:** 4-6 hours  
**Dependencies:** Location permission handling  

---

### 12. Dark Mode Refinement
**Status:** 🟡 PARTIAL  
**Current:** Auto/Light/Dark theme selector  
**Desired Improvements:**
- [ ] Better contrast ratios
- [ ] Dark mode optimizations for charts
- [ ] Follow system theme automatically
- [ ] Per-page theme overrides

**Estimated Effort:** 2-3 hours  
**Dependencies:** None  

---

## 🛠️ Technical Debt & Cleanup

### 13. Remove Legacy Code
**Status:** 🟠 IN PROGRESS  
**Files to Remove:**
- [ ] `Logger.js` (replaced by `managers/Log.js`)
- [ ] `DataProcessor.js` (functionality moved to managers)
- [ ] `UtilityHelper.js` (utilities scattered or deprecated)
- [ ] `UIController.js` (moved to individual pages)
- [ ] `settings-manager.js` (replaced by `managers/Settings.js`)
- [ ] Legacy BLE implementation files

**Plan:**
1. Verify all functionality is in new managers
2. Update imports in all files
3. Remove old files
4. Test everything still works

**Estimated Effort:** 3-4 hours  
**Risk:** High - ensure nothing breaks  

---

### 14. Unit Test Suite
**Status:** 🔵 NOT STARTED  
**Create tests for:**
- [ ] DataProcessor calculations
- [ ] ProtocolParser parsing
- [ ] SettingsManager get/set
- [ ] DatabaseManager queries
- [ ] Event bus emit/listen

**Test Framework:** Jest or Mocha

```javascript
// Example test
describe('ProtocolParser', () => {
    it('should parse valid 72-byte packet', () => {
        const packet = 'FF' + '3f' + ... + 'XX';  // Valid 72-byte packet
        const result = ProtocolParser.parse(packet);
        
        expect(result.power).toBeGreaterThan(0);
        expect(result.voltage).toBeGreaterThan(0);
    });
    
    it('should reject invalid packet', () => {
        const packet = 'INVALID';
        
        expect(() => ProtocolParser.parse(packet))
            .toThrow();
    });
});
```

**Estimated Effort:** 8-10 hours  
**Dependencies:** Test framework setup  

---

### 15. Code Documentation
**Status:** 🟠 IN PROGRESS  
**Missing Documentation:**
- [ ] JSDoc comments in all manager methods
- [ ] README.md for each manager
- [ ] Code examples for common tasks
- [ ] Troubleshooting guide

**Example JSDoc:**
```javascript
/**
 * Connect to a BLE device
 * @param {String} deviceAddress - MAC address (format: "XX:XX:XX:XX:XX:XX")
 * @returns {Promise<Boolean>} - true if connection initiated
 * @throws {Error} If BLE not initialized or already connected
 * @example
 * const connected = await bleMgr.connect("AA:BB:CC:DD:EE:FF");
 */
async connect(deviceAddress) {
    // ...
}
```

**Estimated Effort:** 4-6 hours  
**Dependencies:** None  

---

### 16. Performance Optimization
**Status:** 🟡 ONGOING  
**Areas to Optimize:**
- [ ] Reduce app startup time
- [ ] Optimize chart rendering (lazy load)
- [ ] Reduce database query time
- [ ] Minimize memory usage
- [ ] Optimize asset sizes (images, fonts)

**Measurements to Track:**
- App startup time (target: <2 seconds)
- Chart render time (target: <500ms)
- Database query time (target: <100ms)
- Memory footprint (target: <50MB)

**Estimated Effort:** Ongoing, 2-3 hours per optimization  
**Dependencies:** Performance profiling tools  

---

## 📋 Task Tracking Template

For each task, use this template:

```markdown
### Task Title
**Status:** 🔴 BLOCKING / 🟠 HIGH / 🟡 MEDIUM / 🟢 LOW / 🔵 DESIGN / ✅ DONE

**Description:**
Clear explanation of what needs to be done

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Implementation Plan:**
Step-by-step plan to complete

**Testing Plan:**
How to verify completion

**Estimated Effort:** X hours

**Dependencies:**
List of things needed before starting

**Blocked By:**
Any tasks that must complete first

**Notes:**
Additional context or considerations
```

---

## 🎯 Release Roadmap

### Version 2.1 (Next Release)
**Timeline:** 2-3 weeks  
**Focus:** Stability & Additional Features

**Planned Tasks:**
1. ✅ Auto-reconnection logic
2. ✅ Improve settings UI
3. ✅ Remove legacy code
4. ✅ Document all changes

**QA Checklist:**
- [ ] Test with real device for 1 hour continuous
- [ ] Test reconnection 10 times
- [ ] Check logs for errors
- [ ] Verify all settings persist

---

### Version 2.2 (Planned)
**Timeline:** 3-4 weeks  
**Focus:** Multi-Device & Visualization

**Planned Tasks:**
1. Multi-device support
2. Advanced data visualization
3. Power reports
4. Performance optimization

---

### Version 3.0 (Major Release)
**Timeline:** 6-8 weeks  
**Focus:** Cloud & Advanced Features

**Planned Tasks:**
1. Cloud sync & backup
2. Web dashboard
3. Remote access
4. Widget support

---

## 🚀 Deployment & Release Process

### Pre-Release Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Release notes written
- [ ] APK generated and tested

### Release Process
1. **Staging:** Deploy to test device
2. **Testing:** Full QA cycle
3. **Release:** Build APK, update version
4. **Announcement:** Update README, release notes
5. **Monitoring:** Watch for user reports

### Post-Release Monitoring
- [ ] Check for crash reports
- [ ] Monitor user feedback
- [ ] Track performance metrics
- [ ] Plan next release based on feedback

---

## 📞 Support & Communication

For questions or contributions:
- **Issue Reporting:** Use Git Issues with template
- **Discussion:** Use Git Discussions
- **Code Review:** PR required before merge
- **Documentation:** Update docs when implementing features

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [Technical Details](./ARCHITECTURE_DETAILED.md)
- [Quick Start Guide](./QUICKSTART.md)

---

**Document Version:** 2.0  
**Last Updated:** March 19, 2026  
**Status:** Device data reception WORKING ✅  
**Next Review:** April 19, 2026
