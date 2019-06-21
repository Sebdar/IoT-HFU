
document.addEventListener("DOMContentLoaded", main); //Waits for the html page to be parsed, then launches the main function

function main() {
    console.log('DOM was created, starting connection with API');
    
    elements ={
        temperature: document.getElementById("outsideTemp"),
        heaterStatus: document.getElementById("heaterStatus"),
        blindsStatus: document.getElementById("blindsStatus"),
        blindsStatus2: document.getElementById("blindsStatus2"),
        powerCons: document.getElementById("powerCons"),
        heaterAction: document.getElementById("heaterAction"),
        heaterAuto: document.getElementById("heaterAuto"),
        insideTemp: document.getElementById("insideTemp"),
        heaterCons: document.getElementById("heaterCons"),
        relHumidity: document.getElementById("relHumidity"),
        currWeather: document.getElementById("currWeather"),
        windSpeed: document.getElementById("windSpeed"),
        forecastWeather: document.getElementById("forecastWeather"),
        blindsAction: document.getElementById("blindsAction"),
        blindsAuto: document.getElementById("blindsAuto"),
        currTime: document.getElementById("currTime")
    };

    buttons = {
        heaterAction: document.getElementById("heatOn"),
        heaterAuto: document.getElementById("autoHeat"),
        blindsAction: document.getElementById("blindsOn"),
        blindsAuto: document.getElementById("autoBlinds")
    };
    
    buttons.heaterAction.addEventListener("click", function() {changeStatus("heating")});
    buttons.heaterAuto.addEventListener("click", function() {changeStatus("heatingauto")});
    buttons.blindsAction.addEventListener("click", function() {changeStatus("blinds")});
    buttons.blindsAuto.addEventListener("click", function() {changeStatus("blindsauto")});

    //Initial update
    updateAll();

    //Retrieving all informations from server every 15 seconds
    setInterval(updateAll, 15000);
}

async function updateAll() {
    console.log('Retrieving data from server ..');
    try {
    var receive = await fetch('./status/all');
    var newStatus = await receive.json();
    
    } catch(e) { console.log('ERROR API : ', e);}


    for(var key of Object.keys(elements)) {
        if(typeof(newStatus[key]) !== 'undefined') {
            console.log('Modifying ', key, ' to ', newStatus[key])

            elements[key].innerHTML = newStatus[key];
        }
    }
    elements.blindsStatus2.innerHTML = newStatus["blindsStatus"];

    //Handling buttons status message
    if(newStatus.heaterStatus == "on") {
        elements.heaterAction.innerHTML = "off";
    }
    else if(newStatus.heaterStatus == "off"){
        elements.heaterAction.innerHTML = "on";
    }


    if(newStatus.heaterAuto == "on") {
        elements.heaterAuto.innerHTML = "off";
    }
    else if(newStatus.heaterAuto == "off") {
        elements.heaterAuto.innerHTML = "on";
    }

    if(newStatus.blindsStatus == "open") {
        elements.blindsAction.innerHTML = "closed";
    }
    else if(newStatus.blindsStatus == "closed"){
        elements.heaterAction.innerHTML = "open";
    }


    if(newStatus.blindsAuto == "on") {
        elements.blindsAuto.innerHTML = "off";
    }
    else if(newStatus.blindsAuto == "off") {
        elements.blindsAuto.innerHTML = "on";
    }

    console.log('Done!');
}

async function changeStatus(route) {
    console.log('Asking the server to change status : ', route);
    try {
        var receive = await fetch('./force/'+route, { method:"POST"});
        
        if(receive.status == 200) {
            console.log('Successful!');
        } else {
            console.log('HTTP Error : code', receive.status);
        }
        setTimeout(updateAll, 100);
            
    } catch(e) { console.log('ERROR API : ', e);}

    
}