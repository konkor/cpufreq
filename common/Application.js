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
const Lang = imports.lang;

const Logger = imports.common.Logger;
const Convenience = imports.convenience;
const cpu = imports.common.HelperCPUFreq;
const Settings = imports.common.Settings;
const MainWindow = imports.common.ui.MainWindow;

var DEBUG_LVL = 0;

let started = Date.now ();
let window = null;

var CPUFreqApplication = new Lang.Class ({
  Name: "CPUFreqApplication",
  Extends: Gtk.Application,

  _init: function (props={}) {
    GLib.set_prgname ("cpufreq-application");
    this.parent (props);
    GLib.set_application_name ("CPUFreq Manager");
    Logger.init (DEBUG_LVL);
    this.save = true;
    this.extension = false;

    this.add_main_option (
      'debug', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Enable debugging messages", null
    );
    this.add_main_option (
      'verbose', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Enable verbose output", null
    );
    this.add_main_option (
      'extension', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Enable extension mode", null
    );
    this.add_main_option (
      'no-save', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Do not remember applying profile", null
    );
    this.add_main_option (
      'profile', 'p'.charCodeAt(0), GLib.OptionFlags.NONE, GLib.OptionArg.STRING,
      "Enable power profile battery|balanced|performance|system|user|GUID", "GUID"
    );
    this.connect ('handle-local-options', this.on_local_options.bind (this));
  },

  on_local_options: function (app, options) {
    try {
      this.register (null);
    } catch (e) {
      Logger.error ("Failed to register: %s".format (e.message));
      return 1;
    }

    if (options.contains ("verbose")) {
      DEBUG_LVL = 1; //Enable info messages
      Logger.init (1);
    }
    if (options.contains ("debug")) {
      DEBUG_LVL = 2;
      Logger.init (2);
    }
    if (options.contains ("extension")) {
      this.extension = true && !cpu.is_wayland ();
    }
    if (options.contains ("no-save")) {
      this.save = false;
    }
    if (options.contains ("profile")) {
      let v = options.lookup_value ("profile", null);
      if (v) [v, ] = v.get_string ();
      this.process_profile (v);
      return 0;
    }
    return -1;
  },

  vfunc_startup: function () {
    this.parent();
    this.initialize ();
  },

  initialize: function () {
    if (this.settings) return;
    cpu.init ();
    this.settings = new Settings.Settings (cpu);
  },

  vfunc_activate: function () {
    if (this.finishing) return;
    if (!this.active_window) {
      window = new MainWindow.MainWindow ({ application:this });
      window.connect ("destroy", () => {
        return true;
      });
      window.show_all ();
      cpu.profile_changed_callback = this.on_profile_changed.bind (this);
      if (this.settings.save && this.save) this.settings.restore_saved ();
      if (window.cpanel) window.cpanel.post_init ();
      else this.quit ();
      window.connect ("realize", () => {
        Logger.debug ("realize");
      });
    } else {
      if (this.extension) {
        if (this.active_window) this.active_window.save_geometry ();
        if (Date.now () - started > 1000) this.quit ();
      } else if (this.active_window.cpanel) GLib.timeout_add_seconds (0, 2, () => {
        this.active_window.update ();
        this.active_window.present ();
      });
    }
  },

  on_profile_changed: function (profile) {
    if (!this.active_window || !this.active_window.cpanel) return;
    this.active_window.cpanel.update (profile.name);
  },

  process_profile: function (id) {
    if (!id) {
      this.finishing = true;
      Logger.error ("No profile GUID specified...");
      return 1;
    }
    this.initialize ();
    this.finishing = true;
    this.hold ();
    cpu.profile_changed_callback = this.quit_cb.bind (this);
    this.settings.power_profile (id, this.save);
    return 0;
  },

  quit_cb: function (profile) {
    this.release ();
  },

  get cpufreq () {
    return cpu;
  }
});
