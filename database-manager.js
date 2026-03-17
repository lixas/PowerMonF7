/*
 * Database Manager - Handles all database operations for measurements
 */

class DatabaseManager {
    constructor() {
        this.db = app.OpenDatabase("PowerMonData.sqlite");
        this.init();
    }
    

    init() {
        try {
            
            // Create table (ExecuteSql is usually fire-and-forget for creation)
            this.db.ExecuteSql(
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
                );`
            );
            this.db.ExecuteSql(`CREATE INDEX IF NOT EXISTS idx_timestamp ON measurements(timestamp);`);
            
        } catch (e) {
            console.error("Initialization error: " + e);
        }
    }
    
    // Get measurements for a specific time range
    async getMeasurements(startTime, endTime, limit = 1000) {
        return new Promise((resolve) => {
            if (!this.db) 
                return resolve([]);
            
            var query = `SELECT timestamp, voltage, current, power, capacity, energy,
                            d_minus, d_plus, frequency, power_factor, temperature
                FROM measurements
                WHERE timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp ASC
                LIMIT ?`;
                
            this.db.ExecuteSql(query, [startTime, endTime, limit], (results) => {
                resolve(this.parseResults(results));
            }, (err) => resolve(0));
        });
    }
    
    // Get latest N measurements
    async getLatestMeasurements(count = 100) {
        return new Promise((resolve) => {
            if (!this.db)
                return resolve([]);
            
            var query = `
                SELECT * FROM (
                    SELECT timestamp, voltage, current, power, capacity, energy,
                           d_minus, d_plus, frequency, power_factor, temperature
                    FROM measurements
                    ORDER BY timestamp DESC
                    LIMIT ?
                ) 
                ORDER BY timestamp ASC;`;  --// Reverse to get chronological order
            
            
            this.db.ExecuteSql(query, [count], (results) => {
                resolve(this.parseResults(results));
            }, (err) => resolve(0));
            
            // var results = this.db.ExecuteSql(query, [count]);
            // return this.parseResults(results).reverse(); 
        });
    }
    
    // Get measurements for last N hours
    async getLastHours(hours) {
        var endTime = Date.now();
        var startTime = endTime - (hours * 60 * 60 * 1000);
        return await this.getMeasurements(startTime, endTime);
        // return result
    }
    
    // Get measurements for last N days
    async getLastDays(days) {
        var endTime = Date.now();
        var startTime = endTime - (days * 24 * 60 * 60 * 1000);
        return await this.getMeasurements(startTime, endTime);
    }
    
    // Get measurements for today
    async getToday() {
        var now = new Date();
        var startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        var endTime = Date.now();
        return await this.getMeasurements(startTime, endTime);
    }
    
    // Get aggregated data (for large time ranges)
    getAggregatedData(startTime, endTime, intervalMinutes = 5) {
        if (!this.db) return [];
        
        var intervalMs = intervalMinutes * 60 * 1000;
        
        var query = `
            SELECT 
                (timestamp / ?) * ? as interval_time,
                AVG(voltage) as avg_voltage,
                AVG(current) as avg_current,
                AVG(power) as avg_power,
                MAX(power) as max_power,
                MIN(power) as min_power
            FROM measurements
            WHERE timestamp >= ? AND timestamp <= ?
            GROUP BY interval_time
            ORDER BY interval_time ASC
        `;
        
        var results = this.db.ExecuteSql(
            query, 
            [intervalMs, intervalMs, startTime, endTime]
        );
        
        return this.parseAggregatedResults(results);
    }
    
    // Get statistics for a time range
    getStatistics(startTime, endTime) {
        if (!this.db) return null;
        
        var query = `
            SELECT 
                COUNT(*) as count,
                AVG(voltage) as avg_voltage,
                AVG(current) as avg_current,
                AVG(power) as avg_power,
                MAX(power) as max_power,
                MIN(power) as min_power,
                MAX(voltage) as max_voltage,
                MIN(voltage) as min_voltage,
                MAX(current) as max_current,
                MIN(current) as min_current,
                SUM(energy) as total_energy
            FROM measurements
            WHERE timestamp >= ? AND timestamp <= ?
        `;
        
        var results = this.db.ExecuteSql(query, [startTime, endTime]);
        
        if (results && results.rows && results.rows.length > 0) {
            return results.rows.item(0);
        }
        return null;
    }
    
    // Delete measurements older than specified days
    deleteOlderThan(days) {
        if (!this.db) return false;
        
        var cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        try {
            this.db.ExecuteSql(
                "DELETE FROM measurements WHERE timestamp < ?",
                [cutoffTime]
            );
            return true;
        } catch(e) {
            console.error("Error deleting old data:", e);
            return false;
        }
    }
    
    // Clear all measurements
    clearAll() {
        if (!this.db) return false;
        
        try {
            this.db.ExecuteSql("DELETE FROM measurements");
            return true;
        } catch(e) {
            console.error("Error clearing data:", e);
            return false;
        }
    }
    
    // Returns a Promise that resolves to a Number
    async getCount() {
        return new Promise((resolve) => {
            if (!this.db) 
                return resolve(0);
            this.db.ExecuteSql("SELECT COUNT(*) as cnt FROM measurements", [], (results) => {
                resolve(results.rows.item(0).cnt || 0);
            }, (err) => resolve(0));
        });
    }
    
    // Returns a Promise that resolves to an Object {start, end}
    async getDataRange() {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            const query = "SELECT MIN(timestamp) as first, MAX(timestamp) as last FROM measurements";
            this.db.ExecuteSql(query, [], (results) => {
                if (results.rows.length > 0) {
                    const row = results.rows.item(0);
                    resolve({ start: row.first, end: row.last });
                } else {
                    resolve(null);
                }
            }, (err) => resolve(null));
        });
    }

    
    // Parse SQL results into array of objects
    parseResults(results) {
        var data = [];
        
        if (!results || !results.rows) return data;
        
        for (var i = 0; i < results.rows.length; i++) {
            var row = results.rows.item(i);
            data.push({
                timestamp: row.timestamp,
                Vol: row.voltage,
                Cur: row.current,
                Pwr: row.power,
                Cap: row.capacity,
                Ene: row.energy,
                DMinus: row.d_minus,
                DPlus: row.d_plus,
                Freq: row.frequency,
                PowFact: row.power_factor,
                Temp: row.temperature
            });
        }
        
        return data;
    }
    
    // Parse aggregated results
    parseAggregatedResults(results) {
        var data = [];
        
        if (!results || !results.rows) return data;
        
        for (var i = 0; i < results.rows.length; i++) {
            var row = results.rows.item(i);
            data.push({
                timestamp: row.interval_time,
                Vol: row.avg_voltage,
                Cur: row.avg_current,
                Pwr: row.avg_power,
                maxPwr: row.max_power,
                minPwr: row.min_power
            });
        }
        
        return data;
    }
    
        // Close database connection
    commit() {
        if (this.db) {
            // this.db.Close();
            // this.db = null;
        }
    }
    
    // Close database connection
    close() {
        if (this.db) {
            this.db.Close();
            // this.db = null;
        }
    }
}
