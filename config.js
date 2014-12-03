var config = {
    network: {
	ip_address: 	"192.168.1.31",
	port:		3000
	},

    control: {
	forward: {
		key:	'w',
		xpad:	{AXIS1:"-"} 
		},
	reverse: {
		key:	's',
		xpad:	{AXIS1:"-"} 
		},
	forward: {
		key:	'w',
		xpad:	{AXIS0:"-"} 
		},
	reverse: {
		key:	's',
		xpad:	{AXIS0:"-"} 
		},
	up: {
		key:	'i',
		xpad:	{AXIS3:"-"} 
		},
	dive: {
		key:	'k',
		xpad:	{AXIS3:"-"} 
		},
	roll_left: {
		key:	'j',
		xpad:	{AXIS2:"+"} 
		},
	roll_right: {
		key:	'l',
		xpad:	{AXIS2:"-"} 
		},
	strafe_left: {
		key:	'o',
		xpad:	{AXIS2:"+"} 
		},
	strafe_right: {
		key:	'u',
		xpad:	{AXIS2:"-"} 
		},
	power_up: {
		key:	']',
		xpad:	{AXIS2:"+"} 
		},
	power_down: {
		key:	'[',
		xpad:	{AXIS2:"-"} 
		},
	hover: {
		key:	'h',
		xpad:	{BUTX:1} 
		},
	lights: {
		key:	'g',
		xpad:	{BUTY:1} 
		},
	cam_up: {
		key:	'8',
		xpad:	{BUT12:1} 
		},
	cam_down: {
		key:	'2',
		xpad:	{BUT13:1} 
		},
	cam_left: {
		key:	'4',
		xpad:	{BUT14:1} 
		},
	cam_right: {
		key:	'6',
		xpad:	{BUT15:1} 
		}
	},
	
    servo: {
	S00: {	
		type:	"esc",		// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	375,		// Neutral / Stop
		max:	650,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
	S01: {	
		type:	"esc",		// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	375,		// Neutral / Stop
		max:	650,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
	S02: {	
		type:	"esc",		// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	375,		// Neutral / Stop
		max:	650,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
	S03: {	
		type:	"esc",		// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	375,		// Neutral / Stop
		max:	650,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
	S04: {	
		type:	"servo",	// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	375,		// Neutral / Stop
		max:	650,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
	S05: {	
		type:	"servo",	// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	375,		// Neutral / Stop
		max:	650,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
	S06: {	
		type:	"relay",	// servo, esc, relay, led
		cpos:	0,		// Currunt servo position
		min:	150,		// Min
		stop:	150,		// Neutral / Stop
		max:	4095,		// Max 
		trim:	0,		// Offset 
		type:	"linear",	// 2x, 3x, linear, exponential
		break:	"no"		// break function on ESC
	},
    },

    movement: {
	forward:	{"S00":"+","S01":"+"},
	reverse:	{"S00":"-","S01":"-"},
	turnleft:	{"S00":"+","S01":"-"},
	turnright:	{"S00":"-","S01":"+"},
	up:		{"S02":"+","S03":"+"},
	dive:		{"S02":"-","S03":"-"},
	roll_left:	{"S02":"+","S03":"-"},
	roll_left:	{"S02":"-","S03":"+"},
	strafe_left:	{},	
	strafe_right:	{},
	stop:		{"S00":"0", "S01":"0", "S02":"0", "S03":"0"}
    },

    camera: {
	left:		{ "S04":"+" },
	right:		{ "S04":"-" },
	up:		{ "S05":"+" },
	down:		{ "S05":"-" }
    },

    light: {
	on:		{ "S06":"+" },
	off:		{ "S06":"-" }
    }
};

module.exports = config;
