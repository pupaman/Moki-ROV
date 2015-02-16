var version = "0.1.1";

var express = require('express');
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var shell = require("shelljs");

// Fetch configuration
try {
    var config = require('./config');
} catch (err) {
    console.log("Missing or corrupted config file. Have a look at config.js.example if you need an example."+err);
    process.exit(-1);
}

//console.log("config.servo.S00.max: "+config.servo.S00.max);

//Object.keys(config.movement.forward).forEach(function(key) {
//    console.log(key + config.movement.forward[key]);
//});

var imudata = {
        time: 0,
        roll: 0,
        pitch: 0,
        yaw: 0,
        status: 0
  };


var rovdata = {
	heading: 0,
	pitch: 0,
	roll: 0,
	mbar: 0,
	temp: 0,
        volt: 0,
        current: 0,
	lights: false,
	mpu9150: false,
	ms5803: false,
	mcp3424: false,
	pca9685: false,
	hover: false
  };

var power = 0;
var hoverset = 0;
var hoveractive = false;
var lightsactive = false;
var lightsonce = false;


// I2C
var i2c_device = '/dev/i2c-1';
var i2c = require('i2c');
var PCA9685_ADDR=0x41;
var PCA9685_INIT=false;
var MPU9150_ADDR=0x68;
var MPU9150_INIT=false;
var MS5803_ADDR=0x76;
var MS5803_INIT=false;
var MCP3424_ADDR1=0x6c;
var MCP3424_ADDR1=0x6d;
var MCP3424_INIT1=false;
var MCP3424_INIT2=false;


// Check I2C devices
var wire = new i2c(PCA9685_ADDR, {device: i2c_device}); 
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

PCA9685_INIT = i2c_sensor_check(PCA9685_ADDR);
if (PCA9685_INIT) {
  rovdata.pca9685 = true;
  var makePwm = require("adafruit-pca9685" );
  var pwm = makePwm({"address": PCA9685_ADDR, "device": i2c_device, "freq": 50, "debug": true});
} else {
  rovdata.pca9685 = false;
  console.log("PCA9685 Not found, disabled!");
}

MPU9150_INIT = i2c_sensor_check(MPU9150_ADDR);
var PORT = 32000;
var HOST = '127.0.0.1';
var dgram = require('dgram');
var imuserver = dgram.createSocket('udp4');
if (MPU9150_INIT) {
  rovdata.mpu9150 = true;
//  var mpu9150 = require("mpu9150");
//  var imu = new mpu9150();
//  imu.initialize();
} else {
  rovdata.mpu9150 = false;
  console.log("MPU9150 Not found, disabled!");
}

MS5803_INIT = i2c_sensor_check(MS5803_ADDR);
if (MS5803_INIT) {
  rovdata.ms5803 = true;
  var makeMS5803 = require("ms5803_rpi" );
  var ms5803 = new makeMS5803({address: MS5803_ADDR, device: i2c_device });
} else {
  rovdata.ms5803 = false;
  console.log("MS5803 Not found, disabled!");
}

MCP3424_INIT = i2c_sensor_check(MCP3424_ADDR1);
if (MCP3424_INIT) {
  rovdata.mcp3424 = true;
  var mcp3424 = require('mcp3424');
  var address = 0x6c;
  var gain = 0; //{0,1,2,3} represents {x1,x2,x4,x8}
  var resolution = 3; //{0,1,2,3} and represents {12,14,16,18} bits
  var mcp = new mcp3424(MCP3424_ADDR1, gain, resolution, i2c_device);
} else {
  rovdata.mcp3424 = false;
  console.log("MCP3424 Not found, disabled!");
}

var servoMin = 150;
var servoMax = 600;
var servoStop = 350;

var pwms = {
	'pwm0' : {
		'type' : 'esc',
                'min'  : 150,
                'max'  : 550,
                'neutral': 350
        },
	'pwm1' : {
		'type' : 'esc',
                'min'  : 150,
                'max'  : 550,
                'neutral': 350,
        },
	'pwm2' : {
		'type' : 'esc',
                'min'  : 150,
                'max'  : 550,
                'neutral': 350,
        },
	'pwm3' : {
		'type' : 'esc',
                'min'  : 150,
                'max'  : 550,
                'neutral': 350,
        },
	'pwm8' : {
		'type' : 'servo',
                'min'  : 150,
                'max'  : 550,
                'neutral': 310,
        },
	'pwm9' : {
		'type' : 'servo',
                'min'  : 150,
                'max'  : 550,
                'neutral': 310,
        },
	'pwm15' : {
		'type' : 'relay',
                'min'  : 0,
                'max'  : 4095,
                'neutral': 0
        }
  };

