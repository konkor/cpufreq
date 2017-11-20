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
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = get_appdir ();
imports.searchPath.unshift(APPDIR);

const Convenience = imports.convenience;

const DEBUG_LVL = 2;
const SAVE_SETTINGS_KEY = 'save-settings';
const TURBO_BOOST_KEY = 'turbo-boost';
const GOVERNOR_KEY = 'governor';
const CPU_FREQ_KEY = 'cpu-freq';
const MIN_FREQ_KEY = 'min-freq';
const MAX_FREQ_KEY = 'max-freq';
const MIN_FREQ_PSTATE_KEY = 'min-freq-pstate';
const MAX_FREQ_PSTATE_KEY = 'max-freq-pstate';
const PROFILES_KEY = 'profiles';
const PROFILE_KEY = 'profile';
const TITLE_KEY = 'title';
const MONITOR_KEY = 'monitor';

let theme_gui = APPDIR + "/data/themes/default/gtk.css";
let cssp = null;
let settings = null;
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
        window = new Gtk.Window ();
        window.set_icon_name ("org.konkor.cpufreq");
        if (!window.icon) try {
            window.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/cpufreq.svg").pixbuf;
        } catch (e) {
            error (e);
        }
        this.add_window (window);
        let res = get_info_string (APPDIR + "/cpufreqctl driver");
        if (res && GLib.file_test ("/sys/devices/system/cpu/cpu0/cpufreq/scaling_driver", GLib.FileTest.EXISTS)) {
            util_present = true;
            if (res == "intel_pstate") pstate_present = true;
        }
        check_install ();
        get_governors ();
        get_frequences ();
        this.build ();
    },

    vfunc_activate: function() {
        window.connect("destroy", () => {
            //remove all glib events
        });
        window.show_all ();
        window.present ();
    },

    build: function() {
        //window.set_default_size (400, 600);
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
        this.sidebar = new Sidebar ();
        window.add (this.sidebar);
    }
});

var Sidebar = new Lang.Class({
    Name: "Sidebar",
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL});
        this.get_style_context ().add_class ("sb");

        this.add_governors ();

        //this.show_all ();
    },

    add_governors: function () {
        this.activeg = new Submenu ("Governors", "Active Governor", 0);
        //this.pack_start (this.activeg, true, true, 0);
        governors.forEach (g => {
            if (g[1] == true) this.activeg.set_label (g[0]);
            if (g[0] == "userspace") {
                this.userspace = new Submenu ("userspace", "Userspace Governor", 1);
                frequences.forEach ((freq)=>{
                    var s = "";
                    if (freq.length > 6) {
                        s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
                    } else {
                        s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
                    }
                    let u_item = new MenuItem (s);
                    this.userspace.add_menuitem (u_item);
                    u_item.connect ("activate", Lang.bind (this, function () {
                        if (!installed) return;
                        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " gov userspace");
                        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " set " + f);
                        if (save) {
                            settings.set_string (GOVERNOR_KEY, "userspace");
                            settings.set_string (CPU_FREQ_KEY, f.toString ());
                        }
                    }));
                });
            } else {
                let gi = new MenuItem (g[0]);
                this.activeg.add_menuitem (gi);
            }
        });
        this.add (this.activeg);
        if (this.userspace  && (frequences.length > 0)) this.add (this.userspace);
    }
});

var Submenu = new Lang.Class({
    Name: "Submenu",
    Extends: Gtk.Expander,

    _init: function (text, tooltip, id) {
        this.parent ({label:text, label_fill:true, expanded:false, resize_toplevel:true});
        this.get_style_context ().add_class ("submenu");

        this.scroll = new Gtk.ScrolledWindow ();
        this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
        this.scroll.shadow_type = Gtk.ShadowType.NONE;
        //this.add (this.scroll);

        this.section = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
        this.section.get_style_context ().add_class ("submenu-section");
        this.add (this.section);
        //this.scroll.add (this.section);

        //this.show_all ();
    },

    add_menuitem: function (menuitem) {
        this.section.add (menuitem);
    },

    set_label: function (text) {
        text = text || "";
        this.label = "\u26A1 " + text;
    }
});

