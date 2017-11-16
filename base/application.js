/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2017 Kostiantyn Korienkov <kapa76@gmail.com>
 *
 * This file is part of CPUFreq Manager.
 *
 * CPUFreq Manager is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CPUFreq Manager is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = get_appdir ();
imports.searchPath.unshift(APPDIR);

const Convenience = imports.convenience;

let settings = null;
let window = null;

var CPUFreqApplication = new Lang.Class ({
    Name: 'CPUFreqApplication',
    Extends: Gtk.Application,

    _init: function (args) {
        GLib.set_prgname ("cpufreq-application");
        this.parent ({
            application_id: "org.konkor.cpufreq.application",
            flags: Gio.ApplicationFlags.HANDLES_OPEN
        });
        GLib.set_application_name ("CPUFreq Manager");
    },

    vfunc_startup: function() {
        this.parent();
        window = new Gtk.Window ();
        window.set_icon_name ("org.konkor.cpufreq");
        if (!window.icon) try {
            window.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/cpufreq.svg").pixbuf;
        } catch (e) {
            error (e);
        }
        this.add_window (window);
        this.build ();
    },

    vfunc_activate: function() {
        window.connect('destroy', () => {
            //remove all glib events
        });
        window.show_all ();
        window.present ();
    },

    build: function() {
        window.set_default_size (400, 600);
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (true);
        this.hb.get_style_context ().add_class ("hb");
        window.set_titlebar (this.hb);
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
    let file = Gio.File.new_for_path (path).get_parent();
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

function get_appdir () {
    let s = getCurrentFile ()[1];
    if (GLib.file_test (s + "/prefs.js", GLib.FileTest.EXISTS)) return s;
    s = GLib.get_home_dir () + "/.local/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/prefs.js", GLib.FileTest.EXISTS)) return s;
    s = "/usr/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/prefs.js", GLib.FileTest.EXISTS)) return s;
    throw "Installation not found...";
    return s;
}

function debug (msg) {
    if (msg && (DEBUG_LVL > 1)) print ("[cpufreq][manager]", msg);
}

function error (msg) {
    log ("[cpufreq][manager] (EE) " + msg);
}

settings = Convenience.getSettings ();

let app = new CPUFreqApplication (ARGV);
app.run (ARGV);
