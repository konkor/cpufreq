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
const TURBO_BOOST_KEY = 'turbo-boost';
const GOVERNOR_KEY = 'governor';
const CPU_FREQ_KEY = 'cpu-freq';
const MIN_FREQ_KEY = 'min-freq';
const MAX_FREQ_KEY = 'max-freq';
const MIN_FREQ_PSTATE_KEY = 'min-freq-pstate';
const MAX_FREQ_PSTATE_KEY = 'max-freq-pstate';
const PROFILES_KEY = 'profiles';
const PROFILE_KEY = 'profile';
const MONITOR_KEY = 'monitor';

let _save = false;
let _PID = -1;
let profiles = [];

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
  },

  get save () { return _save; },
  set save (val) {
    _save = val;
    this.set_boolean (SAVE_SETTINGS_KEY, _save);
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

  get turbo () { return this.get_boolean (TURBO_BOOST_KEY); },
  set turbo (val) { this.set_boolean (TURBO_BOOST_KEY, val); },

  get min_freq () { return this.get_string (MIN_FREQ_KEY); },
  set min_freq (val) { this.set_string (MIN_FREQ_KEY, val); },

  get max_freq () { return this.get_string (MAX_FREQ_KEY); },
  set max_freq (val) { this.set_string (MAX_FREQ_KEY, val); },

  get governor () { return this.get_string (GOVERNOR_KEY); },
  set governor (val) { this.set_string (GOVERNOR_KEY, val); },

  get min_freq_pstate () { return this.get_int (MIN_FREQ_PSTATE_KEY); },
  set min_freq_pstate (val) { this.set_int (MIN_FREQ_PSTATE_KEY, val); },

  get max_freq_pstate () { return this.get_int (MAX_FREQ_PSTATE_KEY); },
  set max_freq_pstate (val) { this.set_int (MAX_FREQ_PSTATE_KEY, val); },

  get cpu_freq () { return this.get_string (CPU_FREQ_KEY); },
  set cpu_freq (val) { this.set_string (CPU_FREQ_KEY, val); },

  save_current: function (profile) {
    this.governor = prf.core[0].g;
    this.turbo = prf.turbo;
    this.min_freq_pstate = prf.minf;
    this.max_freq_pstate = prf.maxf;
    this.min_freq = prf.core[0].a.toString();
    this.max_freq = prf.core[0].b.toString();
  },
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
