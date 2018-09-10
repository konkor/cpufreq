/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2018 konkor <github.com/konkor>
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
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = get_appdir ();
imports.searchPath.unshift(APPDIR);
const cpu = imports.base.HelperCPUFreq;
const Settings = imports.base.Settings;
const InfoPanel = imports.base.ui.InfoPanel;
const ControlPanel = imports.base.ui.ControlPanel;

const Convenience = imports.convenience;

const DEBUG_LVL = 2;

let profiles = [];

let theme_gui = APPDIR + "/data/themes/default/gtk.css";
let cssp = null;
let window = null;

var CPUFreqApplication = new Lang.Class ({
    Name: "CPUFreqApplication",
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
        this.settings = new Settings.Settings ();
        window = new Gtk.Window ();
        window.set_icon_name ("org.konkor.cpufreq");
        if (!window.icon) try {
            window.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/cpufreq.svg").pixbuf;
        } catch (e) {
            error (e);
        }
        this.add_window (window);

        cpu.init (this.settings);

        //save = settings.get_boolean (SAVE_SETTINGS_KEY);
        //PID =  settings.get_int (PROFILE_KEY);
        this.build ();
    },

    vfunc_activate: function() {
        window.connect("destroy", () => {
            //remove all glib events
        });
        window.show_all ();
        window.present ();
        this.cpanel.post_init ();
    },

    build: function() {
        window.window_position = Gtk.WindowPosition.MOUSE;
        window.set_default_size (480, 2400);
        cssp = get_css_provider ();
        if (cssp) {
            Gtk.StyleContext.add_provider_for_screen (
                window.get_screen(), cssp, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }
        window.get_style_context ().add_class ("main");
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (false);
        this.hb.get_style_context ().add_class ("hb");
        window.set_titlebar (this.hb);
        this.cpanel = new ControlPanel.ControlPanel (this);
        //window.add (this.sidebar);
        let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        window.add (box);
        this.sidebar = new InfoPanel.InfoPanel ();
        box.pack_start (this.sidebar, false, false, 8);
        box.pack_end (this.cpanel, true, true, 0);
        this.cpanel.set_size_request (320, 160);
        this.sidebar.set_size_request (48, 160);

        window.connect ("focus-out-event", ()=>{ this.quit();});
    },

    get cpufreq () {
        return cpu;
    }
});

function get_css_provider () {
    let cssp = new Gtk.CssProvider ();
    let css_file = Gio.File.new_for_path (theme_gui);
    try {
        cssp.load_from_file (css_file);
    } catch (e) {
        debug (e);
        cssp = null;
    }
    return cssp;
}

function getCurrentFile () {
    let stack = (new Error()).stack;
    let stackLine = stack.split("\n")[1];
    if (!stackLine)
        throw new Error ("Could not find current file");
    let match = new RegExp ("@(.+):\\d+").exec(stackLine);
    if (!match)
        throw new Error ("Could not find current file");
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
