# Moki-ROV 

Pilot your ROV-PI directly from your browser, this will ofcourse only work if you have some kind of network connection to your ROV.
In the setup, in which this software was writen, i am using 100Mb ethernet and Google Chrome as browser (as this one supports the Xpad)
The browser screen will display a HUD, with all the sensor details you have on board your ROV.

If you encounter an issue; please mail details to <rov-pi@team-moki.nl>

This software was build on a Raspberry PI (Model B+)

And tested on:
- Raspberry PI (Model B+)
- Banana Pro

## Currenty supported/tested 

* Adafruit 16-Channel 12-bit PWM/Servo Driver - I2C interface - PCA9685 (http://www.adafruit.com/product/815)
	•Pin 1/2 Camara movement x/y
	•Pin 7/8 Light Relay (http://www.kiwi-electronics.nl/tweekanaals-relais-module-5v)
	•Pin 12/13/14/15 ESC speed-controllers (brushless / brushed)

* OpenROV Pressure sensor [MS5803-14BA] ** (http://store.openrov.com/products/openrov-imu-depth-module)
	•Senses down up to 130m depth
	•Precision to about 1cm of depth
	•Integrated temperature sensor precise to about 0.1C

* MPU-9150 9-axis IMU (http://store.openrov.com/products/openrov-imu-depth-module)
	•3-axis magnetometer for detection of heading (regardless of orientation)
	•3-axis accelerometer to detect roll and pitch
	•3 axis gyroscope to detect rotational rate

* MCP3424 / ADC-Pi-Plus (https://www.abelectronics.co.uk/products/17/Raspberry-Pi-B/56/ADC-Pi-Plus---Raspberry-Pi-Analogue-to-Digital-converter)
	8 Channel ADC digital converter.

* attopilot (https://www.coolcomponents.co.uk/attopilot-voltage-and-current-sense-breakout-180a.html)
	Voltage/Current sensor 0-60v 180A 

## Install

You will require the use of I2C, please make sure your PI is configured correctly for this.
See (https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c) if you need help with this.

Moki-ROV requires a recent nodejs (built and tested with node V 0.10.33) (http://elinux.org/Node.js_on_RPi)
as well as[npm](https://npmjs.org/) for module dependency management.

```
sudo su -
git clone https://github.com/Moki38/Moki-ROV.git
cd Moki-ROV
npm install .
git clone https://github.com/richards-tech/RTIMULib.git
cd RTIMULib
patch -p1 < ../RTIMULib.patch
cd Linux/RTIMULibDrive
make
make install
cd ../../..
apt-get install -y subversion libjpeg8-dev imagemagick libav-tools cmake
git clone https://github.com/jacksonliam/mjpg-streamer.git
cd mjpg-streamer/mjpg-streamer-experimental
make install
cd ../..
```

## Usage

1. Edit `public/index.html` => Change the IP (iframe), to the ip/port for your mjpg-stream.
2. Edit `public/cam1.html` => Change the IP (iframe), to the ip/port for your mjpg-stream.
3. Edit `public/cam2.html` => Change the IP (iframe), to the ip/port for your mjpg-stream.

4. Run `mjpg-stream` => ./mjpg_streamer -i "./input_uvc.so" -o "./output_http.so"
5. Run `RTIMULibDrive` => RTIMULibDrive &
6. Run `node server.js`
7. Point your browser to http://[ROV-IP]:3000/

Or

4. ./rov start
5. Point your browser to http://[ROV-IP]:3000/

### Running mjpg-stream

I run mjpg-streamer from /etc/rc.local using the following commands:

killall mjpg_streamer

export LD_LIBRARY_PATH=/usr/local/lib

/usr/local/bin/mjpg_streamer -b -i "input_uvc.so -n -f 24 -r 800x600 -d /dev/video0" -o "output_http.so -n -w /var/www -p 8080"


### Controlling the ROV

You can control the ROV using a Xpad controller, tested are (Xbox 360 and Xbox one). 

Use `w, s, a, d` to move front, back and sideways. Use `i, j, k ,l` to go up/down or turn clockwise/counter clockwise. 

Use the `1, 2` key to select a camera (mjpg-streamer has to be running).

Use the `[, ]` key to increase and decrease motor power.

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
