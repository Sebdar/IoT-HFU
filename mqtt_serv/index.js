const mosca = require('mosca');
const express = require('express');
const fs = require('fs');
var httpServer = express();

//For settings file
var settingsFil = fs.readFileSync("./settings.json");

try {
	var settings = JSON.parse(settingsFil);
}
catch(e) {
	console.error("ERROR : Could not parse JSON Settings file! :"+e);
	process.exit();
}

//For internal server commands
const readline = require('readline');
const regexCommand = /^[a-zA-Z]+ = [a-z0-9]+$/;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var iotStatus = {

	'temperature': null,
	'heaterStatus': null,
	'blindsStatus': null,
	'powerCons': null,
	'heaterAuto': null,
	'insideTemp': null,
	'heaterCons': null,
	'relHumidity': null,
	'currWeather': null,
	'windSpeed': null,
	'forecastWeather': null,
	'blindsAuto': null,
	'currTime': null,
	'timeUnix': null
}


rl.on('line', (input) => {
	if(input == 'exit' || input == 'shutdown')
	{
		rl.close();
	} else if(regexCommand.test(input)) {
		//If a command is recognized
		//These commands are a debug method for the frontend js
		//and have no actions on the mqtt network
		let command = input.split(' ');
		let key = command[0];
		let value = command[2];
		if(key in iotStatus) {
			iotStatus[key] = value;
			console.log('NOTICE : Internal value changed');
		}
		else {
			console.log('WARNING : key '+key+' could not be recognized!');
		}

	} else if(input in iotStatus) {
		console.log('INFO : Current value of ', input, ' : ', iotStatus[input]);
	}
	else {
		console.log('WARNING : command could not be recognized!');
	}
});
rl.on('close', () => {	
	console.log('SERVER : Received exit signal, shutting down');
	rl.close();
	process.exit();
});




//MQTT Server
settings.mqtt.persistence = {factory: mosca.persistence.Memory}; //Default persistence settings
var mqttServer = new mosca.Server(settings.mqtt);

mqttServer.on('clientConnected', (client) => {
	console.log('NETWORK : Client connected :', client.id);
});

mqttServer.on('published', (packet, client) => {
	console.log('NETWORK : Published :', packet.payload.toString(), 'on topic', packet.topic);
	//Message processing
	
	try  {
		transmitted = JSON.parse(packet.payload.toString());

		for(var key of Object.keys(transmitted)) {
			if(Object.keys(iotStatus).includes(key)) {
				iotStatus[key] = transmitted[key];
				console.log('STATUS : Modified '+key);
			}
			else {
				console.log('WARNING : received key '+key+' could not be recognized!');
			}
		}
	}

	catch(err) {
		console.log('NOTICE : Could not parse JSON packet, may not be an IoT status message');
	}
	
});

mqttServer.on('ready', () => { console.log('MQTT SERVER : Server running');});


//HTTP Server
httpServer.use(express.static(settings.http.static));
httpServer.listen(settings.http.port);


// GET METHODS


httpServer.get('/status/all', (req, res) => {
	console.log('HTTP SERVER : sending status to ', req.ip);

	//Completely arbitrary value
	iotStatus.powerCons = (iotStatus.heaterCons + 100)  * 1.5;
	iotStatus.powerCons = iotStatus.powerCons.toFixed(1);
	
	res.status(200);
	return res.json(iotStatus);
});

httpServer.get('/status/heating', (req, res) => {
	console.log('HTTP SERVER : sending heater status to ', req.ip);

	let heatingStatus = {
		insideTemp : iotStatus.insideTemp,
		heaterAuto : iotStatus.heaterAuto,
		heaterStatus : iotStatus.heaterStatus
	}

	//Completely arbitrary value
	heatingStatus.heaterCons = (iotStatus.heaterCons + 100)  * 1.5;
	heatingStatus.heaterCons = heatingStatus.heaterCons.toFixed(1);
	
	res.status(200);
	return res.json(heatingStatus);
});

httpServer.get('/status/blinds', (req, res) => {
	console.log('HTTP SERVER : sending blinds status to ', req.ip);

	let blindsStatus = {
		blindsAuto : iotStatus.blindsAuto,
		blindsStatus : iotStatus.blindsStatus,
	}

	res.status(200);
	return res.json(blindsStatus);
});

httpServer.get('/status/weather', (req, res) => {
	console.log('HTTP SERVER : sending weather to ', req.ip);

	let weather = {
		currTime : iotStatus.currTime,
		currWeather : iotStatus.currWeather,
		windSpeed : iotStatus.windSpeed,
		relHumidity : iotStatus.relHumidity,
		forecastWeather : iotStatus.forecastWeather,
		temperature : iotStatus.temperature
	}

	res.status(200);
	return res.json(weather);
});


// POST METHODS


httpServer.post('/force/heating', (req, res) => {
	console.log('HTTP SERVER : received request to change heater status');
	let message = {topic: 'appliances/force/heating'};
	if(iotStatus.heaterStatus == "on") {
		message.payload = 'heating:off';
	} else if(iotStatus.heaterStatus == 'off') {
		message.payload = 'heating:on';
	} else {
		console.log('ERROR : Could not recognise message!');
		message.payload = 'error';
	}
	res.status(200);
	res.send();
	mqttServer.publish(message);
});
httpServer.post('/force/heatingauto', (req, res) => {
	console.log('HTTP SERVER : received request to change heater auto mode');
	let message = {topic: 'appliances/force/autoheat'};
	if(iotStatus.heaterAuto == "on") {
		message.payload = 'auto:off';
	} else if(iotStatus.heaterAuto == 'off') {
		message.payload = 'auto:on';
	} else {
		console.log('ERROR : Could not recognise message!');
		message.payload = 'error';
	}
	res.status(200);
	res.send();
	mqttServer.publish(message);
});
httpServer.post('/force/blinds', (req, res) => {
	console.log('HTTP SERVER : received request to change heater status');
	let message = {topic: 'appliances/force/blinds'};
	if(iotStatus.blindsStatus == "closed") {
		message.payload = 'blinds:open';
	} else if(iotStatus.blindsStatus == 'open') {
		message.payload = 'blinds:closed';
	} else {
		console.log('ERROR : Could not recognise message!');
		message.payload = 'error';
	}
	res.status(200);
	res.send();
	mqttServer.publish(message);
});
httpServer.post('/force/blindsauto', (req, res) => {
	console.log('HTTP SERVER : received request to change heater auto mode');
	let message = {topic: 'appliances/force/autoblinds'};
	if(iotStatus.blindsAuto == "on") {
		message.payload = 'auto:off';
	} else if(iotStatus.blindsAuto == 'off') {
		message.payload = 'auto:on';
	} else {
		console.log('ERROR : Could not recognise message!');
		message.payload = 'error';
	}
	res.status(200);
	res.send();
	mqttServer.publish(message);
});