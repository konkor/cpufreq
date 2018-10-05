/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Author (C) 2016-2018 konkor <kapa76@gmail.com>
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

const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

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
const MONITOR_KEY = 'monitor';
const EPROFILES_KEY = 'event-profiles';
const SETTINGS_ID = 'org.gnome.shell.extensions.cpufreq';
const ExtensionUtils = imports.misc.extensionUtils;
const ExtensionSystem = imports.ui.extensionSystem;
const Me = ExtensionUtils.getCurrentExtension ();
const EXTENSIONDIR = Me.dir.get_path ();
const Convenience = Me.imports.convenience;

let event = 0;
let install_event = 0;
let core_event = 0;
let freq_event = 0;
let info_event = 0;
let monitor_event = 0;
let monitorID = 0, saveID, powerID, eprofilesID;
let save = false;
let cpucount = 1;
let freqInfo = null;
let cpufreq_output = null;
let cmd = null;
let ccore = 0;
let profiles = [];
let default_profile = null;
let minfreq = 0, maxfreq = 0; //new values
let monitor_timeout = 500;
let eprofiles = [
    {percent:0, event:0, guid:""},
    {percent:100, event:1, guid:""}
];
let first_boot = true;

const UP_BUS_NAME = 'org.freedesktop.UPower';
const UP_OBJECT_PATH = '/org/freedesktop/UPower/devices/DisplayDevice';
const DisplayDeviceInterface = '<node> \
<interface name="org.freedesktop.UPower.Device"> \
  <property name="Type" type="u" access="read"/> \
  <property name="State" type="u" access="read"/> \
  <property name="Percentage" type="d" access="read"/> \
  <property name="TimeToEmpty" type="x" access="read"/> \
  <property name="TimeToFull" type="x" access="read"/> \
  <property name="IsPresent" type="b" access="read"/> \
  <property name="IconName" type="s" access="read"/> \
</interface> \
</node>';
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const BUS_NAME = 'org.konkor.cpufreq.service';
const OBJECT_PATH = '/org/konkor/cpufreq/service';
const CpufreqServiceIface = '<node> \
<interface name="org.konkor.cpufreq.service"> \
<property name="Frequency" type="t" access="read"/> \
<signal name="FrequencyChanged"> \
  <arg name="title" type="s"/> \
</signal> \
</interface> \
</node>';
const CpufreqServiceProxy = Gio.DBusProxy.makeProxyWrapper (CpufreqServiceIface);

