//Dependencies
var mqtt = require('mqtt');
var fs = require('fs');

//Loading settings
var settingsFil = fs.readFileSync("./settings.json");

try {
	var settings = JSON.parse(settingsFil);
}
catch(e) {
	console.error("ERROR : Could not parse JSON Settings file! :"+e);
	process.exit();
}

var addr = 'mqtt://'+settings.addr+':'+settings.port;
console.log("Connecting to "+addr);

var status = {
	outsideTemp: settings.default.outsideTemp,
	insideTemp: settings.default.insideTemp,
	isOn: settings.default.isOn,
	powerCons: settings.default.powerCons,
	isAuto: settings.default.isAuto,

	force : function (newStatus) {
		this.isOn = newStatus;
		this.isAuto = false;
		console.log('NOTICE : Deactivating auto-mode');
		client.publish('appliances/heating', 'auto:off');
		this.publishStatus();
	},
	setAuto : function() {
		this.isAuto = true;
		console.log('NOTICE : Activating auto-mode');
		client.publish('appliances/heating', 'auto:on');
		this.updateHeating();
	},
	updateHeating : function() {
		if(this.isAuto) {
			if(this.outsideTemp < 20 && !this.isOn) {
				this.isOn = true;
				this.publishStatus();
				console.log('NOTICE : Heater turning on');
			}
			if(this.outsideTemp >= 20 && this.isOn) {
				this.isOn = false;
				this.publishStatus();
				console.log('NOTICE : Heater turning off');
			}
		}
	},
	publishStatus : function() {
		if(this.isOn) {
			client.publish('appliances/heating', 'heating:on');
			console.log('STATUS : Heating is on');
		}
		else {
			client.publish('appliances/heating', 'heating:off');
			console.log('STATUS : Heating is off');
		}
		//client.publish('heating/insidetemp', status.insideTemp);
		console.log('NOTICE : Publishing status to broker');
	},

	//The following formulas for the power consumption and inside temperature
	//are completely arbitrary, and should not represent any physical value.
	//They are placeholders for the "true" values obtained through the
	//hardware part, which is not studied in this course.
	updatePower : function() {
		if(status.isOn) {
			status.powerCons = Math.random * 200 + 800;
			//So as to get a power consumption such as
			//P ~ U([800, 100]) uniform distribution
		} else {
			status.powerCons = 0;
		}
		client.publish('heating/powercons', status.powerCons.toString());
		//Note that if the number is not converted to a string,
		//the client will send an empty string if powerCons==0
	},

	updateInsideTemp : function() {
		if(status.isOn) {
			status.insideTemp = status.outsideTemp + 2;
		} else {
			status.insideTemp = status.outsideTemp;
		}
		client.publish('heating/insidetemp', status.insideTemp.toString());
	}
};



var client = mqtt.connect(addr);

var connected = false;

client.on('connect', () => { connected = true;
	console.log('NETWORK : Connected to main server');
	if(settings.automatePower) {
		setInterval(status.updatePower, settings.updateInterval);
	}
	if(settings.automateInsideTemp) {
		setInterval(status.updateInsideTemp, settings.updateInterval);
	}
})

client.on('message', (topic, message) => {
	console.log('NETWORK : Received package');
	let info = message.toString();
	if(topic == 'local/temperature') {
		status.outsideTemp = parseInt(info, 10);
		console.log('NOTICE : new outside temperature :', status.outsideTemp);
		status.updateHeating();
	}
	else if (topic == 'appliances/force/heating') {
		if(info == 'heating:on')
			status.force(true)
		else if(info == 'heating:off')
			status.force(false)
		else
			console.log('WARNING : Could not recognize force turn message');
	}
	else if (topic == 'appliances/force/autoheat') {
		if(info == 'auto:off') {
			status.isAuto = false;
		}
		else if(info == 'auto:on') {
			status.setAuto();
		}
		else
			console.log('WARNING : Could not recognize force autoheat message');

	}
	else
		console.log('WARNING : Could not identify topic : ', topic);
});

client.subscribe('local/temperature', (err, granted) => {
	if(!err) {
		client.publish('log/subscriptions', 'Heating system subscribed to temperature')
		console.log('NETWORK : Successfully subscribed to local/temperature');
	}
});

client.subscribe('appliances/force/heating');
client.subscribe('appliances/force/autoheat');