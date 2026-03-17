const SettingsManager = {
    defaults: {
        screenOn : 0,   // keep screen on while connected
        theme: "auto", // options: light, dark, auto
        chart: {
            duration: 300, // in seconds
            averaging: 1, // moving average window (1 = no averaging)
            timeRange: 'live', // time range selection (live, 1h, 3h, 6h, 12h, 24h, 7d, 30d)
        },
        powerCalcMethod: "measured", // options: measured, VA = Volts*Amps, VAPF = Volts*Amps*PowerFact
        language: "en",
    },
    
    current: {},
    
    init: function() {
        this.load();
    },
    
    load: function() {
        const saved = app.ReadFile("app_settings.json");
        this.current = saved ? JSON.parse(saved) : { ...this.defaults };
    },
    
    save: function() {
        app.WriteFile("app_settings.json", JSON.stringify(this.current));
    },
    
    get: function(key) {
        return this.current[key];
    },
    
    // set: function(key, value) {
    //     this.current[key] = value;
    //     this.save();
    // },
    set: function(key, value) {
        const keys = key.split('.');
        let obj = this.current;
        
        // Traverse to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            obj[k] = obj[k] || {};
            obj = obj[k];
        }
        
        // Set the value at the final key
        obj[keys[keys.length - 1]] = value;
        this.save();
    },
    
    getAll: function() {
        return { ...this.current };
    },

    reset: function() {
        this.current = { ...this.defaults };
        this.save();
    }
};

// Initialize when app starts
SettingsManager.init();