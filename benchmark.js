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

function getCurrentFile() {
    let stack = (new Error()).stack;

    let stackLine = stack.split('\n')[1];
    if (!stackLine)
        throw new Error('Could not find current file');

    let match = new RegExp('@(.+):\\d+').exec(stackLine);
    if (!match)
        throw new Error('Could not find current file');

    let path = match[1];
    let file = Gio.File.new_for_path(path);
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

let path = getCurrentFile();
let cpufreqctl_path;
if (!path)
    throw new Error('Could not find current file');
cpufreqctl_path = path[1] + "/cpufreqctl";
if (GLib.file_test(cpufreqctl_path, GLib.FileTest.EXISTS) == false) {
    cpufreqctl_path = GLib.find_program_in_path ('cpufreqctl');
    if (!cpufreqctl_path)
        throw new Error('Could not find cpufreqctl');
}
print ("cpufreqctl path:", cpufreqctl_path);
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
print("Gio test end. " + (t1 - t0) + " milliseconds.");


print("GLib processing start...");
var cpufreq_output = null;
tlen = 1000;
t0 = Date.now();
for (let i=0; i<tlen; i++) {
try {
    cpufreq_output = GLib.spawn_command_line_sync (cpufreqctl_path + " info");
    if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
    }catch (e) {
    		print("Error: ", e.message);
		}
}
t1 = Date.now();
print("GLib processing end. " + (t1 - t0) + " milliseconds.");
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Array_comprehensions
