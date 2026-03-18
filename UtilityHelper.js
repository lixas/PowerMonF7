/**
 * UtilityHelper.js - Common utility functions and helpers
 * 
 * Organized utility functions for:
 * - String formatting
 * - Array operations
 * - Object utilities
 * - Debugging helpers
 * - Number formatting
 */

class UtilityHelper {
    // ─────────────────────────────────────────────────────────────────────
    // STRING UTILITIES
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Pad a number with leading zero if single digit
     * @param {Number} digit Number to pad
     * @returns {String} Zero-padded string
     */
    static padZero(digit) {
        return digit <= 9 ? "0" + digit : String(digit);
    }

    /**
     * Format bytes to human-readable format
     * @param {Number} bytes Number of bytes
     * @returns {String} Formatted size (e.g., "1.5 MB")
     */
    static formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";

        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }

    /**
     * Truncate string to max length
     * @param {String} str String to truncate
     * @param {Number} maxLength Maximum length
     * @param {String} suffix Suffix to add (default: "...")
     * @returns {String} Truncated string
     */
    static truncate(str, maxLength, suffix = "...") {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Capitalize first letter of string
     * @param {String} str Input string
     * @returns {String} Capitalized string
     */
    static capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Convert camelCase to Title Case
     * @param {String} str camelCase string
     * @returns {String} Title Case string
     */
    static camelToTitle(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (char) => char.toUpperCase())
            .trim();
    }

    // ─────────────────────────────────────────────────────────────────────
    // ARRAY UTILITIES
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Check if value exists in array
     * @param {Array} arr Array to search
     * @param {*} value Value to find
     * @returns {Boolean} true if found
     */
    static arrayContains(arr, value) {
        return Array.isArray(arr) && arr.indexOf(value) !== -1;
    }

    /**
     * Remove duplicates from array
     * @param {Array} arr Input array
     * @returns {Array} Array with unique values
     */
    static arrayUnique(arr) {
        if (!Array.isArray(arr)) return [];
        return [...new Set(arr)];
    }

    /**
     * Chunk array into smaller arrays
     * @param {Array} arr Array to chunk
     * @param {Number} size Chunk size
     * @returns {Array} Array of chunks
     */
    static arrayChunk(arr, size) {
        if (!Array.isArray(arr) || size < 1) return [];

        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Find element in array by property value
     * @param {Array} arr Array to search
     * @param {String} propName Property name
     * @param {*} value Property value to match
     * @returns {Object} First matching element or null
     */
    static arrayFindByProperty(arr, propName, value) {
        if (!Array.isArray(arr)) return null;
        return arr.find(item => item && item[propName] === value) || null;
    }

    /**
     * Group array elements by property
     * @param {Array} arr Array to group
     * @param {String} propName Property to group by
     * @returns {Object} Object with grouped arrays
     */
    static arrayGroupBy(arr, propName) {
        if (!Array.isArray(arr)) return {};

        return arr.reduce((groups, item) => {
            const key = item[propName];
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
            return groups;
        }, {});
    }

    // ─────────────────────────────────────────────────────────────────────
    // OBJECT UTILITIES
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Deep clone an object
     * @param {Object} obj Object to clone
     * @returns {Object} Deep copy of object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (Array.isArray(obj)) {
            return obj.map(item => UtilityHelper.deepClone(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = UtilityHelper.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Merge objects recursively
     * @param {Object} target Target object
     * @param {Object} source Source object
     * @returns {Object} Merged object
     */
    static deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null) {
                    target[key] = UtilityHelper.deepMerge(target[key] || {}, source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    /**
     * Check if object is empty
     * @param {Object} obj Object to check
     * @returns {Boolean} true if empty
     */
    static isEmpty(obj) {
        if (!obj) return true;
        if (typeof obj !== 'object') return false;
        return Object.keys(obj).length === 0;
    }

    /**
     * Get nested property value safely
     * @param {Object} obj Object
     * @param {String} path Dot-notation path (e.g., "user.profile.name")
     * @param {*} defaultValue Default value if not found
     * @returns {*} Property value or default
     */
    static getNestedProperty(obj, path, defaultValue = null) {
        if (!obj || !path) return defaultValue;

        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    // ─────────────────────────────────────────────────────────────────────
    // DEBUGGING & INSPECTION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Pretty-print object for debugging
     * @param {Object} obj Object to inspect
     * @param {Number} indent Indentation level
     * @returns {String} Formatted object string
     */
    static inspect(obj, indent = 0) {
        const spaces = ' '.repeat(indent);

        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (typeof obj !== 'object') return String(obj);

        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            let str = '[\n';
            obj.forEach((item, i) => {
                str += spaces + '  ' + UtilityHelper.inspect(item, indent + 2);
                if (i < obj.length - 1) str += ',';
                str += '\n';
            });
            return str + spaces + ']';
        }

        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';

        let str = '{\n';
        keys.forEach((key, i) => {
            str += spaces + '  "' + key + '": ' + UtilityHelper.inspect(obj[key], indent + 2);
            if (i < keys.length - 1) str += ',';
            str += '\n';
        });
        return str + spaces + '}';
    }

    /**
     * Get object type (more detailed than typeof)
     * @param {*} value Value to check
     * @returns {String} Type name
     */
    static getType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Date) return 'date';
        if (value instanceof RegExp) return 'regexp';
        return typeof value;
    }

    // ─────────────────────────────────────────────────────────────────────
    // NUMBER UTILITIES
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Clamp number between min and max
     * @param {Number} value Number to clamp
     * @param {Number} min Minimum value
     * @param {Number} max Maximum value
     * @returns {Number} Clamped number
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Check if number is between min and max
     * @param {Number} value Number to check
     * @param {Number} min Minimum value
     * @param {Number} max Maximum value
     * @param {Boolean} inclusive Include boundaries
     * @returns {Boolean} true if in range
     */
    static isInRange(value, min, max, inclusive = true) {
        if (inclusive) {
            return value >= min && value <= max;
        }
        return value > min && value < max;
    }

    // ─────────────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Validate email address
     * @param {String} email Email to validate
     * @returns {Boolean} true if valid
     */
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(String(email).toLowerCase());
    }

    /**
     * Validate URL
     * @param {String} url URL to validate
     * @returns {Boolean} true if valid
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if value is a valid JSON string
     * @param {String} str String to check
     * @returns {Boolean} true if valid JSON
     */
    static isValidJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
}
