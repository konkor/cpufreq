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
String.prototype.format = Convenience.Format.format;

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

let save = false;
let PID = -1;
let profiles = [];
let default_profile = null;

let core_event = 0;
let freq_event = 0;

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
        cpucount = Convenience.get_cpu_number ();

        save = settings.get_boolean (SAVE_SETTINGS_KEY);
        PID =  settings.get_int (PROFILE_KEY);
        this.build ();
    },

    vfunc_activate: function() {
        window.connect("destroy", () => {
            //remove all glib events
        });
        window.show_all ();
        window.present ();
        this.sidebar.post_init ();
    },

    build: function() {
        window.set_default_size (400, 200);
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
        if (pstate_present) this.pstate_build ();
        else this.acpi_build ();
        if (cpucount > 1) this.add_cores ();

        //this.show_all ();
    },

    post_init: function () {
        if (cpucount > 1)
            this.corewarn.visible = GLib.get_num_processors () == 1;
    },

    add_governors: function () {
        this.activeg = new Submenu ("Governors", "Active Governor", 0);
        //this.pack_start (this.activeg, true, true, 0);
        this.activeg.connect ("activate", Lang.bind (this, this.on_submenu));
        governors.forEach (g => {
            if (g[1] == true) this.activeg.set_label (g[0]);
            if (g[0] == "userspace") {
                this.userspace = new Submenu ("userspace", "Userspace Governor", 1);
                this.userspace.connect ("activate", Lang.bind (this, this.on_submenu));
                frequences.forEach ((freq)=>{
                    var s = "";
                    if (freq.length > 6) {
                        s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
                    } else {
                        s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
                    }
                    let u_item = new MenuItem (s);
                    this.userspace.add_menuitem (u_item);
                    u_item.connect ("clicked", Lang.bind (this, function () {
                        if (!installed) return;
                        this._changed ();
                        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " gov userspace");
                        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " set " + freq);
                        this.activeg.set_label ("userspace");
                        if (save) {
                            settings.set_string (GOVERNOR_KEY, "userspace");
                            settings.set_string (CPU_FREQ_KEY, freq.toString ());
                        }
                        this.userspace.expanded = false;
                        this.check_sliders ();
                    }));
                });
            } else {
                let gi = new MenuItem (g[0], g[0] + " governor");
                this.activeg.add_menuitem (gi);
                gi.connect ('clicked', Lang.bind (this, this.on_governor));
            }
        });
        this.add (this.activeg);
        if (this.userspace  && (frequences.length > 0)) this.add (this.userspace);
    },

    on_submenu: function (o) {
        if (o.id == 0) {
            if (this.userspace) this.userspace.expanded = false;
        } else this.activeg.expanded = false;
    },

    on_governor: function (o) {
        if (!installed) return;
        this._changed ();
        GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + ' gov ' + o.label);
        this.activeg.set_label (o.label);
        if (save) settings.set_string (GOVERNOR_KEY, o.label);
        this.activeg.expanded = false;
        this.check_sliders ();
    },

    check_sliders: function () {
        if (pstate_present) {
            this.slider_min.slider.set_value (get_min_pstate() / 100);
            this.slider_max.slider.set_value (get_max_pstate() / 100);
        } else if (this.slider_min) {
            this.slider_min.sensitive = true;
            this.slider_max.sensitive = true;
            if (this.activeg.label.indexOf ("powersave") > -1) {
                this.slider_min.slider.set_value (0);
                this.slider_max.sensitive = false;
            } else if (this.activeg.label.indexOf ("performance") > -1) {
                this.slider_max.slider.set_value (1);
                this.slider_min.sensitive = false;
            }
        }
    },

    acpi_build: function () {
        if (frequences.length > 1) {
            this.sliders_build ();
            if (this.activeg.label.indexOf ("powersave") > -1) {
                this.slider_max.sensitive = false;
                debug (this.activeg.label);
            } else if (this.activeg.label.indexOf ("performance") > -1) {
                this.slider_min.sensitive = false;
            }
        }
    },

    sliders_build: function () {
        this.add (new Gtk.Separator ());
        this.slider_min = new Slider ("Minimum", get_min_label (), "Minimum Frequency");
        this.add (this.slider_min);
        this.slider_max = new Slider ("Maximum", get_max_label (), "Maximum Frequency");
        this.add (this.slider_max);
        if (pstate_present) {
            this.slider_min.slider.set_value (minfreq/100);
            this.slider_max.slider.set_value (maxfreq/100);
        } else {
            this.slider_min.slider.set_value (get_pos (minfreq));
            this.slider_max.slider.set_value (get_pos (maxfreq));
        }
        this.slider_min.slider.connect('value_changed', Lang.bind (this, function (item) {
            if (!installed) return;
            this._changed ();
            if (item.get_value() > this.slider_max.slider.get_value()) {
                this.slider_max.slider.set_value (item.get_value ());
            }
            if (pstate_present) minfreq = Math.floor (item.get_value() * 100);
            else minfreq = get_freq (Math.floor (item.get_value() * 100));
            this.slider_min.update_info (get_label (minfreq));
            if (freq_event != 0) {
                GLib.source_remove (freq_event);
                freq_event = 0;
            }
            freq_event = GLib.timeout_add (0, 1000, set_frequencies);
        }));
        this.slider_max.slider.connect('value_changed', Lang.bind (this, function (item) {
            if (!installed) return;
            this._changed ();
            if (item.get_value() < this.slider_min.slider.get_value()) {
                this.slider_min.slider.set_value (item.get_value ());
            }
            maxfreq = get_freq (Math.floor (item.get_value() * 100));
            this.slider_max.update_info (get_label (maxfreq));
            if (freq_event != 0) {
                GLib.source_remove (freq_event);
                freq_event = 0;
            }
            freq_event = GLib.timeout_add (0, 1000, set_frequencies);
        }));
    },

    pstate_build: function () {
        this.sliders_build ();
    },

    add_cores: function () {
        this.slider_core = new Slider ("Cores Online",
            GLib.get_num_processors (), "Number Of Active Core Threads");
        this.add (this.slider_core);
        this.slider_core.slider.set_value (GLib.get_num_processors () / cpucount);
        this.corewarn = new MenuItem ("⚠ Single Core","Single Core Is Not Recommended");
        this.corewarn.get_style_context ().add_class ("warn");
        this.corewarn.xalign = 0.5;
        this.add (this.corewarn);
        this.corewarn.connect ('clicked', Lang.bind (this, function () {
            let app = Gio.AppInfo.get_default_for_type ("text/plain", false);
            app.launch_uris (["file://" + APPDIR + "/README.md"], null);
        }));
        this.slider_core.slider.connect('value_changed', Lang.bind (this, function (item) {
            if (!installed) return;
            this._changed ();
            var cc = Math.floor ((cpucount - 1) * item.get_value() + 1);
            set_cores (cc);
            this.slider_core.update_info (cc);
            this.corewarn.visible = cc == 1;
        }));
    },

    _changed: function () {
        if (PID > -1) {
            PID = -1;
            settings.set_int (PROFILE_KEY, -1);
        }
        if (this.profmenu) this.profmenu.label = "Custom";
    }
});

