/**
 * BLEManager.js - Centralized Bluetooth Low Energy management
 * 
 * Handles all BLE operations including:
 * - Device connection/disconnection
 * - UART communication
 * - Packet assembly and parsing
 * - Error handling and reconnection logic
 * 
 * Architecture: Singleton pattern - ensures single BLE instance
 */

class BLEManager {
    // ─────────────────────────────────────────────────────────────────────
    // STATIC PROPERTIES & SINGLETON
    // ─────────────────────────────────────────────────────────────────────
    static #instance = null;

    static getInstance() {
        if (!BLEManager.#instance) {
            BLEManager.#instance = new BLEManager();
        }
        return BLEManager.#instance;
    }

    // ─────────────────────────────────────────────────────────────────────
    // BLE UUID CONSTANTS
    // ─────────────────────────────────────────────────────────────────────
    static UUIDS = {
        SERVICE:    "0000FFE0-0000-1000-8000-00805F9B34FB",
        TX:         "0000FFE2-0000-1000-8000-00805F9B34FB",
        RX:         "0000FFE1-0000-1000-8000-00805F9B34FB"
    };

    // ─────────────────────────────────────────────────────────────────────
    // INSTANCE PROPERTIES
    // ─────────────────────────────────────────────────────────────────────
    constructor() {
        /** @type {BluetoothLE} DroidScript BLE object */
        this.ble = null;

        /** @type {String} Address of currently connected device */
        this.connectedDeviceAddress = "";

        /** @type {Boolean} Connection state */
        this.isConnected = false;

        /** @type {String} Accumulated UART buffer for packet assembly */
        this.uartBuffer = "";

        /** @type {String} Device type detected from UART data */
        this.deviceType = "";

        // Callback handlers
        this.callbacks = {
            onUartData: null,
            onConnected: null,
            onDisconnected: null,
            onError: null
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // INITIALIZATION & SETUP
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Initialize BLE module
     * @returns {Boolean} true if initialization successful
     */
    initialize() {
        try {
            Logger.log("Loading BluetoothLE plugin...");
            app.LoadPlugin("BluetoothLE");
            this.ble = app.CreateBluetoothLE();
            Logger.log("BluetoothLE plugin loaded successfully");

            // Store reference to this for use in callbacks
            const self = this;

            Logger.log("Registering BLE callback: SetOnSelect");
            this.ble.SetOnSelect( function (name, addr){
                self.connect(addr);
            });

            Logger.log("Registering BLE callback: SetOnConnect");
            this.ble.SetOnConnect( function() {
                Logger.log("SetOnConnect callback wrapper called");
                self.handleConnect();
            });
            
            Logger.log("Registering BLE callback: SetOnDisconnect");
            this.ble.SetOnDisconnect( function() {
                Logger.log("SetOnDisconnect callback wrapper called");
                self.handleDisconnect();
            });

            Logger.log("Registering BLE callback: SetOnUartReceive");
            this.ble.SetOnUartReceive( function(data) {
                self.handleUartData(data);
            });


            Logger.log("Setting UART mode to Hex...");
            this.ble.SetUartMode("Hex");
            Logger.log("UART mode set successfully");

            Logger.log("Setting UART IDs...");
            this.ble.SetUartIds(
                BLEManager.UUIDS.SERVICE,
                BLEManager.UUIDS.TX,
                BLEManager.UUIDS.RX
            );
            Logger.log("UART IDs set successfully");
            
            Logger.log("BLEManager initialized successfully - all callbacks registered");
            return true;
        } catch (e) {
            this.handleError("BLE initialization failed: " + e);
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // CONNECTION MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Connect to a BLE device
     * @param {String} deviceAddress MAC address of the device
     * @returns {Boolean} true if connection initiated
     */
    connect(deviceAddress) {
        if (!this.ble) {
            this.handleError("BLE not initialized");
            return false;
        }

        if (this.isConnected) {
            Logger.warn("Already connected to a device");
            return false;
        }

        try {
            this.connectedDeviceAddress = deviceAddress;
            Logger.log("Attempting BLE.Connect() for device: " + deviceAddress);
            this.ble.Connect(deviceAddress, "UART");
            Logger.log("BLE.Connect() called - waiting for OnConnect callback...");
            return true;
        } catch (e) {
            this.handleError("Connection failed: " + e);
            return false;
        }
    }

    /**
     * Disconnect from current BLE device
     * @returns {Boolean} true if disconnection initiated
     */
    disconnect() {
        if (!this.ble || !this.isConnected) {
            return false;
        }

        try {
            this.ble.Disconnect();
            Logger.log("BLE disconnection initiated");
            return true;
        } catch (e) {
            this.handleError("Disconnection failed: " + e);
            return false;
        }
    }

    /**
     * Check if currently connected
     * @returns {Boolean} connection state
     */
    getConnectionState() {
        return this.isConnected;
    }

    /**
     * Get currently connected device address
     * @returns {String} MAC address or empty string
     */
    getConnectedDeviceAddress() {
        return this.connectedDeviceAddress;
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATA TRANSMISSION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Send UART command to connected device
     * @param {String} hexCommand Command in hex format (comma-separated)
     * @returns {Boolean} true if sent successfully
     */
    sendUartCommand(hexCommand) {
        if (!this.ble || !this.isConnected) {
            this.handleError("Cannot send - not connected");
            return false;
        }

        try {
            this.ble.SendUart(hexCommand);
            Logger.log("UART sent: " + hexCommand);
            return true;
        } catch (e) {
            this.handleError("UART send failed: " + e);
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATA RECEPTION & PACKET ASSEMBLY
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Handle incoming UART data - assembles packets
     * @param {String} data Hex bytes received (may be multiple bytes)
     * @private
     */
    handleUartData(data) {
        // Accumulate bytes in buffer
        this.uartBuffer += data;

        // Check if packet is complete (ends with 'FF' and minimum length)
        const PACKET_MIN_LENGTH = 36 * 2; // 36 bytes * 2 hex chars
        if (this.uartBuffer.endsWith('FF') && this.uartBuffer.length >= PACKET_MIN_LENGTH) {
            this.processPacket(this.uartBuffer);
            this.uartBuffer = data; // Clear buffer for next packet
        }
    }

    /**
     * Process a complete UART packet
     * @param {String} packet Hex packet
     * @private
     */
    processPacket(packet) {
        try {
            // Extract packet type from bytes 4-5
            const packetType = packet.substring(4, 6);

            // Detect device type from first packet received
            if (!this.deviceType && typeof ProtocolParser !== 'undefined') {
                const parser = new ProtocolParser();
                parser.ParseUartData(packet);
                this.deviceType = parser.getDeviceType();
                Logger.log("Device type detected: " + this.deviceType);
            }

            // Route packet based on type
            switch (packetType) {
                case '01': // Data packet
                    this.emitUartData('data', packet);
                    break;
                case '11': // Command echo
                    this.emitUartData('command', packet);
                    break;
                case '02': // Acknowledgement
                    this.emitUartData('ack', packet);
                    break;
                default:
                    Logger.warn("Unknown packet type: " + packetType);
            }
        } catch (e) {
            this.handleError("Packet processing error: " + e);
        }
    }

    /**
     * Emit processed UART data to callback
     * @param {String} type Packet type
     * @param {String} packet Raw hex packet
     * @private
     */
    emitUartData(type, packet) {
        if (this.callbacks.onUartData) {
            this.callbacks.onUartData({
                type: type,
                packet: packet,
                deviceType: this.deviceType,
                timestamp: Date.now()
            });
        } else {
            Logger.warn("No onUartData callback registered!");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // DEVICE STATE CALLBACKS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Handle device connection
     * @private
     */
    handleConnect() {
        try {
           
            const self = this;
            this.isConnected = true;
            Logger.log("BLE device connected: " + this.connectedDeviceAddress);
            
            // Emit event for UI
            if (window.F7Evt) {
                window.F7Evt.emit('EvtBleConnected', { deviceAddress: this.connectedDeviceAddress });
            }
            
            if (this.callbacks.onConnected) {
                this.callbacks.onConnected(this.connectedDeviceAddress);
            }
        } catch (e) {
            Logger.error("Error after connection: " + e);
            // this.ble.Disconnect();
        }
    }

    /**
     * Handle device disconnection
     * @private
     */
    handleDisconnect() {
        this.isConnected = false;
        const addr = this.connectedDeviceAddress;
        this.connectedDeviceAddress = "";
        this.uartBuffer = "";

        Logger.log("BLE device disconnected: " + addr);

        if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected(addr);
        }
    }

    /**
     * Handle BLE errors
     * @param {String} message Error message
     * @private
     */
    handleError(message) {
        Logger.error(message);

        if (this.callbacks.onError) {
            this.callbacks.onError(message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // CALLBACK REGISTRATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Set callback for UART data events
     * @param {Function} callback Function(data) with { type, packet, deviceType, timestamp }
     */
    setOnUartData(callback) {
        this.callbacks.onUartData = callback;
    }

    /**
     * Set callback for connection events
     * @param {Function} callback Function(deviceAddress)
     */
    setOnConnected(callback) {
        this.callbacks.onConnected = callback;
    }

    /**
     * Set callback for disconnection events
     * @param {Function} callback Function(deviceAddress)
     */
    setOnDisconnected(callback) {
        this.callbacks.onDisconnected = callback;
    }

    /**
     * Set callback for error events
     * @param {Function} callback Function(errorMessage)
     */
    setOnError(callback) {
        this.callbacks.onError = callback;
    }

    // ─────────────────────────────────────────────────────────────────────
    // UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get device type
     * @returns {String} Device type code
     */
    getDeviceType() {
        return this.deviceType;
    }

    /**
     * Reset device state (for cleanup)
     * @private
     */
    reset() {
        this.connectedDeviceAddress = "";
        this.isConnected = false;
        this.uartBuffer = "";
        this.deviceType = "";
    }
}
