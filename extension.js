/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const SAVE_SETTINGS_KEY = 'save-settings';
const PROFILES_KEY = 'profiles';
const PROFILE_KEY = 'profile';
const MONITOR_KEY = 'monitor';
const EPROFILES_KEY = 'event-profiles';
const LABEL_KEY = 'label'
const SETTINGS_ID = 'org.gnome.shell.extensions.cpufreq';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension ();
const EXTENSIONDIR = Me.dir.get_path ();
const Convenience = Me.imports.convenience;

let event = 0;
let event_style = 0;
let monitor_event = 0;
let settingsID, powerID;

let save = false;
let profiles = [];
let label_text = "";
let title_text = "\u26A0";
let title_style = "";
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
<signal name="StyleChanged"> \
  <arg name="style" type="s"/> \
</signal> \
</interface> \
</node>';
const CpufreqServiceProxy = Gio.DBusProxy.makeProxyWrapper (CpufreqServiceIface);

const FrequencyIndicator = new Lang.Class({
  Name: 'Cpufreq',
  Extends: PanelMenu.Button,

  _init: function () {
    this.parent (0.0, "CPU Frequency Indicator", false);
    this._settings = Convenience.getSettings();

    this.statusLabel = new St.Label ({text: title_text, y_expand: true, y_align: 2, style_class:'cpufreq-text'});
    this.statusLabel.style = title_style;
    let _box = new St.BoxLayout();
    _box.add_actor(this.statusLabel);
    this.actor.add_actor(_box);
    this.actor.connect('button-press-event', Lang.bind(this, function () {
      GLib.spawn_command_line_async (EXTENSIONDIR + '/cpufreq-application --extension');
    }));

    this.load_settings (null, null);
    if (!monitor_timeout) this.statusLabel.set_text (this.get_title ());

    if (this.installed && save && first_boot) this.load_saved_settings ();
    first_boot = false;

    this._add_event ();

    //TODO: Workaround updating title
    this._settings.set_boolean (SAVE_SETTINGS_KEY, !save);
    this._settings.set_boolean (SAVE_SETTINGS_KEY, save);

    if (settingsID) this._settings.disconnect (settingsID);
    settingsID = this._settings.connect ("changed", Lang.bind (this, this.load_settings));

    this.power = new PowerManagerProxy (Gio.DBus.system, UP_BUS_NAME, UP_OBJECT_PATH, Lang.bind (this, function (proxy, e) {
      if (e) {
        log(e.message);
        return;
      }
      powerID = this.power.connect ('g-properties-changed', Lang.bind (this, this.on_power_state));
      this.on_power_state ();
    }));
  },

  load_settings: function (o, key) {
    //TODO: Clean unused settings
    let s;
    o = o || this._settings;

    if (!key) {
      this.PID =  o.get_int (PROFILE_KEY);
      s =  o.get_string (PROFILES_KEY);
      if (s.length > 0) profiles = JSON.parse (s);
      monitor_timeout =  o.get_int (MONITOR_KEY);
      save = o.get_boolean (SAVE_SETTINGS_KEY);
      label_text = o.get_string (LABEL_KEY);
      s = o.get_string (EPROFILES_KEY);
      if (s) eprofiles = JSON.parse (s);
    }

    if (key == MONITOR_KEY) {
      monitor_timeout =  o.get_int (MONITOR_KEY);
      if (monitor_event) {
        GLib.source_remove (monitor_event);
        monitor_event = 0;
      }
      monitor_event = GLib.timeout_add (100, 1000, Lang.bind (this, this._add_event));
    }
    if (key == PROFILE_KEY) {
      this.PID = o.get_int (PROFILE_KEY);
    }
    if (key == LABEL_KEY) {
      label_text = o.get_string (LABEL_KEY);
    }
    if (key == EPROFILES_KEY) {
      s = o.get_string (EPROFILES_KEY);
      if (s) eprofiles = JSON.parse (s);
    }

    if ((key == LABEL_KEY) && !monitor_timeout) this.statusLabel.set_text (this.get_title ());
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

  get_title: function (text) {
    text = text || label_text;
    title_text = text.trim ();
    return title_text;
  },

   _add_event: function () {
    if (this.proxy) {
      if (event) this.proxy.disconnectSignal (event);
      if (event_style) this.proxy.disconnectSignal (event_style);
      delete this.proxy;
      this.proxy = null;
      event = 0;
      event_style = 0;
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
          if (title) this.statusLabel.set_text (this.get_title (title.toString ()));
        }));
        event_style = this.proxy.connectSignal ('StyleChanged', Lang.bind(this, function (o, s, style) {
          if (style) {
            title_style = style.toString ();
            this.statusLabel.style = title_style;
          }
        }));
      }));
    }
    monitor_event = 0;
    // cpufreq-service should stop auto on disabled monitors
    //else GLib.spawn_command_line_async ("killall cpufreq-service");
  },

  load_saved_settings: function () {
    GLib.spawn_command_line_async (EXTENSIONDIR + '/cpufreq-application --profile=user');
  },

  remove_events: function () {
    if (this.proxy) {
      if (event) this.proxy.disconnectSignal (event);
      delete this.proxy;
      this.proxy = null;
      event = 0;
    }
    if (settingsID) this._settings.disconnect (settingsID);
    if (powerID) this.power.disconnect (powerID);
    if (monitor_event) GLib.source_remove (monitor_event);
    event = 0; monitor_event = 0;
    settingsID = 0; powerID = 0;
    //GLib.spawn_command_line_async ("killall cpufreq-service");
  }
});

let monitor;

function init () {
}

function enable () {
  monitor = new FrequencyIndicator;
  Main.panel.addToStatusArea ('cpufreq-indicator', monitor);
}

function disable () {
  monitor.remove_events ();
  monitor.destroy ();
  monitor = null;
}
