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

console.log("config.servo.S00.max: "+config.servo.S00.max);

Object.keys(config.movement.forward).forEach(function(key) {
    console.log(key + config.movement.forward[key]);
});

var makePwm = require("adafruit-pca9685" );
var pwm = makePwm();
var mpu9150 = require("mpu9150");
var imu = new mpu9150();
imu.initialize();
var mcp3424 = require('mcp3424');
var address = 0x6c;
var gain = 0; //{0,1,2,3} represents {x1,x2,x4,x8}
var resolution = 3; //{0,1,2,3} and represents {12,14,16,18} bits
//var mcp = new mcp3424(address, gain, resolution, '/dev/i2c-1');

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

var rovdata = {
	heading: 0,
	pitch: 0,
	roll: 0,
	mbar: 0,
	temp: 0,
        volt: 0,
        current: 0,
	lights: false,
	hover: false
  };

var imudata = {
	acc_x: 0,
	acc_y: 0,
	acc_z: 0,
	rot_x: 0,
	rot_y: 0,
	rot_z: 0,
	mag_x: 0,
	mag_y: 0,
	mag_z: 0
  };

var power = 0;
var hoverset = 0;
var hoveractive = false;
var lightsactive = false;
var lightsonce = false;

/* Server config */
app.set("ipaddr", "10.10.10.10");
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

var processResult = function(stdout) {  
    var lines = stdout.toString().split('\n');
    var results = new Array();
    lines.forEach(function(line) {
        var parts = line.split(' = ');
        results[parts[0]] = parts[1];
        if (parts[0] == 'pressure') {
           rovdata.mbar = parts[1]/10;
        }
        if (parts[0] == 'temp') {
           rovdata.temp = parts[1]/100;
        }
        if (parts[0] == 'roll') {
           rovdata.roll = Math.floor(parts[1]);
        }
        if (parts[0] == 'pitch') {
           rovdata.pitch = Math.floor(parts[1]);
        }
        if (parts[0] == 'yaw') {
           rovdata.heading = Math.floor(parts[1]);
        }
    });
};

var update_mpu9150 = function(rovdata){
  console.log('update mpu9150, begin');
/*
  var child = shell.exec('/root/rov-pi/plugins/RTIMULibDrive/Output/RTIMULibDrive', {async:true, silent:true});
    child.stdout.on('data', function(data) {
      processResult(data);
  });
*/
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
  console.log('update mpu9150, end');
  return rovdata;
};

var update_mcp3424 = function(rovdata) {

  rovdata.volt = mcp.getMv(0);
// VFinal = VRaw/49.44; //45 Amp board
//VFinal = VRaw/12.99; //90 Amp board
//VFinal = VRaw/12.99; //180 Amp board  
  rovdata.current = mcp.getMv(3);
//IFinal = IRaw/14.9; //45 Amp board
//IFinal = IRaw/7.4; //90 Amp board
//IFinal = IRaw/3.7; //180 Amp board

console.log(mcp.getMv(0)); //for channel 0
console.log(mcp.getMv(3)); //for channel 3

return rovdata;
};


var update_ms5803 = function(rovdata){
  console.log('update ms5803, begin');
  var child = shell.exec('/root/rov-pi/plugins/ms5803/ms5803.sh', {async:true, silent:true});
    child.stdout.on('data', function(data) {
      processResult(data);
  });
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
 
//   pwm.setFreq(60, 1.0);
   pwm.setPwm(channel, 0, movement);
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

  var interval = setInterval(function () {
//      rovdata = update_ms5803(rovdata);
//      socket.emit("rovdata", rovdata);
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

//rovexec_mpu9150(rovdata);

//Start the http server at port and IP defined before
server.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

