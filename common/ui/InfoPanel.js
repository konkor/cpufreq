/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Convenience = imports.convenience;
const byteArrayToString = Convenience.byteArrayToString;
const Helper = imports.common.HelperCPUFreq;

let cpucount = Convenience.get_cpu_number ();
let info_event = 0;

var InfoPanel = new Lang.Class({
  Name: "InfoPanel",
  Extends: Gtk.Box,

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.VERTICAL,margin:20});
    this.margin_top = 0;
    this.border = 8;
    this.get_style_context ().add_class ("info-widget");

    this.warn_lvl = 0;
    this.tt = 0;
    this.tt_time = 0;
    this.balance = "";

    this._cpuname = new Gtk.Label ({label:this.cpu_name, use_markup:true, xalign:0, margin:8});
    this._cpuname.margin_top = 12;
    this.add (this._cpuname);

    this._linux = new Gtk.Label ({label:this.linux_kernel, use_markup:true, xalign:0, margin:8});
    if (this.amd) this.get_style_context ().add_class ("amd");
    this.add (this._linux);

    this._load = new Gtk.Label ({label:"System Loading \u25cb 0%", use_markup:true, xalign:0, margin:8});
    this.add (this._load);

    this.corebox = new  Gtk.FlowBox ({
      homogeneous: true,
      activate_on_single_click: false,
      max_children_per_line: 4,
      valign: Gtk.Align.START,
      margin_top: 16,
      selection_mode: Gtk.SelectionMode.NONE
    });
    if (cpucount < 4) this.corebox.max_children_per_line = cpucount;
    this.pack_start (this.corebox, false, true, 0);

    this.cores = [];
    for (let i=0; i < cpucount; i++) {
      let core = new CoreInfo (i);
      this.corebox.add (core);
      this.cores.push (core);
    }

    this._warn = new WarningInfo ();
    this.add (this._warn);

    if (Helper.get_cpufreq_info ("irqbalance"))
      this.balance = "IRQBALANCE DETECTED";

    //TODO: handle dispose event
    info_event = GLib.timeout_add_seconds (0, 1, Lang.bind (this, function () {
      this.update ();
      return true;
    }));
  },

  get cpu_name () {
    let f = Gio.File.new_for_path ('/proc/cpuinfo');
    if (f.query_exists(null)) {
      let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
      let line, model = "", s, i = 0;
      try {
        [line, ] = dis.read_line (null);
        while (line != null) {
          s = byteArrayToString(line).toString();
          if (s.indexOf ("model name") > -1) {
            model = s;
            i++;
          }
          if (i > 0) break;
          [line, ] = dis.read_line (null);
        }
        dis.close (null);
        if (model) {
          model = model.substring (model.indexOf (":") + 1).trim ();
          //if (model.lastIndexOf ("@") > -1) model = model.substring (0, model.lastIndexOf ("@")).trim ();
          if (model.toLowerCase().lastIndexOf ("amd") > -1) this.amd = true;
          model = model.replace ("(R)", "®");
          model = model.replace ("(TM)", "™");
          s = model; model = "";
          s.split (" ").forEach ((f)=>{
            if (f.length > 0) model += f + " ";
          });
          //return "AMD Ryzen 7 1800X Eight-Core @ 3.60GHz";
          return model.trim ().toString ();
        }
      } catch (e) {
        print ("Get CPU Error:", e.message);
      }
    }
    return "unknown processor";
  },

  get linux_kernel () {
    let distro = "GNU/Linux ";
    let f = Gio.File.new_for_path ('/etc/os-release');
    if (f.query_exists (null)) {
      let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
      let line, model = "", s, i = 0;
      try {
        [line, ] = dis.read_line (null);
        while (line != null) {
          s = byteArrayToString(line).toString();
          if (s.indexOf ("PRETTY_NAME=") > -1) {
            model = s;
            i++;
          }
          if (i > 0) break;
          [line, ] = dis.read_line (null);
        }
        dis.close (null);
        if (model) {
          if (model.length > 11) model = model.substring (12).trim ();
          model = model.replace (/\"/g, "");
          model = model.replace (distro, "");
          i = model.indexOf ('(');
          if ((i > -1) && (model.length > (i+1))) {
            model = model.slice(0,i) + model[i+1].toUpperCase() + model.slice(i+2);
            model = model.replace (")", "");
          }
          distro = model;
        }
      } catch (e) {
        print ("Get Release Error:", e.message);
      }
    }
    let kernel_version = Helper.get_info_string ("uname -r");
    if (kernel_version) {
      distro += "\nKernel " + kernel_version;
    }
    distro += "\nDriver ";
    if (Helper.intel_pstate) distro += "Intel PState";
    else distro += "ACPI";
    distro += "\nTurbo Boost ";
    if (!Helper.boost_present) distro += "not ";
    distro += "supported";
    return distro;
  },

  get loadavg () {
    let s = "System Loading ", i = 0 , j, cc = GLib.get_num_processors ();
    let load = Helper.get_info_string ("cat /proc/loadavg");
    if (load) {
      load = load.split(" ")[0];
      j = i = Math.round (parseFloat (load * 100));
      /*while (i > 100) {
        s += "\u25cf";
        i -= 100;
      }
      if (i < 25) s += "\u25cb ";
      else if (i < 50) s += "◔ ";
      else if (i < 75) s += "◑ ";
      else if (i < 100) s += "◕ ";
      else s += "\u25cf ";*/
      s += j.toString () + "%";
    }
    if (j > cc * 100) {
      this.warnmsg = "SYSTEM OVERLOAD";
      this.warn_lvl = 2;
    } else if (j > cc * 75) {
      this.warnmsg = "SYSTEM BUSY";
      this.warn_lvl = 1;
    } else {
      this.warnmsg = "";
      this.warn_lvl = 0;
    }
    return s;
  },

  get_throttle: function () {
    let s = "", i = 0;
    let throttle = Helper.get_cpufreq_info ("throttle", true);

    if (throttle) {
      i = parseInt (throttle);
      if (!i) return;
      s = "CPU THROTTLE: " + i;
      if (i != this.tt) {
        this.warn_lvl = 2;
        s += "\nTHROTTLE SPEED: " + Math.round ((i-this.tt)/2, 1);
        this.tt_time = Date.now ();
      } else if ((this.warn_lvl == 0) && ((Date.now() - this.tt_time) < 600000)) this.warn_lvl = 1;
      this.tt = i;
      if (this.warnmsg.length > 0) this.warnmsg += "\n" + s;
      else this.warnmsg = s;
    }
  },

  get_balance: function () {
    if (this.balance) {
      if (this.warn_lvl == 0) this.warn_lvl = 1;
      if (this.warnmsg.length > 0) this.warnmsg += "\n" + this.balance;
      else this.warnmsg = this.balance;
    }
  },

  update: function () {
    Helper.get_governors ();
    this.cores.forEach (core => {
      core.update ();
    });
    this.warnmsg = "";
    this.warn_lvl = 0;
    this._load.set_text (this.loadavg);
    this.get_throttle ();
    this.get_balance ();
    this._warn.update (this.warn_lvl, this.warnmsg);
  }
});

