#!/usr/bin/gjs

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = get_appdir ();
imports.searchPath.unshift(APPDIR);

const Convenience = imports.convenience;

let settings = null;

let streams = [];
let freqs = [];
let cancel = null;
let cpucount = 1;

let event = 0;
let init_event = 0;

var CpufreqService = new Lang.Class ({
    Name: 'CpufreqService',
    Extends: Gio.Application,

    _init: function (uuid) {
        GLib.set_prgname ("cpufreq-service");
        this.parent ({
            application_id: "org.konkor.cpufreq.service",
            flags: Gio.ApplicationFlags.HANDLES_OPEN
        });
        GLib.set_application_name ("CPUFreq Service");
    },

    vfunc_startup: function() {
        this.parent();
        this.init ();
    },

    vfunc_activate: function() {
        this.activate_action ('start-client', null);
        debug ("activate");
    },

    init: function() {
        debug ("init");
        cpucount = Convenience.get_cpu_number ();
        this.title = "-- \u3393";
        freqs = [GLib.get_num_processors ()];
        cancel = new Gio.Cancellable ();
        this._init_streams ();
        this._update_freq ();
        this._add_event ();
    },

     _add_event: function () {
        if (event != 0) {
            GLib.Source.remove (event);
            event = 0;
        }
        event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
            this._update_freq ();
            return true;
        }));
    },

    _init_streams: function() {
        if (init_event != 0) {
            GLib.Source.remove (init_event);
            init_event = 0;
        }
        streams = [];
        for (let key = 0; key < cpucount; key++) {
            if (GLib.file_test ('/sys/devices/system/cpu/cpu' + key + '/topology', GLib.FileTest.EXISTS)) {
                let f = Gio.File.new_for_path ('/sys/devices/system/cpu/cpu' + key + '/cpufreq/scaling_cur_freq');
                streams.push (new Gio.DataInputStream({ base_stream: f.read(null) }));
            } else {
                streams.push (null);
            }
        }
    },

    _update_freq: function () {
        let m = 0;
        cancel.cancel ();
        cancel = new Gio.Cancellable ();
        streams.forEach (stream => {
            this._read_line (stream);
        });
            for (let i = 0; i < cpucount; i++)
                if (i < freqs.length && freqs[i] > m) m = freqs[i];
            if (m > 0) {
                if (m >= 1000000) {
                    this.title = (m/1000000).toFixed(2).toString() + " \u3393";
                } else {
                    this.title = (m/1000).toFixed(0).toString() + "  \u3392";
                }
            }
        debug (this.title);
    },

    _read_line: function (dis) {
        if (dis == null) return;
        try {
            dis.seek (0, GLib.SeekType.SET, cancel);
            dis.read_line_async (200, cancel, this._read_done);
        } catch (e) {
            init_event = GLib.timeout_add (0, 25, Lang.bind (this, this._init_streams ));
        }
    },

    _read_done: function (stream, res) {
        try {
            let [line,] = stream.read_line_finish (res);
            if (line) {
                var n = parseInt (line);
                if (Number.isInteger (n)) {
                    freqs.unshift (n);
                    freqs.splice (freqs.length-1, 1);
                }
            }
        } catch (e) {}
    },

    remove_events: function () {
        if (event != 0) GLib.Source.remove (event);
        if (init_event != 0) GLib.Source.remove (init_event);
        event = 0; init_event = 0;
    }
});

function getCurrentFile () {
    let stack = (new Error()).stack;
    let stackLine = stack.split('\n')[1];
    if (!stackLine)
        throw new Error ('Could not find current file');
    let match = new RegExp ('@(.+):\\d+').exec(stackLine);
    if (!match)
        throw new Error ('Could not find current file');
    let path = match[1];
    let file = Gio.File.new_for_path (path);
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

function get_appdir () {
    let s = getCurrentFile ()[1];
    if (GLib.file_test (s + "/extension.js", GLib.FileTest.EXISTS)) return s;
    s = GLib.get_home_dir () + "/.local/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/extension.js", GLib.FileTest.EXISTS)) return s;
    s = "/usr/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/extension.js", GLib.FileTest.EXISTS)) return s;
    throw "Installation not found...";
    return s;
}

let cmd_out, info_out;
function get_info_string (cmd) {
    cmd_out = GLib.spawn_command_line_sync (cmd);
    if (cmd_out[0]) info_out = cmd_out[1].toString().split("\n")[0];
    if (info_out) return info_out;
    return "";
}

function debug (msg) {
    if (msg) print ("[cpufreq][monitor] " + msg);
}

function error (msg) {
    print ("[cpufreq][monitor] (EE) " + msg);
}

settings = Convenience.getSettings ();

let app = new CpufreqService ();
app.hold();
app.run (ARGV);
