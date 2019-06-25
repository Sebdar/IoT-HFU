//Dependencies
var mqtt = require('mqtt');
var fs = require('fs');
var fetch = require('node-fetch');

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
var APILink = settings.apiURL;
var APILinkForecast = settings.apiURLForecast;
if(settings.refreshInterval < 1000) {
	console.log("WARNING : Specified refresh rate is too low for the API (we took the free version because we're cheap")
	console.log("Restablishing refresh rate to 30000 ms");
	settings.refreshInterval = 30000;
}

var status = {
	time: { 
		currTime: null, //Will be a string, day or night
		timeUnix: null //Will contain the Unix time
	},
	weather: {
		currWeather: null, //A string containing the weather overview
		windSpeed: null, //A number
		relHumidity: null, //A number
		forecastWeather: null //A string
	},
	temperature: {
		temperature: null,
	},


	updateWeather: function() {
		
		var pr1 = fetch(APILink)
		  .then(response => response.json())
		 pr1.then(function(newWeather) {
			status.time.timeUnix = newWeather.dt;
			status.temperature.temperature = newWeather.main.temp;
			status.weather.currWeather = newWeather.weather[0].description;
			status.weather.relHumidity = newWeather.main.humidity;
			status.weather.windSpeed = newWeather.wind.speed * 3.6;

			
			//Asserting if it is night or day, based on real sunrise and sunset time
			if(status.time.timeUnix < newWeather.sys.sunset && status.time.timeUnix > newWeather.sys.sunrise) {
				status.time.currTime = 'day';
			}
			else {
				status.time.currTime = 'night'; 
			}

		
		}).catch(err => {console.log(err)});
		pr1.catch(err => {console.log(err)});

		//Retrieving forecast
		var pr1 = fetch(APILinkForecast)
		  .then(response => response.json())
		 pr1.then(function(forecast) {
			//console.log(forecast);
			status.weather.forecastWeather = forecast.list[2].weather[0].description;
		
		}).catch(err => {console.log(err)});
		pr1.catch(err => {console.log(err)});	

		status.publishStatus();	
	
	},
	publishStatus : function() {
		console.log('NOTICE : Publishing status to broker');
		client.publish('local/temperature', JSON.stringify(this.temperature));
		client.publish('local/time', JSON.stringify(this.time));
		client.publish('local/weather', JSON.stringify(this.weather));
	}
};


var client = mqtt.connect(addr);

var connected = false;

client.on('connect', () => { connected = true;
	console.log('NETWORK : Connected to main server');

	//Setting up the status updater
	setInterval(status.updateWeather, settings.refreshInterval); 
});


//The weather station doesn't need to subscribe to any topic
