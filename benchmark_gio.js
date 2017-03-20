#!/usr/bin/gjs

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

function _read_line (fname) {
		//if (GLib.file_test(fname, GLib.FileTest.EXISTS) == false) return null;
		let f = Gio.file_new_for_path (fname);
		let line, res, dis;
		try {
		    dis = Gio.DataInputStream.new (f.read (null));
		    [line,res] = dis.read_line (null);
		    dis.close (null);
		    
		} catch (e) {
    		print("Error: ", e.message);
		}
		return line;
}

let freqInfo = null;
let s;
let len = GLib.get_num_processors (), tlen = 100000;
let m = 0, n = 0, key;
print("Gio start...");
var t0 = Date.now();
for (let i=0; i<tlen; i++)
for (key=0; key<len; key++) {
	s = this._read_line("/sys/devices/system/cpu/cpu" + key.toString() + "/cpufreq/scaling_cur_freq");
    if (s) {
        n = parseInt (s);
        if (n > m) {
            m = n;
            freqInfo = s;
        }
    }
}
var t1 = Date.now();
print("Gio test end in " + (t1 - t0) + " milliseconds.");


