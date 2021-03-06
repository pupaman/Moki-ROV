//
// Copyright (c) 2015, Eric van Dijken <eric@team-moki.nl>
//

var version = "0.2.1";

var express = require('express');
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var shell = require("shelljs");

//
// Fetch configuration
//
try {
    var config = require('./config');
} catch (err) {
    console.log("Missing or corrupted config file.");
    console.log("Have a look at config.js.example if you need an example.");
    console.log("Error: "+err);
    process.exit(-1);
}

//
// imudata, is used for storing data from RTIMUlibDrive
//
var imudata = {
        time: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        status: 0
  };

//
// rovdata, is used for sending data to the webbrowser
//
var rovdata = {
	heading: 0,
	pitch: 0,
	roll: 0,
	mbar: 0,
	temp: 0,
        volt: 0,
        current: 0,
	lights: false,
	motor: false,
	mpu9150: false,
	ms5803: false,
	mcp3424: false,
	pca9685: false,
	hover: false
  };

//
// Some local status variables
//
var power = 0;
var hoverset = 0;
var hoveractive = false;
var lightsactive = false;
var lightsonce = false;
var motoractive = false;
var motoronce = false;

// I2C
var i2c = require('i2c');

// Check I2C devices
var wire = new i2c(config.sensor.PCA9685.addr, {device: config.i2c.device}); 
function i2c_sensor_check(obj) {
var arr = wire.scan(function(err, data) {
  // result contains an array of addresses
  });
  for(var i=0; i<arr.length; i++) {
      if (arr[i] == obj) {
         return true;
      }
  }
}

config.sensor.PCA9685.scan = i2c_sensor_check(config.sensor.PCA9685.addr);
if (config.sensor.PCA9685.scan) {
  rovdata.pca9685 = true;
  var makePwm = require("adafruit-pca9685" );
  var pwm = makePwm({"address": config.sensor.PCA9685.addr, "device": config.i2c.device, "freq": 50, "debug": false});
} else {
  rovdata.pca9685 = false;
  console.log("PCA9685 Not found, disabled!");
}

config.sensor.MPU9150.scan = i2c_sensor_check(config.sensor.MPU9150.addr);
var PORT = 32000;
var HOST = '127.0.0.1';
var dgram = require('dgram');
var imuserver = dgram.createSocket('udp4');
if (config.sensor.MPU9150.scan) {
  rovdata.mpu9150 = true;
//  var mpu9150 = require("mpu9150");
//  var imu = new mpu9150();
//  imu.initialize();
} else {
  rovdata.mpu9150 = false;
  console.log("MPU9150 Not found, disabled!");
}

config.sensor.MS5803.scan = i2c_sensor_check(config.sensor.MS5803.addr);
if (config.sensor.MS5803.scan) {
  rovdata.ms5803 = true;
  var makeMS5803 = require("ms5803_rpi" );
  var ms5803 = new makeMS5803({address: config.sensor.MS5803.addr, device: config.i2c.device });
} else {
  rovdata.ms5803 = false;
  console.log("MS5803 Not found, disabled!");
}

config.sensor.MCP3424.scan1 = i2c_sensor_check(config.sensor.MCP3424.addr1);
if (config.sensor.MCP3424.scan1) {
  rovdata.mcp3424 = true;
  var mcp3424 = require('mcp3424');
  var gain = 0; //{0,1,2,3} represents {x1,x2,x4,x8}
  var resolution = 3; //{0,1,2,3} and represents {12,14,16,18} bits
  var mcp = new mcp3424(config.sensor.MCP3424.addr1, gain, resolution, config.i2c.device);
} else {
  rovdata.mcp3424 = false;
  console.log("MCP3424 Not found, disabled!");
}

/* Server config */
app.set("ipaddr", config.network.ip_address);
app.set("port", config.network.port);
app.set("views", __dirname + "/views");
app.use(express.static("public", __dirname + "/public"));
app.get("/", function(request, response) {
	res.sendfile('index.html');
});

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

// As we are currently using RTIMUlib... we skip this.
var update_mpu9150 = function(rovdata){
/*
  imudata.acc_x = imu.getAccelerationX();
  imudata.acc_y = imu.getAccelerationY();
  imudata.acc_z = imu.getAccelerationZ();
  imudata.rot_x = imu.getRotationX();
  imudata.rot_y = imu.getRotationY();
  imudata.rot_z = imu.getRotationZ();
  imudata.mag_x = imu.getHeadingX();
  imudata.mag_y = imu.getHeadingY();
  imudata.mag_z = imu.getHeadingZ();
//  imudata = imu.getMotion9();
//  console.log(imudata);
*/
  return rovdata;
};