var MenuItem = new Lang.Class({
    Name: "MenuItem",
    Extends: Gtk.Button,

    _init: function (text) {
        this.parent ({label:text, xalign:0});
        this.get_style_context ().add_class ("menuitem");
    }
});

let governors = [];
let governoractual = "";
let util_present = false;
let pstate_present = false;
let cpufreqctl_path = null;
let pkexec_path = null;
let installed = false;
let updated = true;
let frequences = [];
let minimum_freq = 0;
let maximum_freq = 0;

function check_install () {
    pkexec_path = GLib.find_program_in_path ("pkexec");
    cpufreqctl_path = GLib.find_program_in_path ("cpufreqctl");
    installed = false;
    updated = true;
    if (!cpufreqctl_path)
        cpufreqctl_path = APPDIR + "/cpufreqctl";
    else
        installed = true;
    if (!GLib.file_test ("/usr/share/polkit-1/actions/konkor.cpufreq.policy", GLib.FileTest.EXISTS)) {
        installed = false;
    }
    if (!pkexec_path) installed = false;
    if (installed) {
        let localctl = null, globalctl = null;
        globalctl = get_info_string ("/usr/bin/cpufreqctl version");
        localctl = get_info_string (APPDIR + "/cpufreqctl version");
        if (localctl != globalctl) updated = false;
    }
}

function get_governors () {
    let governorslist = [], gn = [], gc = [], idx = 0, res = "";
    governors = [];
    governoractual = "";
    if (!util_present) return governors;
    res = get_info_string (this.cpufreqctl_path + " list");
    if (res) governorslist = res.split(" ");
    res = get_info_string (this.cpufreqctl_path + " gov");
    if (res) governoractual = res.toString();
    governorslist.forEach ((governor)=> {
        if (governor.length == 0) return;
        let governortemp;
        if (this.governoractual.indexOf (governor) > -1)
            governortemp = [governor, true];
        else
            governortemp = [governor, false];
        governors.push (governortemp);
    });
    governoractual.split(" ").forEach ((governor)=> {
        idx = -1;
        for (let i = 0; i < gn.length; i++)
            if (gn.indexOf (governor) > -1)
                idx = i;
        if (idx > -1) {
            gc[idx]++;
        } else {
            gn.push (governor);
            gc.push (1);
        }
    });
    governoractual = "";
    if (gn.length > 1) {
        for (let i = 0; i < gn.length; i++) {
            if (i > 0 && (i % 2 == 0))
                governoractual += "\n" + gc[i].toString() + " " + gn[i];
            else
                governoractual += " " + gc[i].toString() + " " + gn[i];
        }
        governoractual = governoractual.trim();
    }
    return governors;
}

function get_frequences () {
    let frequenceslist = [];
    frequences = [];
    if (!util_present) return;
    frequenceslist = get_info_string (this.cpufreqctl_path + " freq");
    if (!frequenceslist) return;
    frequenceslist = frequenceslist.split (" ");
    frequenceslist.forEach ((freq)=> {
        if (freq.length > 0)
            if (parseInt (freq) > 0) frequences.unshift (freq);
    });
    if (frequences.length > 0) {
        minimum_freq = frequences[0];
        maximum_freq = frequences[frequences.length - 1];
    }
}

let cmd_out, info_out;
function get_info_string (cmd) {
    cmd_out = GLib.spawn_command_line_sync (cmd);
    if (cmd_out[0]) info_out = cmd_out[1].toString().split("\n")[0];
    if (info_out) return info_out;
    return "";
}

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

settings = Convenience.getSettings ();

let app = new CPUFreqApplication (ARGV);
app.run (ARGV);
