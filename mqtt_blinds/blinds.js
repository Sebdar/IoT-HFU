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
	time: null,
	isClosed: settings.default.isClosed,
	isAuto: settings.default.isAuto,
	outsideTemp : 20,

	force : function (newStatus) {
		this.isClosed = newStatus;
		this.isAuto = false;
		console.log('NOTICE : Deactivating auto-mode');
		client.publish('appliances/blinds', 'auto:off');
		this.publishStatus();
	},
	setAuto : function() {
		this.isAuto = true;
		console.log('NOTICE : Activating auto-mode');
		client.publish('appliances/blinds', 'auto:on');
		this.updateBlinds();
	},
	updateBlinds : function() {
		if(this.isAuto) {
			if((this.outsideTemp >= 28 || this.time == 'night') && !this.isClosed) {
				this.isClosed = true;
				this.publishStatus();
				console.log('NOTICE : Closing blinds');
			}
			if((this.outsideTemp < 28 && this.time == 'day') && this.isClosed) {
				this.isClosed = false;
				this.publishStatus();
				console.log('NOTICE : Opening blinds');
			}
		}
	},
	publishStatus : function() {
		if(this.isClosed) {
			client.publish('appliances/blinds', 'blinds:closed');
			console.log('STATUS : Blinds are closed');
		}
		else {
			client.publish('appliances/blinds', 'blinds:open');
			console.log('STATUS : Blinds are open');
		}
		console.log('NOTICE : Publishing status to broker');
	}
};


var client = mqtt.connect(addr);

var connected = false;

client.on('connect', () => { connected = true;
	console.log('NETWORK : Connected to main server');
})

client.on('message', (topic, message) => {
	console.log('NETWORK : Received package');
	let info = message.toString();
	if(topic == 'local/temperature') {
		status.outsideTemp = parseInt(info, 10);
		console.log('NOTICE : new outside temperature :', status.outsideTemp);
		status.updateBlinds();
	}
	else if(topic == 'local/time') {
		if(info == 'day' || info == 'night') {
			status.time = info;
			console.log('NOTICE : new time :', status.time);
			status.updateBlinds();
		}
		else
			console.log('WARNING : Could not recognize time message');
	}
	else if (topic == 'appliances/force/blinds') {
		if(info == 'blinds:closed')
			status.force(true)
		else if(info == 'blinds:open')
			status.force(false)
		else
			console.log('WARNING : Could not recognize force turn message');
	}
	else if (topic == 'appliances/force/autoblinds') {
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
		client.publish('log/subscriptions', 'Blinds system subscribed to temperature')
		console.log('NETWORK : Successfully subscribed to local/temperature');
	}
});


client.subscribe('local/time', (err, granted) => {
	if(!err) {
		client.publish('log/subscriptions', 'Blinds system subscribed to time')
		console.log('NETWORK : Successfully subscribed to local/time');
	}
})

client.subscribe('appliances/force/blinds');
client.subscribe('appliances/force/autoblinds');