const FrequencyIndicator = new Lang.Class({
    Name: 'Cpufreq',
    Extends: PanelMenu.Button,

    _init: function () {
        this.parent (0.0, "CPU Frequency Indicator", false);
        let saves = true;

        this._settings = Convenience.getSettings();

        this.statusLabel = new St.Label ({text: "\u26A0", y_expand: true, y_align: Clutter.ActorAlign.CENTER});
        let _box = new St.BoxLayout();
        _box.add_actor(this.statusLabel);
        this.actor.add_actor(_box);
        this.actor.connect('button-press-event', Lang.bind(this, function () {
            if (this._is_events () || !this.menu.isOpen) return;
            if (this.util_present) {
                let gcount = 0, saves = save;
                this.governors = this._get_governors ();
                if (this.governors.length > 0) {
                    this.governors.forEach ( (governor)=>{
                        if (governor[1] == true) {
                            this.activeg.label.text = "\u26A1 " + governor[0];
                            gcount++;
                        }
                    });
                    if (gcount > 1) this.activeg.label.text = "\u26A1 mixed";
                }
                if (this.info) this.info.update (this.governoractual);
                save = false;
                if (this.pstate_present) {
                    this.slider_min.setValue (this._get_min_pstate () / 100);
                    this.slider_max.setValue (this._get_max_pstate () / 100);
                    this.label_min.set_text (Math.floor (this.slider_min.value * 100).toString() + "%");
                    this.label_max.set_text (Math.floor (this.slider_max.value * 100).toString() + "%");
                    if (this.boost_present) this.turbo_switch.setToggleState (this._get_turbo ());
                } else {
                    if (this.boost_present) this.boost_switch.setToggleState (this._get_boost ());
                    if (this.slider_min) {
                        let f = this._get_coremin (0);
                        this.slider_min.setValue (this._get_pos (f));
                        this.label_min.set_text (this._get_label (f));
                        f = this._get_coremax (0);
                        this.slider_max.setValue (this._get_pos (f));
                        this.label_max.set_text (this._get_label (f));
                    }
                }
                if (this.slider_core) {
                    this.slider_core.setValue (GLib.get_num_processors () / cpucount);
                    var cc = Math.floor ((cpucount - 1) * this.slider_core.value + 1);
                    this.coremenu.set_text (cc);
                    this.corewarn.actor.visible = (cc == 1) ? true : false;
                }
                save = saves;
            }
        }));
        this.cpufreqctl_path = null;
        cpucount = Convenience.get_cpu_number ();
        this.util_present = false;
        this.pstate_present = false;
        this.boost_present = false;
        this.installed = false;
        this.updated = true;
        this.governorslist = [];
        this.frequences = [];
        // min/max posible values
        this.minimum_freq = -1;
        this.maximum_freq = -1;
        this.edit_item = null;

        freqInfo = null;
        cpufreq_output = GLib.spawn_command_line_sync (EXTENSIONDIR + "/cpufreqctl driver");
        if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
        if (freqInfo && GLib.file_test ("/sys/devices/system/cpu/cpu0/cpufreq/scaling_driver", GLib.FileTest.EXISTS)) {
            this.util_present = true;
            if (freqInfo == 'intel_pstate') {
                this.pstate_present = true;
            }
        }

        this._check_install ();
        this._check_extensions ();

        save = this._settings.get_boolean (SAVE_SETTINGS_KEY);
        this.PID =  this._settings.get_int (PROFILE_KEY);
        let profs =  this._settings.get_string (PROFILES_KEY);
        if (profs.length > 0) profiles = JSON.parse (profs);
        if (!default_profile) default_profile = this._get_profile ('Default');
        this.get_power_profiles ();
        monitor_timeout =  this._settings.get_int (MONITOR_KEY);
        if (save && !first_boot) {
            saves = save;
            save = false;
        }
        this._build_ui ();
        if (saves != save) save = saves;
        //print ("First boot:", first_boot);
        if (save && first_boot) this._load_settings ();
        first_boot = false;
        //print (profs);

        this._add_event ();
        this.menu.connect ('open-state-changed', Lang.bind (this, this._on_menu_state_changed));
        if (monitorID) this._settings.disconnect (monitorID);
        monitorID = this._settings.connect ("changed::" + MONITOR_KEY, Lang.bind (this, function() {
            monitor_timeout = this._settings.get_int (MONITOR_KEY);
            if (monitor_event) {
                GLib.source_remove (monitor_event);
                monitor_event = 0;
            }
            monitor_event = GLib.timeout_add (100, 1000, Lang.bind (this, this._add_event));
        }));
        if (saveID) this._settings.disconnect (saveID);
        saveID = this._settings.connect ("changed::" + SAVE_SETTINGS_KEY, Lang.bind (this, function() {
            save = this._settings.get_boolean (SAVE_SETTINGS_KEY);
            this.save_switch.setToggleState (save);
        }));
        eprofilesID = this._settings.connect ("changed::" + EPROFILES_KEY, Lang.bind (this, this.get_power_profiles));
        //this.power = Main.panel.statusArea["aggregateMenu"]._power._proxy;
        //if (this.power) powerID = this.power.connect ('g-properties-changed', Lang.bind (this, this.on_power_state));
        this.power = new PowerManagerProxy (Gio.DBus.system, UP_BUS_NAME, UP_OBJECT_PATH, Lang.bind (this, function (proxy, e) {
            if (e) {
                log(e.message);
                return;
            }
            powerID = this.power.connect ('g-properties-changed', Lang.bind (this, this.on_power_state));
            this.on_power_state ();
        }));
    },

    _on_menu_state_changed: function (source, state) {
        if (state) {
            info_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
                this.info.update (this.governoractual);
                return true;
            }));
        } else {
            GLib.source_remove (info_event);
            info_event = 0;
            Clutter.ungrab_keyboard ();
        }
    },

    on_power_state: function () {
        let id = -1;
        //print ("on_power_state", this.power.State, this.power.Percentage);
        if (this.power.State == 1 || this.power.State == 4) {
            id = this.get_profile_id (eprofiles[0].guid);
            if (id == -1 || id == this.PID) return;
            if (this.power.Percentage >= eprofiles[0].percent) {
                this._load_profile (profiles[id]);
                this.PID = id;
            }
        } else if (this.power.State == 2) {
            id = this.get_profile_id (eprofiles[1].guid);
            if (id == -1 || id == this.PID) return;
            if (this.power.Percentage <= eprofiles[1].percent) {
                this._load_profile (profiles[id]);
                this.PID = id;
            }
        }
    },

    get_power_profiles: function () {
        let s = this._settings.get_string (EPROFILES_KEY);
        if (s) eprofiles = JSON.parse (s);
    },

    get_profile_id: function (guid) {
        for (let i = 0; i < profiles.length; i++) {
            if (profiles[i].guid == guid) return i;
        }
        return -1;
    },

    _is_events: function () {
        if (install_event > 0) return true;
        if (core_event > 0) return true;
        if (freq_event > 0) return true;
        return false;
    },

    _check_install: function () {
        this.cpufreqctl_path = GLib.find_program_in_path ('cpufreqctl');
        this.installed = false;
        this.updated = true;
        if (!this.cpufreqctl_path) {
            this.cpufreqctl_path = EXTENSIONDIR + '/cpufreqctl';
        } else {
            this.installed = true;
        }
        if (!GLib.file_test ("/usr/share/polkit-1/actions/konkor.cpufreq.policy", GLib.FileTest.EXISTS)) {
            this.installed = false;
        }
        if (this.installed) {
            let localctl = null, globalctl = null;
            cpufreq_output = GLib.spawn_command_line_sync ("/usr/bin/cpufreqctl version");
            if (cpufreq_output[0]) globalctl = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            cpufreq_output = GLib.spawn_command_line_sync (EXTENSIONDIR + "/cpufreqctl version");
            if (cpufreq_output[0]) localctl = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (localctl != globalctl) {
                this.updated = false;
            }
        }
    },

    _install: function () {
        cmd = EXTENSIONDIR + '/cpufreqctl install';
        Util.trySpawnCommandLine (cmd);
        if (install_event != 0) {
            GLib.source_remove (install_event);
        }
        install_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
            this._check_install ();
            if (this.installed && this.updated) {
                try {
                    this.remove_events ();
                    ExtensionSystem.reloadExtension (Me);
                    print ("Reloading completed");
                } catch (e) {
                    print ("Error reloading extension", e.message);
                }
            }
            return (!this.installed || !this.updated);
        }));
    },

    _check_extensions: function () {
        if (this.util_present) {
            let default_boost = this.pstate_present ? this._get_turbo () : this._get_boost ();
            if (default_boost == false) {
                if (this.pstate_present) this._set_turbo (true);
                else this._set_boost (true);
                let new_state = this.pstate_present ? this._get_turbo () : this._get_boost ();
                if (default_boost != new_state) {
                    this.boost_present = true;
                    if (this.pstate_present) this._set_turbo (false);
                    else this._set_boost (false);
                }
            } else {
                this.boost_present = true;
            }
        }
    },

     _add_event: function () {
        if (this.proxy) {
            if (event) this.proxy.disconnectSignal (event);
            delete this.proxy;
            this.proxy = null;
            event = 0;
        }
        if (monitor_timeout > 0) {
            if (!GLib.spawn_command_line_async (EXTENSIONDIR + "/cpufreq-service")) {
                log ("Unable to start cpufreq service...");
                return;
            }
            this.proxy = new CpufreqServiceProxy (Gio.DBus.session, BUS_NAME, OBJECT_PATH, Lang.bind (this, function (proxy, e) {
                if (e) {
                    log (e.message);
                    return;
                }
                event = this.proxy.connectSignal ('FrequencyChanged', Lang.bind(this, function (o, s, title) {
                    if (title) this.statusLabel.set_text (title.toString());
                }));
            }));
        }
    },

    _build_ui: function () {
        this._build_popup ();
    },

    _load_settings: function () {
        if (!this.util_present) return;
        if (this.PID >= profiles.length) this.PID = profiles.length - 1;
        if (this.PID > -1) {
            this._load_profile (profiles[this.PID]);
            return;
        }
        var gov = this._settings.get_string (GOVERNOR_KEY);
        var freq = this._settings.get_string (CPU_FREQ_KEY);
        var cores = [];
        for (let key = 0; key < cpucount; key++) {
            let core = {g:gov,a:minfreq,b:maxfreq};
            if (gov == "userspace") core = {g:gov,a:freq,b:freq};
            cores.push (core);
        }
        var p = {name:"Saved settings",minf:minfreq,maxf:maxfreq,turbo:this._get_boost(),cpu:cpucount,acpi:!this.pstate_present,core:cores};
        this._load_profile (p);
    },

    _build_popup: function () {
        this.menu.removeAll ();
        if (this.util_present) {
            this.governors = this._get_governors ();
            this.frequences = this._get_frequences ();
            this.activeg = new PopupMenu.PopupSubMenuMenuItem ("Governors", false);
            this.coremenu = new CoreInfoItem (GLib.get_num_processors ());
            this.profmenu = new PopupMenu.PopupSubMenuMenuItem (default_profile.name, false);
            this.corewarn = null;
            this.slider_min = null;
            this.slider_max = null;
            this.slider_core = null;
            this.label_min = null;
            this.label_max = null;
            let slider_lock = false;
            let userspace = null;
            this.turbo_switch = null;
            this.boost_switch = null;

            this.info = new InfoItem ();
            this.menu.addMenuItem (this.info);
            this.menu.addMenuItem (this.activeg);
            if (this.pstate_present) {
                minfreq = this._get_min_pstate ();
                maxfreq = this._get_max_pstate ();
                this.slider_min = new Slider.Slider (minfreq / 100);
                this.slider_max = new Slider.Slider (maxfreq / 100);
            } else {
                minfreq = this._get_min ();
                maxfreq = this._get_max ();
                if (this.frequences.length > 1) {
                    this.slider_min = new Slider.Slider (this._get_pos (minfreq));
                    this.slider_max = new Slider.Slider (this._get_pos (maxfreq));
                }
            }
            if (this.governors.length > 0) {
                this.governors.forEach ((governor)=>{
                    if (governor[1] == true) {
                        this.activeg.label.text = governor[0];
                    }
                    if ((governor[0] == 'userspace') && (this.frequences.length > 0)) {
                        userspace = new PopupMenu.PopupSubMenuMenuItem('userspace', false);
                        this.frequences.forEach ((freq)=>{
                            let f = freq;
                            var s = '';
                            if (freq.length > 6) {
                                s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
                            } else {
                                s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
                            }
                            let u_item = new PopupMenu.PopupMenuItem (s);
                            userspace.menu.addMenuItem (u_item);
                            u_item.connect ('activate', Lang.bind (this, function () {
                                this._changed ();
                                    GLib.spawn_command_line_async (this.cpufreqctl_path + ' gov userspace');
                                    let cmd = this.cpufreqctl_path + ' set ' + f;
                                    global.log (cmd);
                                    Util.trySpawnCommandLine (cmd);
                                    if (save) {
                                        this._settings.set_string (GOVERNOR_KEY, 'userspace');
                                        this._settings.set_string (CPU_FREQ_KEY, f.toString ());
                                    }
                                    if (this.slider_min) {
                                        this.slider_min.actor.reactive = true;
                                        this.slider_min.actor.opacity = 255;
                                        this.slider_max.actor.reactive = true;
                                        this.slider_max.actor.opacity = 255;
                                    }
                            }));
                        });
                    } else {
                        let governorItem = new PopupMenu.PopupMenuItem (governor[0]);
                        this.activeg.menu.addMenuItem (governorItem);
                        governorItem.connect ('activate', Lang.bind (this, function () {
                            this._changed ();
                            let cmd = this.cpufreqctl_path + ' gov ' + governorItem.label.text;
                            global.log (cmd);
                            GLib.spawn_command_line_async (cmd);
                            if (save) this._settings.set_string(GOVERNOR_KEY, governorItem.label.text);
                            if (this.pstate_present) {
                                slider_lock = true;
                                this.slider_min.setValue (this._get_min_pstate () / 100);
                                this.slider_max.setValue (this._get_max_pstate () / 100);
                                slider_lock = false;
                            } else if (this.slider_min) {
                                this.slider_min.actor.reactive = true;
                                this.slider_min.actor.opacity = 255;
                                this.slider_max.actor.reactive = true;
                                this.slider_max.actor.opacity = 255;
                                if (governorItem.label.text == 'powersave') {
                                    this.slider_min.setValue (0);
                                    this.label_min.set_text (this._get_label (this.minimum_freq));
                                    this._set_min (this.minimum_freq);
                                    this.slider_max.actor.reactive = false;
                                    this.slider_max.actor.opacity = 50;
                                } else if (governorItem.label.text == 'performance') {
                                    this.slider_max.setValue (1);
                                    this.label_max.set_text (this._get_label (this.maximum_freq));
                                    this._set_max (this.maximum_freq);
                                    this.slider_min.actor.reactive = false;
                                    this.slider_min.actor.opacity = 50;
                                }
                            }
                        }));
                    }
                });
            }
            if (userspace != null) this.menu.addMenuItem (userspace);
            if (this.pstate_present) {
                if (this.boost_present) {
                    this.turbo_switch = new TurboSwitchMenuItem ('Turbo Boost', this._get_turbo ());
                    this.turbo_switch.connect ('toggled', Lang.bind (this, function (item) {
                        this._changed ();
                        this._set_turbo (item.state);
                    }));
                }
                this.menu.addMenuItem (new SeparatorItem ());
                this.label_min = new InfoMenuItem ("Minimum", this._get_min_pstate () + "%");
                this.menu.addMenuItem (this.label_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (this.slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                this.slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (item.value > this.slider_max.value) {
                        this.slider_max.setValue (item.value);
                        this.slider_max.emit ('value-changed', item.value);
                    }
                    minfreq = Math.floor (item.value * 100);
                    this.label_min.set_text (minfreq.toString() + "%");
                    if (freq_event != 0) {
                        GLib.source_remove (freq_event);
                        freq_event = 0;
                    }
                    freq_event = GLib.timeout_add (0, 1000, Lang.bind (this, this.set_frequencies));
                }));
                this.label_max = new InfoMenuItem ("Maximum", this._get_max_pstate () + "%");
                this.menu.addMenuItem (this.label_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (this.slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                this.slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (item.value < this.slider_min.value) {
                        this.slider_min.setValue (item.value);
                        this.slider_min.emit ('value-changed', item.value);
                    }
                    maxfreq = Math.floor (item.value * 100);
                    this.label_max.set_text (maxfreq.toString() + "%");
                    if (freq_event != 0) {
                        GLib.source_remove (freq_event);
                        freq_event = 0;
                    }
                    freq_event = GLib.timeout_add (0, 1000, Lang.bind (this, this.set_frequencies));
                }));
            } else if (this.boost_present) {
                this.boost_switch = new TurboSwitchMenuItem ('Turbo Boost', this._get_boost ());
                this.boost_switch.connect ('toggled', Lang.bind (this, function (item) {
                    this._changed ();
                    this._set_boost (item.state);
                }));
            }
            if (!this.pstate_present && (this.frequences.length > 1)) {
                this.menu.addMenuItem (new SeparatorItem ());
                this.label_min = new InfoMenuItem ("Minimum", this._get_min_label ());
                this.menu.addMenuItem (this.label_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (this.slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                this.slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (item.value > this.slider_max.value) {
                        this.slider_max.setValue (item.value);
                        this.slider_max.emit('value-changed', item.value);
                    }
                    minfreq = this._get_freq (Math.floor (item.value * 100));
                    this.label_min.set_text (this._get_label (minfreq));
                    if (freq_event != 0) {
                        GLib.source_remove (freq_event);
                        freq_event = 0;
                    }
                    freq_event = GLib.timeout_add (0, 1000, Lang.bind (this, this.set_frequencies));
                }));
                this.label_max = new InfoMenuItem ("Maximum", this._get_max_label ());
                this.menu.addMenuItem (this.label_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (this.slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                this.slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (item.value < this.slider_min.value) {
                        this.slider_min.setValue (item.value);
                        this.slider_min.emit('value-changed', item.value);
                    }
                    maxfreq = this._get_freq (Math.floor (item.value * 100));
                    this.label_max.set_text (this._get_label (maxfreq));
                    if (freq_event != 0) {
                        GLib.source_remove (freq_event);
                        freq_event = 0;
                    }
                    freq_event = GLib.timeout_add (0, 1000, Lang.bind (this, this.set_frequencies));
                }));
            }
            if (this.slider_min && !this.pstate_present) {
                if (this.activeg.label.text == 'powersave') {
                    this.slider_max.actor.reactive = false;
                    this.slider_max.actor.opacity = 50;
                } else if (this.activeg.label.text == 'performance') {
                    this.slider_min.actor.reactive = false;
                    this.slider_min.actor.opacity = 50;
                }
            }
            if (cpucount > 1) {
                //this.menu.addMenuItem (new PopupMenu.PopupSeparatorMenuItem ());
                this.menu.addMenuItem (this.coremenu);
                let menu_core = new PopupMenu.PopupBaseMenuItem ({activate: false});
                this.slider_core = new Slider.Slider (GLib.get_num_processors () / cpucount);
                menu_core.actor.add (this.slider_core.actor, {expand: true});
                this.menu.addMenuItem (menu_core);
                this.corewarn = new PopupMenu.PopupMenuItem ("⚠ Single Core Is Not Recommended");
                this.corewarn.actor.effect = new Clutter.ColorizeEffect (new Clutter.Color({red: 47, green: 4, blue: 4}), 0.75);
                this.corewarn.actor.visible = false;
                this.menu.addMenuItem (this.corewarn);
                this.corewarn.connect ('activate', Lang.bind (this, function () {
                    cmd = "gedit --new-window " + EXTENSIONDIR + "/README.md +20";
                    Util.trySpawnCommandLine (cmd);
                }));
                this.slider_core.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    var cc = Math.floor ((cpucount - 1) * item.value + 1);
                    this._set_cores (cc);
                    this.coremenu.set_text (cc);
                    this.corewarn.actor.visible = (cc == 1) ? true : false;
                }));
            }
            if (this.boost_present || this.pstate_present) {
                //this.menu.addMenuItem (new SeparatorItem ());
            }
            if (this.boost_switch) this.menu.addMenuItem (this.boost_switch);
            if (this.turbo_switch) this.menu.addMenuItem (this.turbo_switch);
            //Profiles menu
            let newItem = new NewMenuItem ("New ...", "", "Profile Name");
            this.profmenu.menu.addMenuItem (newItem);
            newItem.connect ('save', Lang.bind (this, function () {
                profiles.push (this._get_profile (newItem.entry.text));
                this._add_profile (profiles.length -1);
                this._settings.set_string (PROFILES_KEY, JSON.stringify (profiles));
            }));
            this.menu.addMenuItem (new SeparatorItem ());
            this.menu.addMenuItem (this.profmenu);
            let resetItem = new PopupMenu.PopupMenuItem (default_profile.name);
            this.profmenu.menu.addMenuItem (resetItem);
            resetItem.connect ('activate', Lang.bind (this, function () {
                this._load_profile (default_profile);
                if (save && (this.PID != -1)) this._settings.set_int (PROFILE_KEY, -1);
                this.PID = -1;
            }));
            for (let p in profiles) {
                if (!profiles[p].guid) {
                    profiles[p].guid = Gio.dbus_generate_guid ();
                    this._settings.set_string (PROFILES_KEY, JSON.stringify (profiles));
                }
                this._add_profile (p);
            }
            if (!this.installed || !this.updated) {
                let updates_txt = "";
                if (!this.updated) updates_txt = " updates";
                this.menu.addMenuItem (new SeparatorItem ());
                let mi_install = new PopupMenu.PopupMenuItem ("\u26a0 Install" + updates_txt + "...");
                this.menu.addMenuItem (mi_install);
                mi_install.connect ('activate', Lang.bind (this, function () {
                    this._install ();
                }));
            } else {
                this.menu.addMenuItem (new SeparatorItem ());
                let sm = new PopupMenu.PopupSubMenuMenuItem('Preferences', false);
                this.menu.addMenuItem (sm);
                this.save_switch = new PopupMenu.PopupSwitchMenuItem('Remember settings', save);
                sm.menu.addMenuItem (this.save_switch);
                this.save_switch.connect ('toggled', Lang.bind (this, function (item) {
                    save = item.state;
                    this._settings.set_boolean(SAVE_SETTINGS_KEY, item.state);
                    if (save && this.PID == -1)
                        this._save_profile (this._get_profile ("Current"));
                }));
                this.prefs = new PopupMenu.PopupMenuItem ("Preferences...");
                sm.menu.addMenuItem (this.prefs);
                this.prefs.connect ('activate', Lang.bind (this, function () {
                    GLib.spawn_command_line_async ('gnome-shell-extension-prefs ' + Me.uuid);
                    this.emit ('activate');
                }));
                let mi_reload = new PopupMenu.PopupMenuItem ("Reload");
                sm.menu.addMenuItem (mi_reload);
                mi_reload.connect ('activate', Lang.bind (this, function () {
                    try {
                        this.remove_events ();
                        ExtensionSystem.reloadExtension (Me);
                        print ("Reloading completed");
                    } catch (e) {
                        print ("Error reloading extension", e.message);
                    }
                }));
            }
            this.menu.addMenuItem (new SupportMenuItem ());

        } else {
            let errorItem = new PopupMenu.PopupMenuItem ("\u26a0 Please install cpufrequtils or cpupower");
            this.menu.addMenuItem (errorItem);
        }
    },

    _changed: function () {
        if (this.PID > -1) {
            this.PID = -1;
            this._settings.set_int (PROFILE_KEY, -1);
        }
        if (this.profmenu) this.profmenu.label.text = "Custom";
    },

    _add_profile: function (idx) {
        let prfItem = new ProfileMenuItem (profiles[idx].name);
        prfItem.ID = idx;
        this.profmenu.menu.addMenuItem (prfItem);
        prfItem.connect ('activate', Lang.bind (this, function (o) {
            //this.profmenu.label.text = o.label.text;
            this._load_profile (profiles[o.ID]);
            this.PID = o.ID;
            this._settings.set_int (PROFILE_KEY, this.PID);
        }));
        prfItem.connect ('edit', Lang.bind (this, function (o) {
            if (this.edit_item && this.edit_item.edit_mode && this.edit_item.ID != o.ID) this.edit_item.toggle ();
            this.edit_item = o;
        }));
        prfItem.connect ('update', Lang.bind (this, function (o) {
            profiles[o.ID] = this._get_profile (o.label.text);
            this._settings.set_string (PROFILES_KEY, JSON.stringify (profiles));
        }));
        prfItem.connect ('delete', Lang.bind (this, function (o) {
            var id  = parseInt (o.ID);
            if (this.PID > -1) {
                if (id == this.PID) this.PID = -1;
                if (this.PID > id) this.PID--;
                this._settings.set_int (PROFILE_KEY, this.PID);
            }
            profiles.splice (o.ID, 1);
            this._settings.set_string (PROFILES_KEY, JSON.stringify (profiles));
            o.destroy ();
            let items = this.profmenu.menu.box.get_children ().map (function(actor) {return actor._delegate;});
            id += 2;
            for (let key = id; key < items.length; key++){
                let item = items[key];
                item.ID -= 1;
            }
        }));
    },

    _get_profile: function (pname) {
        let save_state = save;
        let cores = [];
        let boost = true;
        let minf = 0, maxf = 100;
        save = false;
        if (this.pstate_present) boost = this._get_turbo ();
        else boost = this._get_boost ();
        if (this.slider_min) {
            minf = Math.floor (this.slider_min.value * 100);
            maxf = Math.floor (this.slider_max.value * 100);
        }
        for (let key = 0; key < cpucount; key++) {
            let core = {g:this._get_governor (key), a:this._get_coremin (key), b:this._get_coremax (key)};
            cores.push (core);
        }
        let p = {name:pname, minf:minf, maxf:maxf, turbo:boost, cpu:GLib.get_num_processors (), acpi:!this.pstate_present, guid:Gio.dbus_generate_guid (), core:cores};
        save = save_state;
        print (JSON.stringify (p));
        return p;
    },

    _load_profile: function (prf) {
        if (install_event > 0) return;
        print ('Loading profile...', JSON.stringify (prf));
        this.statusLabel.set_text ("... \u3393");
        this.prf = prf;
        for (let key = 1; key < cpucount; key++) {
            this._set_core (key, true);
        }
        this.stage = 0;
        this._delayed_load ();
        if (this.profmenu) this.profmenu.label.text = prf.name;
    },

    _delayed_load: function () {
        let delay = 1000;
        if (core_event != 0) {
            GLib.source_remove (core_event);
            core_event = 0;
        }
        if (freq_event != 0) {
            GLib.source_remove (freq_event);
            freq_event = 0;
        }
        this._load_stage (this.prf);
        this.stage++;
        switch (this.stage) {
            case 1: // reset min/max frequencies
                delay = 50;
                break;
            case 2: // setting governors
                delay = 50;
                break;
            case 3: // setting boost
                delay = 50;
                break;
            case 4: // setting min frequency
                delay = 50;
                break;
            case 5: // setting max frequency
                delay = 50;
                break;
            case 6: // enable/disable cores
                delay = 50;
                break;
            default:
                return;
        }
        core_event = GLib.timeout_add (0, delay, Lang.bind (this, this._delayed_load));
    },

    _load_stage: function (prf) {
        if (this.stage == 1) {
            if (this.pstate_present) {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " min 0");
                GLib.spawn_command_line_async (this.cpufreqctl_path + " max 100");
            } else {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " minf " + this._get_freq (0));
                GLib.spawn_command_line_async (this.cpufreqctl_path + " maxf " + this._get_freq (100));
            }
        } else if (this.stage == 2) {
            this.g = "";
            for (let key = 0; key < cpucount; key++) {
                if (prf.core[key]) {
                    this._set_governor (key, prf.core[key].g);
                    if (this.g != "mixed") {
                        if (!this.g) {
                            this.g = prf.core[key].g;
                        } else if (this.g != prf.core[key].g) {
                            this.g = "mixed";
                        }
                    }
                }
            }
        } else if (this.stage == 3) {
            if (this.pstate_present) {
                this._set_turbo (prf.turbo);
            } else {
                this._set_boost (prf.turbo);
            }
        } else if (this.stage == 4) {
            if (this.pstate_present) {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " min " + prf.minf);
            } else {
                for (let key = 0; key < prf.cpu; key++) {
                    if (prf.core[key]) {
                        this._set_coremin (key, prf.core[key].a);
                    }
                }
            }
        } else if (this.stage == 5) {
            if (this.pstate_present) {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " max " + prf.maxf);
            } else {
                for (let key = 0; key < prf.cpu; key++) {
                    if (prf.core[key]) {
                        this._set_coremax (key, prf.core[key].b);
                    }
                }
                this.slider_min.actor.reactive = true;
                this.slider_min.actor.opacity = 255;
                this.slider_max.actor.reactive = true;
                this.slider_max.actor.opacity = 255;
                if (this.g == 'powersave') {
                    this.slider_max.actor.reactive = false;
                    this.slider_max.actor.opacity = 50;
                } else if (this.g == 'performance') {
                    this.slider_min.actor.reactive = false;
                    this.slider_min.actor.opacity = 50;
                }
            }
        } else if (this.stage == 6) {
            for (let key = 1; key < cpucount; key++) {
                if (key < prf.cpu) this._set_core (key, true);
                else this._set_core (key, false);
            }
        }
    },

    _save_profile: function (prf) {
        let s, n = 0;
        if (prf.core[0].g == "userspace") {
            s = this._read_line (streams[0]);
            if (s) {
                n = parseInt (s);
                if ((n > 0) && Number.isInteger (n)) {
                    this._settings.set_string (GOVERNOR_KEY, 'userspace');
                    this._settings.set_string (CPU_FREQ_KEY, s);
                }
            }
        } else this._settings.set_string (GOVERNOR_KEY, prf.core[0].g);
        this._settings.set_boolean (TURBO_BOOST_KEY, prf.turbo);
        this._settings.set_int (MIN_FREQ_PSTATE_KEY, prf.minf);
        this._settings.set_int (MAX_FREQ_PSTATE_KEY, prf.maxf);
        this._settings.set_string (MIN_FREQ_KEY, prf.core[0].a.toString());
        this._settings.set_string (MAX_FREQ_KEY, prf.core[0].b.toString());
    },

    _pause: function (msec) {
        var t = Date.now ();
        var i = 0;
        while ((Date.now () - t) < msec) {
            i++;
        }
        //print (msec,"ms loops:", i);
    },

    set_frequencies: function () {
        if (freq_event != 0) {
            GLib.source_remove (freq_event);
            freq_event = 0;
        }
        let cmin, cmax;
        if (this.pstate_present) {
            let save_state = save;
            save = false;
            cmin = this._get_min_pstate ();
            cmax = this._get_max_pstate ();
            save = save_state;
            if ((minfreq == cmin) && (maxfreq == cmax)) return;
            if ((minfreq > cmax) && (minfreq <= maxfreq)) {
                this._set_max_pstate (maxfreq);
                this._pause (100);
                this._set_min_pstate (minfreq);
            } else {
                if (minfreq != cmin) this._set_min_pstate (minfreq);
                this._pause (100);
                if (maxfreq != cmax) this._set_max_pstate (maxfreq);
            }
        } else {
            cmin = this._get_coremin (0);
            cmax = this._get_coremax (0);
            if ((minfreq == cmin) && (maxfreq == cmax)) return;
            if ((minfreq > cmax) && (minfreq <= maxfreq)) {
                this._set_max (maxfreq);
                this._pause (100);
                this._set_min (minfreq);
            } else {
                if (minfreq != cmin) this._set_min (minfreq);
                this._pause (100);
                if (maxfreq != cmax) this._set_max (maxfreq);
            }
        }
    },

    _get_governors: function () {
        let governors = new Array(), gn = [], gc = [], idx = 0;
        this.governoractual = "";
        if (this.util_present) {
            let cpufreq_output1 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " list");
            if (cpufreq_output1[0]) this.governorslist = Convenience.byteArrayToString(cpufreq_output1[1]).toString().split("\n")[0].split(" ");
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " gov");
            if (cpufreq_output[0]) this.governoractual = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0].toString();
            this.governorslist.forEach ((governor)=> {
                let governortemp;
                if (this.governoractual.indexOf (governor) > -1)
                    governortemp = [governor, true];
                else
                    governortemp = [governor, false];
                if (governor.length > 0) {
                    //governortemp[0] = governortemp[0][0].toUpperCase() + governortemp[0].slice(1);
                    governors.push (governortemp);
                }
            });
            this.governoractual.split(" ").forEach ((governor)=> {
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
            this.governoractual = "";
            if (gn.length > 1) {
                for (let i = 0; i < gn.length; i++) {
                    if (i > 0 && (i % 2 == 0))
                        this.governoractual += "\n" + gc[i].toString() + " " + gn[i];
                    else
                        this.governoractual += " " + gc[i].toString() + " " + gn[i];
                }
                this.governoractual = this.governoractual.trim();
            }
        }
        return governors;
    },

    _get_frequences: function () {
        let frequences = new Array();
        let frequenceslist = new Array();
        if (this.util_present) {
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " freq");
            if (cpufreq_output[0]) frequenceslist = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0].split(" ");
            frequenceslist.forEach ((freq)=> {
                if (freq.length > 0) {
                    if (parseInt (freq) > 0) frequences.unshift (freq);
                }
            });
            if (frequences.length > 0) {
                this.minimum_freq = frequences[0];
                this.maximum_freq = frequences[frequences.length - 1];
            }
        }
        return frequences;
    },

    _get_freq: function (num) {
        let n = this.frequences.length;
        let step = Math.round (100 / n);
        let i = Math.round (num / step);
        if (i >= n) i = n - 1;
        return parseInt (this.frequences[i]);
    },

    _get_pos: function (num) {
        let m = parseFloat (this.frequences[this.frequences.length -1]) - parseFloat (this.frequences[0]);
        let p = (parseFloat (num) - parseFloat (this.frequences[0]))/m;
        return p;
    },

    _get_single: function () {
        if (GLib.get_num_processors () == 1) return true;
        return false;
    },

    _get_core: function (core) {
        freqInfo = null;
        if (this.util_present) {
            cpufreq_output = GLib.spawn_command_line_sync ("cat /sys/devices/system/cpu/cpu" + core + "/online");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                if (freqInfo == '1') {
                    return true;
                }
            }
        }
        return false;
    },

    _set_core: function (core, state) {
        if (this.util_present) {
            this.util_present = false;
            if (state) {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " on " + core);
            } else {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " off " + core);
            }
            this.util_present = true;
            return state;
        }
        return false;
    },

    _set_cores: function (count) {
        ccore = count;
        if (core_event != 0) {
            GLib.source_remove (core_event);
            core_event = 0;
        }
        if (count == GLib.get_num_processors ()) return;
        core_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
            for (let key = 1; key < cpucount; key++) {
                if (key < ccore) this._set_core (key, true);
                else this._set_core (key, false);
            }
            core_event = 0;
            return false;
        }));
    },

    _get_governor: function (core) {
        freqInfo = null;
        if (this.util_present) {
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " coreg " + core);
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                let g = freqInfo;
                return g;
            }
        }
        return "unknown";
    },

    _set_governor: function (core, state) {
        if (this.util_present) {
            try {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " coreg " + core + " " + state);
            } catch (e) {
                global.log ("Set governor", e.message);
                return false;
            }
        }
        return true;
    },

    _get_coremin: function (core) {
        freqInfo = null;
        if (this.util_present) {
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " coremin " + core);
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                let g = parseInt (freqInfo);
                return g;
            }
        }
        return 0;
    },

    _set_coremin: function (core, state) {
        if (this.util_present) {
            try {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " coremin " + core + " " + state);
            } catch (e) {
                global.log ("Set coremin", e.message);
                return false;
            }
        }
        return true;
    },

    _get_coremax: function (core) {
        freqInfo = null;
        if (this.util_present) {
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " coremax " + core);
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                let g = parseInt (freqInfo);
                return g;
            }
        }
        return 0;
    },

    _set_coremax: function (core, state) {
        if (this.util_present) {
            try {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " coremax " + core + " " + state);
            } catch (e) {
                global.log ("Set coremax", e.message);
                return false;
            }
        }
        return true;
    },

    _get_turbo: function () {
        freqInfo = null;
        if (this.util_present) {
            if (save) {
                return this._set_turbo (this._settings.get_boolean(TURBO_BOOST_KEY));
            }
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " turbo");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                if (freqInfo == '0') {
                    return true;
                }
            }
        }
        return false;
    },

    _set_turbo: function (state) {
        if (this.util_present) {
            if (state) {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " turbo 0");
            } else {
                GLib.spawn_command_line_async (this.cpufreqctl_path + " turbo 1");
            }
            if (save) this._settings.set_boolean(TURBO_BOOST_KEY, state);
            return state;
        }
        return false;
    },

    _get_min_pstate: function () {
        freqInfo = null;
        if (this.util_present) {
            if (save) {
                return this._set_min_pstate (this._settings.get_int(MIN_FREQ_PSTATE_KEY));
            }
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " min");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 0;
    },

    _set_min_pstate: function (minimum) {
        if (this.util_present) {
            cmd = this.cpufreqctl_path + " min " + minimum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_int(MIN_FREQ_PSTATE_KEY, minimum);
            return minimum;
        }
        return 0;
    },

    _get_max_pstate: function () {
        freqInfo = null;
        if (this.util_present) {
            if (save) {
                return this._set_max_pstate (this._settings.get_int(MAX_FREQ_PSTATE_KEY));
            }
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " max");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 100;
    },

    _set_max_pstate: function (maximum) {
        if (this.util_present) {
            cmd = this.cpufreqctl_path + " max " + maximum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_int(MAX_FREQ_PSTATE_KEY, maximum);
            return maximum;
        }
        return 100;
    },

    _get_label: function (num, n) {
        n = (typeof n !== 'undefined') ?  n : 3;
        if (num >= 1000000) {
            return (num/1000000).toFixed(n).toString() + " \u3393";
        } else {
            return (num/1000).toFixed(0).toString() + " \u3392";
        }
    },

    _get_min_label: function (n) {
        n = (typeof n !== 'undefined') ?  n : 3;
        return this._get_label (this._get_min (), n);
    },

    _get_max_label: function (n) {
        n = (typeof n !== 'undefined') ?  n : 3;
        return this._get_label (this._get_max (), n);
    },

    _get_min: function () {
        freqInfo = null;
        if (this.util_present) {
            if (save) {
                return this._set_min (parseInt (this._settings.get_string (MIN_FREQ_KEY)));
            }
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " minf");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return minf;
    },

    _set_min: function (minimum) {
        if ((minimum <= 0) || !Number.isInteger (minimum)) return 0;
        if (this.util_present) {
            cmd = this.cpufreqctl_path + " minf " + minimum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_string (MIN_FREQ_KEY, minimum.toString());
            return minimum;
        }
        return 0;
    },

    _get_max: function () {
        freqInfo = null;
        if (this.util_present) {
            if (save) {
                return this._set_max (parseInt (this._settings.get_string (MAX_FREQ_KEY)));
            }
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " maxf");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return maxf;
    },

    _set_max: function (maximum) {
        if ((maximum <= 0) || !Number.isInteger (maximum)) return 0;
        if (this.util_present) {
            cmd = this.cpufreqctl_path + " maxf " + maximum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_string (MAX_FREQ_KEY, maximum.toString());
            return maximum;
        }
        return 0;
    },

    _get_boost: function () {
        freqInfo = null;
        if (this.util_present) {
            if (save) {
                return this._set_boost (this._settings.get_boolean(TURBO_BOOST_KEY));
            }
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " boost");
            if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) {
                if (freqInfo == '1') {
                    return true;
                }
            }
        }
        return false;
    },

    _set_boost: function (state) {
        if (this.util_present) {
            if (state) {
                GLib.spawn_command_line_async (this.cpufreqctl_path + ' boost 1');
            } else {
                GLib.spawn_command_line_async (this.cpufreqctl_path + ' boost 0');
            }
            if (save) this._settings.set_boolean(TURBO_BOOST_KEY, state);
            return state;
        }
        return false;
    },

    remove_events: function () {
        if (this.proxy) {
            if (event) this.proxy.disconnectSignal (event);
            delete this.proxy;
            this.proxy = null;
            event = 0;
        }
        if (monitorID) this._settings.disconnect (monitorID);
        if (saveID) this._settings.disconnect (saveID);
        if (eprofilesID) this._settings.disconnect (eprofilesID);
        if (powerID) this.power.disconnect (powerID);
        if (install_event != 0) GLib.source_remove (install_event);
        if (core_event != 0) GLib.source_remove (core_event);
        if (freq_event != 0) GLib.source_remove (freq_event);
        if (monitor_event) GLib.source_remove (monitor_event);
        event = 0; install_event = 0; core_event = 0; freq_event = 0; monitor_event = 0;
        saveID = 0; monitorID = 0; powerID = 0; eprofilesID = 0;
        GLib.spawn_command_line_async ("killall cpufreq-service");
    }
});