var Slider = new Lang.Class({
    Name: "Slider",
    Extends: Gtk.Box,

    _init: function (text, info, tooltip) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL,margin:22});
        this.margin_top = 8;
        this.margin_bottom = 8;
        this.get_style_context ().add_class ("slider-item");
        this.tooltip_text = tooltip;

        let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        box.get_style_context ().add_class ("info-item");
        this.add (box);
        this.label = new Gtk.Label ({label:"<b>"+text+"</b>", use_markup:true, xalign:0});
        box.pack_start (this.label, true, true, 0);
        this.info = new Gtk.Label ({label:"<i>" + info + "</i>", use_markup:true});
        box.pack_end (this.info, false, false, 0);
        this.slider = Gtk.Scale.new_with_range (Gtk.Orientation.HORIZONTAL, 0, 1, 0.05);
        this.get_style_context ().add_class ("slider");
        this.slider.draw_value = false;
        this.add (this.slider);

        this.show_all ();
    },

    update_info: function (info) {
        this.info.set_markup ("<i>" + info + "</i>");
    }
});

var Submenu = new Lang.Class({
    Name: "Submenu",
    Extends: Gtk.Expander,

    _init: function (text, tooltip, id) {
        this.parent ({label:text, label_fill:true, expanded:false, resize_toplevel:false});
        this.get_style_context ().add_class ("submenu");
        this.tooltip_text = tooltip;
        this.id = id;

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

    _init: function (text, tooltip) {
        tooltip = tooltip || "";
        this.parent ({label:text, tooltip_text:tooltip, xalign:0});
        this.get_style_context ().add_class ("menuitem");
    }
});

function get_label (num, n) {
    if (pstate_present) return num + "%";
    n = (typeof n !== 'undefined') ?  n : 3;
    if (num >= 1000000) {
        return (num/1000000).toFixed(n).toString() + " \u3393";
    } else {
        return (num/1000).toFixed(0).toString() + " \u3392";
    }
}

function get_min_label (n) {
    n = (typeof n !== 'undefined') ?  n : 3;
    if (pstate_present) return minfreq + "%";
    return get_label (get_min (), n);
}

function get_max_label (n) {
    n = (typeof n !== 'undefined') ?  n : 3;
    if (pstate_present) return maxfreq + "%";
    return get_label (get_max (), n);
}

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
let minfreq = 0, maxfreq = 0;
let cpucount = 1;

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
    if (pstate_present) {
        minfreq = get_min_pstate ();
        maxfreq = get_max_pstate ();
    } else {
        minfreq = get_min ();
        maxfreq = get_max ();
    }
}

