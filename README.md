# ROV-PI

Pilot your ROV-PI directly from your browser. 

If you encounter an issue; please mail details to <rov-pi@team-moki.nl>

This software was build and tested on a Raspberry PI (Model B+)

## Current plugins

* **[servo](plugings/servo)**
	Controle I2C servo boards
	* Adafruit 16-Channel 12-bit PWM/Servo Driver - I2C interface - PCA9685 (http://www.adafruit.com/product/815)

* **[MS5803-14BA](plugins/MS5803-14BA)** (http://store.openrov.com/products/openrov-imu-depth-module)
	OpenROV Pressure sensor 
	•Senses down up to 130m depth
	•Precision to about 1cm of depth
	•Integrated temperature sensor precise to about 0.1C

* **[hud](plugins/hud)** to visualize a head-up display with artificial horizon, compass, depthmeter, etc. 

* **[MPU-9150](plugins/MPU-9150)** (http://store.openrov.com/products/openrov-imu-depth-module)
	OpenROV 9-axis IMU
	•3-axis magnetometer for detection of heading (regardless of orientation)
	•3-axis accelerometer to detect roll and pitch
	•3 axis gyroscope to detect rotational rate

## Planned plugins
	Plugins that atleast have to make it (one day)
 
* ** [ADC-Pi-Plus] (https://www.abelectronics.co.uk/products/17/Raspberry-Pi-B/56/ADC-Pi-Plus---Raspberry-Pi-Analogue-to-Digital-converter)
	8 Channel ADC digital converter.

* ** [attopilot] (https://www.coolcomponents.co.uk/attopilot-voltage-and-current-sense-breakout-180a.html)
	Voltage/Current sensor 0-60v 180A 

## Future plugins
	Plugins that are nice to have, one day (maybe)

* **[servo](plugings/servo)**
	Controle I2C servo boards
	* Bitwizard I2C 7 servo board (http://www.bitwizard.nl/shop/expansion-boards/servo)

* **[gamepad]** controls the ROV with a gamepad/Xbox360 controller. 

## Install

If you require the use of I2C, please make sure your PI is configured correctly for this.
See (https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c) if you need help with this.

ROV-PI requires a recent nodejs (built and tested with node > 0.10) (http://elinux.org/Node.js_on_RPi)
as well as[npm](https://npmjs.org/) and [bower](http://bower.io/) for dependency management.

```
git clone https://github.com/Moki38/Moki-ROV.git
cd ROV-PI
npm install
bower install
```

## Usage

1. Edit `server.js` => Change the IP (app.set("ipaddr", "192.168.1.30");), to the ip from your PI.
2. Edit `index..html` => Change the IP (iframe), to the ip/port from your mjpg-stream.
2. Run `mjpg-stream`
3. Run `node server.js`
4. Point your browser to http://<ROV-PI-IP>:3000/

### Running mjpg-stream

I run mjpg-streamer from /etc/rc.local using the following commands:

killall mjpg_streamer

export LD_LIBRARY_PATH=/usr/local/lib

/usr/local/bin/mjpg_streamer -b -i "input_uvc.so -n -f 24 -r 800x600 -d /dev/video0" -o "output_http.so -n -w /var/www -p 8080"


### Controlling the ROV

You can control the ROV using the following keys. 

Use `w, s, a, d` to move front, back and sideways. Use `i, j, k ,l` to go up/down or turn clockwise/counter clockwise. 

Use the `1, 2, 3, 4` key to select a camera (mjpg-streamer has to be running).

Use the `h` key to activate hover-mode.

### Record a mission

As we already have a video-datastream on a web page, just install CamStudio (http://sourceforge.net/projects/camstudio)
It willl allow you to capture, your screen,window or a boxed area on your PC screen.

## Thanks

The perfect place for ROV builders: http://www.homebuiltrovs.com/rovforum/index.php

## License

The MIT License

Copyright (c) 2014 by the AUTHORS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