const TurboSwitchMenuItem = new Lang.Class ({
    Name: 'TurboSwitchMenuItem',
    Extends: PopupMenu.PopupSwitchMenuItem,

    _init: function (text, active, params) {
        this.parent (text, active, params);
    },

    activate: function (event) {
        if (this._switch.actor.mapped) {
            this.toggle();
        }
    }
});

const SupportMenuItem = new Lang.Class ({
    Name: 'SupportMenuItem',
    Extends: PopupMenu.PopupMenuItem,

    _init: function () {
        this.parent ("Sposored by Térence Clastres", {style_class: 'sponsors-info-item'});
        this.label.x_expand = true;
    },

    activate: function (event) {
      this.emit ('activate', event);
      let app = Gio.AppInfo.get_default_for_uri_scheme ("https");
      app.launch_uris (["http://konkor.github.io/cpufreq/donations/"], null);
    }
});

const InfoMenuItem = new Lang.Class ({
    Name: 'InfoMenuItem',
    Extends: PopupMenu.PopupMenuItem,

    _init: function (text, label_info) {
        this.parent (text, {reactive: false, style_class: 'popup-info-item'});
        this.label.x_expand = true;
        this.label2 = new St.Label ({text: label_info});
        this.label2.align = St.Align.END;
        this.actor.add_child (this.label2);
    },

    set_text: function (text) {
        this.label2.set_text (text);
    }
});

