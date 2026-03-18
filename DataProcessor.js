/**
 * DataProcessor.js - Data parsing and calculation utilities
 * 
 * Handles:
 * - Power calculations based on different methods
 * - UART packet parsing and formatting
 * - Measurement data transformation
 * - Unit conversions and scaling
 */

class DataProcessor {
    // ─────────────────────────────────────────────────────────────────────
    // POWER CALCULATION METHODS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Compute power using configured calculation method
     * @param {Object} data Parsed measurement data with Vol, Cur, Pwr, PowFact
     * @param {String} method Calculation method: 'measured', 'VA', 'VAPF'
     * @returns {Number} Calculated power in watts
     * 
     * Methods:
     *   'measured' - Use device's power measurement directly
     *   'VA'       - Calculate as Volts × Amps
     *   'VAPF'     - Calculate as Volts × Amps × PowerFactor
     */
    static computePower(data, method = 'measured') {
        const volts = parseFloat(data.Vol) || 0;
        const amps = parseFloat(data.Cur) || 0;
        const pf = parseFloat(data.PowFact) || 0;
        const measured = parseFloat(data.Pwr) || 0;

        switch (method) {
            case 'VA':
                // Direct VA calculation: volts × amperes
                return DataProcessor.round(volts * amps, 3);

            case 'VAPF':
                // VA with power factor: volts × amperes × power factor
                // Falls back to VA if power factor is not available
                if (pf > 0) {
                    return DataProcessor.round(volts * amps * pf, 3);
                }
                return DataProcessor.round(volts * amps, 3);

            case 'measured':
            default:
                // Use device's direct measurement
                return measured;
        }
    }

