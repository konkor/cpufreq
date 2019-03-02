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

imports.gi.versions.Gtk = '3.0';

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];

const cpu = imports.common.HelperCPUFreq;
const Settings = imports.common.Settings;
const InfoPanel = imports.common.ui.InfoPanel;
const ControlPanel = imports.common.ui.ControlPanel;

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
            application_id: "org.konkor.cpufreq.application"
        });
        GLib.set_application_name ("CPUFreq Manager");
        this.extension = false;
        if (args.indexOf ("--extension") > -1) this.extension = true;
    },

    vfunc_startup: function() {
        this.parent();
        this.settings = new Settings.Settings ();
        window = new Gtk.ApplicationWindow ();
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
        Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
        window.set_default_size (480, 2400);
        cssp = get_css_provider ();
        if (cssp) {
            Gtk.StyleContext.add_provider_for_screen (
                window.get_screen(), cssp, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }
        window.get_style_context ().add_class ("main");
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (!this.extension);
        this.hb.get_style_context ().add_class ("hb");
        window.set_titlebar (this.hb);

        this.prefs_button = new Gtk.Button ({always_show_image: true, tooltip_text:"Preferences"});
        this.prefs_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/application-menu-symbolic.svg");
        this.prefs_button.get_style_context ().add_class ("hb-button");
        this.prefs_button.set_relief (Gtk.ReliefStyle.NONE);
        this.hb.pack_end (this.prefs_button);

        this.cpanel = new ControlPanel.ControlPanel (this);
        //window.add (this.sidebar);
        let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        window.add (box);
        this.sidebar = new InfoPanel.InfoPanel ();
        box.pack_start (this.sidebar, true, true, 24);
        box.pack_end (this.cpanel, true, true, 8);
        this.cpanel.set_size_request (320, 160);
        this.sidebar.set_size_request (360, 160);

        if (this.extension) window.connect ("focus-out-event", ()=>{ this.quit();});
        this.prefs_button.connect ("clicked", () => {
          GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences");
        });

        this.build_menu ();
    },

    build_menu: function () {

    },

    set_accel: function (mi, accel) {

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

function debug (msg) {
    if (msg && (DEBUG_LVL > 1)) print ("[cpufreq][manager]", msg);
}

function error (msg) {
    log ("[cpufreq][manager] (EE) " + msg);
}