const CoreInfoItem = new Lang.Class ({
    Name: 'CoreInfoItem',
    Extends: InfoMenuItem,

    _init: function (cores) {
        this.msg = "Cores Online";
        this.parent (this.msg, cores.toString ());
    },

    set_text: function (cores) {
        if (this.label2.text == '' && cores > 1) this.label.text = this.msg;
        else if (this.label2.text != '' && cores == 1) this.label.text = "Single Core Online";
        if (this.label2.text != '' && cores == 1)this.label2.set_text ('');
        if (this.label2.text != cores.toString () && cores > 1)this.label2.set_text (cores.toString ());
    }
});

const NewMenuItem = new Lang.Class ({
    Name: 'NewMenuItem',
    Extends: PopupMenu.PopupMenuItem,

    _init: function (text, text_entry, hint_text, params) {
        this.parent (text, params);
        this.edit_mode = false;
        this.entry = new St.Entry ({ text:text_entry, hint_text:hint_text, style_class: 'cpufreq-entry', track_hover: true, can_focus: true, x_expand: true });
        this.actor.add_child (this.entry);
        this.entry.set_primary_icon (new St.Icon({ style_class: 'cpufreq-entry-icon', icon_name: 'emblem-ok-symbolic', icon_size: 14 }));
        this.entry.connect ('primary-icon-clicked', Lang.bind(this, function () {
            this.on_click ();
        }));
        this.entry.connect ('secondary-icon-clicked', Lang.bind(this, function () {
            this.on_click ();
        }));
        this.entry.clutter_text.connect('key-press-event', Lang.bind (this, function (o, event) {
            let symbol = event.get_key_symbol();
            if (symbol == Clutter.Escape) {
                this.toggle ();
                return Clutter.EVENT_STOP;
            } else if (symbol == Clutter.Return || symbol == Clutter.KP_Enter) {
                this.on_click ();
                this.toggle ();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        }));
        this.entry.clutter_text.connect('key-focus-in', Lang.bind (this, function () {
            Clutter.grab_keyboard (this.entry.clutter_text);
        }));
        this.entry.visible = false;
    },

    activate: function (event) {
        if (!this.entry.visible) {this.edit_mode = true;this.toggle ();}
        else if (!this.edit_mode) this.toggle ();
    },

    toggle: function () {
        this.label.visible = !this.label.visible;
        this.entry.visible = !this.entry.visible;
        if (this.entry.visible) Clutter.grab_keyboard (this.entry.clutter_text);
        else Clutter.ungrab_keyboard ();
    },

    on_click: function () {
        this.edit_mode = false;
        this.emit ('save');
    }
});

const ProfileMenuItem = new Lang.Class ({
    Name: 'ProfileMenuItem',
    Extends: NewMenuItem,

    _init: function (text, params) {
        this.parent (text, text, "", params);
        this.label.x_expand = true;
        this.edit_button = new St.Button ({ child: new St.Icon ({ icon_name: 'open-menu-symbolic', icon_size: 14 }), style_class: 'edit-button'});
        this.actor.add_child (this.edit_button);
        this.edit_button.connect ('clicked', Lang.bind (this, function () {
            this.toggle ();
            Clutter.grab_keyboard (this.entry.clutter_text);
            global.stage.set_key_focus (this.entry.clutter_text);
            this.emit ('edit');
        }));
        this.delete_button = new St.Button ({ child: new St.Icon ({ icon_name: 'edit-delete-symbolic', icon_size: 14 }), style_class: 'delete-button'});
        this.actor.add_child (this.delete_button);
        this.delete_button.connect ('clicked', Lang.bind (this, function () {
            this.emit ('delete');
        }));
    },

    activate: function (event) {
        if (this.entry.text == '') this.entry.text = this.label.text;
        if (!this.edit_mode) this.emit ('activate', event);
        if (this.entry.visible) this.toggle ();
    },

    toggle: function () {
        this.parent ();
        this.edit_button.visible = !this.edit_button.visible;
        this.delete_button.visible = !this.delete_button.visible;
        this.edit_mode = this.entry.visible;
    },

    on_click: function () {
        this.label.text = this.entry.text;
        this.emit ('update');
    }
});

const SeparatorItem = new Lang.Class({
    Name: 'SeparatorItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function () {
        this.parent({reactive: false, can_focus: false, style_class: 'cpufreq-separator-item'});
        this._separator = new St.Widget({ style_class: 'cpufreq-separator-menu-item',
                                          y_expand: true,
                                          y_align: Clutter.ActorAlign.CENTER });
        this.actor.add(this._separator, {expand: true});
    }
});

