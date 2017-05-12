const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Separator = imports.ui.separator;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

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
const SETTINGS_ID = 'org.gnome.shell.extensions.cpufreq';
const ExtensionUtils = imports.misc.extensionUtils;
const ExtensionSystem = imports.ui.extensionSystem;
const Me = ExtensionUtils.getCurrentExtension ();
const EXTENSIONDIR = Me.dir.get_path ();
const Convenience = Me.imports.convenience;

let event = 0;
let install_event = 0;
let core_event = 0;
let min_event = 0;
let max_event = 0;
let save = false;
let streams = [];
let freqInfo = null;
let cpufreq_output = null;
let cmd = null;
let ccore = 0;
let profiles = [];
let default_profile = null;

const FrequencyIndicator = new Lang.Class({
    Name: 'Cpufreq',
    Extends: PanelMenu.Button,

    _init: function () {
        this.parent (0.0, "CPU Frequency Indicator", false);

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
                    for each (let governor in this.governors) {
                        if (governor[1] == true) {
                            this.activeg.label.text = "\u26A1 " + governor[0];
                            gcount++;
                        }
                    }
                    if (gcount > 1) this.activeg.label.text = "\u26A1 mixed";
                }
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
                    this.slider_core.setValue (GLib.get_num_processors () / this.cpucount);
                    var cc = Math.floor ((this.cpucount - 1) * this.slider_core.value + 1);
                    if (cc == 1) {
                        this.corewarn.actor.visible = true;
                        this.coremenu.label.text = "Single Core Online";
                    } else {
                        this.corewarn.actor.visible = false;
                        this.coremenu.label.text = cc + " Cores Online";
                    }
                }
                save = saves;
            }
        }));
        this.pkexec_path = null;
        this.cpufreqctl_path = null;
        this.cpucount = this._get_cpu_number ();
        this.util_present = false;
        this.pstate_present = false;
        this.boost_present = false;
        this.installed = false;
        this.updated = true;
        this.governorslist = [];
        this.frequences = [];
        this.minimum_freq = -1;
        this.maximum_freq = -1;

        freqInfo = null;
        cpufreq_output = GLib.spawn_command_line_sync (EXTENSIONDIR + "/cpufreqctl driver");
        if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
        this._build_ui ();
        if (save) this._load_settings ();

        this._add_event ();
        this.menu.connect('menu-closed', function() { Clutter.ungrab_keyboard (); });
    },

    _is_events: function () {
        if (install_event > 0) return true;
        if (core_event > 0) return true;
        if (min_event > 0) return true;
        if (max_event > 0) return true;
        return false;
    },

    _check_install: function () {
        this.pkexec_path = GLib.find_program_in_path ('pkexec');
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
        if (!this.pkexec_path) {
            this.installed = false;
        }
        if (this.installed) {
            let localctl = null, globalctl = null;
            cpufreq_output = GLib.spawn_command_line_sync ("/usr/bin/cpufreqctl version");
            if (cpufreq_output[0]) globalctl = cpufreq_output[1].toString().split("\n")[0];
            cpufreq_output = GLib.spawn_command_line_sync (EXTENSIONDIR + "/cpufreqctl version");
            if (cpufreq_output[0]) localctl = cpufreq_output[1].toString().split("\n")[0];
            if (localctl != globalctl) {
                this.updated = false;
            }
        }
    },

    _install: function () {
        cmd = this.pkexec_path + " " + EXTENSIONDIR + '/cpufreqctl install';
        Util.trySpawnCommandLine (cmd);
        if (install_event != 0) {
            Mainloop.source_remove (install_event);
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
        if (this.util_present && this.installed) {
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
        if (event != 0) Mainloop.source_remove (event);
        if (this.util_present) {
            event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
                this._update_freq ();
                return true;
            }));
        }
    },

    _build_ui: function () {
        this._init_streams ();
        this._update_freq ();
        this._build_popup ();
    },

    _update_freq: function () {
        freqInfo = null;
        let s, m = 0, n = 0;
        if (this.util_present) {
            streams.forEach (stream => {
                s = this._read_line (stream);
                if (s) {
                    n = parseInt (s);
                    if (n > m) {
                        m = n;
                        freqInfo = s;
                    }
                }
            });
            if (freqInfo) {
                if (freqInfo.length > 6) {
                    this.title = (parseInt(freqInfo)/1000000).toFixed(2).toString() + " \u3393";
                } else {
                    this.title = (parseInt(freqInfo)/1000).toFixed(0).toString() + "  \u3392";
                }
            }
        } else {
            this.title = "\u26A0";
        }
        this.statusLabel.set_text (this.title);
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
        cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov ' + gov;
        GLib.spawn_command_line_sync (cmd);
		if (gov == 'userspace') {
            cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' set ' + freq;
	    	Util.trySpawnCommandLine (cmd);
        }
    },

    _init_streams: function () {
        streams = [];
        for (let key = 0; key < this.cpucount; key++) {
            if (GLib.file_test ('/sys/devices/system/cpu/cpu' + key + '/topology', GLib.FileTest.EXISTS)) {
                let f = Gio.File.new_for_path ('/sys/devices/system/cpu/cpu' + key + '/cpufreq/scaling_cur_freq');
                streams.push (new Gio.DataInputStream({ base_stream: f.read(null) }));
            } else {
                streams.push (null);
            }
        }
    },

    _read_line: function (dis) {
        if (dis == null) return "0";
        let line;
        try {
            dis.seek (0, GLib.SeekType.SET, null);
            [line,] = dis.read_line (null);
        } catch (e) {
            print ("Error: ", e.message);
            this._init_streams ();
        }
        return line;
    },

    _build_popup: function () {
        this.menu.removeAll ();
        if (this.util_present) {
            this.governors = this._get_governors ();
            this.frequences = this._get_frequences ();
            this.activeg = new PopupMenu.PopupSubMenuMenuItem ("Governors", false);
            this.coremenu = new PopupMenu.PopupMenuItem (GLib.get_num_processors () + " Cores Online", {reactive: false, style_class: 'popup-info-item'});
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

            this.menu.addMenuItem (this.activeg);
            if (this.pstate_present) {
                this.slider_min = new Slider.Slider (this._get_min_pstate () / 100);
                this.slider_max = new Slider.Slider (this._get_max_pstate () / 100);
            } else if (this.frequences.length > 1) {
                this.slider_min = new Slider.Slider (this._get_pos (this._get_min ()));
                this.slider_max = new Slider.Slider (this._get_pos (this._get_max ()));
            }
            if (this.governors.length > 0) {
                for each (let governor in this.governors){
                    if (governor[1] == true) {
                        this.activeg.label.text = governor[0];
                    }
                    if ((governor[0] == 'userspace') && (this.frequences.length > 0)) {
                        userspace = new PopupMenu.PopupSubMenuMenuItem('userspace', false);
                        for each (let freq in this.frequences){
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
                                if (this.installed) {
                                    GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov userspace');
                                    let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' set ' + f;
	    	                        global.log (cmd);
		                            Util.trySpawnCommandLine (cmd);
		                            if (save) {
		                                this._settings.set_string (GOVERNOR_KEY, 'userspace');
		                                this._settings.set_string (CPU_FREQ_KEY, f.toString ());
		                            }
		                        }
                            }));
                        }
                    } else {
                        let governorItem = new PopupMenu.PopupMenuItem (governor[0]);
                        this.activeg.menu.addMenuItem (governorItem);
                        governorItem.connect ('activate', Lang.bind (this, function () {
                            this._changed ();
                            if (this.installed) {
                                let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov ' + governorItem.label.text;
		                        global.log (cmd);
		                        GLib.spawn_command_line_sync (cmd);
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
                            } else {
                                this._install ();
                            }
                        }));
                    }
                }
            }
            if (userspace != null) this.menu.addMenuItem (userspace);
            if (this.pstate_present) {
                this.turbo_switch = new PopupMenu.PopupSwitchMenuItem('Turbo Boost: ', this._get_turbo ());
                this.turbo_switch.connect ('toggled', Lang.bind (this, function (item) {
                    this._changed ();
                    if (this.installed) {
                        this._set_turbo (item.state);
                    }
                }));
                this.menu.addMenuItem (new SeparatorItem ());
                let title_min = new PopupMenu.PopupMenuItem ('Minimum:', {reactive: false});
                this.label_min = new St.Label ({text: this._get_min_pstate().toString() + "%"});
                title_min.actor.add_child (this.label_min, {align:St.Align.END});
                this.menu.addMenuItem (title_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (this.slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                this.slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (this.installed) {
                        if (slider_lock == false) {
                            this.label_min.set_text (Math.floor (item.value * 100).toString() + "%");
                            this._set_min_pstate (Math.floor (item.value * 100));
                        }
                    }
                }));
                let title_max = new PopupMenu.PopupMenuItem ('Maximum:', {reactive: false});
                this.label_max = new St.Label ({text: this._get_max_pstate().toString() + "%"});
                title_max.actor.add_child (this.label_max, {align:St.Align.END});
                this.menu.addMenuItem (title_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (this.slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                this.slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (this.installed) {
                        if (slider_lock == false) {
                            this.label_max.set_text (Math.floor (item.value * 100).toString() + "%");
                            this._set_max_pstate (Math.floor (item.value * 100));
                        }
                    }
                }));
            } else if (this.boost_present) {
                this.boost_switch = new PopupMenu.PopupSwitchMenuItem('Turbo Boost: ', this._get_boost ());
                this.boost_switch.connect ('toggled', Lang.bind (this, function (item) {
                    this._changed ();
                    if (this.installed) {
                        this._set_boost (item.state);
                    }
                }));
            }
            if (!this.pstate_present && (this.frequences.length > 1)) {
                this.menu.addMenuItem (new SeparatorItem ());
                let title_min = new PopupMenu.PopupMenuItem ('Minimum:', {reactive: false, style_class: 'popup-info-item'});
                this.label_min = new St.Label ({text: this._get_min_label ()});
                title_min.actor.add_child (this.label_min, {align:St.Align.END});
                this.menu.addMenuItem (title_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (this.slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                this.slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (this.installed) {
                        if (slider_lock == false) {
                            var f = this._get_freq (Math.floor (item.value * 100));
                            this.label_min.set_text (this._get_label (f));
                            this._set_min (f);
                        }
                    }
                }));
                let title_max = new PopupMenu.PopupMenuItem ('Maximum:', {reactive: false, style_class: 'popup-info-item'});
                this.label_max = new St.Label ({text: this._get_max_label ()});
                title_max.actor.add_child (this.label_max, {align:St.Align.END});
                this.menu.addMenuItem (title_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (this.slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                this.slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    this._changed ();
                    if (this.installed) {
                        if (slider_lock == false) {
                            var f = this._get_freq (Math.floor (item.value * 100));
                            this.label_max.set_text (this._get_label (f));
                            this._set_max (f);
                        }
                    }
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
            if (this.cpucount > 1) {
                //this.menu.addMenuItem (new PopupMenu.PopupSeparatorMenuItem ());
                this.menu.addMenuItem (this.coremenu);
                let menu_core = new PopupMenu.PopupBaseMenuItem ({activate: false});
                this.slider_core = new Slider.Slider (GLib.get_num_processors () / this.cpucount);
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
                    if (this.installed) {
                        var cc = Math.floor ((this.cpucount - 1) * item.value + 1);
                        this._set_cores (cc);
                        if (cc == 1) {
                            this.corewarn.actor.visible = true;
                            this.coremenu.label.text = "Single Core Online";
                        } else {
                            this.corewarn.actor.visible = false;
                            this.coremenu.label.text = cc + " Cores Online";
                        }
                    }
                }));
            }
            if (this.boost_present || this.pstate_present) {
                //this.menu.addMenuItem (new SeparatorItem ());
            }
            if (this.boost_switch) this.menu.addMenuItem (this.boost_switch);
            if (this.turbo_switch) this.menu.addMenuItem (this.turbo_switch);
            //Profiles menu
            let newItem = new NewMenuItem ("New ...");
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
                if (this.installed) {
                    this._load_profile (default_profile);
                    if (save && (this.PID != -1)) this._settings.set_int (PROFILE_KEY, -1);
                    this.PID = -1;
                }
            }));
            for (let p in profiles) {
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
                let save_switch = new PopupMenu.PopupSwitchMenuItem('Remember settings', save);
                sm.menu.addMenuItem (save_switch);
                save_switch.connect ('toggled', Lang.bind (this, function (item) {
                    save = item.state;
                    this._settings.set_boolean(SAVE_SETTINGS_KEY, item.state);
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
            if (this.installed) {
                //this.profmenu.label.text = o.label.text;
                this._load_profile (profiles[o.ID]);
                this.PID = o.ID;
                if (save) this._settings.set_int (PROFILE_KEY, this.PID);
            }
        }));
        prfItem.connect ('update', Lang.bind (this, function (o) {
            profiles[o.ID].name = o.label.text;
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
                //print (key, item.ID);
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
        for (let key = 0; key < this.cpucount; key++) {
            let core = {g:this._get_governor (key), a:this._get_coremin (key), b:this._get_coremax (key)};
            cores.push (core);
        }
        let p = {name:pname, minf:minf, maxf:maxf, turbo:boost, cpu:GLib.get_num_processors (), core:cores};
        save = save_state;
        print (JSON.stringify (p));
        return p;
    },

    _load_profile: function (prf) {
        if (install_event > 0) return;
        this.remove_events ();
        for (let key = 1; key < this.cpucount; key++) {
            if (key < prf.cpu) this._set_core (key, true);
            else this._set_core (key, false);
        }
        for (let key = 0; key < prf.cpu; key++) {
            if (prf.core[key]) {
                this._set_governor (key, prf.core[key].g);
                if (!this.pstate_present) {
                    this._set_coremin (key, prf.core[key].a);
                    this._set_coremax (key, prf.core[key].b);
                }
            }
        }
        if (this.pstate_present) {
            this._set_min_pstate (prf.minf);
            this._set_max_pstate (prf.maxf);
            this._set_turbo (prf.turbo);
        } else {
            this._set_boost (prf.turbo);
        }
        if (this.profmenu) this.profmenu.label.text = prf.name;
        this._add_event ();
    },

    _get_cpu_number: function () {
        let c = 0;
        let cpulist = null;
        let ret = GLib.spawn_command_line_sync ("cat /sys/devices/system/cpu/present");
        if (ret[0]) cpulist = ret[1].toString().split("\n", 1)[0].split("-");
        for each (let f in cpulist) {
            if (parseInt (f) > 0) c = parseInt (f);
        }
        return c + 1;
    },

    _get_governors: function () {
        let governors = new Array();
        let governoractual = '';
        if (this.util_present) {
            //getting the governors list
            let cpufreq_output1 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " list");
            if (cpufreq_output1[0]) this.governorslist = cpufreq_output1[1].toString().split("\n")[0].split(" ");
            //get the actual governor
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " gov");
            if (cpufreq_output[0]) governoractual = cpufreq_output[1].toString().split("\n")[0].toString();

            for each (let governor in this.governorslist){
                let governortemp;
                if (governoractual.indexOf (governor) > -1)
                    governortemp = [governor, true];
                else
                    governortemp = [governor, false];

                if (governor.length > 0) {
                    //governortemp[0] = governortemp[0][0].toUpperCase() + governortemp[0].slice(1);
                    governors.push (governortemp);
                }
            }
        }
        return governors;
    },

    _get_frequences: function () {
        let frequences = new Array();
        let frequenceslist = new Array();
        if (this.util_present) {
            cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " freq");
            if (cpufreq_output[0]) frequenceslist = cpufreq_output[1].toString().split("\n")[0].split(" ");
            for each (let freq in frequenceslist){
                if (freq.length > 0) {
                    frequences.unshift (freq);
                }
            }
            if (frequences.length > 0) {
                this.minimum_freq = frequences[0];
                this.maximum_freq = frequences[frequences.length - 1];
            }
        }
        return frequences;
    },

    _get_freq: function (num) {
        let n = this.frequences.length;
        let step = Math.round ((100 - (100 % n)) / n);
        let i = Math.round (num / step);
        if (i == n) i--;
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
                GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + " on " + core);
            } else {
                GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + " off " + core);
            }
            this._init_streams ();
            this.util_present = true;
            return state;
        }
        return false;
    },

    _set_cores: function (count) {
        ccore = count;
        if (core_event != 0) {
            Mainloop.source_remove (core_event);
        }
        core_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
            for (let key = 1; key < this.cpucount; key++) {
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
                GLib.spawn_command_line_sync (this.pkexec_path + " " + this.cpufreqctl_path + " coreg " + core + " " + state);
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
                GLib.spawn_command_line_sync (this.pkexec_path + " " + this.cpufreqctl_path + " coremin " + core + " " + state);
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
                GLib.spawn_command_line_sync (this.pkexec_path + " " + this.cpufreqctl_path + " coremax " + core + " " + state);
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
                GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + " turbo 0");
            } else {
                GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + " turbo 1");
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 0;
    },

    _set_min_pstate: function (minimum) {
        if (min_event != 0) Mainloop.source_remove (min_event);
        if (this.util_present) {
            min_event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
                cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " min " + minimum.toString();
                Util.trySpawnCommandLine (cmd);
                if (save) this._settings.set_int(MIN_FREQ_PSTATE_KEY, minimum);
                min_event = 0;
                return false;
            }));
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 100;
    },

    _set_max_pstate: function (maximum) {
        if (max_event != 0) Mainloop.source_remove (max_event);
        if (this.util_present) {
            max_event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
                cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " max " + maximum.toString();
                Util.trySpawnCommandLine (cmd);
                if (save) this._settings.set_int(MAX_FREQ_PSTATE_KEY, maximum);
                max_event = 0;
                return false;
            }));
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return minf;
    },

    _set_min: function (minimum) {
        if (minimum <= 0) return 0;
        if (min_event != 0) Mainloop.source_remove (min_event);
        if (this.util_present) {
            min_event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
                cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " minf " + minimum.toString();
                Util.trySpawnCommandLine (cmd);
                if (save) this._settings.set_string (MIN_FREQ_KEY, minimum.toString());
                min_event = 0;
                return false;
            }));
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return maxf;
    },

    _set_max: function (maximum) {
        if (maximum <= 0) return 0;
        if (max_event != 0) Mainloop.source_remove (max_event);
        if (this.util_present) {
            max_event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
                cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " maxf " + maximum.toString();
                Util.trySpawnCommandLine (cmd);
                if (save) this._settings.set_string (MAX_FREQ_KEY, maximum.toString());
                max_event = 0;
                return false;
            }));
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
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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
                GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + ' boost 1');
            } else {
                GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + ' boost 0');
            }
            if (save) this._settings.set_boolean(TURBO_BOOST_KEY, state);
            return state;
        }
        return false;
    },

    remove_events: function () {
        if (event != 0) Mainloop.source_remove (event);
        if (install_event != 0) Mainloop.source_remove (install_event);
        if (core_event != 0) Mainloop.source_remove (core_event);
        if (min_event != 0) Mainloop.source_remove (min_event);
        if (max_event != 0) Mainloop.source_remove (max_event);
        event = 0; install_event = 0; core_event = 0; min_event = 0; max_event = 0;
    }
});

