const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

const SETTINGS_ID = 'org.gnome.shell.extensions.cpufreq'
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension ();
const EXTENSIONDIR = Me.dir.get_path ();

let event = null;

const FrequencyIndicator = new Lang.Class({
    Name: 'FrequencyIndicator',
    Extends: PanelMenu.Button,

    _init: function () {
        this.parent (0.0, "CPU Frequency Indicator", false);
        this.statusLabel = new St.Label ({text: "\u26A0", y_expand: true, y_align: Clutter.ActorAlign.CENTER});
        this.actor.add_actor (this.statusLabel);
        this.pkexec_path = GLib.find_program_in_path ('pkexec');
        this.cpufreqctl_path = EXTENSIONDIR + '/cpufreqctl';

        this.governorchanged = false;
        this.util_present = false;
        this.pstate_present = false;
        this.boost_present = false;
        this.installed = false;

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

        this._build_ui ();

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
                this._set_boost ('1');
                var new_state = this._get_boost ();
                if (default_boost != new_state) {
                    this.boost_present = true;
                    this._set_boost ('0');
                }
            } else {
                this.boost_present = true;
            }
        }
    },
    
     _add_event: function () {
        if (this.util_present) {
            event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
                this._update_freq ();
                this._update_popup ();
                return true;
            }));
        }
    },

    _build_ui: function () {
        this._update_freq ();
        this._build_popup ();
    },

    _update_freq: function () {
        let freqInfo = null;
        if (this.util_present) {
            let cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " info");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
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

    _update_popup: function () {
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
                slider_min = new Slider.Slider (this._get_min () / 100);
                slider_max = new Slider.Slider (this._get_max () / 100);
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
		                        if (this.pstate_present) {
		                            slider_lock = true;
                                    slider_min.setValue (this._get_min () / 100);
                                    slider_max.setValue (this._get_max () / 100);
                                    slider_lock = false;
                                }
                            } else {
                                this._install ();
                            }
                        }));
                    }
                }
            }
            if (this.pstate_present) {
                separator1 = new PopupMenu.PopupSeparatorMenuItem ();
                this.menu.addMenuItem (separator1);
                let turbo_switch = new PopupMenu.PopupSwitchMenuItem('Turbo Boost: ', this._get_turbo ());
                this.menu.addMenuItem (turbo_switch);
                turbo_switch.connect ('toggled', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (item.state) {
                            this._set_turbo ('0');
                        } else {
                            this._set_turbo ('1');
                        }
                    }
                }));
                let title_min = new PopupMenu.PopupMenuItem ('Minimum:', {reactive: false});
                let label_min = new St.Label ({text: this._get_min().toString() + "%"});
                title_min.actor.add_child (label_min, {align:St.Align.END});
                this.menu.addMenuItem (title_min);
                let menu_min = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_min.actor.add (slider_min.actor, {expand: true});
                this.menu.addMenuItem (menu_min);
                slider_min.connect('value-changed', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (slider_lock == false) {
                            label_min.set_text (Math.floor (item.value * 100).toString() + "%");
                            this._set_min (Math.floor (item.value * 100));
                        }
                    }
                }));
                let title_max = new PopupMenu.PopupMenuItem ('Maximum:', {reactive: false});
                let label_max = new St.Label ({text: this._get_max().toString() + "%"});
                title_max.actor.add_child (label_max, {align:St.Align.END});
                this.menu.addMenuItem (title_max);
                let menu_max = new PopupMenu.PopupBaseMenuItem ({activate: false});
                menu_max.actor.add (slider_max.actor, {expand: true});
                this.menu.addMenuItem (menu_max);
                slider_max.connect('value-changed', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (slider_lock == false) {
                            label_max.set_text (Math.floor (item.value * 100).toString() + "%");
                            this._set_max (Math.floor (item.value * 100));
                        }
                    }
                }));
            } else if (this.boost_present) {
                separator1 = new PopupMenu.PopupSeparatorMenuItem ();
                this.menu.addMenuItem (separator1);
                let boost_switch = new PopupMenu.PopupSwitchMenuItem('Turbo Boost: ', this._get_boost ());
                this.menu.addMenuItem (boost_switch);
                boost_switch.connect ('toggled', Lang.bind (this, function (item) {
                    if (this.installed) {
                        if (item.state) {
                            this._set_boost ('1');
                        } else {
                            this._set_boost ('0');
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
        let governorslist = new Array();
        let governoractual = '';
        if (this.util_present) {
            //get the list of available governors
            var cpufreq_output1 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " list");
            if (cpufreq_output1[0]) governorslist = cpufreq_output1[1].toString().split("\n")[0].split(" ");

            //get the actual governor
            var cpufreq_output2 = GLib.spawn_command_line_sync (this.cpufreqctl_path + " gov");
            if (cpufreq_output2[0]) governoractual = cpufreq_output2[1].toString().split("\n")[0].toString();

            for each (let governor in governorslist){
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
                    frequences.push (freq);
                }
            }
        }
        return frequences;
    },

    _get_turbo: function () {
        var freqInfo = null;
        if (this.util_present) {
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
            GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + " turbo " + state.toString());
        }
    },

    _get_min: function () {
        var freqInfo = null;
        if (this.util_present) {
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " min");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 0;
    },

    _set_min: function (minimum) {
        if (this.util_present) {
            var cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " min " + minimum.toString();
            Util.trySpawnCommandLine (cmd);
        }
    },

    _get_max: function () {
        var freqInfo = null;
        if (this.util_present) {
            var cpufreq_output = GLib.spawn_command_line_sync (this.cpufreqctl_path + " max");
            if (cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                return parseInt (freqInfo);
            }
        }
        return 0;
    },

    _set_max: function (maximum) {
        if (this.util_present) {
            var cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + " max " + maximum.toString();
            Util.trySpawnCommandLine (cmd);
        }
    },

    _get_boost: function () {
        var freqInfo = null;
        if (this.util_present) {
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
            GLib.spawn_command_line_sync (this.pkexec_path + ' ' + this.cpufreqctl_path + ' boost ' + state.toString());
        }
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
