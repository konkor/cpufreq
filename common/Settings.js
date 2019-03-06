/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2018 konkor <github.com/konkor>
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
const Gio = imports.gi.Gio;

const SAVE_SETTINGS_KEY = 'save-settings';
const REMEMBERED_KEY = 'remember-profile';
/*const TURBO_BOOST_KEY = 'turbo-boost';
const GOVERNOR_KEY = 'governor';
const CPU_FREQ_KEY = 'cpu-freq';
const MIN_FREQ_KEY = 'min-freq';
const MAX_FREQ_KEY = 'max-freq';
const MIN_FREQ_PSTATE_KEY = 'min-freq-pstate';
const MAX_FREQ_PSTATE_KEY = 'max-freq-pstate';*/
const PROFILES_KEY = 'profiles';
const PROFILE_KEY = 'profile';
const MONITOR_KEY = 'monitor';

let _save = false;
let _PID = -1;
let profiles = [];
let remember_profile = null;

var Settings = new Lang.Class({
  Name: "Settings",
  Extends: Gio.Settings,

  _init: function () {
    const schema = 'org.gnome.shell.extensions.cpufreq';
    const GioSSS = Gio.SettingsSchemaSource;

    let schemaDir = Gio.File.new_for_path (getCurrentFile()[1] + '/schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
      schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                              GioSSS.get_default(),
                                              false);
    else
      schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
      throw new Error('Schema ' + schema + ' could not be found for the extension. ' +
                      'Please check your installation.');
    this.parent ({ settings_schema: schemaObj });
    this.load ();
  },

  load: function () {
    _save = this.get_boolean (SAVE_SETTINGS_KEY);
    _PID = this.get_int (PROFILE_KEY);
    this.load_profiles ();
    let s = this.get_string (REMEMBERED_KEY);
    if (s) remember_profile = JSON.parse (s);
    print ("Save settings", _save);
  },

  get save () { return _save; },
  set save (val) {
    _save = val;
    this.set_boolean (SAVE_SETTINGS_KEY, _save);
  },

  get current_profile () { return remember_profile; },
  set current_profile (val) {
    if (!val) return;
    remember_profile = val;
    this.update_current_profile ();
  },

  update_current_profile: function () {
    let s = JSON.stringify (remember_profile);
    this.set_string (REMEMBERED_KEY, s);
    print ("Updating settings");
  },

  get monitor () { return this.get_int (MONITOR_KEY); },
  set monitor (val) { this.set_int (MONITOR_KEY, val); },

  get PID () { return _PID; },
  set PID (val) {
    _PID = val;
    this.set_int (PROFILE_KEY, _PID);
  },

  get profiles () { return profiles; },

  load_profiles: function () {
    let s = this.get_string (PROFILES_KEY);
    if (s) try {
      profiles = JSON.parse (s);
    } catch (e) {
      profiles = [];
    }
  },

  add_profile: function (profile) {
    profiles.push (profile);
    this.set_string (PROFILES_KEY, JSON.stringify (profiles));
  },

  get turbo () {
    if (remember_profile) return remember_profile.turbo;
    return true;
  },
  set turbo (val) {
    print ("set turbo");
    if (!remember_profile || (remember_profile.turbo == val)) return;
    remember_profile.turbo = val;
    this.update_current_profile ();
  },

  get cpu_cores () {
    if (remember_profile) return remember_profile.cpu;
    return 1;
  },
  set cpu_cores (val) {
    print ("set cores online");
    if (!remember_profile || (remember_profile.cpu == val)) return;
    remember_profile.cpu = val;
    this.update_current_profile ();
  },

  get min_freq () {
    if (remember_profile && remember_profile.core[0])
      return remember_profile.core[0].a;
    return 0;
  },
  set min_freq (val) {
    print ("set min_freq");
    if (!remember_profile) return;
    var equal = true;
    for (let i = 0; i < remember_profile.cpu; i++) {
      if (remember_profile.core[i].a != val) equal = false;
      remember_profile.core[i].a = val;
    }
    if (!equal) this.update_current_profile ();
  },

  get max_freq () {
    if (remember_profile && remember_profile.core[0])
      return remember_profile.core[0].b;
    return 0;
  },
  set max_freq (val) {
    print ("set max_freq");
    if (!remember_profile) return;
    var equal = true;
    for (let i = 0; i < remember_profile.cpu; i++) {
      if (remember_profile.core[i].b != val) equal = false;
      remember_profile.core[i].b = val;
    }
    if (!equal) this.update_current_profile ();
  },

  get governor () {
    print ("get governor");
    if (remember_profile && remember_profile.core[0])
      return remember_profile.core[0].g;
    return "";
  },
  set governor (val) {
    print ("set governor");
    if (!remember_profile) return;
    var equal = true;
    for (let i = 0; i < remember_profile.cpu; i++) {
      if (remember_profile.core[i].g != val) equal = false;
      remember_profile.core[i].g = val;
    }
    if (!equal) this.update_current_profile ();
  },

  get min_freq_pstate () {
    if (remember_profile)
      return remember_profile.minf;
    return 0;
  },
  set min_freq_pstate (val) {
    if (!remember_profile || (remember_profile.minf == val)) return;
    remember_profile.minf = val;
    this.update_current_profile ();
  },

  get max_freq_pstate () {
    if (remember_profile)
      return remember_profile.maxf;
    return 0;
  },
  set max_freq_pstate (val) {
    if (!remember_profile || (remember_profile.maxf == val)) return;
    remember_profile.maxf = val;
    this.update_current_profile ();
  },

  set_userspace: function (frequency) {
    if (!remember_profile) return;
    var equal = true;
    for (let i = 0; i < remember_profile.core; i++) {
      if (remember_profile.core[i].g != "userspace") equal = false;
      if (remember_profile.core[i].f != frequency) equal = false;
      remember_profile.core[i].g = "userspace";
      remember_profile.core[i].f = frequency;
    }
    if (!equal) this.update_current_profile ();
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
  let file = Gio.File.new_for_path (path).get_parent();
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