const NewMenuItem = new Lang.Class ({
    Name: 'NewMenuItem',
    Extends: PopupMenu.PopupMenuItem,

    _init: function (text, active, params) {
        this.parent (text, active, params);
        this.entry = new St.Entry ({ text:'', hint_text: 'Profile Name', style_class: 'cpufreq-entry', track_hover: true, can_focus: true, x_expand: true });
        this.actor.add_child (this.entry);
        this.entry.set_primary_icon (new St.Icon({ style_class: 'cpufreq-entry-icon', icon_name: 'emblem-ok-symbolic', icon_size: 14 }));
        //FIX to the bug https://bugzilla.gnome.org/show_bug.cgi?id=782190 only 1 button useful for 3.18-3.24
        //this.entry.set_secondary_icon (new St.Icon({ icon_name: 'edit-delete-symbolic', icon_size: 14 }));
        this.entry.connect ('primary-icon-clicked', Lang.bind(this, function () {
            this.emit ('save');
        }));
        this.entry.connect ('secondary-icon-clicked', Lang.bind(this, function () {
            this.emit ('save');
        }));
        this.entry.clutter_text.connect('key-press-event', Lang.bind (this, function (o, event) {
            let symbol = event.get_key_symbol();
            if (symbol == Clutter.Escape) {
                this.toggle ();
                return Clutter.EVENT_STOP;
            } else if (symbol == Clutter.Return || symbol == Clutter.KP_Enter) {
                this.emit ('save');
                this.toggle ();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        }));
        this.entry.visible = false;
    },

    activate: function (event) {
        if (this.entry.text != '') this.toggle ();
    },

    toggle: function () {
        this.label.visible = !this.label.visible;
        this.entry.visible = !this.entry.visible;
        if (this.entry.visible) Clutter.grab_keyboard (this.entry.clutter_text);
        else Clutter.ungrab_keyboard ();
    }
});

const ProfileMenuItem = new Lang.Class ({
    Name: 'ProfileMenuItem',
    Extends: PopupMenu.PopupMenuItem,

    _init: function (text, active, params) {
        this.parent (text, active, params);
        this.label.x_expand = true;
        this.edit_mode = false;
        this.entry = new St.Entry ({ text: text, style_class: 'cpufreq-entry', track_hover: true, can_focus: true, x_expand: true });
        this.actor.add_child (this.entry);
        this.entry.set_primary_icon (new St.Icon({ style_class: 'cpufreq-entry-icon', icon_name: 'emblem-ok-symbolic', icon_size: 14 }));
        this.entry.connect ('primary-icon-clicked', Lang.bind (this, function () {
            this.update ();
        }));
        this.entry.connect ('secondary-icon-clicked', Lang.bind (this, function () {
            this.update ();
        }));
        this.entry.clutter_text.connect('key-press-event', Lang.bind (this, function (o, event) {
            let symbol = event.get_key_symbol();
            if (symbol == Clutter.Escape) {
                this.toggle ();
                return Clutter.EVENT_STOP;
            } else if (symbol == Clutter.Return || symbol == Clutter.KP_Enter) {
                this.update ();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        }));
        this.entry.visible = false;
        this.edit_button = new St.Button ({ child: new St.Icon ({ icon_name: 'open-menu-symbolic', icon_size: 14 }), style_class: 'edit-button'});
        this.actor.add_child (this.edit_button);
        this.edit_button.connect ('clicked', Lang.bind (this, function () {
            this.toggle ();
            this.edit_mode = true;
            Clutter.grab_keyboard (this.entry.clutter_text);
            global.stage.set_key_focus (this.entry.clutter_text);
        }));
        this.delete_button = new St.Button ({ child: new St.Icon ({ icon_name: 'edit-delete-symbolic', icon_size: 14 }), style_class: 'delete-button'});
        this.actor.add_child (this.delete_button);
        this.delete_button.connect ('clicked', Lang.bind (this, function (actor, event) {
            this.emit ('delete', event);
        }));
    },

    update: function () {
        this.label.text = this.entry.text;
        this.toggle ();
        this.entry.remove_style_pseudo_class('focus');
        this.emit ('update', event);
    },

    activate: function (event) {
        if (this.entry.text == '') this.entry.text = this.label.text;
        if (!this.edit_mode) this.parent (event);
        if (this.entry.visible) this.toggle ();
        this.edit_mode = false;
    },

    toggle: function () {
        this.label.visible = !this.label.visible;
        this.entry.visible = !this.entry.visible;
        this.edit_button.visible = !this.edit_button.visible;
        this.delete_button.visible = !this.delete_button.visible;
        Clutter.ungrab_keyboard ();
    }
});

const SeparatorItem = new Lang.Class({
    Name: 'SeparatorItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function () {
        this.parent({ reactive: false, style_class: 'separator-item', can_focus: false});

        this._separator = new Separator.HorizontalSeparator ({ style_class: 'popup-separator-menu-item' });
        this.actor.add (this._separator.actor, { expand: true });
    }
});

let freqMenu;

function init () {
}

function enable () {
    freqMenu = new FrequencyIndicator;
    Main.panel.addToStatusArea ('cpufreq-indicator', freqMenu);
}

function disable () {
    freqMenu.remove_events ();
    freqMenu.destroy ();
    freqMenu = null;
}
