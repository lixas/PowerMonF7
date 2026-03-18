class ProtocolParser{
    constructor() {
        this.deviceType = "";
        this.deviceTypeDescription = "";

    }

    // parse uart string, different for USB and Mains type devices
    // PUBLIC
    ParseUartData = (bfr) => {
        
        this.deviceType = bfr.substring(6, 8)
        
        if(this.deviceType == "03") {        // usb tester
            this.deviceTypeDescription = "USB"
            return this._ParseUSB(bfr)
        }
        
        if(this.deviceType == "01") {        // mains power
            this.deviceTypeDescription = "Mains"
            return this._ParseMains(bfr)
        }

    };
    
    getDeviceType = () => {
        return this.deviceType
    };
  
    getDeviceTypeDescription = () => {
        return this.deviceTypeDescription
    };

    // PRIVATE
    _ParseUSB = (bfr) => {
        var meter       = [];

        meter.Vol       = parseInt(bfr.substring( 8, 14), 16)/100
        meter.Cur       = parseInt(bfr.substring(14, 20), 16)/100
        meter.Pwr       = parseFloat((meter.Vol * meter.Cur).toFixed(3))
        meter.Cap       = parseInt(bfr.substring(20, 26), 16)
        meter.Ene       = parseInt(bfr.substring(26, 34), 16)/100
        meter.DMinus    = parseInt(bfr.substring(34, 38), 16)/100
        meter.DPlus     = parseInt(bfr.substring(38, 42), 16)/100
        meter.Price     = null
        meter.Cost      = null
        meter.Freq      = null
        meter.PowFact   = null
        meter.Temp      = parseInt(bfr.substring(44, 46), 16)
        let hour        = addZero(parseInt(bfr.substring(48, 50), 16))
        let minute      = addZero(parseInt(bfr.substring(50, 52), 16))
        let second      = addZero(parseInt(bfr.substring(52, 54), 16))
        meter.Time      = this._formatString("{0}:{1}:{2}", hour, minute, second)

        return meter
    };

    // PRIVATE
    _ParseMains = (bfr) => {
        var meter       = [];

        meter.Vol       = parseInt(bfr.substring( 8, 14), 16)/10
        meter.Cur       = parseInt(bfr.substring(14, 20), 16)/1000
        meter.Pwr       = parseInt(bfr.substring(20, 26), 16)/10
        meter.Cap       = null
        meter.Ene       = parseInt(bfr.substring(26, 34), 16)/100
        meter.DMinus    = null
        meter.DPlus     = null
        meter.Price     = parseInt(bfr.substring(34, 40), 16)/100
        meter.Cost      = parseFloat((meter.Price * meter.Ene).toFixed(3))
        meter.Freq      = parseInt(bfr.substring(40, 44), 16)/10
        meter.PowFact   = parseInt(bfr.substring(44, 48), 16)/1000
        meter.Temp      = parseInt(bfr.substring(50, 52), 16)
        let hour        = addZero(parseInt(bfr.substring(52, 56), 16))
        let minute      = addZero(parseInt(bfr.substring(56, 58), 16))
        let second      = addZero(parseInt(bfr.substring(58, 60), 16))
        meter.Time      = this._formatString("{0}:{1}:{2}", hour, minute, second)

        return meter
    };

    // PRIVATE
    _formatString = (template, ...args) => {
        return template.replace(/{([0-9]+)}/g, function (match, index) {
            return typeof args[index] === 'undefined' ? match : args[index];
        });
    };

    
}