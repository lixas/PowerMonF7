class ChartControl{
    constructor() {
        this.chartObject = '';
        this.data = [
// 			{ y: 2010, v: 10, c: 20, p: 20 },
// 			{ y: 2011, v: 20, c: 15, p: 30 },
// 			{ y: 2012, v: 15, c: 25, p: 37 },
// 			{ y: 2013, v: 25, c: 22, p: 55 },
// 			{ y: 2014, v: 22, c: 30, p: 66 },
// 			{ y: 2015, v: 30, c: 28, p: 44 },
// 			{ y: 2016, v: 28, c: 18, p: 28 },
		];
		
		// Averaging settings
		this.averaging = 1; // Default: no averaging
		this.dataBuffer = {
		    voltage: [],
		    current: [],
		    power: [],
		    timestamps: []
		};
    }
    
        // PRIVATE
    renderOnScreen = (element) => {
        this.chartObject = new Chart(element, {
			type: 'line',
			data: {
				// labels: this.data.map(row => row.y),
			    labels: [],
				datasets: [
					{
						label: 'Voltage',
				// 		data: this.data.map(row => row.v),
						data: [],
						yAxisID: 'left-y-axis-1',
						pointStyle: false,
					},
					{
						label: 'Current',
				// 		data: this.data.map(row => row.c),
						data: [],
			            yAxisID: 'left-y-axis-2',
						pointStyle: false,
					},
					{
						label: 'Power',
				// 		data: this.data.map(row => row.p),
						data: [],
						yAxisID: 'right-y-axis-1',
						type: 'line',
					}
				]
			},
			options: {
			    // chart should be responsive and resize when the browser does.
				responsive: true,
				// maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
				maintainAspectRatio: true,
				plugins: {
				    decimation: {
                        algorithm: 'lttb',
                        enabled: true,
                        samples: 3,
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    tooltip: {
                        position : 'nearest'
				    }
				},
				elements: {
				    line: {
				        tension: 0.4,
				    },
				},
				scales: {
					'left-y-axis-1': {
						type: 'linear',
						position: 'left',
						// min: 0,
						title: {
							display: true,
							text: 'Voltage'
						},
					},
					'left-y-axis-2': {
						type: 'linear',
						position: 'left',
						// min: 0,
						title: {
							display: true,
							text: 'Current'
						},
					},
					'right-y-axis-1': {
						type: 'linear',
						position: 'right',
						title: {
							display: true,
							text: 'Power'
						},
					}
				}
			},
		});
    };
    
    dataAdd = (vol, cur, pwr) => {
        
        const d = new Date();
        const hour = addZero(d.getHours());
        const min = addZero(d.getMinutes());
        const sec = addZero(d.getSeconds());
        const timestamp = hour+':'+min+':'+sec;
        

        if(this.chartObject){
            // Add new data to buffer
            this.dataBuffer.voltage.push(vol);
            this.dataBuffer.current.push(cur);
            this.dataBuffer.power.push(pwr);
            this.dataBuffer.timestamps.push(timestamp);
            
            // Keep only the last 'averaging' number of points in buffer
            if (this.dataBuffer.voltage.length > this.averaging) {
                this.dataBuffer.voltage.shift();
                this.dataBuffer.current.shift();
                this.dataBuffer.power.shift();
                this.dataBuffer.timestamps.shift();
            }
            
            // Calculate averages
            const avgVoltage = this.calculateAverage(this.dataBuffer.voltage);
            const avgCurrent = this.calculateAverage(this.dataBuffer.current);
            const avgPower = this.calculateAverage(this.dataBuffer.power);
            
            // Add averaged data to chart
            this.chartObject.data.labels.push(timestamp);
            this.chartObject.data.datasets[0].data.push(avgVoltage);
            this.chartObject.data.datasets[1].data.push(avgCurrent);
            this.chartObject.data.datasets[2].data.push(avgPower);
            
            this.chartObject.update();
            
            // if (this.chartObject.data.labels.length > window.settings.chart.duration){
            //     this.chartObject.data.labels.shift()
            //     for (let i = 0; i < this.chartObject.data.datasets.length; ++i) {
            //         this.chartObject.data.datasets[i].data.shift()
            //     }
            // }
        }
    

    };
    
    // Add data with custom timestamp (for historical data)
    dataAddWithTime = (vol, cur, pwr, timeStr) => {
        if(this.chartObject){
            // For historical data, add without averaging
            this.chartObject.data.labels.push(timeStr);
            this.chartObject.data.datasets[0].data.push(vol);
            this.chartObject.data.datasets[1].data.push(cur);
            this.chartObject.data.datasets[2].data.push(pwr);
        }
    };
    
    // Force chart update (call after batch loading)
    forceUpdate = () => {
        if(this.chartObject){
            this.chartObject.update('none'); // 'none' for no animation
        }
    };
    
    dataClear = () => {
        if (this.chartObject) {
            this.chartObject.data.labels = []
            for (let index = 0; index < this.chartObject.data.datasets.length; ++index) {
              this.chartObject.data.datasets[index].data = [];
            }
            this.chartObject.update('none');
        }
    };
    
    calculateAverage = (arr) => {
        if (arr.length === 0) return 0;
        const sum = arr.reduce((acc, val) => acc + val, 0);
        return sum / arr.length;
    };
    
    setAveraging = (level) => {
        this.averaging = parseInt(level) || 1;
        // Clear the buffer when changing averaging level
        this.dataBuffer = {
            voltage: [],
            current: [],
            power: [],
            timestamps: []
        };
    };
    
    destroy = () => {
        this.chartObject.destroy()
    };

}
