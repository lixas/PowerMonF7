/**
 * UIController.js - Manages UI interactions and state
 * 
 * Handles:
 * - Page lifecycle events
 * - Button click handlers
 * - UI state synchronization
 * - Dialog and popup management
 * - Theme UI updates
 * 
 * Architecture: Event-driven, works with AppManager events
 */

class UIController {
    // ─────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Initialize UI controller
     * Call from each page component's mounted hook
     * @param {Object} options Configuration options
     * @param {Framework7} options.app Framework7 instance
     * @param {HTMLElement} options.root Root element of page
     */
    static initialize(options = {}) {
        const appMgr = AppManager.getInstance();
        const $$ = Dom7;

        // Store reference for this page
        this.app = options.app || appMgr.getApp();
        this.root = options.root || document.querySelector('.page');
    }

    // ─────────────────────────────────────────────────────────────────────
    // BUTTON HANDLERS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Handle remote control button click
     * @param {String} buttonId Button ID
     */
    static handleRemoteButton(buttonId) {
        const appMgr = AppManager.getInstance();
        appMgr.sendRemoteCommand(buttonId);
    }

    /**
     * Handle device connection request
     * @param {String} deviceAddress MAC address
     */
    static async handleDeviceConnect(deviceAddress) {
        const appMgr = AppManager.getInstance();
        const success = await appMgr.connectToDevice(deviceAddress);

        if (!success && this.app) {
            this.app.dialog.alert("Failed to connect to device");
        }
    }

    /**
     * Handle device disconnection request
     */
    static async handleDeviceDisconnect() {
        const appMgr = AppManager.getInstance();
        await appMgr.disconnectFromDevice();
    }

    /**
     * Handle theme toggle
     */
    static handleThemeToggle() {
        const appMgr = AppManager.getInstance();
        appMgr.toggleTheme();
    }

    // ─────────────────────────────────────────────────────────────────────
    // DIALOG & CONFIRMATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Show confirmation dialog
     * @param {String} message Dialog message
     * @param {String} title Dialog title
     * @param {Function} onConfirm Callback if confirmed
     */
    static showConfirm(message, title = "Confirm", onConfirm) {
        if (!this.app) return;

        this.app.dialog.confirm(message, title, () => {
            if (onConfirm) onConfirm();
        });
    }

    /**
     * Show alert dialog
     * @param {String} message Alert message
     * @param {String} title Dialog title
     */
    static showAlert(message, title = "Alert") {
        if (!this.app) return;

        this.app.dialog.alert(message, title);
    }

    /**
     * Show toast notification
     * @param {String} message Toast message
     * @param {Number} duration Duration in milliseconds
     */
    static showToast(message, duration = 2000) {
        if (!this.app) return;

        this.app.toast.create({
            text: message,
            closeTimeout: duration
        }).open();
    }

