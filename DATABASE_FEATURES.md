# PowerMon - Enhanced Features Documentation

## New Features

### 1. Background BLE Service
The application now includes a background service that continues to read BLE data even when the app is in the background.

**Files:**
- `BleService.js` - Background service implementation
- `service-manager.js` - Service control interface

**Usage:**
The service can be started/stopped from the application settings. When running, it will:
- Continue reading BLE data in the background
- Save all measurements to the SQLite database
- Keep the app updated with real-time data

### 2. SQLite Database Storage
All measurements are now automatically saved to a local SQLite database.

**Database Schema:**
```sql
CREATE TABLE measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    voltage REAL NOT NULL,
    current REAL NOT NULL,
    power REAL NOT NULL,
    capacity REAL,
    energy REAL,
    d_minus REAL,
    d_plus REAL,
    frequency REAL,
    power_factor REAL,
    temperature REAL,
    device_type TEXT,
    UNIQUE(timestamp)
);
```

**Files:**
- `database-manager.js` - Database query and management interface

**Features:**
- Automatic data saving during BLE readings
- Efficient indexing on timestamp for fast queries
- Data retention (automatic cleanup after 30 days)
- Support for millions of data points

### 3. Chart Time Range Selection
The chart now supports viewing historical data with multiple time ranges.

**Time Ranges Available:**
- **Live (Real-time)** - Shows incoming data in real-time
- **Last 1 Hour** - Historical data from the past hour
- **Last 3 Hours** - Historical data from the past 3 hours
- **Last 6 Hours** - Historical data from the past 6 hours
- **Last 12 Hours** - Historical data from the past 12 hours
- **Last 24 Hours** - Historical data from the past day
- **Last 7 Days** - Historical data from the past week
- **Last 30 Days** - Historical data from the past month
- **Custom Range** - (Coming soon) Select specific date/time range

**How it works:**
1. Select your desired time range from the dropdown
2. Chart automatically queries the database and displays historical data
3. For historical ranges, the chart auto-refreshes every 30 seconds
4. Your last selected time range is saved in settings

### 4. Data Averaging
Smooths out noisy measurements using moving average.

**Averaging Levels:**
- None (1 point) - Raw data, no smoothing
- Light (3 points) - Minimal smoothing
- Medium (5 points) - Balanced smoothing
- Heavy (10 points) - Strong smoothing
- Very Heavy (20 points) - Maximum smoothing

**How it works:**
- Each displayed point is the average of the last N measurements
- Reduces noise and makes trends more visible
- Settings are saved automatically

## Configuration

### Settings Storage
All preferences are saved in `app_settings.json`:

```json
{
    "theme": "dark",
    "chart": {
        "duration": 600,
        "averaging": 5,
        "timeRange": "24h"
    },
    "powerCalcMethod": "measured",
    "language": "en"
}
```

## Database Management

### Manual Database Operations

The `DatabaseManager` class provides these methods:

```javascript
// Get measurements for a time range
dbManager.getMeasurements(startTime, endTime, limit);

// Get latest N measurements
dbManager.getLatestMeasurements(100);

// Get last N hours/days
dbManager.getLastHours(6);
dbManager.getLastDays(7);

// Get statistics
dbManager.getStatistics(startTime, endTime);

// Clear old data
dbManager.deleteOlderThan(30); // Delete older than 30 days
dbManager.clearAll(); // Clear everything

// Get database info
dbManager.getCount(); // Total measurements
dbManager.getDataRange(); // First and last timestamp
```

## Performance Considerations

### Large Datasets
- For time ranges > 24 hours with many data points, the chart may load slowly
- Consider implementing data decimation (showing every Nth point) for very large datasets
- The database can handle millions of records efficiently

### Memory Management
- Historical data loads all points into memory for charting
- For very long time ranges (30 days), this could use significant memory
- Consider implementing pagination or aggregation for month-long views

## Service Usage (Optional)

### Starting the Background Service
```javascript
// In your main app
serviceManager.start();
serviceManager.connect(deviceAddress);

// Set up callbacks
serviceManager.setOnData(function(data) {
    console.log("Received:", data);
});

serviceManager.setOnStatus(function(status) {
    console.log("Status:", status);
});
```

### Stopping the Service
```javascript
serviceManager.disconnect();
serviceManager.stop();
```

**Note:** The background service is optional. The current implementation saves data directly in the main app for better stability.

## Data Privacy

- All data is stored locally on the device
- No data is transmitted to external servers
- Database file: `PowerMonData.db` in app data directory
- To completely clear data: Use "Clear All Data" in settings or manually delete the database file

## Troubleshooting

### Chart not showing historical data
1. Check if database has data: Use `dbManager.getCount()`
2. Verify time range selection
3. Check device time settings (timestamps must be valid)

### Database errors
1. Ensure app has storage permissions
2. Check available storage space
3. Try clearing old data if database is very large

### Service not working
1. Check if service is properly started
2. Verify BLE permissions are granted
3. Ensure device supports background services

## Future Enhancements

Potential improvements for future versions:

1. **Custom Date Range Picker** - Select specific start/end dates
2. **Data Export** - Export measurements to CSV/Excel
3. **Statistics View** - Min/Max/Average calculations
4. **Data Comparison** - Compare multiple time periods
5. **Alerts** - Notify on threshold values
6. **Cloud Sync** - Optional cloud backup (with user consent)
7. **Data Aggregation** - Smart downsampling for long time ranges

## API Reference

See individual file headers for detailed API documentation:
- `database-manager.js` - Database operations
- `service-manager.js` - Service control
- `chart.js` - Chart control and data management
