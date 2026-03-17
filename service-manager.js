/*
 * Service Manager - Controls the BLE background service
 */

class ServiceManager {
    constructor() {
        this.service = null;
        this.isRunning = false;
        this.callbacks = {
            onData: null,
            onStatus: null,
            onDataClear: null
        };
    }
    
    // Start the BLE service
    start() {
        if (this.isRunning) {
            console.log("Service already running");
            return;
        }
        
        // Create and start service
        this.service = app.CreateService("BleService", "this", this.onServiceMessage.bind(this));
        this.service.Start();
        this.isRunning = true;
        
        console.log("BLE Service started");
    }
    
    // Stop the BLE service
    stop() {
        if (!this.isRunning || !this.service) {
            console.log("Service not running");
            return;
        }
        
        this.service.Stop();
        this.isRunning = false;
        this.service = null;
        
        console.log("BLE Service stopped");
    }
    
    // Connect to a BLE device
    connect(address) {
        if (!this.isRunning) {
            console.log("Service not running");
            return;
        }
        
        this.service.SendMessage(JSON.stringify({
            action: "connect",
            address: address
        }));
    }
    
    // Disconnect from BLE device
    disconnect() {
        if (!this.isRunning) {
            console.log("Service not running");
            return;
        }
        
        this.service.SendMessage(JSON.stringify({
            action: "disconnect"
        }));
    }
    
    // Get service status
    getStatus() {
        if (!this.isRunning) {
            console.log("Service not running");
            return;
        }
        
        this.service.SendMessage(JSON.stringify({
            action: "getStatus"
        }));
    }
    
    // Clear all data
    clearData() {
        if (!this.isRunning) {
            console.log("Service not running");
            return;
        }
        
        this.service.SendMessage(JSON.stringify({
            action: "clearData"
        }));
    }
    
    // Handle messages from service
    onServiceMessage(msg) {
        try {
            var data = JSON.parse(msg);
            
            switch(data.type) {
                case "data":
                    if (this.callbacks.onData) {
                        this.callbacks.onData(data.data);
                    }
                    break;
                    
                case "status":
                    if (this.callbacks.onStatus) {
                        this.callbacks.onStatus(data);
                    }
                    break;
                    
                case "dataClear":
                    if (this.callbacks.onDataClear) {
                        this.callbacks.onDataClear(data.success);
                    }
                    break;
            }
        } catch(e) {
            console.error("Error parsing service message:", e);
        }
    }
    
    // Set callback for data events
    setOnData(callback) {
        this.callbacks.onData = callback;
    }
    
    // Set callback for status events
    setOnStatus(callback) {
        this.callbacks.onStatus = callback;
    }
    
    // Set callback for data clear events
    setOnDataClear(callback) {
        this.callbacks.onDataClear = callback;
    }
    
    // Check if service is running
    isServiceRunning() {
        return this.isRunning;
    }
}