var update_mcp3424 = function(rovdata) {

  var volt_raw = mcp.getMv(0);
  var amp_raw = mcp.getMv(1);

//  console.log("Volt: "+volt_raw/21);
//  console.log("Amp: "+amp_raw/(4096*79));

  rovdata.volt = Math.floor(volt_raw/21*100)/100;
// VFinal = VRaw/49.44; //45 Amp board
//VFinal = VRaw/12.99; //90 Amp board
//VFinal = VRaw/12.99; //180 Amp board  
  rovdata.current = Math.floor(amp_raw/(4096*79)*100)/100;
//IFinal = IRaw/14.9; //45 Amp board
//IFinal = IRaw/7.4; //90 Amp board
//IFinal = IRaw/3.7; //180 Amp board

//console.log(mcp.getMv(0)); //for channel 0
//console.log(mcp.getMv(1)); //for channel 1

return rovdata;
};


var update_ms5803 = function(rovdata){
//  console.log('update ms5803, begin');
   ms5803.read(function (err, data) {
//    console.log('update ms5803'+data);
    rovdata.temp = data.temperature;
    rovdata.mbar = data.pressure;
  });
//  console.log('update ms5803, end');
  return rovdata;
};

var servo = function(channel, position) {

// Lets set some default values
   var servoStop = 350;
   var servoMin = 200;
   var servoMax = 500;
   var BRAKE_ESC = false;
   var movement = 0;
 
   if (config.esc.engine_1.channel == channel) { 
	servoStop =  config.esc.engine_1.neutral;
	servoMin  =  config.esc.engine_1.min;
	servoMax  =  config.esc.engine_1.max;
	BRAKE_ESC =  config.esc.engine_1.brake;
	lastdir   =  config.esc.engine_1.last;
	}

   if (config.esc.engine_2.channel == channel) { 
	servoStop =  config.esc.engine_2.neutral;
	servoMin  =  config.esc.engine_2.min;
	servoMax  =  config.esc.engine_2.max;
	BRAKE_ESC =  config.esc.engine_2.brake;
	lastdir   =  config.esc.engine_2.last;
	}

   if (config.esc.engine_3.channel == channel) { 
	servoStop =  config.esc.engine_3.neutral;
	servoMin  =  config.esc.engine_3.min;
	servoMax  =  config.esc.engine_3.max;
	BRAKE_ESC =  config.esc.engine_3.brake;
	lastdir   =  config.esc.engine_3.last;
	}

   if (config.esc.engine_4.channel == channel) { 
	servoStop =  config.esc.engine_4.neutral;
	servoMin  =  config.esc.engine_4.min;
	servoMax  =  config.esc.engine_4.max;
	BRAKE_ESC =  config.esc.engine_4.brake;
	lastdir   =  config.esc.engine_4.last;
	}

   if (position == "init") {
     pwm.setPwm(channel, 0, servoStop+(servoMax-servoStop));
     sleep(500);
     pwm.setPwm(channel, 0, servoStop-(servoStop-servoMin));
     sleep(500);
     pwm.setPwm(channel, 0, servoStop);
   }

   if (position == "reverse") {
     movement = servoStop+((servoMax-servoStop)/100*power);
     pwm.setPwm(channel, 0, movement);
     if ((BRAKE_ESC) && (lastdir == "forward")) {
       console.log("servo BREAK");
       pwm.setPwm(channel, 0, servoStop);
       sleep(3);
       pwm.setPwm(channel, 0, movement);
     } 
   }

   if (position == "forward") {
     movement = servoStop-((servoStop-servoMin)/100*power);
     pwm.setPwm(channel, 0, movement);
   }

   if (position == "stop") {
     movement = servoStop;
     pwm.setPwm(channel, 0, movement);
   }
   console.log("servo: "+channel+" move: "+movement);
 
};

