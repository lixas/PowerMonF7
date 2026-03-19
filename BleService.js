/**
 * BleService.js - Background service for BLE power meter data collection
 * 
 * This service runs in the background and handles:
 * - BLE device connection and UART communication
 * - Measurement data reception and parsing
 * - Database persistence
 * - Inter-process messaging with main app
 * 
 * Architecture:
 * - Uses BLEManager for all BLE operations
 * - Uses DatabaseManager for data persistence
 * - Uses DataProcessor for power calculations
 * - Communicates with main app via JSON messages
 * 
 * @requires managers/BLE.js
 * @requires managers/Database.js
 * @requires DataProcessor.js
 * @requires js/parser.js (ProtocolParser class)
 */

// ─────────────────────────────────────────────────────────────────────────
// DEPENDENCIES & INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────

// Load required modules before service starts
app.LoadScript("js/parser.js");
app.LoadScript("managers/BLE.js");
app.LoadScript("managers/Database.js");
app.LoadScript("DataProcessor.js");

// Service-level variables
const ServiceState = {
    bleManager: null,
    dbManager: null,
    isRunning: false,
    powerCalcMethod: 'measured'
};

// ─────────────────────────────────────────────────────────────────────────
// SERVICE ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Service start callback - called when service is first started
 */
function OnStart() {
    try {
        app.ShowPopup("PowerMon Service Started");

        // Initialize components
        ServiceState.bleManager = BLEManager.getInstance();
        ServiceState.dbManager = new DatabaseManager();

        // Configure BLE event handlers
        ServiceState.bleManager.setOnUartData(handleUartData);
        ServiceState.bleManager.setOnConnected(handleDeviceConnected);
        ServiceState.bleManager.setOnDisconnected(handleDeviceDisconnected);
        ServiceState.bleManager.setOnError(handleError);

        // Initialize BLE hardware
        if (!ServiceState.bleManager.initialize()) {
            throw new Error("BLE initialization failed");
        }

        // Set up message handler for communication with main app
        app.SetOnMessage(handleMainAppMessage);

        // Start periodic cleanup of old data (every hour)
        setInterval(cleanupOldData, 3600000);

        ServiceState.isRunning = true;
        Logger.log("BleService initialized successfully");
    } catch (e) {
        Logger.error("BleService startup error: " + e);
        app.ShowPopup("Service Error: " + e);
    }
}

/**
 * Service stop callback - called when service is stopped
 */
function OnStop() {
    try {
        if (ServiceState.bleManager && ServiceState.bleManager.getConnectionState()) {
            ServiceState.bleManager.disconnect();
        }

        if (ServiceState.dbManager) {
            ServiceState.dbManager.close();
        }

        ServiceState.isRunning = false;
        app.ShowPopup("PowerMon Service Stopped");
        Logger.log("BleService stopped");
    } catch (e) {
        Logger.error("BleService shutdown error: " + e);
    }
}

// Initialize SQLite database
function obsolete_initDatabase() {
    db = app.OpenDatabase("PowerMonData.sqlite");
    
    // Create measurements table if it doesn't exist
    db.ExecuteSql(
        `CREATE TABLE IF NOT EXISTS measurements (
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
        CREATE INDEX IF NOT EXISTS idx_timestamp ON measurements(timestamp);`
    );
}

// ─────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLERS - Communication with main app
// ─────────────────────────────────────────────────────────────────────────

/**
 * Handle messages from main app
 * Supported commands:
 *   - connect: { action: "connect", address: "MAC:ADDRESS" }
 *   - disconnect: { action: "disconnect" }
 *   - getStatus: { action: "getStatus" }
 *   - clearData: { action: "clearData" }
 * 
 * @param {String} msg JSON message from main app
 */
function handleMainAppMessage(msg) {
    try {
        const cmd = JSON.parse(msg);
        Logger.log("Service received: " + cmd.action);

        switch (cmd.action) {
            case "connect":
                handleConnectCommand(cmd);
                break;

            case "disconnect":
                handleDisconnectCommand();
                break;

            case "getStatus":
                sendServiceStatus();
                break;

            case "clearData":
                handleClearDataCommand();
                break;

            case "setPowerCalcMethod":
                ServiceState.powerCalcMethod = cmd.method || 'measured';
                Logger.log("Power calculation method set to: " + ServiceState.powerCalcMethod);
                break;

            default:
                Logger.warn("Unknown command: " + cmd.action);
        }
    } catch (e) {
        Logger.error("Message handling error: " + e);
    }
}

