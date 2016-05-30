const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

const SETTINGS_ID = 'org.gnome.shell.extensions.cpufreq'
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();

let event = null;

const FrequencyIndicator = new Lang.Class({
    Name: 'FrequencyIndicator',
    Extends: PanelMenu.Button,

    _init: function () {
       this.parent(0.0, "CPU Frequency Indicator", false);
       this.statusLabel = new St.Label({text: "Hz"});
       this.actor.add_actor(this.statusLabel);
       this.pkexec_path = GLib.find_program_in_path('pkexec');
       this.cpufreqctl_path = EXTENSIONDIR + '/cpufreqctl';

       this.governorchanged = false;
       this.util_present = false;
       
       this.cpuFreqInfoPath = GLib.find_program_in_path('cpufreq-info');
       if(this.cpuFreqInfoPath){
           this.util_present = true;
       }

       this.cpuPowerPath = GLib.find_program_in_path('cpupower');
       if(this.cpuPowerPath){
           this.util_present = true;
       }

       this._build_ui();
        
       if(this.util_present){
           event = GLib.timeout_add_seconds(0, 1, Lang.bind(this, function () {
               this._update_freq();
               this._update_popup();
               return true;
           }));
       }
    },
    
    _build_ui: function() {
        this._update_freq();
        this._build_popup();
        
    },

    _update_freq: function() {
        let freqInfo = null;
        if(this.util_present){
            let cpufreq_output = GLib.spawn_command_line_sync(this.cpufreqctl_path + " info");
            if(cpufreq_output[0]) freqInfo = cpufreq_output[1].toString().split("\n")[0];
            if (freqInfo) {
                if (freqInfo.length > 6) {
                    this.title = (parseInt(freqInfo)/1000000).toFixed(1).toString() + " GHz";
                } else {
                    this.title = (parseInt(freqInfo)/1000).toFixed(0).toString() + " MHz";
                }
            }
        } else {
            this.title = "!"
        }
        
        this.statusLabel.set_text (this.title);
    },
    
    _update_popup: function() {
        if(this.util_present){  
            this.governors = this._get_governors();
            if (this.governors.length>0){
                for each (let governor in this.governors){
                    if (governor[1] == true) {
                        this.activeg.label.text = governor[0];
                    }
                }
            }
        }
    },

    _build_popup: function() {
        this.menu.removeAll();
        if(this.util_present){  
            //get the available governors
            this.governors = this._get_governors();
            this.activeg = new PopupMenu.PopupMenuItem("unknown");
            this.menu.addMenuItem(this.activeg);
            let separator1 = new PopupMenu.PopupSeparatorMenuItem();
            this.menu.addMenuItem(separator1);

            if (this.governors.length > 0){
                for each (let governor in this.governors){
                    let governorItem = new PopupMenu.PopupMenuItem(governor[0]);
                    this.menu.addMenuItem(governorItem);
                    if (governor[1] == true) {
                        this.activeg.label.text = governor[0];
                    }
                    
                    governorItem.connect('activate', Lang.bind(this, function() {
                        let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' gov ' + governorItem.label.text;
		                global.log(cmd);
		                Util.trySpawnCommandLine(cmd);
                    }));
                }
            }
        } else {
            let errorItem = new PopupMenu.PopupMenuItem("Please install cpufrequtils or cpupower");
            this.menu.addMenuItem(errorItem);
        }
    },

    _get_cpu_number: function(){
        let ret = GLib.spawn_command_line_sync("grep -c processor /proc/cpuinfo");
        return ret[1].toString().split("\n", 1)[0];
    },
    
    _get_governors: function(){
        let governors = new Array();
        let governorslist = new Array();
        let governoractual = '';
        if (this.util_present) {
            //get the list of available governors
            var cpufreq_output1 = GLib.spawn_command_line_sync(this.cpufreqctl_path + " list");
            if(cpufreq_output1[0]) governorslist = cpufreq_output1[1].toString().split("\n")[0].split(" ");
            
            //get the actual governor
            var cpufreq_output2 = GLib.spawn_command_line_sync(this.cpufreqctl_path + " gov");
            if(cpufreq_output2[0]) governoractual = cpufreq_output2[1].toString().split("\n")[0].toString();
            
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
    }
});

let freqMenu;

function init()
{
}

function enable()
{
  freqMenu = new FrequencyIndicator;
  Main.panel.addToStatusArea('cpufreq-indicator', freqMenu);
}

function disable()
{
  freqMenu.destroy();
  Mainloop.source_remove(event);
  freqMenu = null;
}
