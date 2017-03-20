#!/usr/bin/gjs

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
//const System = imports.system; System.gc();

let streams = [];

function _init_streams () {
    let len = GLib.get_num_processors ();
    streams = [];
    for (let key = 0; key < len; key++) {
        let f = Gio.File.new_for_path ('/sys/devices/system/cpu/cpu' + key +
            '/cpufreq/scaling_cur_freq');
        streams.push (new Gio.DataInputStream ({ base_stream: f.read(null) }));
    }
}

function _read_line (dis) {
    let line;
	try {
	    dis.seek (0, GLib.SeekType.SET, null); 
        [line,] = dis.read_line (null);
	} catch (e) {
    	print ("Error: ", e.message);
    	_init_streams ();
	}
	return line;
}

let freqInfo = null;
let tlen = 1000;
let s, m, n;
//init fs...
_init_streams ();
print ("Gio start...");
var t0 = Date.now ();
for (let i = 0; i < tlen; i++) {
    m = 0; n = 0;
    streams.forEach (stream => {
        s = _read_line (stream);
        if (s) {
            n = parseInt (s);
            if (n > m) {
                m = n;
                freqInfo = s;
            }
        }
    });
}

var t1 = Date.now ();
print ("Gio test end in " + (t1 - t0) + " milliseconds.");