/**
 * Handle connect command
 * @param {Object} cmd Command object with address
 * @private
 */
function handleConnectCommand(cmd) {
    if (!cmd.address) {
        Logger.error("Connect command missing device address");
        return;
    }

    if (!ServiceState.bleManager.connect(cmd.address)) {
        sendServiceMessage({
            type: "status",
            connected: false,
            error: "Connection failed"
        });
    }
}

/**
 * Handle disconnect command
 * @private
 */
function handleDisconnectCommand() {
    if (!ServiceState.bleManager.disconnect()) {
        Logger.warn("Not connected, cannot disconnect");
    }
}

/**
 * Handle clear data command
 * @private
 */
function handleClearDataCommand() {
    try {
        const success = ServiceState.dbManager.clearAll();
        sendServiceMessage({
            type: "dataClear",
            success: success
        });
    } catch (e) {
        Logger.error("Clear data error: " + e);
    }
}

/**
 * Send message back to main app
 * @param {Object} data Message object
 * @private
 */
function sendServiceMessage(data) {
    try {
        app.SendMessage(JSON.stringify(data));
    } catch (e) {
        Logger.error("Send message error: " + e);
    }
}

/**
 * Send current service status to main app
 * @private
 */
function sendServiceStatus() {
    sendServiceMessage({
        type: "status",
        running: ServiceState.isRunning,
        connected: ServiceState.bleManager.getConnectionState(),
        address: ServiceState.bleManager.getConnectedDeviceAddress(),
        deviceType: ServiceState.bleManager.getDeviceType()
    });
}

// Connect to BLE device
function connectToDevice(address) {
    if (isConnected) {
        app.SendMessage("Already connected");
        return;
    }
    
    currentDeviceAddress = address;
    ble.Connect(address, "UART");
    isConnected = true;
    
    app.SendMessage(JSON.stringify({
        type: "status",
        connected: true,
        address: address
    }));
}

// Disconnect from BLE device
function disconnectDevice() {
    if (ble && isConnected) {
        ble.Disconnect();
    }
}

function OnBleDisconnect() {
    isConnected = false;
    currentDeviceAddress = "";
    
    app.SendMessage(JSON.stringify({
        type: "status",
        connected: false
    }));
}

// Handle incoming BLE UART data
function OnBleUartReceive(data) {
    if (data == 'FF' && BufferUart.length >= 36*2) {
        // Use AppManager's parser instance
        const appMgr = AppManager.getInstance();
        const parser = appMgr.parser;
        
        if (deviceType != parser.getDeviceType()) {
            deviceType = parser.getDeviceType();
        }
        
        switch(BufferUart.substring(4, 6)) {
            case '01':  // Data packet
                var parsed = parser.ParseUartData(BufferUart, deviceType);
                saveToDatabase(parsed);
                
                // Send data to main app
                app.SendMessage(JSON.stringify({
                    type: "data",
                    data: parsed
                }));
                break;
        }
        BufferUart = data;
    } else {
        BufferUart += data;
    }
}

// Save measurement to database
function saveToDatabase(data) {
    if (!db) return;
    
    var timestamp = Date.now();
    
    try {
        db.ExecuteSql(
            `INSERT OR REPLACE INTO measurements 
            (timestamp, voltage, current, power, capacity, energy, 
             d_minus, d_plus, frequency, power_factor, temperature, device_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                timestamp,
                data.Vol || 0,
                data.Cur || 0,
                data.Pwr || 0,
                data.Cap || 0,
                data.Ene || 0,
                data.DMinus || 0,
                data.DPlus || 0,
                data.Freq || 0,
                data.PowFact || 0,
                data.Temp || 0,
                deviceType || "unknown"
            ]
        );
    } catch(e) {
        app.ShowPopup("Database error: " + e);
    }
}

// Send current status to main app
function sendStatus() {
    app.SendMessage(JSON.stringify({
        type: "status",
        connected: isConnected,
        address: currentDeviceAddress,
        deviceType: deviceType
    }));
}

// Clear all measurements data
function clearAllData() {
    if (db) {
        db.ExecuteSql("DELETE FROM measurements");
        app.SendMessage(JSON.stringify({
            type: "dataClear",
            success: true
        }));
    }
}

// Cleanup old data (older than 30 days)
function cleanupOldData() {
    if (!db) return;
    
    var cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    db.ExecuteSql(
        "DELETE FROM measurements WHERE timestamp < ?",
        [cutoffTime]
    );
}
