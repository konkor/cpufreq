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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];

const Convenience = imports.convenience;
const byteArrayToString = Convenience.byteArrayToString;

let governors = [];
let governoractual = [];
let util_present = false;
let pstate_present = false;
let cpufreqctl_path = null;
let pkexec_path = null;
let installed = false;
let updated = true;
let frequences = [];
let minimum_freq = 0;
let maximum_freq = 0;
let minfreq = 0, maxfreq = 0;
let cpucount = 1;
let boost_present = false;

let settings = null;
let core_event = 0;

function init (prefs) {
  settings = prefs;

  let res = get_info_string (APPDIR + "/cpufreqctl driver");
  if (res && GLib.file_test ("/sys/devices/system/cpu/cpu0/cpufreq/scaling_driver", GLib.FileTest.EXISTS)) {
      util_present = true;
      if (res == "intel_pstate") pstate_present = true;
  }
  check_install ();
  check_extensions ();
  get_governors ();
  get_frequences ();
  cpucount = get_cpu_number ();
}

function check_install () {
    pkexec_path = GLib.find_program_in_path ("pkexec");
    cpufreqctl_path = GLib.find_program_in_path ("cpufreqctl");
    installed = false;
    updated = true;
    if (!cpufreqctl_path)
        cpufreqctl_path = APPDIR + "/cpufreqctl";
    else
        installed = true;
    if (!GLib.file_test ("/usr/share/polkit-1/actions/konkor.cpufreq.policy", GLib.FileTest.EXISTS)) {
        installed = false;
    }
    if (!pkexec_path) installed = false;
    if (installed) {
        let localctl = null, globalctl = null;
        globalctl = get_info_string ("/usr/bin/cpufreqctl version");
        localctl = get_info_string (APPDIR + "/cpufreqctl version");
        if (localctl != globalctl) updated = false;
    }
}

function check_extensions () {
    if (!util_present || !installed) return;
    let default_boost = get_turbo ();
    if (default_boost == false) {
        set_turbo (true);
        let new_state = get_turbo ();
        if (default_boost != new_state) {
            boost_present = true;
            set_turbo (false);
        }
    } else boost_present = true;
}

function get_turbo () {
    if (!util_present) return false;
    if (settings.save) return set_turbo (settings.turbo);
    var res = null;
    if (pstate_present) res = get_info_string (cpufreqctl_path + " turbo");
    else res = get_info_string (cpufreqctl_path + " boost");
    if (res) {
        if (pstate_present && res == '0') return true;
        if (!pstate_present && res == '1') return true;
    }
    return false;
}

function set_turbo (state) {
    if (!util_present) return false;
    if (pstate_present) {
        if (state)
            GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " turbo 0");
        else GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " turbo 1");
    } else {
        if (state)
            GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " boost 1");
        else GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " boost 0");
    }
    if (settings.save) settings.turbo = state;
    return state;
}

function get_governors () {
    let governorslist = [], governorsactive = [], gc = [], idx = 0, res = "";
    governors = [];
    governoractual = [];
    if (!util_present) return governors;

    res = get_info_string (this.cpufreqctl_path + " gov");
    if (res) governorslist = res.toString().split(" ");
    governorslist.forEach ((governor)=> {
        if (governor.length == 0) return;
        governoractual.push (governor);
    });

    res = get_info_string (this.cpufreqctl_path + " list");
    if (res) governorslist = res.toString().split(" ");
    governorslist.forEach ((governor)=> {
        if (governor.length == 0) return;
        let governortemp;
        if (governoractual.indexOf (governor) > -1)
            governortemp = [governor, true];
        else
            governortemp = [governor, false];
        governors.push (governortemp);
    });
    /*governoractual.forEach ((governor)=> {
        idx = -1;
        for (let i = 0; i < gn.length; i++)
            if (gn.indexOf (governor) > -1)
                idx = i;
        if (idx > -1) {
            gc[idx]++;
        } else {
            gn.push (governor);
            gc.push (1);
        }
    });
    governoractual = "";
    if (gn.length > 1) {
        for (let i = 0; i < gn.length; i++) {
            if (i > 0 && (i % 2 == 0))
                governoractual += "\n" + gc[i].toString() + " " + gn[i];
            else
                governoractual += " " + gc[i].toString() + " " + gn[i];
        }
        governoractual = governoractual.trim();
    }*/
    return governors;
}

