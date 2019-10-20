/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

imports.gi.versions.Gtk = '3.0';

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const AI = imports.gi.AppIndicator3;
const Lang = imports.lang;

const Logger = imports.common.Logger;
const Convenience = imports.convenience;
const Settings = imports.common.Settings;
const Gettext = imports.gettext.domain('org-konkor-cpufreq');
const _ = Gettext.gettext;

var DEBUG_LVL = 0;
var DOMAIN = "indicator"
Logger.init (DEBUG_LVL);
function debug (msg) { Logger.debug (DOMAIN, msg);}
function error (msg) { Logger.error (DOMAIN, msg);}
function info (msg)  { Logger.info (DOMAIN, msg);}
Convenience.initTranslations ();

//let status_event = 0;
let update_event = 0;
//let settings = null;
//let server = 0;
let APPDIR = "";
let desktop = GLib.getenv ("XDG_CURRENT_DESKTOP").toUpperCase ();
let window = null;
let stats = "";

var CPUFreqIndicator = new Lang.Class ({
  Name: "CPUFreqIndicator",
  Extends: Gtk.Application,

  _init: function (props={}, path="") {
    GLib.set_prgname ("cpufreq-indicator");
    this.parent (props);
    GLib.set_application_name ("CPUFreq Indicator");
    APPDIR = path;
  },

  vfunc_startup: function () {
    this.parent();
    if (this.settings) return;
    this.settings = new Settings.Settings ();
  },

  vfunc_activate: function () {
    if (!this.active_window) {
      window = new Gtk.ApplicationWindow ({ application:this });
      window.connect ("destroy", () => {
        return true;
      });
      /*window.set_icon_name ('cpufreq');
      if (!window.icon) try {
        window.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/cpufreq.svg").pixbuf;
      } catch (e) {
        error (e.message);
      }*/
      this.initialize ();
      window.hide ();
    }
  },

  initialize: function () {
    this.enable_service ();
    this.build_menu ();
    this.dbus = Gio.bus_get_sync (Gio.BusType.SESSION, null);
    if (this.dbus)
      this.dbus.call ('org.freedesktop.DBus', '/', "org.freedesktop.DBus", "AddMatch",
        GLib.Variant.new ('(s)', ["type=\'signal\'"]), null, Gio.DBusCallFlags.NONE, -1, null, () => {
          this._signalCC = this.dbus.signal_subscribe (null, "org.konkor.cpufreq.service", "FrequencyChanged",
          '/org/konkor/cpufreq/service', null, Gio.DBusSignalFlags.NO_MATCH_RULE, this.on_frequency_changed.bind (this));
      });
  },

  enable_service: function () {
    if (GLib.spawn_command_line_async (APPDIR + "/cpufreq-service")) {
      debug ("Starting cpufreq-service...")
    } else {
      error ("Failed to start cpufreq-service...")
    }
  },

  build_menu: function () {
    var item;
    this.appmenu = new Gtk.Menu ();
    this.indicator = AI.Indicator.new ("CPUFreq", "cpufreq-indicator", AI.IndicatorCategory.APPLICATION_STATUS);
    this.indicator.set_icon_theme_path (APPDIR + "/data/icons");
    //this.appmenu.append (new Gtk.SeparatorMenuItem ());
    item = Gtk.MenuItem.new_with_label (_("Exit"));
    item.connect ('activate', () => {
      this.remove_events ();
      this.quit ();
    });
    this.appmenu.append (item);

    this.appmenu.show_all ();
    this.indicator.set_status (AI.IndicatorStatus.ACTIVE);
    this.indicator.set_icon ("");
    this.indicator.set_label ("---", "");
    this.indicator.set_menu (this.appmenu);
    this.appmenu.connect ('show', () => {
      this.update_stats ();
    });

  },

  on_frequency_changed: function (conn, sender, object, iface, signal, param, user_data) {
    stats = param.get_child_value(0).get_string()[0];
    if (update_event) GLib.Source.remove (update_event);
    update_event = GLib.timeout_add (0, 50, this.update_stats.bind (this));
  },

  update_stats: function () {
    if (update_event) {
      GLib.Source.remove (update_event);
      update_event = 0;
    }
    this.indicator.set_label (stats, "");
    debug (stats);
  },

  remove_events: function () {
    if (update_event) GLib.Source.remove (update_event);
    update_event = 0;
    if (this.dbus && this._signalCC) this.dbus.signal_unsubscribe (this._signalCC);
    this._signalCC = 0;
  }
});

function spawn_async (args, callback) {
  callback = callback || null;
  let r, pid;
  try {
    [r, pid] = GLib.spawn_async (null, args, null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
  } catch (e) {
    error (e.message);
    return;
  }
  if (callback) GLib.child_watch_add (GLib.PRIORITY_DEFAULT, pid, (p, s, o) => {
    callback (p, s, o);
  });
}
