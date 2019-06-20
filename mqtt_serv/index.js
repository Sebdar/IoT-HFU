var mosca = require('mosca');
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
	'currentWeather': null,
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
var settings = {
	port: 1883,
	host: "localhost",
	persistence: {factory: mosca.persistence.Memory}
};

var server = new mosca.Server(settings);

server.on('clientConnected', (client) => {
	console.log('NETWORK : Client connected :', client.id);
});

server.on('published', (packet, client) => {
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

server.on('ready', () => { console.log('SERVER : Server running');});
