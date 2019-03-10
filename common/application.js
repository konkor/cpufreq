/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2019 konkor <github.com/konkor>
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

imports.gi.versions.Gtk = '3.0';

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const Convenience = imports.convenience;
const cpu = imports.common.HelperCPUFreq;
const Settings = imports.common.Settings;
const MainWindow = imports.common.ui.MainWindow;

const DEBUG_LVL = 2;

let window = null;

var CPUFreqApplication = new Lang.Class ({
  Name: "CPUFreqApplication",
  Extends: Gtk.Application,

  _init: function (args) {
    GLib.set_prgname ("cpufreq-application");
    this.parent ({
      application_id: "org.konkor.cpufreq.application"
    });
    GLib.set_application_name ("CPUFreq Manager");
    this.extension = false;
    if (args.indexOf ("--extension") > -1) this.extension = true;
    print (this.extension);
  },

  vfunc_startup: function() {
    this.parent();
    this.settings = new Settings.Settings ();
    cpu.init (this.settings);
  },

  vfunc_activate: function() {
    print ("activate");
    if (!this.active_window) {
      window = new MainWindow.MainWindow ({ application:this });
      window.connect ("destroy", () => {
        return true;
      });
      window.show_all ();
      cpu.profile_changed_callback = Lang.bind (this, this.on_profile_changed);
      if (this.settings.save) cpu.restore_saved ();
      window.cpanel.post_init ();
    }
    this.active_window.present ();
  },

  on_profile_changed: function (profile) {
    if (!this.active_window) return;
    this.active_window.cpanel.update (profile.name);
  },

  get cpufreq () {
    return cpu;
  }
});

function debug (msg) {
  if (msg && (DEBUG_LVL > 1)) print ("[cpufreq][manager]", msg);
}

function error (msg) {
  log ("[cpufreq][manager] (EE) " + msg);
}
