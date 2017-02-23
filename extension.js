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
const Mainloop = imports.mainloop;

const SAVE_SETTINGS_KEY = 'save-settings';
const TURBO_BOOST_KEY = 'turbo-boost';
const GOVERNOR_KEY = 'governor';
const CPU_FREQ_KEY = 'cpu-freq';
const MIN_FREQ_KEY = 'min-freq';
const MAX_FREQ_KEY = 'max-freq';
const MIN_FREQ_PSTATE_KEY = 'min-freq-pstate';
const MAX_FREQ_PSTATE_KEY = 'max-freq-pstate';
const SETTINGS_ID = 'org.gnome.shell.extensions.cpufreq';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension ();
const EXTENSIONDIR = Me.dir.get_path ();
const CpufreqUtil = Me.imports.cpufreqUtil;
const Convenience = Me.imports.convenience;

let event = null;
let save = false;

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
            if (this.util_present) {
                this.governors = this._get_governors ();
                if (this.governors.length > 0) {
                    for each (let governor in this.governors) {
                        if (governor[1] == true) {
                            this.activeg.label.text = "\u26A1 " + governor[0];
                        }
                    }
                }
            }
        }));
        this.pkexec_path = GLib.find_program_in_path ('pkexec');
        this.cpufreqctl_path = EXTENSIONDIR + '/cpufreqctl';

        this.governorchanged = false;
        this.util_present = false;
        this.pstate_present = false;
        this.boost_present = false;
        this.installed = false;
        this.governorslist = [];
        this.frequences = [];

        this.cpuFreqInfoPath = GLib.find_program_in_path ('cpufreq-info');
        if (this.cpuFreqInfoPath){
            this.util_present = true;
        }

        this.cpuPowerPath = GLib.find_program_in_path ('cpupower');
        if (this.cpuPowerPath) {
            this.util_present = true;
        }

        if(GLib.file_test ("/usr/share/polkit-1/actions/konkor.cpufreq.policy", GLib.FileTest.EXISTS)) {
            this.installed = true;
        }

        if (this.pkexec_path == null) {
            this.installed = false;
        }

        this._check_extensions ();
        
        save = this._settings.get_boolean(SAVE_SETTINGS_KEY);

        this._build_ui ();
        
        if (save) this._load_settings ();

        this._add_event ();
    },

    _check_extensions: function () {
        if (this.util_present && this.installed) {
            var freqInfo = null;
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " driver");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                if (freqInfo == 'intel_pstate') {
                    this.pstate_present = true;
                }
            }
            var default_boost = this._get_boost ();
            if (default_boost == false) {
                this._set_boost (true);
                var new_state = this._get_boost ();
                if (default_boost != new_state) {
                    this.boost_present = true;
                    this._set_boost (false);
                }
            } else {
                this.boost_present = true;
            }
        }
    },

     _add_event: function () {
        if (this.util_present) {
            event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
                if (this._cur_freq && this._cur_freq.available) {
                    this._cur_freq.execute(Lang.bind(this, function() {
                        this._update_freq();
                    }));
                }
                return true;
            }));
        }
    },

    _build_ui: function () {
        this._cur_freq = new CpufreqUtil.CpufreqUtil();
        this._update_freq ();
        //get the list of available governors
        var cpufreq_output1 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " list");
        if (cpufreq_output1[0]) this.governorslist = cpufreq_output1[1].toString().split("\n")[0].split(" ");
        this._build_popup ();
    },

    _update_freq: function () {
        let freqInfo = null;
        if (this.util_present) {
            if (this._cur_freq && this._cur_freq.available)
                freqInfo = this._cur_freq.freq;
            //if (cpufreq_output[0]) freqInfo = cpufreq_output.split("\n")[0];
            if (freqInfo) {
                //global.log (freqInfo);
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
        var gov = this._settings.get_string (GOVERNOR_KEY);
        var freq = this._settings.get_string (CPU_FREQ_KEY);
        let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov ' + gov;
        GLib.spawn_command_line_sync (cmd);
		if (gov == 'userspace') {
            cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' set ' + freq;
	    	Util.trySpawnCommandLine (cmd);
        }
    }, 

    _build_popup: function () {
        this.menu.removeAll ();
        if (this.util_present) {
            this.governors = this._get_governors ();
            this.frequences = this._get_frequences ();
            this.activeg = new PopupMenu.PopupMenuItem ("unknown");
            this.menu.addMenuItem (this.activeg);
            let separator1 = new PopupMenu.PopupSeparatorMenuItem ();
            this.menu.addMenuItem (separator1);
            let slider_min = null;
            let slider_max = null;
            let slider_lock = false;

            if (this.pstate_present) {
                slider_min = new Slider.Slider (this._get_min_pstate () / 100);
                slider_max = new Slider.Slider (this._get_max_pstate () / 100);
            } else if (this.frequences.length > 0) {
                slider_min = new Slider.Slider (this._get_pos (this._get_min ()));
                slider_max = new Slider.Slider (this._get_pos (this._get_max ()));
            }
            if (this.governors.length > 0) {
                for each (let governor in this.governors){
                    if (governor[1] == true) {
                        this.activeg.label.text = governor[0];
                    }
                    if ((governor[0] == 'userspace') && (this.frequences.length > 0)) {
                        let sm = new PopupMenu.PopupSubMenuMenuItem('userspace', false);
                        this.menu.addMenuItem (sm);
                        for each (let freq in this.frequences){
                            let f = freq;
                            var s = '';
                            if (freq.length > 6) {
                                s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
                            } else {
                                s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
                            }
                            let u_item = new PopupMenu.PopupMenuItem (s);
                            sm.menu.addMenuItem (u_item);
                            u_item.connect ('activate', Lang.bind (this, function () {
                                if (this.installed) {
                                    GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov userspace');
                                    let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' set ' + f;
	    	                        global.log (cmd);
		                            Util.trySpawnCommandLine (cmd);
		                            if (save) {
		                                this._settings.set_string(GOVERNOR_KEY, 'userspace');
		                                this._settings.set_string(CPU_FREQ_KEY, f.toString ());		                            }
		                        }
                            }));
                        }
                    } else {
                        let governorItem = new PopupMenu.PopupMenuItem (governor[0]);
                        this.menu.addMenuItem (governorItem);
                        governorItem.connect ('activate', Lang.bind (this, function () {
                            if (this.installed) {
                                let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov ' + governorItem.label.text;
		                        global.log (cmd);
		                        GLib.spawn_command_line_sync (cmd);
		                        if (save) this._settings.set_string(GOVERNOR_KEY, governorItem.label.text);
		                        if (this.pstate_present) {
		                            slider_lock = true;
                                    slider_min.setValue (this._get_min_pstate () / 100);
                                    slider_max.setValue (this._get_max_pstate () / 100);
                                    slider_lock = false;
                                }
                            } else {
                                this._install ();
                            }
                        }));
                    }
                }
            }
            if (this.boost_present || this.pstate_present || (this.frequences.length > 0)) {
                separator1 = new PopupMenu.PopupSeparatorMenuItem ();
                this.menu.addMenuItem (separator1);
            }
            if (this.pstate_present) {
                let turbo_switch = new PopupMenu.PopupSwitchMenuItem('Turbo Boost: ', this._get_turbo ());
                this.menu.addMenuItem (turbo_switch);
                turbo_switch.connect ('toggled', Lang.bind (this, function (item) {
                    if (this.installed) {
                        this._set_turbo (item.state);
                    }
                }));
                let title_min = new PopupMenu.PopupMenuItem ('Minimum:', {reactive: false});
                let label_min = new St.Label ({text: this._get_min_pstate().toString() + "%"});
                title_min.actor.add_child (label_min, {align:St.Align.END});
                this.menu.addMenuItem (title_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (slider_lock == false) {
                            label_min.set_text (Math.floor (item.value * 100).toString() + "%");
                            this._set_min_pstate (Math.floor (item.value * 100));
                        }
                    }
                }));
                let title_max = new PopupMenu.PopupMenuItem ('Maximum:', {reactive: false});
                let label_max = new St.Label ({text: this._get_max_pstate().toString() + "%"});
                title_max.actor.add_child (label_max, {align:St.Align.END});
                this.menu.addMenuItem (title_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (slider_lock == false) {
                            label_max.set_text (Math.floor (item.value * 100).toString() + "%");
                            this._set_max_pstate (Math.floor (item.value * 100));
                        }
                    }
                }));
            } else if (this.boost_present) {
                let boost_switch = new PopupMenu.PopupSwitchMenuItem('Turbo Boost: ', this._get_boost ());
                this.menu.addMenuItem (boost_switch);
                boost_switch.connect ('toggled', Lang.bind (this, function (item) {
                    if (this.installed) {
                        this._set_boost (item.state);
                    }
                }));
            }
            if (!this.pstate_present || (this.frequences.length > 0)) {
                let title_min = new PopupMenu.PopupMenuItem ('Minimum:', {reactive: false});
                let label_min = new St.Label ({text: this._get_min_label ()});
                title_min.actor.add_child (label_min, {align:St.Align.END});
                this.menu.addMenuItem (title_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (slider_lock == false) {
                            var f = this._get_freq (Math.floor (item.value * 100));
                            label_min.set_text (this._get_label (f));
                            this._set_min (f);
                        }
                    }
                }));
                let title_max = new PopupMenu.PopupMenuItem ('Maximum:', {reactive: false});
                let label_max = new St.Label ({text: this._get_max_label ()});
                title_max.actor.add_child (label_max, {align:St.Align.END});
                this.menu.addMenuItem (title_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (slider_lock == false) {
                            var f = this._get_freq (Math.floor (item.value * 100));
                            label_max.set_text (this._get_label (f));
                            this._set_max (f);
                        }
                    }
                }));
            }
            if (!this.installed) {
                separator1 = new PopupMenu.PopupSeparatorMenuItem ();
                this.menu.addMenuItem (separator1);
                let mi_install = new PopupMenu.PopupMenuItem ("\u26a0 Install...");
                this.menu.addMenuItem (mi_install);
                mi_install.connect ('activate', Lang.bind (this, function () {
                    if (!this.installed) {
                        this._install ();
                    }
                }));
            } else {
                separator1 = new PopupMenu.PopupSeparatorMenuItem ();
                this.menu.addMenuItem (separator1);
                let sm = new PopupMenu.PopupSubMenuMenuItem('Preferences', false);
                this.menu.addMenuItem (sm);
                let save_switch = new PopupMenu.PopupSwitchMenuItem('Remember settings', save);
                sm.menu.addMenuItem (save_switch);
                save_switch.connect ('toggled', Lang.bind (this, function (item) {
                    save = item.state;
                    this._settings.set_boolean(SAVE_SETTINGS_KEY, item.state);
                }));
            }
        } else {
            let errorItem = new PopupMenu.PopupMenuItem ("\u26a0 Please install cpufrequtils or cpupower");
            this.menu.addMenuItem (errorItem);
        }
    },

    _get_cpu_number: function () {
        let ret = GLib.spawn_command_line_sync ("grep -c processor /proc/cpuinfo");
        return ret[1].toString().split("\n", 1)[0];
    },

    _get_governors: function () {
        let governors = new Array();
        let governoractual = '';
        if (this.util_present) {
            //get the actual governor
            var cpufreq_output2 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " gov");
            if (cpufreq_output2[0]) governoractual = cpufreq_output2[1].toString().split("\n")[0].toString();

            for each (let governor in this.governorslist){
                let governortemp;
                if(governoractual == governor)
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

    _install: function () {
        if (this.pkexec_path == null) {
            return;
        }
        var cmd = "sed -i \"s/USERNAME/" + GLib.get_user_name() + "/\" " + EXTENSIONDIR + "/konkor.cpufreq.policy";
        //global.log (cmd);
        GLib.spawn_command_line_sync (cmd);
        cmd = this.pkexec_path + " cp " + EXTENSIONDIR + '/konkor.cpufreq.policy /usr/share/polkit-1/actions/';
		Util.trySpawnCommandLine (cmd);
        GLib.usleep (2000000);
        if(GLib.file_test ("/usr/share/polkit-1/actions/konkor.cpufreq.policy", GLib.FileTest.EXISTS)) {
            this.installed = true;
        } else {
            return;
        }
        Mainloop.source_remove (event);
        this._check_extensions ();
        this._build_popup ();
        this._add_event ();
    },

    _get_frequences: function () {
        let frequences = new Array();
        let frequenceslist = new Array();
        if (this.util_present) {
            var cpufreq_output1 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " freq");
            if (cpufreq_output1[0]) frequenceslist = cpufreq_output1[1].toString().split("\n")[0].split(" ");
            for each (let freq in frequenceslist){
                if (freq.length > 0) {
                    frequences.unshift (freq);
                }
            }
        }
        return frequences;
    },

    _get_freq: function (num) {
        var n = this.frequences.length;
        var step = Math.round ((100 - (100 % n)) / n);
        var i = Math.round (num / step);
        if (i == n) i--;
        return parseInt (this.frequences[i]);
    },

    _get_pos: function (num) {
        var m = parseFloat (this.frequences[this.frequences.length -1]) - parseFloat (this.frequences[0]);
        var p = (parseFloat (num) - parseFloat (this.frequences[0]))/m;
        //global.log ('num=' + num.toString() + ' m=' + m.toString() + ' p=' + p.toString());
        return p;
    },

    _get_turbo: function () {
        var freqInfo = null;
        var turbo = true;
        if (this.util_present) {
            if (save) {
                turbo = this._settings.get_boolean(TURBO_BOOST_KEY);
                return this._set_turbo (turbo);
            }
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " turbo");
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
        var freqInfo = null;
        var minf = 0;
        if (this.util_present) {
            if (save) {
                minf = this._settings.get_int(MIN_FREQ_PSTATE_KEY);
                return this._set_min_pstate (minf);
            }
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " min");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 0;
    },

    _set_min_pstate: function (minimum) {
        if (this.util_present) {
            var cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " min " + minimum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_int(MIN_FREQ_PSTATE_KEY, minimum);
            return minimum;
        }
        return 0;
    },

    _get_max_pstate: function () {
        var freqInfo = null;
        var maxf = 100;
        if (this.util_present) {
            if (save) {
                maxf = this._settings.get_int(MAX_FREQ_PSTATE_KEY);
                return this._set_max_pstate (maxf);
            }
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " max");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 100;
    },

    _set_max_pstate: function (maximum) {
        if (this.util_present) {
            var cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " max " + maximum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_int(MAX_FREQ_PSTATE_KEY, maximum);
            return maximum;
        }
        return 100;
    },

    _get_label: function (num) {
        if (num >= 1000000) {
            return (num/1000000).toFixed(3).toString() + " \u3393";
        } else {
            return (num/1000).toFixed(0).toString() + " \u3392";
        }
    },

    _get_min_label: function () {
        return this._get_label (this._get_min ());
    },

    _get_max_label: function () {
        return this._get_label (this._get_max ());
    },

    _get_min: function () {
        var freqInfo = null;
        var minf = 0;
        if (this.util_present) {
            if (save) {
                minf = parseInt (this._settings.get_string (MIN_FREQ_KEY));
                if (minf > 0) return this._set_min (minf);
            }
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " minf");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return minf;
    },

    _set_min: function (minimum) {
        if (this.util_present) {
            var cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " minf " + minimum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_string (MIN_FREQ_KEY, minimum.toString());
            return minimum;
        }
        return 0;
    },

    _get_max: function () {
        var freqInfo = null;
        var maxf = 0;
        if (this.util_present) {
            if (save) {
                maxf = parseInt (this._settings.get_string (MAX_FREQ_KEY));
                if (maxf > 0) return this._set_max (maxf);
            }
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " maxf");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return maxf;
    },

    _set_max: function (maximum) {
        if (this.util_present) {
            var cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " maxf " + maximum.toString();
            Util.trySpawnCommandLine (cmd);
            if (save) this._settings.set_string (MAX_FREQ_KEY, maximum.toString());
            return maximum;
        }
        return 0;
    },

    _get_boost: function () {
        var freqInfo = null;
        var turbo = true;
        if (this.util_present) {
            if (save) {
                turbo = this._settings.get_boolean(TURBO_BOOST_KEY);
                return this._set_boost (turbo);
            }
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " boost");
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
    }
});

let freqMenu;

function init () {
}

function enable () {
  freqMenu = new FrequencyIndicator;
  Main.panel.addToStatusArea('cpufreq-indicator', freqMenu);
}

function disable () {
  freqMenu.destroy();
  Mainloop.source_remove(event);
  freqMenu = null;
}
