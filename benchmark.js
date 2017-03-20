#!/usr/bin/gjs

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

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

function getCurrentFile () {
    let stack = (new Error ()).stack;

    let stackLine = stack.split ('\n')[1];
    if (!stackLine)
        throw new Error ('Could not find current file');

    let match = new RegExp ('@(.+):\\d+').exec (stackLine);
    if (!match)
        throw new Error ('Could not find current file');

    let path = match[1];
    let file = Gio.File.new_for_path (path);
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

let path = getCurrentFile ();
let cpufreqctl_path;
if (!path)
    throw new Error ('Could not find current file');
cpufreqctl_path = path[1] + "/cpufreqctl";
if (GLib.file_test (cpufreqctl_path, GLib.FileTest.EXISTS) == false) {
    cpufreqctl_path = GLib.find_program_in_path ('cpufreqctl');
    if (!cpufreqctl_path)
        throw new Error ('Could not find cpufreqctl');
}
let freqInfo = null;
let tlen = 100;
let s, m, n, key;
print ("Gio start...");
_init_streams ();
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

print("GLib processing start...");
var cpufreq_output = null;
t0 = Date.now ();
for (let i=0; i<tlen; i++) {
    try {
        cpufreq_output = GLib.spawn_command_line_sync (cpufreqctl_path + " info");
        if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
    } catch (e) {
    	print("Error: ", e.message);
	}
}
t1 = Date.now ();
print("GLib processing end in " + (t1 - t0) + " milliseconds.");
