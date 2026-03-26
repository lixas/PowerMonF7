/**
 * AppManager.js - Main application controller
 * 
 * Centralizes app-wide functionality:
 * - Framework7 initialization
 * - BLE device management
 * - Theme handling
 * - Remote command execution
 * - Global event bus
 * 
 * Architecture: Singleton pattern
 */

class AppManager {
    // ─────────────────────────────────────────────────────────────────────
    // STATIC INSTANCE & INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────
    static #instance = null;

    static getInstance() {
        if (!AppManager.#instance) {
            AppManager.#instance = new AppManager();
        }
        return AppManager.#instance;
    }

    // ─────────────────────────────────────────────────────────────────────
    // INSTANCE PROPERTIES
    // ─────────────────────────────────────────────────────────────────────
    constructor() {
        /** @type {Framework7} Framework7 app instance */
        this.webapp = null;

        /** @type {Framework7.Events} Global event bus - uses global F7Evt from PowerMon.html */
        this.eventBus = window.F7Evt || new Framework7.Events();

        /** @type {BluetoothLE} BLE device object */
        this.ble = null;

        /** @type {BLEManager} BLE manager instance */
        this.bleManager = null;

        /** @type {DatabaseManager} Database manager instance */
        this.dbManager = null;

        /** @type {Boolean} BLE connection state */
        this.isConnected = false;

        /** @type {Object} Global runtime state */
        this.runtime = {
            keepScreenOn: false,
            currentDevice: null
        };

        /** @type {PowerMeterSimulator} Hardware simulator for testing */
        this.simulator = null;

        /** @type {ProtocolParser} UART protocol parser */
        this.parser = null;

        /** @type {Object} Store device list */
        this.devices = [];

        /** @type {Object} Cached settings - updated when settings change to avoid querying each time */
        this.currentSettings = {
            powerCalcMethod: 'measured',
            screenOn: 0,
            theme: 'auto',
            chartDuration: 300
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // APP INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Initialize the entire application
     * Called on app startup (OnStart)
     * @returns {Boolean} true if initialization successful
     */
    async initialize() {
        try {
            Logger.log("Initializing AppManager");

            // Initialize settings FIRST (before anything else that uses it)
            SettingsManager.init();

            // Initialize Framework7 (before BLE which needs app object)
            this.initializeFramework7();

            // Initialize components
            this.bleManager = BLEManager.getInstance();
            if (!this.bleManager.initialize()) {
                Logger.error("Failed to initialize BLEManager");
                return false;
            }

            this.dbManager = new DatabaseManager();
            this.simulator = new PowerMeterSimulator();
            this.parser = new ProtocolParser();

            // Configure BLE manager callbacks
            this.bleManager.setOnUartData(this.handleUartData.bind(this));
            this.bleManager.setOnConnected(this.handleBleConnected.bind(this));
            this.bleManager.setOnDisconnected(this.handleBleDisconnected.bind(this));
            this.bleManager.setOnError(this.handleBleError.bind(this));

            // Load settings and apply theme
            this.applyTheme(SettingsManager.get("theme"));

            // Initialize settings cache
            this.updateSettingsCache();

            // Listen for settings changes from other components
            if (window.F7Evt) {
                window.F7Evt.on('SettingsChanged', () => {
                    this.updateSettingsCache();
                    Logger.log("Settings cache updated after SettingsChanged event");
                });
            }

            // Set up global handlers
            this.setupGlobalHandlers();

            Logger.log("AppManager initialized successfully");
            return true;
        } catch (e) {
            Logger.error("AppManager initialization error: " + e);
            return false;
        }
    }

    /**
     * Initialize Framework7 app
     * @private
     */
    initializeFramework7() {
        try {
            this.webapp = new Framework7({
                name: "PowerMon",
                el: '#PowerMonAppDiv',
                theme: 'md',
                routes: [
                    {
                        path: '/',
                        componentUrl: './home.html',
                    },
                    {
                        path: '/details',
                        componentUrl: './details.html',
                    },
                    {
                        path: '/chart',
                        componentUrl: './chart.html',
                    },
                    {
                        path: '/settings',
                        componentUrl: './settings.html',
                    },
                    {
                        path: '/about',
                        componentUrl: './about.html',
                    },
                    {
                        path: '/debug',
                        componentUrl: './debug.html',
                    }
                ],
                methods: {
                    helloWorld: () => {
                        this.webapp.dialog.alert('Hello World!');
                    }
                },
                view: {
                    pushState: true
                },
                touch: {
                    tapHold: true,
                    mdTouchRipple: true
                },
                tapHold: true,
                // on: {
                //     pageInit: function (page) {
                //         // use dump function from utils.js to log page details
                //         console.log("Page initialized: " + dump2(page.router.currentRoute.url));
                //         // console.log('page init'+ page)
                //     }
                    
                // }
            });

            // Create main view
            if (!this.webapp || !this.webapp.views) {
                throw new Error("Framework7 webapp or views not initialized");
            }

            this.webapp.views.create('.view-main', {
                url: '/'
            });

            Logger.log("Framework7 initialized");
        } catch (e) {
            Logger.error("Framework7 initialization failed: " + e);
            throw e;
        }
    }

    /**
     * Set up global event handlers
     * @private
     */
    setupGlobalHandlers() {
        // Back button handler
        if (window.OnBack) {
            // OnBack already defined in PowerMon.html
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // THEME MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        const $$ = Dom7;
        if ($$('html').hasClass('light')) {
            this.applyTheme('dark');
        } else {
            this.applyTheme('light');
        }
    }

    /**
     * Apply theme to the application
     * @param {String} theme Theme name: 'light', 'dark', or 'auto'
     */
    applyTheme(theme) {
        const $$ = Dom7;

        if (theme === 'light' || theme === 'dark') {
            $$('html').removeClass('dark light').addClass(theme);
            Logger.log("Theme applied: " + theme);
        } else {
            // Auto-detect system theme
            const autoTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
            $$('html').removeClass('dark light').addClass(autoTheme);
            Logger.log("Auto-detected theme: " + autoTheme);
        }

        // Save preference
        SettingsManager.set('theme', theme);
    }

    // ─────────────────────────────────────────────────────────────────────
    // BLE DEVICE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Connect to a BLE device
     * @param {String} deviceAddress MAC address of device
     * @returns {Boolean} true if connection initiated
     */
    async connectToDevice(deviceAddress) {
        if (this.isConnected) {
            Logger.warn("Already connected to a device");
            return false;
        }

        try {
            // Load screen-on setting
            this.runtime.keepScreenOn = !!SettingsManager.get('screenOn');

            // Use simulator if special address
            if (deviceAddress === '00:00:00:00:00:00') {
                Logger.log("Starting hardware simulator");
                this.simulator.onData = (data) => this.handleDataAvailable(data);
                this.simulator.Start();
                
                // Mark as connected and emit events
                this.handleBleConnected(deviceAddress);
            } else {
                // Connect to real device
                Logger.log("Connecting to device: " + deviceAddress);
                this.runtime.currentDevice = deviceAddress;
                this.bleManager.connect(deviceAddress);
            }

            return true;
        } catch (e) {
            Logger.error("Connection error: " + e);
            return false;
        }
    }

    /**
     * Disconnect from current BLE device
     * @returns {Boolean} true if disconnection initiated
     */
    async disconnectFromDevice() {
        if (!this.isConnected) {
            Logger.warn("Not connected to any device");
            return false;
        }

        try {
            const currentDevice = this.runtime.currentDevice;
            
            if (this.simulator.Status()) {
                this.simulator.Stop();
                Logger.log("Simulator stopped");
            } else {
                this.bleManager.disconnect();
            }

            // Emit disconnect event to update UI and release resources
            this.handleBleDisconnected(currentDevice);

            return true;
        } catch (e) {
            Logger.error("Disconnection error: " + e);
            return false;
        }
    }

    /**
     * Get connection state
     * @returns {Boolean} true if connected
     */
    getConnectionState() {
        return this.isConnected;
    }

    /**
     * Get current device address
     * @returns {String} MAC address or empty
     */
    getCurrentDeviceAddress() {
        return this.runtime.currentDevice || "";
    }

    // ─────────────────────────────────────────────────────────────────────
    // SETTINGS CACHE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update cached settings from SettingsManager
     * Called during initialization and when SettingsChanged event fires
     * Avoids querying SettingsManager on every data packet
     * @private
     */
    updateSettingsCache() {
        try {
            this.currentSettings = {
                powerCalcMethod: SettingsManager.get('powerCalcMethod') || 'measured',
                screenOn: SettingsManager.get('screenOn') || 0,
                theme: SettingsManager.get('theme') || 'auto',
                chartDuration: SettingsManager.get('chart').duration || 300
            };
            Logger.log("Settings cache updated: method=" + this.currentSettings.powerCalcMethod);
        } catch (e) {
            Logger.error("Settings cache update error: " + e);
        }
    }

    /**
     * Get cached setting value
     * @param {String} key Setting key (e.g., 'powerCalcMethod', 'screenOn')
     * @returns {*} Setting value or null if not found
     */
    getCachedSetting(key) {
        return this.currentSettings[key] || null;
    }

    // ─────────────────────────────────────────────────────────────────────
    // BLE EVENT HANDLERS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Handle UART data from device
     * @param {Object} data UART data from BLEManager
     * @private
     */
    handleUartData(data) {
        try {
            // Parse packet
            const parsed = this.parser.ParseUartData(data.packet);

            if (!parsed) {
                Logger.warn("Failed to parse UART data");
                return;
            }

            // Apply power calculation method using cached settings
            parsed.Pwr = DataProcessor.computePower(
                parsed,
                this.currentSettings.powerCalcMethod
            );

            // Validate data
            if (!DataProcessor.isValidMeasurement(parsed)) {
                Logger.warn("Invalid measurement: Vol=" + typeof parsed.Vol + ", Cur=" + typeof parsed.Cur + 
                           ", Pwr=" + typeof parsed.Pwr + ", Ene=" + typeof parsed.Ene);
                return;
            }

            // Emit event to subscribers
            this.handleDataAvailable(parsed);

            // Save to database
            this.saveMeasurement(parsed, data.deviceType);
        } catch (e) {
            Logger.error("UART data handling error: " + e);
        }
    }

    /**
     * Handle data available event
     * Emits global event for UI updates
     * @param {Object} data Measurement data
     * @private
     */
    handleDataAvailable(data) {
        this.eventBus.emit("EvtBleDataAvailable", data);
    }

    /**
     * Handle device connected
     * @param {String} address Device MAC address
     * @private
     */
    handleBleConnected(address) {
        this.isConnected = true;
        this.runtime.currentDevice = address;

        // Apply screen lock setting
        if (this.runtime.keepScreenOn) {
            app.PreventScreenLock(true);
        }

        // Enable remote control buttons
        this.eventBus.emit("EvtEnableAllRemoteControlButtons");
    }

    /**
     * Handle device disconnected
     * @param {String} address Device MAC address
     * @private
     */
    handleBleDisconnected(address) {
        this.isConnected = false;
        this.runtime.currentDevice = null;

        // Release screen lock
        app.PreventScreenLock(false);

        // Disable remote control buttons
        this.eventBus.emit("EvtDisableAllRemoteControlButtons");
    }

    /**
     * Handle BLE errors
     * @param {String} errorMessage Error description
     * @private
     */
    handleBleError(errorMessage) {
        Logger.error("BLE Error: " + errorMessage);
        this.eventBus.emit("EvtBleError", errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATA MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Save measurement to database
     * @param {Object} measurement Measurement data
     * @param {String} deviceType Device type
     * @private
     */
    async saveMeasurement(measurement, deviceType) {
        try {
            if (!this.dbManager || !this.dbManager.db) {
                Logger.error("Database not available");
                return;
            }

            const record = DataProcessor.measurementToRecord(measurement, deviceType);

            this.dbManager.db.ExecuteSql(
                `INSERT OR REPLACE INTO measurements 
                (timestamp, voltage, current, power, capacity, energy, 
                 d_minus, d_plus, frequency, power_factor, temperature, device_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.timestamp,
                    record.voltage,
                    record.current,
                    record.power,
                    record.capacity,
                    record.energy,
                    record.d_minus,
                    record.d_plus,
                    record.frequency,
                    record.power_factor,
                    record.temperature,
                    record.device_type
                ]
            );
        } catch (e) {
            Logger.error("Measurement save error: " + e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // REMOTE COMMAND EXECUTION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Send remote command to device
     * @param {String} commandName Command identifier
     * @returns {Boolean} true if sent
     */
    sendRemoteCommand(commandName) {
        const RemoteActionCodes = {
            btnSetup: { hex: "FF,55,11,03,31,00,00,00,00,01" },
            btnMinus: { hex: "FF,55,11,03,34,00,00,00,00,0C" },
            btnPlus: { hex: "FF,55,11,03,33,00,00,00,00,03" },
            btnEnter: { hex: "FF,55,11,03,32,00,00,00,00,02" },
            rstTime: { hex: "FF,55,11,03,03,00,00,00,00,53" },
            rstEne: { hex: "FF,55,11,03,01,00,00,00,00,51" },
            rstCap: { hex: "FF,55,11,03,02,00,00,00,00,52" },
            rstAll: { hex: "FF,55,11,03,05,00,00,00,00,5D" }
        };

        if (!RemoteActionCodes.hasOwnProperty(commandName)) {
            Logger.error("Unknown command: " + commandName);
            return false;
        }

        const hex = RemoteActionCodes[commandName].hex;

        // Handle simulator commands
        if (this.simulator.Status()) {
            switch (commandName) {
                case "rstTime":
                    this.simulator.ResetTime();
                    break;
                case "rstEne":
                    this.simulator.ResetEnergy();
                    break;
                case "rstCap":
                    this.simulator.ResetCapacity();
                    break;
            }
            Logger.log("Simulator command executed: " + commandName);
        } else {
            // Send to real device
            if (this.bleManager.sendUartCommand(hex)) {
                Logger.log("Remote command sent: " + commandName);
                return true;
            }
        }

        return false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // EVENT BUS - Global pub/sub
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Subscribe to global event
     * @param {String} eventName Event name
     * @param {Function} callback Callback function
     */
    on(eventName, callback) {
        this.eventBus.on(eventName, callback);
    }

    /**
     * Unsubscribe from global event
     * @param {String} eventName Event name
     * @param {Function} callback Callback function
     */
    off(eventName, callback) {
        this.eventBus.off(eventName, callback);
    }

    /**
     * Emit global event
     * @param {String} eventName Event name
     * @param {*} data Event data
     */
    emit(eventName, data) {
        this.eventBus.emit(eventName, data);
    }

    // ─────────────────────────────────────────────────────────────────────
    // UTILITY & STATE ACCESS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get Framework7 instance
     * @returns {Framework7} webapp object
     */
    getApp() {
        return this.webapp;
    }

    /**
     * Get database manager
     * @returns {DatabaseManager} dbManager
     */
    getDatabase() {
        return this.dbManager;
    }

    /**
     * Get BLE manager
     * @returns {BLEManager} bleManager
     */
    getBleManager() {
        return this.bleManager;
    }

    /**
     * Get global runtime state
     * @returns {Object} runtime object
     */
    getRuntime() {
        return this.runtime;
    }

    /**
     * Get global settings object (measurement definitions)
     * @returns {Object} settings object with measurements array
     */
    getSettings() {
        return {
            chart: {
                show: true,
                duration: 60,
                points: 116
            },
            measurements: [
                { key: 'Vol', title: 'Voltage', icon: "bolt", idx: 0, val: ['V'] },
                { key: 'Cur', title: 'Current', icon: "arrow_right_arrow_left", idx: 0, val: ['A'] },
                { key: 'Pwr', title: 'Power', icon: "speedometer", idx: 0, val: ['W', 'kW'] },
                { key: 'Cap', title: 'Capacity', icon: "battery_25", idx: 0, val: ['mAh', 'Ah'] },
                { key: 'Ene', title: 'Energy', icon: "sparkles", idx: 0, val: ['Wh', 'kWh'] },
                { key: 'DMinus', title: 'Neg DLV *', icon: "minus_circle", idx: 0, val: ['V'] },
                { key: 'DPlus', title: 'Pos DLV *', icon: "plus_circle", idx: 0, val: ['V'] },
                { key: 'Price', title: 'kWh price', icon: "money_dollar_circle", idx: 0, val: ['¤/kWh'] },
                { key: 'Cost', title: 'Total cost', icon: "money_dollar", idx: 0, val: ['¤'] },
                { key: 'Freq', title: 'Frequency', icon: "waveform_path", idx: 0, val: ['Hz'] },
                { key: 'PowFact', title: 'Power Factor', icon: "gauge", idx: 0, val: ['PF'] },
                { key: 'Temp', title: 'Temperature', icon: "thermometer", idx: 0, val: ['°C', '°F'] },
                { key: 'Time', title: 'Time', icon: "timer", idx: 0, val: [''] }
            ]
        };
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        try {
            if (this.isConnected) {
                this.disconnectFromDevice();
            }

            if (this.dbManager) {
                this.dbManager.close();
            }

            Logger.log("AppManager shutdown complete");
        } catch (e) {
            Logger.error("Shutdown error: " + e);
        }
    }
}
