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

const Logger = imports.common.Logger;
const Convenience = imports.convenience;
const byteArrayToString = Convenience.byteArrayToString;
const Helper = imports.common.HelperCPUFreq;

const Gettext = imports.gettext.domain ('org-konkor-cpufreq');
const _ = Gettext.gettext;

let cpucount = Convenience.get_cpu_number ();
let info_event = 0;

var InfoPanel = new Lang.Class({
  Name: "InfoPanel",
  Extends: Gtk.Box,

  _init: function () {
    Logger.info ("InfoPanel", "initialization");
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

    this._board_vendor = new InfoLabel ();
    Helper.get_content_async ("/sys/class/dmi/id/board_vendor", (res, text) => {
      if (!res) return;
      this._board_vendor.label.set_text (text.split ("\n")[0]);
    });
    this.add (this._board_vendor);

    this._board_model = new InfoLabel ();
    Helper.get_content_async ("/sys/class/dmi/id/board_name", (res, text) => {
      if (!res) return;
      this._board_model.label.set_text ("Model");
      this._board_model.info.set_text (text.split ("\n")[0]);
    });
    this.add (this._board_model);

    this._linux = new Gtk.Label ({label:this.linux_kernel, use_markup:true, xalign:0, margin:8});
    if (this.amd) this.get_style_context ().add_class ("amd");
    this.add (this._linux);

    this._load = new Gtk.Label ({label:"System Loading \u25cb 0%", use_markup:true, xalign:0, margin:8});
    this._load.tooltip_text = _("Current relative system loading to online cores");
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

    this.connect ("realize", () => {
      Logger.info ("InfoPanel", "realize");
      info_event = GLib.timeout_add_seconds (100, 2, Lang.bind (this, function () {
        this.update ();
        return true;
      }));
    });;
    Logger.info ("InfoPanel", "done");
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
    let kernel_version = Helper.get_command_line_string ("uname -r");
    if (kernel_version) {
      distro += "\nKernel " + kernel_version;
    }
    distro += "\nDriver ";
    if (Helper.pstate_present) distro += "Intel PState";
    else distro += "ACPI";
    distro += "\nTurbo Boost ";
    if (!Helper.boost_present) distro += "not ";
    distro += "supported";
    return distro;
  },

  get loadavg () {
    let s = "System Loading ", i = 0 , j = 0, cc = GLib.get_num_processors () || 1;
    let load = Helper.get_content_string ("/proc/loadavg");
    if (load) {
      load = load.split(" ")[0];
      j = i = parseFloat (load * 100);
    }
    //TODO: Make some custom widget for loading
    s += Math.round (j / cc).toString () + "%";
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
    let throttle = Helper.get_cpufreq_info ("throttle");

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
    Logger.info ("InfoPanel", "update");
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

var InfoLabel = new Lang.Class({
  Name: "InfoLabel",
  Extends: Gtk.Box,

  _init: function (props={}) {
    props.orientation = props.orientation || Gtk.Orientation.HORIZONTAL;
    this.parent (props);
    this.no_show_all = true;

    this.label = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
    this.label.no_show_all = false;
    this.add (this.label);

    this.info = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
    this.pack_start (this.info, true, true, 8);
    this.label.connect ("notify::label", this.on_label.bind (this));
    this.info.connect ("notify::label", this.on_label.bind (this));
  },

  on_label: function (o) {
    this.visible = o.visible = !!o.label;
  },

  update: function (info) {
    info = info || "";
    if (this.info.label != info) this.info.set_text (info);
  }
});

var WarningInfo = new Lang.Class({
  Name: "WarningInfo",
  Extends: InfoLabel,

  _init: function () {
    this.parent ({margin:2});
    this.get_style_context ().add_class ("status");
    this.margin_top = 24;
    this.update (0, "SYSTEM STATUS OK");
  },

  update: function (level, message) {
    this.parent (message || "SYSTEM STATUS OK");
    var style = this.get_style_context ();
    style.remove_class ("warning");
    style.remove_class ("critical");
    if (level > 1) {
      this.label.set_text ("☹");
      style.add_class ("critical");
    } else if (level > 0) {
      this.label.set_text ("");
      style.add_class ("warning");
    } else {
      this.label.set_text ("☺");
    }
  }
});

var BoardInfo = new Lang.Class({
  Name: "BoardInfo",
  Extends: InfoLabel,

  _init: function () {
    this.parent ({});
    this.margin_top = 0;
    //this.update (0, "SYSTEM STATUS OK");
    Helper.get_content_async ("/sys/class/dmi/id/board_vendor", (res, text) => {
      if (!res) return;
      this.label.set_text (text.split ("\n")[0]);
    });
    Helper.get_content_async ("/sys/class/dmi/id/board_name", (res, text) => {
      if (!res) return;
      this.info.set_text (text.split ("\n")[0]);
    });
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
    else {
      this.opacity = 0.5;
      this.tooltip_text = "offline";
    }
  },

  get_frequency: function () {
    Helper.get_frequency_async (this.core, Lang.bind (this, (label) => {
      if (this.freqlabel) this.freqlabel.set_text (label);
    }));
  },

  get_governor: function () {
    var g = Helper.governoractual[this.core];
    if (!g) return;
    this.tooltip_text = g;
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
