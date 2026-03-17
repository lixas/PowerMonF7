class PowerMeterSimulator{
    constructor() {
        
        this.parser = new ProtocolParser()
        this.onData = false

        this.sim = {}
        this.sim.Active = false
        this.sim.Voltage = 5
        this.sim.Current = 2
        this.sim.Power = 0
        this.sim.Capacity = 0
        this.sim.Energy = 0
        this.sim.Temp = 23
        this.sim.TempChange = 0.1
        this.sim.Time = 0
        // this.meterHistory = new FixedLenArray(pageSettings.getChartDuration())
        this.meterHistory = new FixedLenArray(60)
    }

    //stop simulation
    Stop = () => {
        this.sim.Active = false
    }
    
    //start simulation
    Start = () => {
        this.sim.TimeStarted = Date.now()
        this.sim.Active = true
        this._Simulate()
    }
    
    //stop simulation
    Status = () => {
        return this.sim.Active
    }
    
    ResetTime = () => {
        this.sim.TimeStarted = Date.now()
    }
    
    ResetEnergy = () => {
        this.sim.Energy = 0
    }
    
    ResetCapacity = () => {
        this.sim.Capacity = 0
    }
    
    
    // simulate values
    _Simulate = () => {
        var StepStarted = performance.now()
        function decimalToHex(d, padding) {
            var hex = Number(d).toString(16);
            padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
            while (hex.length < padding) {
                hex = "0" + hex;
            }
            return hex.toUpperCase();
        }
        // Voltage
        this.sim.Voltage = (Math.floor(Math.random() * (600 - 400 + 1)) + 400)/100;

        // Current
        this.sim.Current = (Math.floor(Math.random() * (220 - 180 + 1)) + 180)/100;
        
        // Power
        this.sim.Power = this.sim.Voltage * this.sim.Current
        
        // Capacity
        this.sim.Capacity += this.sim.Current*1000/3600
        
        // Energy
        this.sim.Energy += ( this.sim.Power / 36 )
        
        // time hour
        var s = Date.now() - this.sim.TimeStarted
        
        var hour = new Date(s).toISOString().substr(11, 2);
        var minute = new Date(s).toISOString().substr(14, 2);
        var secod = new Date(s).toISOString().substr(17, 2);
        
        var UART = ["FF", "55",  "01", "03",
            ...decimalToHex(parseInt(this.sim.Voltage*100), 6).match(/.{1,2}/g),    // voltage
            ...decimalToHex(parseInt(this.sim.Current*100), 6).match(/.{1,2}/g),    // current
            ...decimalToHex(parseInt(this.sim.Capacity), 6).match(/.{1,2}/g),       // capacity
            ...decimalToHex(parseInt(this.sim.Energy), 8).match(/.{1,2}/g),         // energy
            ...decimalToHex(parseInt(0), 14).match(/.{1,2}/g),                      // d- d+ and space
            
            ...decimalToHex(parseInt(hour), 2).match(/.{1,2}/g),            // time
            ...decimalToHex(parseInt(minute), 2).match(/.{1,2}/g),          // time
            ...decimalToHex(parseInt(secod), 2).match(/.{1,2}/g),           // time
            
        ]

        var parsed = this.parser.ParseUartData(UART.join(""), "03")
        this.onData(parsed)
        // this.addItemToChartHistory(parsed)
        // this.controller.displayDataOnScreen(parsed)
        // webapp.emit('DataPageReady', {Vol: 17})
        
        if(this.sim.Active)
            setTimeout(this._Simulate, 1000 - (performance.now() - StepStarted))
        else    // clean history
            this.meterHistory.clean()
    }
}

class FixedLenArray{
    constructor(len) {
        /*
        infinite size if len=0
        */
        this.maxLen = len
        this.arr = []
    }

    _trimHead = () => {            // private
        if( this.lenArray >= this.maxLen && this.maxLen > 0 ){
            this.arr.shift()
        }
    }

    addItem = (num) => {
        this._trimHead()
        this.arr.push(num)
    }

    avg = (acc=2) => {
        sum = 0
        if (this.lenArray == 0){
            return false
        }

        let sum = 0;
        
        for (let i = 0; i < this.lenArray; i++) {
            sum += this.arr[i];
        }
        
        return round(sum / this.lenArray, 2)
    }

    clean = () => {
        this.arr = []
    }

    minItem = () => {
        try {
            return Math.min(this.arr)
        }
        catch (error){
            //pass
        }

    }
    
    maxItem = () => {
        try {
            return Math.max(this.arr)
        }
        catch (error){
            //pass
        }
    }
    
    get lenArray() {
        return this.arr.length
    }
    
    get data(){
        return this.arr
    }
    
    resize = (len) =>{
        this.maxLen = len
        this.arr = this.arr.slice(-1*len)
    }
}