function is_mixed_governors () {
    let mixed = false;
    for ( let i = 0; i < governoractual.length-1; i++) {
      if (governoractual[i] != governoractual[i+1]) mixed = true;
    }
    return mixed;
}

function set_governor (governor) {
    if (!util_present || !governor) return;

    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " gov " + governor);

    if (settings.save) settings.governor = governor;
}

function set_userspace (frequency) {
    if (!util_present || !frequency) return 0;

    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " gov userspace");
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " set " + frequency);

    if (settings.save) {
      settings.governor = "userspace";
      settings.cpu_freq = frequency.toString ();
    }
    return frequency;
}

function get_frequences () {
    let frequenceslist = [];
    frequences = [];
    if (!util_present) return;
    frequenceslist = get_info_string (this.cpufreqctl_path + " freq");
    if (!frequenceslist) return;
    frequenceslist = frequenceslist.split (" ");
    frequenceslist.forEach ((freq)=> {
        if (freq.length > 0)
            if (parseInt (freq) > 0) frequences.unshift (freq);
    });
    if (frequences.length > 0) {
        minimum_freq = frequences[0];
        maximum_freq = frequences[frequences.length - 1];
    }
    if (pstate_present) {
        minfreq = get_min_pstate ();
        maxfreq = get_max_pstate ();
    } else {
        minfreq = get_min ();
        maxfreq = get_max ();
    }
}

function set_frequencies () {
    let cmin, cmax;
    if (pstate_present) {
        let save_state = settings.save;
        settings.save = false;
        cmin = get_min_pstate ();
        cmax = get_max_pstate ();
        settings.save = save_state;
        debug ("%d:%d - %d:%d".format (cmin,cmax,minfreq,maxfreq));
        if ((minfreq == cmin) && (maxfreq == cmax)) return;
        if ((minfreq > cmax) && (minfreq <= maxfreq)) {
            set_max_pstate (maxfreq);
            pause (100);
            set_min_pstate (minfreq);
        } else {
            if (minfreq != cmin) set_min_pstate (minfreq);
            pause (100);
            if (maxfreq != cmax) set_max_pstate (maxfreq);
        }
    } else {
        cmin = get_coremin (0);
        cmax = get_coremax (0);
        debug ("%d:%d - %d:%d".format (cmin,cmax,minfreq,maxfreq));
        if ((minfreq == cmin) && (maxfreq == cmax)) return;
        if ((minfreq > cmax) && (minfreq <= maxfreq)) {
            set_max (maxfreq);
            pause (100);
            set_min (minfreq);
        } else {
            if (minfreq != cmin) set_min (minfreq);
            pause (100);
            if (maxfreq != cmax) set_max (maxfreq);
        }
    }
}

function get_coremin (core) {
    if (!util_present) return 0;
    var res = get_info_string (cpufreqctl_path + " coremin " + core);
    if (res) return parseInt (res);
    return 0;
}

function set_coremin (core, state) {
    if (!util_present) return false;
    try {
        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " coremin " + core + " " + state);
    } catch (e) {
        error ("Set coremin" + e.message);
        return false;
    }
    return true;
}

function get_coremax (core) {
    if (!util_present) return 0;
    var res = get_info_string (cpufreqctl_path + " coremax " + core);
    if (res) return parseInt (res);
    return 0;
}

function set_coremax (core, state) {
    if (!util_present) return false;
    try {
        GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " coremax " + core + " " + state);
    } catch (e) {
        error ("Set coremax" + e.message);
        return false;
    }
    return true;
}

function get_min () {
    if (!util_present) return minimum_freq;
    if (settings.save) return set_min (parseInt (settings.min_freq));
    var res = get_info_string (cpufreqctl_path + " minf");
    if (res) return parseInt (res);
    return minimum_freq;
}

function set_min (minimum) {
    if ((minimum <= 0) || !Number.isInteger (minimum)) return 0;
    if (!util_present) return 0;
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " minf " + minimum.toString());
    if (settings.save) settings.min_freq = minimum.toString ();
    return minimum;
}

function get_max () {
    if (!util_present) return maximum_freq;
    if (settings.save) return set_max (parseInt (settings.max_freq));
    var res = get_info_string (cpufreqctl_path + " maxf");
    if (res) return parseInt (res);
    return maximum_freq;
}

function set_max (maximum) {
    if ((maximum <= 0) || !Number.isInteger (maximum)) return 0;
    if (!util_present) return 0;
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " maxf " + maximum.toString());
    if (settings.save) settings.max_freq = maximum.toString ();
    return maximum;
}