/* Socket.IO events */
io.on('connection', function(socket){
  console.log('connected');

var gamepadctrl = function(gamepad) {
  var event;
  console.log ('Gamepad %s',gamepad);
  var res = gamepad.split(" ");
//  console.log ('Gamepad res:'+res);
  if (res[0] == "button") {
// X Button
    if ((res[1] == 2) && (res[3] == 1)) {
      if (hoveractive == false) {
        rovdata.hover = true;
        hoverset = rovdata.depth;
        hoveractive = true;
      } else {
        rovdata.hover = false;
        hoveractive = false;
      }
   }
//Y Button
    if ((res[1] == 3) && (res[3] == 1)) {
      if (lightsactive == false) {
        rovdata.lights = true;
        lightsactive = true;
      } else {
        rovdata.lights = false;
        lightsactive = false;
      }
      lightsonce = false;
      lights();
    }
    
//Window (8) Button
    if ((res[1] == 8) && (res[3] == 1)) {
      if (motoractive == false) {
        rovdata.motor = true;
        motoractive = true;
      } else {
        rovdata.motor = false;
        motoractive = false;
      }
      motoronce = false;
      motor();
    }
    

   if ((res[1] == 4) && (res[3] == 1)) {
   }
   if ((res[1] == 5) && (res[3] == 1)) {
   }
  };
  if (res[0] == "axis") {
    event = 'Stop All';
    if ((res[1] == 0) && (res[3] > 50)) { event = 'right'; };
    if ((res[1] == 0) && (res[3] < -50)) { event = 'left'; };
    if ((res[1] == 1) && (res[3] > 50)) { event = 'reverse'; };
    if ((res[1] == 1) && (res[3] < -50)) { event = 'forward'; };
    if ((res[1] == 2) && (res[3] > 50)) { event = 'strafe_r'; };
    if ((res[1] == 2) && (res[3] < -50)) { event = 'strafe_l'; };
    if ((res[1] == 3) && (res[3] > 50)) { event = 'dive'; };
    if ((res[1] == 3) && (res[3] < -50)) { event = 'up'; };
  
    socket.emit("command",event);

    switch (event) {
        case 'up':
           motor_3("reverse");
           motor_4("reverse");
          break;
        case 'dive':
           motor_3("forward");
           motor_4("forward");
          break;
        case 'left':
           motor_1("forward");
           motor_2("reverse");
          break;
        case 'right':
           motor_1("reverse");
           motor_2("forward");
          break;
        case 'forward':
           motor_1("forward");
           motor_2("forward");
          break;
        case 'reverse':
           motor_1("reverse");
           motor_2("reverse");
          break;
        case 'strafe_l':
           motor_3("forward");
           motor_4("reverse");
          break;
        case 'strafe_r':
           motor_3("reverse");
           motor_4("forward");
          break;
        default:
          socket.emit("motor","stopall");

          motor_stop();
         break; 
     };



  };

}

var lights = function() {
      if (!lightsonce) {
        if (rovdata.lights) {
          console.log("LIGHTS: ON");
          pwm.setPwm(7, 0, 4095);
          socket.emit("command","Light ON");
        } else {
          console.log("LIGHTS: OFF");
          pwm.setPwm(7, 0 , 0);
          socket.emit("command","Light Off");
        }
      lightsonce = true;
      }
}

var motor = function() {
      if (!motoronce) {
        if (rovdata.motor) {
          console.log("MOTOR: ON");
          pwm.setPwm(6, 0, 4095);
          socket.emit("command","Motor ON");
        } else {
          console.log("Motor: OFF");
          pwm.setPwm(6, 0 , 0);
          socket.emit("command","Motor Off");
        }
      motoronce = true;
      }
}

var hover = function() {
   if (hoverset < rovdata.depth) {
      console.log("HOVER: UP");
  } 
   if (hoverset > rovdata.depth) {
      console.log("HOVER: DOWN");
  } 
}


var motor_stop = function() {
  console.log("motor", "stopall");
  servo(15,"stop");
  servo(14,"stop");
  servo(13,"stop");
  servo(12,"stop");
  //pwm.stop();
  socket.emit("motor", "stopall");
}

var motor_1 = function(position) {
  servo(15,position);
  console.log("motor1", position);
  socket.emit("motor1", position);
}

var motor_2 = function(position) {
  servo(14,position);
  console.log("motor2", position);
  socket.emit("motor2", position);
}

var motor_3 = function(position) {
  servo(13,position);
  console.log("motor3", position);
  socket.emit("motor3", position);
}

var motor_4 = function(position) {
  servo(12,position);
  console.log("motor4", position);
  socket.emit("motor4", position);
}


  socket.on('disconnect', function(){
    console.log('disconnected');
    clearInterval(interval);
  });

imuserver.on('listening', function () {
    var address = imuserver.address();
//    console.log('Listening for IMU data on: ' + address.address + ":" + address.port);
});

imuserver.on('message', function (message, remote) {
    imustring = message.toString().split(' ');

    for(var i=0; i<imustring.length;i++) imustring[i] = +imustring[i];

    imudata.time   = imustring[0];
    imudata.pitch  = +imustring[1].toFixed(2);
    imudata.roll   = +imustring[2].toFixed(2);
    imudata.yaw    = +imustring[3].toFixed(2);
    if (new Date().getTime() - imudata.time < 15) {
       imudata.status = 'OK';
    } else {
       imudata.status = 'NOK';
    }
    if (imudata.roll < 0) {
            rovdata.roll = Math.floor((imudata.roll + 360)*100)/100;
    } else {
            rovdata.roll =  Math.floor((imudata.roll)*100)/100;
    }
    if (imudata.pitch < 0) {
        rovdata.pitch = Math.floor((imudata.pitch + 360)*100)/100;
    } else {
        rovdata.pitch = Math.floor((imudata.pitch)*100)/100;
    }
    if (imudata.yaw < 0) {
        rovdata.heading = imudata.yaw + 360;
    } else {
        rovdata.heading = imudata.yaw;
    }
    rovdata.status = imudata.status;

//    console.log(imudata);
});


  var interval = setInterval(function () {

    if (config.sensor.MCP3424.scan1) {update_mcp3424(rovdata)};
    if (config.sensor.MPU9150.scan) {update_mpu9150(rovdata)};
    if (config.sensor.MS5803.scan) {update_ms5803(rovdata)};

      socket.emit("rovdata", rovdata);
      if (rovdata.hover) {
	hover();
      };
     lights();
  }, 1000);

  socket.on('gamepad', function(gamepad) {
    gamepadctrl(gamepad);
  });

  socket.on('power', function(data) {
    power = data;
    console.log('Power request: %d', data);
    if (power == 0) {
      motor_stop();
    }
  });

  socket.on('keydown', function(event) {
    console.log('Keydown request: %s', event);
    socket.emit("command",event);
    switch (event) {
	case 'up':
           motor_3("reverse");
           motor_4("reverse");
          break;
	case 'dive':
           motor_3("forward");
           motor_4("forward");
          break;
	case 'left':
           motor_1("forward");
           motor_2("reverse");
          break;
	case 'right':
           motor_1("reverse");
           motor_2("forward");
          break;
	case 'forward':
           motor_1("forward");
           motor_2("forward");
          break;
	case 'reverse':
           motor_1("reverse");
           motor_2("reverse");
          break;
	case 'strafe_l':
           motor_3("forward");
           motor_4("reverse");
          break;
	case 'strafe_r':
           motor_3("reverse");
           motor_4("forward");
          break;
	case 'hover':
            if (hoveractive == false) {
              rovdata.hover = true;
              hoverset = rovdata.depth;
              hoveractive = true;
            } else {
              rovdata.hover = false;
              hoveractive = false;
            }
          break;
	case 'lights':
            if (lightsactive == false) {
              rovdata.lights = true;
              lightsactive = true;
            } else {
              rovdata.lights = false;
              lightsactive = false;
            }
            lightsonce = false;
          break;
	case 'cam1':
          break;
	case 'cam2':
          break;
    }
  });

  socket.on('keyup', function(event) {
    console.log('Keyup request: %s', event);
    switch (event) {
        case 'up':
          motor_stop();
          break;
        case 'dive':
          motor_stop();
          break;
        case 'left':
          motor_stop();
          break;
        case 'right':
          motor_stop();
          break;
        case 'forward':
          motor_stop();
          break;
        case 'reverse':
          motor_stop();
          break;
        case 'strafe_l':
          motor_stop();
          break;
        case 'strafe_r':
          motor_stop();
          break;
        case 'hover':
          break;
        case 'lights':
          break;
        case 'cam1':
          break;
        case 'cam2':
          break;
    }
  });

});

//
// Prime the ESC, by going FULL forward and FULL back
//
if (config.esc.on_off.channel != -1) {
  console.log("Starting ESC\'s");
  pwm.setPwm(6, 0, 0);
  sleep(1000);
  pwm.setPwm(6, 0 , 4095);
  sleep(1000);

  servo(15,"init");
  servo(14,"init");
  servo(13,"init");
  servo(12,"init");

  console.log("motor", "stopall");
  servo(15,"stop");
  servo(14,"stop");
  servo(13,"stop");
  servo(12,"stop");
}

imuserver.bind(PORT, HOST);

console.log("Special thanks to the testers of this software: olegodo and perfo !!!");

//Start the http server at port and IP defined before
server.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("ROV Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

