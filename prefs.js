/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Author (C) 2016-2017 konkor <kapa76@gmail.com>
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

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const SAVE_SETTINGS_KEY = 'save-settings';
const PROFILES_KEY = 'profiles';
const MONITOR_KEY = 'monitor';
const CHARGING_KEY = 'charging';
const DISCHARGING_KEY = 'discharging';

const Gettext = imports.gettext.domain('gnome-shell-extensions-cpufreq');
const _ = Gettext.gettext;

const EXTENSIONDIR = getCurrentFile ()[1];
imports.searchPath.unshift (EXTENSIONDIR);
const Convenience = imports.convenience;

let save = false;
let profiles = [];
let monitor_timeout = 500;
let charging_profile = {percent:0, guid:""};
let discharging_profile = {percent:100, guid:""};

let settings = false;

var CPUFreqPreferences = new Lang.Class({
    Name: 'CPUFreqPreferences',

    _init: function () {
        this.parent (0.0, "CPUFreq Preferences", false);
        let label, s;

        settings = Convenience.getSettings ();
        save = settings.get_boolean (SAVE_SETTINGS_KEY);
        monitor_timeout = settings.get_int (MONITOR_KEY);
        s = settings.get_string (CHARGING_KEY);
        if (s) charging_profile = JSON.parse (s);
        s = settings.get_string (DISCHARGING_KEY);
        if (s) discharging_profile = JSON.parse (s);
        s =  settings.get_string (PROFILES_KEY);
        if (s) profiles = JSON.parse (s);

        this.notebook = new Gtk.Notebook ({expand:true});

        this.general = new PageGeneralCPUFreq ();
        this.notebook.add (this.general);
        label = new Gtk.Label ({label: _("General")});
        this.notebook.set_tab_label (this.general, label);

        this.power = new PagePowerCPUFreq ();
        this.notebook.add (this.power);
        label = new Gtk.Label ({label: _("Power")});
        this.notebook.set_tab_label (this.power, label);

        this.notebook.show_all ();
    }
});

var PageGeneralCPUFreq = new Lang.Class({
    Name: 'PageGeneralCPUFreq',
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        let id = 0, i = 0;
        this.border_width = 6;

        this.add (new Gtk.Label ({label: _("<b>System</b>"), use_markup:true, xalign:0, margin_top:8}));
        this.cb_startup = Gtk.CheckButton.new_with_label (_("Remember settings"));
        this.cb_startup.tooltip_text = _("Remember settings to restore on the next startup");
        this.cb_startup.margin = 6;
        this.add (this.cb_startup);
        this.cb_startup.active = save;
        this.cb_startup.connect ('toggled', Lang.bind (this, ()=>{
            save = this.cb_startup.active;
            settings.set_boolean (SAVE_SETTINGS_KEY, save);
        }));
        this.add (new Gtk.Label ({label: _("<b>Frequency Monitor</b>"), use_markup:true, xalign:0, margin_top:12}));
        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6});
        this.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label: _("Frequency Updating Interval (ms)")}));
        this.timeout = Gtk.SpinButton.new_with_range (0, 1000000, 50);
        this.timeout.tooltip_text = _("500ms - default, 0 - disable");
        this.timeout.value = monitor_timeout;
        this.timeout.connect ('value_changed', Lang.bind (this, ()=>{
            monitor_timeout = this.timeout.value;
            settings.set_int (MONITOR_KEY, monitor_timeout);
        }));
        hbox.pack_end (this.timeout, false, false, 0);

        this.show_all ();
    }
});

var PagePowerCPUFreq = new Lang.Class({
    Name: 'PagePowerCPUFreq',
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.border_width = 6;

        this.unplug = new PowerProfile (discharging_profile, "Battery discharging");
        this.add (this.unplug);
        this.plug = new PowerProfile (charging_profile, "Battery charging");
        this.add (this.plug);
        this.unplug.combo.connect ('changed', Lang.bind (this, (o)=>{
            if (o.active == 0) discharging_profile.guid = "";
            else discharging_profile.guid = profiles[o.active - 1].guid;
            settings.set_string (DISCHARGING_KEY, JSON.stringify (discharging_profile));
        }));
        this.unplug.slider.connect('value_changed', Lang.bind (this, function (o) {
            discharging_profile.percent = Math.round (o.get_value ());
            settings.set_string (DISCHARGING_KEY, JSON.stringify (discharging_profile));
        }));
        this.plug.combo.connect ('changed', Lang.bind (this, (o)=>{
            if (o.active == 0) charging_profile.guid = "";
            else charging_profile.guid = profiles[o.active - 1].guid;
            settings.set_string (CHARGING_KEY, JSON.stringify (charging_profile));
        }));
        this.plug.slider.connect('value_changed', Lang.bind (this, function (o) {
            charging_profile.percent = Math.round (o.get_value ());
            settings.set_string (CHARGING_KEY, JSON.stringify (charging_profile));
        }));

        this.show_all ();
    }
});

var PowerProfile = new Lang.Class({
    Name: 'PowerProfile',
    Extends: Gtk.Box,

    _init: function (profile, text) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.border_width = 6;
        let id = 0, i = 1;

        this.add (new Gtk.Label ({label:"<b>"+text+"</b>",use_markup:true,xalign:0,margin_top:8}));

        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        this.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label: _("Power Profile")}));
        this.combo = new Gtk.ComboBoxText ();
        this.combo.append_text (_("do nothing"));
        profiles.forEach (s => {
            this.combo.append_text (s.name);
            if (s.guid == profile.guid) id = i;
            i++;
        });
        this.combo.active = id;
        hbox.pack_end (this.combo, false, false, 0);

        hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        this.add (hbox);
        this.label = new Gtk.Label ({label:"when battery level", use_markup:true, xalign:0});
        hbox.pack_start (this.label, true, true, 0);
        this.info = new Gtk.Label ({label:"<i>"+profile.percent+"%</i>", use_markup:true});
        hbox.pack_end (this.info, false, false, 0);
        this.slider = Gtk.Scale.new_with_range (Gtk.Orientation.HORIZONTAL, 1, 100, 1);
        this.slider.draw_value = false;
        this.slider.set_value (profile.percent);
        this.add (this.slider);
        this.slider.connect('value_changed', Lang.bind (this, function (o) {
            this.update_info (Math.round (o.get_value ()).toString ());
        }));

        this.show_all ();
    },

    update_info: function (info) {
        this.info.set_markup ("<i>" + info + "%</i>");
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
    let file = Gio.File.new_for_path (path);
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

function debug (msg) {
    if (msg) print ("[cpufreq][prefs] " + msg);
}

function error (msg) {
    log ("[cpufreq][prefs] (EE) " + msg);
}

function init() {
    Convenience.initTranslations ();
}

function buildPrefsWidget() {
    let widget = new CPUFreqPreferences ();
    return widget.notebook;
}