    /**
     * Validate measurement data
     * @param {Object} data Measurement object
     * @returns {Boolean} true if data is valid
     */
    static isValidMeasurement(data) {
        if (!data) return false;

        // Check essential fields exist and are numbers
        return (
            typeof data.Vol === 'number' && data.Vol >= 0 &&
            typeof data.Cur === 'number' && data.Cur >= 0 &&
            typeof data.Pwr === 'number' && data.Pwr >= 0 &&
            typeof data.Ene === 'number' && data.Ene >= 0
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // DATA FORMATTING & TRANSFORMATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Format measurement data for display
     * @param {Object} data Raw measurement data
     * @param {Object} options Formatting options
     * @returns {Object} Formatted data
     */
    static formatMeasurement(data, options = {}) {
        const defaults = {
            decimals: 2,
            units: true
        };
        const opts = { ...defaults, ...options };

        return {
            voltage: DataProcessor.round(data.Vol, 2) + (opts.units ? ' V' : ''),
            current: DataProcessor.round(data.Cur, 3) + (opts.units ? ' A' : ''),
            power: DataProcessor.round(data.Pwr, 2) + (opts.units ? ' W' : ''),
            energy: DataProcessor.round(data.Ene, 2) + (opts.units ? ' Wh' : ''),
            temperature: Math.round(data.Temp) + (opts.units ? ' °C' : ''),
            powerFactor: DataProcessor.round(data.PowFact, 3) + (opts.units ? ' PF' : '')
        };
    }

    /**
     * Convert database record to measurement display object
     * @param {Object} record Database row
     * @returns {Object} Formatted measurement
     */
    static recordToMeasurement(record) {
        return {
            timestamp: record.timestamp,
            Vol: record.voltage,
            Cur: record.current,
            Pwr: record.power,
            Cap: record.capacity,
            Ene: record.energy,
            DMinus: record.d_minus,
            DPlus: record.d_plus,
            Freq: record.frequency,
            PowFact: record.power_factor,
            Temp: record.temperature
        };
    }

    /**
     * Convert measurement object to database insert format
     * @param {Object} measurement Measurement object
     * @param {String} deviceType Device type identifier
     * @returns {Object} Database-friendly object
     */
    static measurementToRecord(measurement, deviceType = "unknown") {
        return {
            timestamp: Date.now(),
            voltage: measurement.Vol || 0,
            current: measurement.Cur || 0,
            power: measurement.Pwr || 0,
            capacity: measurement.Cap || 0,
            energy: measurement.Ene || 0,
            d_minus: measurement.DMinus || 0,
            d_plus: measurement.DPlus || 0,
            frequency: measurement.Freq || 0,
            power_factor: measurement.PowFact || 0,
            temperature: measurement.Temp || 0,
            device_type: deviceType
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // AGGREGATION & STATISTICS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Calculate statistics for a measurement array
     * @param {Array} measurements Array of measurement objects
     * @returns {Object} Statistics including min, max, avg, sum
     */
    static calculateStats(measurements) {
        if (!measurements || measurements.length === 0) {
            return null;
        }

        const stats = {
            count: measurements.length,
            voltage: { min: Infinity, max: -Infinity, avg: 0 },
            current: { min: Infinity, max: -Infinity, avg: 0 },
            power: { min: Infinity, max: -Infinity, avg: 0 },
            energy: { min: Infinity, max: -Infinity, sum: 0 },
            temperature: { min: Infinity, max: -Infinity, avg: 0 }
        };

        let voltSum = 0, currSum = 0, pwrSum = 0, tempSum = 0;

        measurements.forEach(m => {
            // Voltage stats
            stats.voltage.min = Math.min(stats.voltage.min, m.Vol);
            stats.voltage.max = Math.max(stats.voltage.max, m.Vol);
            voltSum += m.Vol;

            // Current stats
            stats.current.min = Math.min(stats.current.min, m.Cur);
            stats.current.max = Math.max(stats.current.max, m.Cur);
            currSum += m.Cur;

            // Power stats
            stats.power.min = Math.min(stats.power.min, m.Pwr);
            stats.power.max = Math.max(stats.power.max, m.Pwr);
            pwrSum += m.Pwr;

            // Energy sum
            stats.energy.sum += m.Ene;

            // Temperature stats
            stats.temperature.min = Math.min(stats.temperature.min, m.Temp);
            stats.temperature.max = Math.max(stats.temperature.max, m.Temp);
            tempSum += m.Temp;
        });

        // Calculate averages
        stats.voltage.avg = DataProcessor.round(voltSum / measurements.length, 2);
        stats.current.avg = DataProcessor.round(currSum / measurements.length, 3);
        stats.power.avg = DataProcessor.round(pwrSum / measurements.length, 2);
        stats.temperature.avg = DataProcessor.round(tempSum / measurements.length, 1);

        return stats;
    }

    // ─────────────────────────────────────────────────────────────────────
    // UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Round number to specified decimal places
     * @param {Number} value Number to round
     * @param {Number} decimals Decimal places
     * @returns {Number} Rounded number
     */
    static round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    /**
     * Format time duration in human-readable format
     * @param {Number} milliseconds Duration in milliseconds
     * @returns {String} Formatted duration (e.g., "2h 30m")
     */
    static formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return days + "d " + (hours % 24) + "h";
        if (hours > 0) return hours + "h " + (minutes % 60) + "m";
        if (minutes > 0) return minutes + "m " + (seconds % 60) + "s";
        return seconds + "s";
    }

    /**
     * Format timestamp as readable date/time
     * @param {Number} timestamp Milliseconds since epoch
     * @returns {String} Formatted date/time
     */
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const pad = (n) => (n < 10 ? '0' + n : n);

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
               `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    /**
     * Check if measurement value is within reasonable range
     * @param {String} field Field name (voltage, current, power, temp)
     * @param {Number} value Measurement value
     * @returns {Boolean} true if value is within expected range
     */
    static isValueInRange(field, value) {
        const ranges = {
            voltage: { min: 100, max: 250 },
            current: { min: 0, max: 100 },
            power: { min: 0, max: 25000 },
            temperature: { min: -40, max: 85 }
        };

        const range = ranges[field];
        if (!range) return true;

        return value >= range.min && value <= range.max;
    }
}
