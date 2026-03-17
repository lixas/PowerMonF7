/**
 * Logger.js — PowerMon debug logging utility
 *
 * Global singleton instance. Load this before any other app script.
 *
 * Usage:
 *   Logger.info("BLE connected to " + adr);
 *   Logger.warn("Voltage out of expected range");
 *   Logger.error("Parse failed: " + e.message);
 *
 * Each entry automatically captures the caller location, e.g. home.html@123
 */

class LogEntry {

    constructor(levelKey, levelLabel, priority, message) {
        this.timestamp = LogEntry.#timestamp();
        this.levelKey  = levelKey;
        this.level     = levelLabel;
        this.priority  = priority;
        this.message   = String(message);
    }

    /** @returns {string} formatted for console output and file export */
    toString() {
        return `[${this.timestamp}] [${this.level.toUpperCase()}] ${this.message}`;
    }

    // ── Private helpers ───────────────────────────────────────────────────

    static #pad(n) { return n < 10 ? "0" + n : String(n); }

    static #timestamp() {
        const d = new Date();
        return `${d.getFullYear()}-${LogEntry.#pad(d.getMonth() + 1)}-${LogEntry.#pad(d.getDate())}` +
               `  ${LogEntry.#pad(d.getHours())}:${LogEntry.#pad(d.getMinutes())}:${LogEntry.#pad(d.getSeconds())}`;
    }
}


class CallerResolver {

    // Frames belonging to the logger itself — skipped when walking the stack
    static #INTERNAL_PATTERNS = [
        /CallerResolver/,
        /AppLogger/,
        /LogEntry/,
        /Logger\.js/,
    ];

    /**
     * Walk the current call stack and return the first frame that does NOT
     * belong to the logger internals, formatted as "filename@line".
     *
     * Handles the two most common stack formats:
     *   V8  — "    at functionName (http://host/path/file.html:123:45)"
     *   JSC — "functionName@http://host/path/file.html:123:45"
     *
     * @returns {string}  e.g. "home.html@42"  or  "PowerMon.html@310"
     */
    static resolve() {
        try {
            const raw = new Error().stack;
            if (!raw) return "unknown";

            const lines = raw.split("\n");

            for (const line of lines) {
                // Skip blank lines and internal logger frames
                if (!line.trim()) continue;
                if (CallerResolver.#INTERNAL_PATTERNS.some(p => p.test(line))) continue;

                const location = CallerResolver.#extractLocation(line);
                if (location) return location;
            }
        } catch (_) {
            // Stack traces are not guaranteed — fail silently
        }
        return "unknown";
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Extract "filename@line" from a single stack frame line.
     * Returns null if the line doesn't match any known format.
     */
    static #extractLocation(line) {
        // V8: "    at something (http://localhost/path/to/file.html:123:45)"
        // V8: "    at http://localhost/path/to/file.html:123:45"          (anonymous)
        const v8 = line.match(/\(([^)]+):(\d+):\d+\)/) ||
                   line.match(/at\s+((?:https?|file):\/\/[^:]+):(\d+):\d+/);
        if (v8) return CallerResolver.#formatLocation(v8[1], v8[2]);

        // JSC / Firefox: "funcName@http://localhost/path/to/file.html:123:45"
        const jsc = line.match(/@(.+):(\d+):\d+$/);
        if (jsc) return CallerResolver.#formatLocation(jsc[1], jsc[2]);

        // DroidScript may use bare "file.js:123" without a URL scheme
        const bare = line.match(/([^/\\]+\.(?:html|js)):(\d+)/);
        if (bare) return `${bare[1]}@${bare[2]}`;

        return null;
    }

    /** Turn a full URL + line number into "filename@line" */
    static #formatLocation(url, line) {
        // Grab just the last path segment (the filename)
        const filename = url.split("/").pop().split("?")[0] || url;
        return `${filename}@${line}`;
    }
}


class AppLogger {

    // ── Private fields ────────────────────────────────────────────────────

    #logs       = [];
    #maxEntries = 500;

    #levels = {
        INFO:    { label: "Info",    priority: 1 },
        WARNING: { label: "Warning", priority: 2 },
        ERROR:   { label: "Error",   priority: 3 }
    };

    // ── Singleton ─────────────────────────────────────────────────────────

    static #instance = null;

    static getInstance() {
        if (!AppLogger.#instance) {
            AppLogger.#instance = new AppLogger();
        }
        return AppLogger.#instance;
    }

    // ── Public logging methods ────────────────────────────────────────────

    /** Log an informational message */
    log(message)   { return this.#add("INFO",    message); }
    info(message)  { return this.#add("INFO",    message); }

    /** Log a warning */
    warn(message)  { return this.#add("WARNING", message); }

    /** Log an error */
    error(message) { return this.#add("ERROR",   message); }

    // ── Query methods ─────────────────────────────────────────────────────

    /**
     * Retrieve stored entries, optionally filtered to a minimum severity.
     * @param {"ALL"|"INFO"|"WARNING"|"ERROR"} filterLevel
     * @returns {LogEntry[]}
     */
    getLogs(filterLevel) {
        if (!filterLevel || filterLevel === "ALL") return [...this.#logs];
        const min = this.#levels[filterLevel]?.priority ?? 1;
        return this.#logs.filter(e => e.priority >= min);
    }

    /** Number of entries matching the filter */
    count(filterLevel) {
        return this.getLogs(filterLevel).length;
    }

    /** Remove all entries from memory */
    clear() { this.#logs = []; }

    /**
     * Produce a plain-text string suitable for saving / sharing.
     * @param {"ALL"|"INFO"|"WARNING"|"ERROR"} filterLevel
     * @returns {string}
     */
    exportText(filterLevel) {
        const entries = this.getLogs(filterLevel);
        if (!entries.length) return "(no log entries)";
        return entries.map(e => e.toString()).join("\n");
    }

    // ── Private core ──────────────────────────────────────────────────────

    #add(levelKey, message) {
        const { label, priority } = this.#levels[levelKey];
        // const caller = CallerResolver.resolve();
        const entry  = new LogEntry(levelKey, label, priority, message);

        this.#logs.push(entry);
        if (this.#logs.length > this.#maxEntries) this.#logs.shift();

        // Mirror to DroidScript IDE console
        if      (levelKey === "ERROR")   console.error(entry.toString());
        else if (levelKey === "WARNING") console.warn(entry.toString());
        else                             console.log(entry.toString());

        return entry;
    }
}


// Global singleton — usage: Logger.info(...) / Logger.warn(...) / Logger.error(...)
const Logger = AppLogger.getInstance();