    // ─────────────────────────────────────────────────────────────────────
    // MEASUREMENT DISPLAY
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update measurement display value
     * @param {String} elementId HTML element ID
     * @param {Number} value Measurement value
     * @param {Number} decimals Decimal places
     */
    static updateMeasurement(elementId, value, decimals = 2) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = DataProcessor.round(value, decimals);
        }
    }

    /**
     * Update measurement with unit
     * @param {String} elementId HTML element ID
     * @param {Number} value Measurement value
     * @param {String} unit Unit suffix
     * @param {Number} decimals Decimal places
     */
    static updateMeasurementWithUnit(elementId, value, unit, decimals = 2) {
        const element = document.getElementById(elementId);
        if (element) {
            const rounded = DataProcessor.round(value, decimals);
            element.textContent = rounded + " " + unit;
        }
    }

    /**
     * Update multiple measurements at once
     * @param {Object} updates Map of elementId -> value
     */
    static updateMeasurements(updates) {
        for (const [id, value] of Object.entries(updates)) {
            this.updateMeasurement(id, value);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // ELEMENT STATE
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Enable button or element
     * @param {String} elementId Element ID
     */
    static enableElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove("disabled");
            element.disabled = false;
        }
    }

    /**
     * Disable button or element
     * @param {String} elementId Element ID
     */
    static disableElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add("disabled");
            element.disabled = true;
        }
    }

    /**
     * Show element
     * @param {String} elementId Element ID
     */
    static showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = "";
        }
    }

    /**
     * Hide element
     * @param {String} elementId Element ID
     */
    static hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = "none";
        }
    }

    /**
     * Set element classes
     * @param {String} elementId Element ID
     * @param {Array} classes Array of class names
     */
    static setClasses(elementId, classes) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = "";
            classes.forEach(cls => element.classList.add(cls));
        }
    }

    /**
     * Add class to element
     * @param {String} elementId Element ID
     * @param {String} className Class name to add
     */
    static addClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * Remove class from element
     * @param {String} elementId Element ID
     * @param {String} className Class name to remove
     */
    static removeClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // CONNECTION STATE UI
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update connection status display
     * @param {Boolean} connected Connection state
     * @param {String} deviceName Device name/address
     */
    static updateConnectionStatus(connected, deviceName = "") {
        const appMgr = AppManager.getInstance();

        if (connected) {
            this.showElement("disconnect-button");
            this.hideElement("connect-button");

            // Enable remote control buttons
            appMgr.emit("EvtEnableAllRemoteControlButtons");
        } else {
            this.hideElement("disconnect-button");
            this.showElement("connect-button");

            // Disable remote control buttons
            appMgr.emit("EvtDisableAllRemoteControlButtons");
        }
    }

    /**
     * Enable all remote control buttons
     */
    static enableRemoteControlButtons() {
        const buttonIds = ["btnSetup", "btnMinus", "btnPlus", "btnEnter", "btnReset"];
        buttonIds.forEach(id => this.enableElement(id));
    }

    /**
     * Disable all remote control buttons
     */
    static disableRemoteControlButtons() {
        const buttonIds = ["btnSetup", "btnMinus", "btnPlus", "btnEnter", "btnReset"];
        buttonIds.forEach(id => this.disableElement(id));
    }

    // ─────────────────────────────────────────────────────────────────────
    // SIGNAL STRENGTH DISPLAY
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Determine signal level from RSSI value
     * @param {Number} rssi RSSI value in dBm
     * @returns {String} Signal level: 'full', 'strong', 'medium', 'weak'
     */
    static getSignalLevel(rssi) {
        if (rssi >= -50) return "full";
        if (rssi >= -70) return "strong";
        if (rssi >= -80) return "medium";
        return "weak";
    }

    /**
     * Update signal strength icon
     * @param {String} elementId Signal icon element ID
     * @param {Number} rssi RSSI value
     */
    static updateSignalIcon(elementId, rssi) {
        const element = document.querySelector(elementId || ".signal-icon");
        if (!element) return;

        const level = this.getSignalLevel(rssi);

        // Remove all level classes
        element.classList.remove("weak", "medium", "strong", "full");

        // Add current level class
        if (level) {
            element.classList.add(level);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // LOADING & PROGRESS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Show loading indicator
     * @param {String} message Loading message
     */
    static showLoading(message = "Loading...") {
        if (!this.app) return;

        this.app.preloader.show();
    }

    /**
     * Hide loading indicator
     */
    static hideLoading() {
        if (!this.app) return;

        this.app.preloader.hide();
    }

    /**
     * Show progress indicator
     * @param {Number} progress Progress percentage (0-100)
     */
    static showProgress(progress) {
        if (!this.app) return;

        this.app.progressbar.show("multi", progress);
    }

    /**
     * Hide progress indicator
     */
    static hideProgress() {
        if (!this.app) return;

        this.app.progressbar.hide("multi");
    }

    // ─────────────────────────────────────────────────────────────────────
    // CHART & GRAPH UI
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update chart data display
     * @param {String} chartElementId Chart container ID
     * @param {Object} data Chart data object
     */
    static updateChart(chartElementId, data) {
        // Chart update handled by chart.js
        // This is a placeholder for potential UI updates
        Logger.log("Chart update triggered");
    }

    /**
     * Clear chart display
     * @param {String} chartElementId Chart container ID
     */
    static clearChart(chartElementId) {
        const element = document.getElementById(chartElementId);
        if (element) {
            element.innerHTML = "";
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // SETTINGS UI
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update settings display values
     * Synchronize UI with actual settings
     */
    static syncSettingsUI() {
        const screenOn = !!SettingsManager.get('screenOn');
        const theme = SettingsManager.get('theme');
        const powerMethod = SettingsManager.get('powerCalcMethod');

        // Update checkboxes
        const screenCheckbox = document.getElementById('keep-screen-setting');
        if (screenCheckbox) {
            screenCheckbox.checked = screenOn;
        }

        // Update selects
        const themeSelect = document.querySelector('select[name="themeChooser"]');
        if (themeSelect) {
            themeSelect.value = theme;
        }

        const powerSelect = document.getElementById('power-calc-method');
        if (powerSelect) {
            powerSelect.value = powerMethod;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // KEYBOARD & FORM HANDLING
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get form field value
     * @param {String} fieldId Field ID
     * @returns {String} Field value
     */
    static getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : "";
    }

    /**
     * Set form field value
     * @param {String} fieldId Field ID
     * @param {String} value Value to set
     */
    static setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    /**
     * Clear form
     * @param {String} formId Form ID
     */
    static clearForm(formId) {
        const form = document.getElementById(formId);
        if (form && form.reset) {
            form.reset();
        }
    }

    /**
     * Validate email input
     * @param {String} email Email address
     * @returns {Boolean} true if valid
     */
    static validateEmail(email) {
        return UtilityHelper.isValidEmail(email);
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACCESSIBILITY
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Set ARIA label for accessibility
     * @param {String} elementId Element ID
     * @param {String} label Aria label text
     */
    static setAriaLabel(elementId, label) {
        const element = document.getElementById(elementId);
        if (element) {
            element.setAttribute("aria-label", label);
        }
    }

    /**
     * Announce message to screen reader
     * @param {String} message Message to announce
     * @param {Boolean} polite Use polite politeness level
     */
    static announceToScreenReader(message, polite = true) {
        const ariaLive = document.querySelector('[aria-live="' + (polite ? 'polite' : 'assertive') + '"]');
        if (ariaLive) {
            ariaLive.textContent = message;
        }
    }
}
