#!/usr/bin/gjs

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = get_appdir ();
imports.searchPath.unshift(APPDIR);

const Convenience = imports.convenience;

let settings = null;

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