var WarningInfo = new Lang.Class({
  Name: "WarningInfo",
  Extends: Gtk.Box,

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL, margin:1});
    this.get_style_context ().add_class ("status");
    this.margin_top = 24;

    this.icon = new Gtk.Label ({label:"☺", xalign:0.0, margin_left:8});
    this.add (this.icon);

    this.label = new Gtk.Label ({label:"SYSTEM STATUS OK", xalign:0.0});
    this.pack_start (this.label, true, true, 8);
  },

  update: function (level, message) {
    var style = this.get_style_context ();
    this.label.set_text (message);
    style.remove_class ("warning");
    style.remove_class ("critical");
    if (level > 1) {
      this.icon.set_text ("☹");
      style.add_class ("critical");
    } else if (level > 0) {
      this.icon.set_text ("");
      style.add_class ("warning");
    } else {
      this.icon.set_text ("☺");
      this.label.set_text ("SYSTEM STATUS OK");
    }
  }
});

var CoreInfo = new Lang.Class({
  Name: "CoreInfo",
  Extends: Gtk.Box,

  _init: function (num) {
    this.core = num || 0;
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.get_style_context ().add_class ("coreinfo");

    this.cpulabel = new Gtk.Label ({label:"CPU" + this.core, xalign:0.5, margin_top:0});
    this.add (this.cpulabel);

    this.freqlabel = new Gtk.Label ({label:"---", xalign:0.5, margin_top:0, opacity:0.8});
    this.add (this.freqlabel);

    this.govlabel = new Gtk.Label ({label:"\uf06c", xalign:0.5, margin_top:0, opacity:0.8});
    this.add (this.govlabel);

    this.update ();
  },

  update: function () {
    var cpu_online = GLib.get_num_processors ();

    this.get_frequency ();
    this.get_governor ();
    this.sensitive = this.core < cpu_online;
    if (this.sensitive) this.opacity = 1;
    else  this.opacity = 0.5;
  },

  get_frequency: function () {
    Helper.get_frequency_async (this.core, Lang.bind (this, (label) => {
      if (this.freqlabel) this.freqlabel.set_text (label);
    }));
  },

  get_governor: function () {
    var g = Helper.governoractual[this.core];
    if (!g) return;
    if (g == "powersave") g = "\uf06c";
    else if (g == "performance") g = "\uf197";
    else if (g == "ondemand") g = "\uf0e7";
    else if (g == "conservative") g = "\ue976";
    else if (g == "schedutil") g = "\ue953";
    else if (g == "userspace") g = "\uf007";
    else g = "\uf0e7";
    this.govlabel.set_text (g);
  }
});