function set_frequencies () {
    if (freq_event != 0) {
        GLib.source_remove (freq_event);
        freq_event = 0;
    }
    let cmin, cmax;
    if (pstate_present) {
        let save_state = save;
        save = false;
        cmin = get_min_pstate ();
        cmax = get_max_pstate ();
        save = save_state;
        debug ("%d:%d - %d:%d".format (cmin,cmax,minfreq,maxfreq));
        if ((minfreq == cmin) && (maxfreq == cmax)) return;
        if ((minfreq > cmax) && (minfreq <= maxfreq)) {
            set_max_pstate (maxfreq);
            pause (100);
            set_min_pstate (minfreq);
        } else {
            if (minfreq != cmin) set_min_pstate (minfreq);
            pause (100);
            if (maxfreq != cmax) set_max_pstate (maxfreq);
        }
    } else {
        cmin = get_coremin (0);
        cmax = get_coremax (0);
        debug ("%d:%d - %d:%d".format (cmin,cmax,minfreq,maxfreq));
        if ((minfreq == cmin) && (maxfreq == cmax)) return;
        if ((minfreq > cmax) && (minfreq <= maxfreq)) {
            set_max (maxfreq);
            pause (100);
            set_min (minfreq);
        } else {
            if (minfreq != cmin) set_min (minfreq);
            pause (100);
            if (maxfreq != cmax) set_max (maxfreq);
        }
    }
}

function get_coremin (core) {
    if (!util_present) return 0;
    var res = get_info_string (cpufreqctl_path + " coremin " + core);
    if (res) return parseInt (res);
    return 0;
}

function set_coremin (core, state) {
    if (!util_present) return false;
    try {
        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " coremin " + core + " " + state);
    } catch (e) {
        error ("Set coremin" + e.message);
        return false;
    }
    return true;
}

function get_coremax (core) {
    if (!util_present) return 0;
    var res = get_info_string (cpufreqctl_path + " coremax " + core);
    if (res) return parseInt (res);
    return 0;
}

function set_coremax (core, state) {
    if (!util_present) return false;
    try {
        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " coremax " + core + " " + state);
    } catch (e) {
        error ("Set coremax" + e.message);
        return false;
    }
    return true;
}

function get_min () {
    if (!util_present) return minimum_freq;
    if (save) return set_min (parseInt (settings.get_string (MIN_FREQ_KEY)));
    var res = get_info_string (cpufreqctl_path + " minf");
    if (res) return parseInt (res);
    return minimum_freq;
}

function set_min (minimum) {
    if ((minimum <= 0) || !Number.isInteger (minimum)) return 0;
    if (!util_present) return 0;
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " minf " + minimum.toString());
    if (save) settings.set_string (MIN_FREQ_KEY, minimum.toString());
    return minimum;
}

function get_max () {
    if (!util_present) return maximum_freq;
    if (save) return set_max (parseInt (settings.get_string (MAX_FREQ_KEY)));
    var res = get_info_string (cpufreqctl_path + " maxf");
    if (res) return parseInt (res);
    return maximum_freq;
}

function set_max (maximum) {
    if ((maximum <= 0) || !Number.isInteger (maximum)) return 0;
    if (!util_present) return 0;
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " maxf " + maximum.toString());
    if (save) settings.set_string (MAX_FREQ_KEY, maximum.toString());
    return maximum;
}

function get_min_pstate () {
    if (!util_present) return 0;
    if (save) return set_min_pstate (settings.get_int (MIN_FREQ_PSTATE_KEY));
    var res = get_info_string (cpufreqctl_path + " min");
    if (res) return parseInt (res);
    return 0;
}

function set_min_pstate (minimum) {
    if (!util_present) return 0;
    GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " min " + minimum.toString());
    if (save) settings.set_int (MIN_FREQ_PSTATE_KEY, minimum);
    return minimum;
}

function get_max_pstate () {
    if (!util_present) return 0;
    if (save) return set_max_pstate (settings.get_int (MAX_FREQ_PSTATE_KEY));
    var res = get_info_string (cpufreqctl_path + " max");
    if (res) return parseInt (res);
    return 0;
}

function set_max_pstate (maximum) {
    if (!util_present) return 100;
    GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " max " + maximum.toString());
    if (save) settings.set_int (MAX_FREQ_PSTATE_KEY, maximum);
    return maximum;
}

function set_core (core, state) {
    if (!util_present) return false;
    util_present = false;
    if (state)
        GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " on " + core);
    else
        GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " off " + core);
    util_present = true;
    return state;
}

function set_cores (count) {
    let ccore = count;
    if (core_event != 0) {
        GLib.source_remove (core_event);
        core_event = 0;
    }
    if (count == GLib.get_num_processors ()) return;
    core_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
        for (let key = 1; key < cpucount; key++) {
            set_core (key, key < ccore);
        }
        core_event = 0;
        return false;
    }));
}

function pause (msec) {
    var t = Date.now ();
    var i = 0;
    while ((Date.now () - t) < msec) i++;
}

function get_freq (num) {
    let n = frequences.length;
    let step = Math.round (100 / n);
    let i = Math.round (num / step);
    if (i >= n) i = n - 1;
    return parseInt (frequences[i]);
}

function get_pos (num) {
    let m = parseFloat (frequences[frequences.length -1]) - parseFloat (frequences[0]);
    let p = (parseFloat (num) - parseFloat (frequences[0]))/m;
    return p;
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
