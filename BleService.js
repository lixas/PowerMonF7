/*
 * BLE Service - Background service for reading BLE data from power meter
 * This service runs independently and saves data to SQLite database
 */

// Global variables for the service
var ble = null;
var db = null;
var BufferUart = "";
var deviceType = "";
var isConnected = false;
var currentDeviceAddress = "";

// Load required scripts
app.LoadScript("js/parser.js");

// Service initialization
function OnStart() {
    app.ShowPopup("PowerMon Service Started");
    
    // Initialize BLE
    app.LoadPlugin("BluetoothLE");
    ble = app.CreateBluetoothLE();
    ble.SetUartIds(
        "0000FFE0-0000-1000-8000-00805F9B34FB",  //Svc
        "0000FFE2-0000-1000-8000-00805F9B34FB",  //Tx
        "0000FFE1-0000-1000-8000-00805F9B34FB"   //Rx
    );
    ble.SetUartMode("Hex");
    
    // Initialize database
    // initDatabase();
    
    // Set up BLE callbacks
    ble.SetOnUartReceive(OnBleUartReceive);
    ble.SetOnDisconnect(OnBleDisconnect);
    
    // Listen for messages from main app
    app.SetOnMessage(OnMessage);
    
    // Start periodic cleanup (every hour)
    setInterval(cleanupOldData, 3600000);
}

function OnStop() {
    if (isConnected && ble) {
        ble.Disconnect();
    }
    if (db) {
        db.Close();
    }
    app.ShowPopup("PowerMon Service Stopped");
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

// Handle messages from main app
function OnMessage(msg) {
    var cmd = JSON.parse(msg);
    
    switch(cmd.action) {
        case "connect":
            connectToDevice(cmd.address);
            break;
        case "disconnect":
            disconnectDevice();
            break;
        case "getStatus":
            sendStatus();
            break;
        case "clearData":
            clearAllData();
            break;
    }
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
        // Initialize parser if needed
        if (typeof BLEParser === 'undefined') {
            BLEParser = new ProtocolParser();
        }
        
        if (deviceType != BLEParser.getDeviceType()) {
            deviceType = BLEParser.getDeviceType();
        }
        
        switch(BufferUart.substring(4, 6)) {
            case '01':  // Data packet
                var parsed = BLEParser.ParseUartData(BufferUart, deviceType);
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