let tt = 0, tt_time = 0;

const InfoItem = new Lang.Class({
    Name: 'InfoItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function (params) {
        this.parent ({ reactive: false, can_focus: false });
        this._icon = new St.Label ({text: "☺", style: 'color: #33d552; font-weight: bold; font-size: 56pt;'});//new St.Icon ({ style_class: 'logo-icon' });
        this._icon.y_expand = true;
        this._icon.y_align = Clutter.ActorAlign.CENTER;
        this.actor.add_child (this._icon);
        //this._icon.icon_name = 'smile';
        this.vbox = new St.BoxLayout({ vertical: true, style: 'padding: 8px; spacing: 4px;' });
        this.vbox.align = St.Align.END;
        this.actor.add_child (this.vbox);
        this._cpu = new St.Label ({text: this.cpu_name, style: 'font-weight: bold;'});
        this._cpu.align = St.Align.START;
        this.vbox.add_child (this._cpu);
        this._linux = new St.Label ({text: this.linux_kernel});
        this._linux.align = St.Align.START;
        this.vbox.add_child (this._linux);
        this._load = new St.Label ({text: "◕ 170%"});
        this._load.align = St.Align.START;
        this.vbox.add_child (this._load);
        this._cores = new St.Label ({text: "2 performance, 4 ondemand"});
        this._cores.align = St.Align.START;
        this.vbox.add_child (this._cores);
        this._warn = new St.Label ({text: "☺ 😐 ☹ WARN MESSAGE", style: 'color: orange; font-weight: bold;'});
        this._warn.align = St.Align.START;
        this.vbox.add_child (this._warn);
        this._warn.visible = false;
        this.warn_lvl = 0;
        this.balance = "";
        this.cpufreqctl_path = GLib.find_program_in_path ('cpufreqctl');
        if (this.cpufreqctl_path) {
        cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " irqbalance");
        if (cpufreq_output[0]) {
            freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            if (freqInfo) this.balance = "IRQBALANCE DETECTED";
        }
        }
    },

    get cpu_name () {
        if (GLib.file_test ('/proc/cpuinfo', GLib.FileTest.EXISTS)) {
            let f = Gio.File.new_for_path ('/proc/cpuinfo');
            let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
            let line, model = "", s, i = 0;
            try {
                [line, ] = dis.read_line (null);
                while (line != null) {
                    s = Convenience.byteArrayToString(line).toString();
                    if (s.indexOf ("model name") > -1) {
                        model = s;
                        i++;
                    }
                    if (i > 0) break;
                    [line, ] = dis.read_line (null);
                }
                dis.close (null);
                if (model) {
                    model = model.substring (model.indexOf (":") + 1).trim ();
                    if (model.lastIndexOf ("@") > -1)
                        model = model.substring (0, model.lastIndexOf ("@")).trim ();
                    model = model.replace ("(R)", "®");
                    model = model.replace ("(TM)", "™");
                    s = model; model = "";
                    s.split (" ").forEach ((f)=>{
                        if (f.length > 0) model += f + " ";
                    });
                    return model.trim ().toString ();
                }
            } catch (e) {
                print ("Get CPU Error:", e.message);
            }
        }
        return "unknown processor";
    },

    get linux_kernel () {
        let distro = "GNU/Linux ";
        let f = Gio.File.new_for_path ('/etc/os-release');
        if (f.query_exists (null)) {
            let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
            let line, model = "", s, i = 0;
            try {
                [line, ] = dis.read_line (null);
                while (line != null) {
                    s = Convenience.byteArrayToString(line).toString();
                    if (s.indexOf ("PRETTY_NAME=") > -1) {
                        model = s;
                        i++;
                    }
                    if (i > 0) break;
                    [line, ] = dis.read_line (null);
                }
                dis.close (null);
                if (model) {
                    if (model.length > 11) model = model.substring (12).trim ();
                    model = model.replace (/\"/g, "");
                    model = model.replace (distro, "");
                    i = model.indexOf ('(');
                    if ((i > -1) && (model.length > (i+1))) {
                        model = model.slice(0,i) + model[i+1].toUpperCase() + model.slice(i+2);
                        model = model.replace (")", "");
                    }
                    distro = model;
                }
            } catch (e) {
                print ("Get Release Error:", e.message);
            }
        }
        cpufreq_output = GLib.spawn_command_line_sync ("uname -r");
        if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0].split(".");
        if (freqInfo[0]) {
            if (distro.length > 22) distro += "\nKernel " + Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
            else {distro += " kernel " + freqInfo[0];
            if (freqInfo[1]) distro += "." + freqInfo[1];}
        }
        return distro;
    },

    get loadavg () {
        let s = "Loading ", i = 0 , j, cc = GLib.get_num_processors ();
        cpufreq_output = GLib.spawn_command_line_sync ("cat /proc/loadavg");
        if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0].split(" ");
        if (freqInfo[0]) {
            j = i = Math.round (parseFloat (freqInfo[0]) * 100);
            while (i > 100) {
                s += "◉";
                i -= 100;
            }
            if (i < 25) s += "◌ ";
            else if (i < 50) s += "◔ ";
            else if (i < 75) s += "◑ ";
            else if (i < 100) s += "◕ ";
            else s += "◉ ";
            s += j.toString () + "%";
        }
        if (j > cc * 100) {
            this.warnmsg = "SYSTEM OVERLOAD";
            this.warn_lvl = 2;
        } else if (j > cc * 75) {
            this.warnmsg = "SYSTEM BUSY";
            this.warn_lvl = 1;
        } else {
            this.warnmsg = "";
            this.warn_lvl = 0;
        }
        return s;
    },

    set_warns: function () {
        if (this.warn_lvl > 1) {
            this._icon.text = "☹";
            this._icon.set_style ('color: red; font-weight: bold; font-size: 56pt;');
            this._warn.visible = true;
            this._warn.set_style ('color: red; font-weight: bold;');
        } else if (this.warn_lvl > 0) {
            this._icon.text = "😐";
            this._icon.set_style ('color: orange; font-weight: bold; font-size: 56pt;');
            this._warn.visible = true;
            this._warn.set_style ('color: orange; font-weight: bold;');
        } else {
            this._icon.text = "☺";
            this._icon.set_style ('color: #33d552; font-weight: bold; font-size: 56pt;');
            this._warn.visible = false;
        }
        this._warn.text = this.warnmsg;
    },

    get_throttle: function () {
        let s = "", i = 0;
        cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " throttle");
        if (cpufreq_output[0]) freqInfo = Convenience.byteArrayToString(cpufreq_output[1]).toString().split("\n")[0];
        if (freqInfo) {
            i = parseInt (freqInfo);
            if (!i) return;
            s = "CPU THROTTLE: " + i;
            if (i != tt) {
                this.warn_lvl = 2;
                s += "\nTHROTTLE SPEED: " + Math.round ((i-tt)/2, 1);
                tt_time = Date.now ();
            } else if ((this.warn_lvl == 0) && ((Date.now() - tt_time) < 600000)) this.warn_lvl = 1;
            tt = i;
            if (this.warnmsg.length > 0) this.warnmsg += "\n" + s;
            else this.warnmsg = s;
        }
    },

    get_balance: function () {
        if (this.balance) {
            if (this.warn_lvl == 0) this.warn_lvl = 1;
            if (this.warnmsg.length > 0) this.warnmsg += "\n" + this.balance;
            else this.warnmsg = this.balance;
        }
    },

    update: function (governors) {
        this.warnmsg = "";
        this.warn_lvl = 0;
        this._load.text = this.loadavg;
        this.get_throttle ();
        this.get_balance ();
        this.set_warns ();
        if (governors) {
            this._cores.visible = true;
            this._cores.text = governors;
        } else this._cores.visible = false;
    }
});

let freqMenu;

function init () {
    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path (EXTENSIONDIR + "/icons");
}

function enable () {
    freqMenu = new FrequencyIndicator;
    Main.panel.addToStatusArea ('cpufreq-indicator', freqMenu);
}

function disable () {
    freqMenu.remove_events ();
    freqMenu.destroy ();
    freqMenu = null;
    GLib.spawn_command_line_async ("killall cpufreq-service");
}