function get_min_pstate () {
    if (!util_present) return 0;
    if (settings.save) return set_min_pstate (settings.min_freq_pstate);
    var res = get_info_string (cpufreqctl_path + " min");
    if (res) return parseInt (res);
    return 0;
}

function set_min_pstate (minimum) {
    if (!util_present) return 0;
    GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " min " + minimum.toString());
    if (settings.save) settings.min_freq_pstate = minimum;
    return minimum;
}

function get_max_pstate () {
    if (!util_present) return 0;
    if (settings.save) return set_max_pstate (settings.max_freq_pstate);
    var res = get_info_string (cpufreqctl_path + " max");
    if (res) return parseInt (res);
    return 0;
}

function set_max_pstate (maximum) {
    if (!util_present) return 100;
    GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " max " + maximum.toString());
    if (settings.save) settings.max_freq_pstate = maximum;
    return maximum;
}

function set_core (core, state) {
    if (!util_present) return false;
    util_present = false;
    if (state)
        GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " on " + core);
    else
        GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " off " + core);
    util_present = true;
    return state;
}

function set_cores (count, callback) {
    let ccore = count;
    if (core_event != 0) {
        GLib.source_remove (core_event);
        core_event = 0;
    }
    if (count == GLib.get_num_processors ()) return;
    core_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
        for (let key = 1; key < cpucount; key++) {
            set_core (key, key < ccore);
        }
        core_event = 0;
        if (callback) callback ();
        return false;
    }));
}

function pause (msec) {
    var t = Date.now ();
    var i = 0;
    while ((Date.now () - t) < msec) i++;
}

//TODO: move it to cpufreqctl?!
function get_frequency_async (num, callback) {
  let label = "";
  num = num || 0;
  if (!callback) return;
  let file = Gio.File.new_for_path ("/sys/devices/system/cpu/cpu" + num + "/cpufreq/scaling_cur_freq");
  file.load_contents_async (null, (o, res) => {
      let [success, contents] = o.load_contents_finish (res);
      if (!success) return;
      try {
          contents = byteArrayToString (contents).toString ().split ("\n")[0].trim ();
          var n = parseInt (contents);
          if (Number.isInteger (n)) {
            if (n >= 1000000) {
              label = (n / 1000000).toFixed(2).toString () + " \u3393";
            } else {
              label = (m / 1000).toFixed(0).toString () + "  \u3392";
            }
          }
          callback (label);
      } catch (e) {}
  });
}

function get_freq (num) {
    let n = frequences.length;
    let step = Math.round (100 / n);
    let i = Math.round (num / step);
    if (i >= n) i = n - 1;
    return parseInt (frequences[i]);
}

function get_pos (num) {
    let m = parseFloat (frequences[frequences.length -1]) - parseFloat (frequences[0]);
    let p = (parseFloat (num) - parseFloat (frequences[0]))/m;
    return p;
}

function get_cpu_number () {
  let c = 0;
  let cpulist = null;
  let ret = GLib.spawn_command_line_sync ("cat /sys/devices/system/cpu/present");
  if (ret[0]) cpulist = byteArrayToString (ret[1]).toString().split("\n", 1)[0].split("-");
  cpulist.forEach ((f)=> {
    if (parseInt (f) > 0) c = parseInt (f);
  });
  return c + 1;
}

let cmd_out, info_out;
function get_info_string (cmd) {
    cmd_out = GLib.spawn_command_line_sync (cmd);
    if (cmd_out[0]) info_out = cmd_out[1].toString().split("\n")[0];
    if (info_out) return info_out;
    return "";
}

function get_cpufreq_info (params) {
    if (!cpufreqctl_path || !params) return "";
    let s = get_info_string (pkexec_path + " " + cpufreqctl_path + " " + params);
    return s;
}

const DEBUG_LVL = 2;
function debug (msg) {
  if (DEBUG_LVL > 1) Convenience.debug ("cpu helper", msg);
}

function error (msg) {
  Convenience.error ("cpu helper", msg);
}

function getCurrentFile () {
    let stack = (new Error()).stack;
    let stackLine = stack.split("\n")[1];
    if (!stackLine)
        throw new Error ("Could not find current file");
    let match = new RegExp ("@(.+):\\d+").exec(stackLine);
    if (!match)
        throw new Error ("Could not find current file");
    let path = match[1];
    let file = Gio.File.new_for_path (path).get_parent();
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
