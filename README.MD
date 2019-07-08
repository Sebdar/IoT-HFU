# Home Automation System

## Introduction

These programs were created as a final project for the elective course "Internet of things Software" at the HFU, campus Schwenningen. It consists of an home automation system interface, which communicates with 3 "modules" : a weather station, connected roller blinds and a connected heating system. The project relies on javascript, both used in the browser and the modules, which run on the node.js runtime.

Many features were added compared to what was expected, but the default configuration (in the different `settings.json`) should fit the instructions.

This project was realised by  Martín Schottlender, Matías Stingl & Sébastien Darche.

## Installation

The project was provided without the node modules. As such, we need to install them on the computer. A simple installation file can be found as installation.sh. Please ensure that node and npm are installed on the computer.
You can also install them manually by going into each folders (`mqtt_blinds`, `mqtt_heating`, `mqtt_weather`, `mqtt_serv`) and using the command `npm install`.

The node_modules folders were not included in order to avoid having a directory that is too heavy (they were .gitignore'd too).

## Technical details

The browser communicated using the HTTP protocol with the main server. The server then relays informations to the various IoT modules using the MQTT protocol, more appropriate for the small data packets used in the Internet of Things.

Please note that it is best to run first the server, then the separate modules.

### Main Server

The main server communicates using both MQTT and HTTP. This is achieved using two libraries, Mosca for the MQTT server and Express to provide static html files as well as a basic REST API. These files can be found under `mqtt_serv/html`.

The REST API provides the following GET routes :

- /status/all : returns a JSON object containing all the current IoT values
- /status/heating
- /status/blinds
- /status/weather

The last 3 send the same JSON object stripped of all the unnecessary informations. Note that these are not used in the `script.js` as it is more practical to get everything given the relatively small size of the data.

It provides the following POST routes :

- /force/heating
- /force/heatingauto
- /force/blinds
- /force/blindsauto

These routes will flip the status of the appliances by telling the server to send a MQTT message to the appropriate channel. The server will then answer with the http code 200 (success).
These features were not requested but added anyways as they seem like an important part of a home automation system.

As a debug method, the server includes a very basic command system : 

- `exit`, `shutdown` or a standard EOF or SIGINT signal (CTRL + D, CTRL + C) will shutdown the server
- `key = value` will modify the key `key` in the internal iotStatus object of the server. This will not have any effect on the MQTT part, it is intended as a debug tool for the http side and REST API.
- `key` will return the current value of `key` in the iotStatus object.


### Weather station

The weather station retrieves every 30 seconds (configurable, under `settings.json`) the current weather informations from the Open Weather Map service. Please mind that, since we use the free version we can't have a refresh rate lower than 1 second. Though the weather station will rectify it to 30 seconds if it finds an incorrect value.
It then sends these informations as JSON objects over the topics `local/temperature`, `local/time` and `local/weather`. The time sent is a string, wether "day" or "night", based on the true sunrise and sunset time retrieved from OWM. The true "time" (UNIX) is also sent in the object.

The forecast is retrieved from OWP as well and represents a 6 hours forecast.

The weather station is not subscribed to any topic, but this could be a part of an update later (for example to shut it off).

### Connected blinds & heating system

These two systems are quite similar. They are subscribed to `local/temperature` (and `local/time` for the blinds) and turn on and off accordingly. New features were also added, to force turn off and on these systems (this disables the auto-mode). They are by default on auto-mode but this can be changed in `settings.json` for each system.