/* Server config */
app.set("ipaddr", "0.0.0.0");
app.set("port", 3000);
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
  console.log(imudata);
*/
  return rovdata;
};

var update_mcp3424 = function(rovdata) {

  rovdata.volt = Math.floor(mcp.getMv(0)/4096/12.99*100)/100;
// VFinal = VRaw/49.44; //45 Amp board
//VFinal = VRaw/12.99; //90 Amp board
//VFinal = VRaw/12.99; //180 Amp board  
  rovdata.current = Math.floor(mcp.getMv(1)/4096/3.7*100)/100;
//IFinal = IRaw/14.9; //45 Amp board
//IFinal = IRaw/7.4; //90 Amp board
//IFinal = IRaw/3.7; //180 Amp board

//console.log(mcp.getMv(0)); //for channel 0
//console.log(mcp.getMv(1)); //for channel 1

return rovdata;
};


var update_ms5803 = function(rovdata){
  console.log('update ms5803, begin');
  ms5803.read = function(data){
    console.log('update ms5803'+data);
  };
  console.log('update ms5803, end');
  return rovdata;
};


var servo = function(channel, position) {
   
   if (position == "reverse") {
     movement = servoStop+((servoMax-servoStop)/100*power);
   }
   if (position == "forward") {
     movement = servoStop-((servoStop-servoMin)/100*power);
   }
   if (position == "stop") {
     movement = servoStop;
   }
   console.log("servo", movement);
 
   //pwm.setPwm(channel, 0, movement);
};

/* Socket.IO events */
io.on('connection', function(socket){
  console.log('connected');

var gamepadctrl = function(gamepad) {
  var event;
  console.log ('Gamepad %s',gamepad);
  var res = gamepad.split(" ");
  console.log ('Gamepad res:'+res);
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
          //pwm.setPwm(7, 0, 4095);
          socket.emit("command","Light ON");
        } else {
          console.log("LIGHTS: OFF");
          //pwm.setPwm(7, 0 , 0);
          socket.emit("command","Light Off");
        }
      lightsonce = true;
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
    imudata.roll   = +imustring[1].toFixed(2);
    imudata.pitch  = +imustring[2].toFixed(2);
    imudata.yaw    = +imustring[3].toFixed(2);
    if (new Date().getTime() - imudata.time < 15) {
       imudata.status = 'OK';
    } else {
       imudata.status = 'NOK';
    }
    if (imudata.roll < 0) {
            rovdata.roll = imudata.roll + 360;
    } else {
            rovdata.roll = imudata.roll;
    }
    if (imudata.pitch < 0) {
        rovdata.pitch = imudata.pitch + 360;
    } else {
        rovdata.pitch = imudata.pitch;
    }
    if (imudata.yaw < 0) {
        rovdata.yaw = imudata.yaw + 360;
    } else {
        rovdata.yaw = imudata.yaw;
    }
    rovdata.status = imudata.status;

//    console.log(imudata);
});


  var interval = setInterval(function () {
    if (MCP3424_INIT) {update_mcp3424(rovdata)};
    if (MPU9150_INIT) {update_mpu9150(rovdata)};
    if (MS5803_INIT) {update_ms5803(rovdata)};

//      rovdata = update_ms5803(rovdata);
//      rovdata = update_mpu9150(rovdata);
//      rovdata = update_mcp3424(rovdata);

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
           motor_1("reverse");
           motor_2("reverse");
          break;
	case 'dive':
           motor_1("forward");
           motor_2("forward");
          break;
	case 'left':
           motor_3("forward");
           motor_4("reverse");
          break;
	case 'right':
           motor_3("reverse");
           motor_4("forward");
          break;
	case 'forward':
           motor_3("forward");
           motor_4("forward");
          break;
	case 'reverse':
           motor_3("reverse");
           motor_4("reverse");
          break;
	case 'strafe_l':
           motor_1("forward");
           motor_2("reverse");
          break;
	case 'strafe_r':
           motor_1("reverse");
           motor_2("forward");
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

//Start the http server at port and IP defined before
server.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("ROV Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

