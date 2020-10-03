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
let throttle_event = 0;

var InfoPanel = new Lang.Class({
  Name: "InfoPanel",
  Extends: Gtk.Box,
  Signals: {
    'warn_level': {},
  },

  _init: function () {
    Logger.info ("InfoPanel", "initialization");
    this.parent ({orientation:Gtk.Orientation.VERTICAL,margin:0});
    this.margin_bottom = this.margin_end = 16;
    this.border = 8;
    this.get_style_context ().add_class ("info-widget");

    this.warn_lvl = this.wlold = 0;
    this.tt = 0;
    this.tt_time = 0;
    this.balance = "";

    this._cpuname = new Gtk.Label ({label:this.cpu_name, use_markup:true, xalign:0, margin:8});
    this._cpuname.get_style_context ().add_class ("bold");
    this._cpuname.margin_top = 12;
    this.add (this._cpuname);

    this._board_vendor = new InfoLabel ();
    Helper.get_content_async ("/sys/class/dmi/id/board_vendor", (res, text) => {
      if (res)
        this._board_vendor.label.set_text (text.split ("\n")[0]);
      else if (this.hardware) this._board_vendor.label.set_text (this.hardware);
    });
    this.add (this._board_vendor);

    this._board_model = new InfoLabel ();
    Helper.get_content_async ("/sys/class/dmi/id/board_name", (res, text) => {
      if (!res) {
        if (this.board) this._board_model.label.set_text (this.board);
        return;
      }
      if (text.toLowerCase().indexOf ("product name") > -1) return;
      let s = text.split ("\n")[0];
      if (s.length < 10) this._board_model.label.set_text ("Model");
      else this._board_model.tooltip_text = "Model";
      this._board_model.info.set_text (s);
    });
    this.add (this._board_model);

    this._linux = new Gtk.Label ({label:this.linux_kernel, use_markup:true, xalign:0, margin:8});
    if (this.amd) this.get_style_context ().add_class ("amd");
    this.add (this._linux);

    this.corebox = new  Gtk.FlowBox ({
      homogeneous: true,
      activate_on_single_click: false,
      max_children_per_line: 4,
      valign: Gtk.Align.START,
      margin_top: 10,
      selection_mode: Gtk.SelectionMode.NONE
    });

    if (cpucount > 16) this.corebox.min_children_per_line = this.corebox.max_children_per_line = 8;
    let hugecpu = cpucount > 32;

    if (cpucount < 4) this.corebox.max_children_per_line = cpucount;
    else if ((cpucount % 3 == 0) && (cpucount % 4 > 0)) {
      this.corebox.max_children_per_line = 3;
      if (hugecpu) this.corebox.max_children_per_line = 6;
    }
    if (hugecpu) {
      this.corebox.min_children_per_line = this.corebox.max_children_per_line;
      let rows = cpucount/this.corebox.max_children_per_line;
      if (rows > 4) rows = 4;
      let scroll = new Gtk.ScrolledWindow ();
      scroll.hscrollbar_policy = Gtk.PolicyType.NEVER;
      this.pack_start (scroll, true, true, 0);
      scroll.set_size_request (380, 60*rows);
      scroll.add (this.corebox);
    } else this.pack_start (this.corebox, false, true, 0);


    this.cores = [];
    for (let i=0; i < cpucount; i++) {
      let core = new CoreInfo (i);
      this.corebox.add (core);
      this.cores.push (core);
    }

    this._load = new InfoLevel (_("System Loading"), "0%", _("Average value of system loading relative to\nonline cores for the last minute"), {margin_top:24});
    this.add (this._load);

    this.mem_total = this.mem_free = this.mem_available = 0;
    this._memory = new InfoLevel (_("Memory"), "0.0%", _("Used system memory"));
    this.add (this._memory);

    this.swap_total = this.swap_free = 0;
    this._swap = new InfoLevel (_("Swap"), "0.0%", _("Used swap memory"));
    this.add (this._swap);

    this._warn = new WarningInfo ();
    this.add (this._warn);

    this.connect ("realize", this.on_realized.bind (this));
    this.connect ("destroy", this.on_delete.bind (this));
    Logger.debug ("InfoPanel", "done");
  },

  on_realized: function () {
    Logger.info ("InfoPanel", "realize");
    if (Helper.get_cpufreq_info ("--irqbalance"))
      this.balance = "IRQBALANCE DETECTED";
    this.get_memory ();
    info_event = GLib.timeout_add (100, 1000, () => {
      this.update ();
      return true;
    });
    if (!Helper.thermal_throttle) {
      GLib.timeout_add (20, 750, () => {
        Helper.get_throttle_events (this.throttle_events_cb.bind (this));
      });
      throttle_event = GLib.timeout_add_seconds (100, 12, () => {
        Helper.get_throttle_events (this.throttle_events_cb.bind (this));
        return true;
      });
    }
    this._swap.visible = false;
  },

  throttle_events_cb: function (events) {
    if (events) this.tt = events;
  },

  on_delete: function () {
    if (info_event) GLib.source_remove (info_event);
    if (throttle_event) GLib.source_remove (throttle_event);
    throttle_event = info_event = 0;
  },

  get cpu_name () {
    let f = Gio.File.new_for_path ('/proc/cpuinfo');
    if (f.query_exists(null)) {
      let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
      let line, model = "", board = "", hw = "", s;
      try {
        [line, ] = dis.read_line (null);
        while (line != null) {
          s = byteArrayToString(line).toString();
          if (s.indexOf ("model name") > -1) {
            model = s;
          } else if (s.indexOf ("Hardware") > -1) {
            hw = s;
          } else if ((s.indexOf ("Model") == 0) && hw) {
            board = s;
          }
          [line, ] = dis.read_line (null);
        }
        dis.close (null);
        if (hw) {
          this.hardware = hw.substring (hw.indexOf (":") + 1).trim ();
        }
        if (board) {
          this.board = board.substring (board.indexOf (":") + 1).trim ();
        }
        if (model) {
          model = model.substring (model.indexOf (":") + 1).trim ();
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
        Logger.error ("cpu_name", e.message);
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
        Logger.error ("linux_kernel", e.message);
      }
    }
    let kernel_version = Helper.get_command_line_string ("uname -r");
    if (kernel_version) {
      distro += "\nKernel " + kernel_version;
    }
    distro += "\nDriver ";
    if (Helper.pstate_present) distro += "Intel PState";
    else distro += "ACPI";
    return distro;
  },

  get loadavg () {
    let j = 0, cc = GLib.get_num_processors () || 1;
    let load = Helper.get_content_string ("/proc/loadavg");
    if (load) {
      load = load.split(" ")[0];
      j = parseFloat (load)  / cc;
    }
    if (j > 1) {
      this.warnmsg = "SYSTEM OVERLOAD";
      this.warn_lvl = 2;
    } else if (j > 0.75) {
      this.warnmsg = "SYSTEM BUSY";
      this.warn_lvl = 1;
    } else {
      this.warnmsg = "";
      this.warn_lvl = 0;
    }
    return j;
  },

  get_throttle: function (throttle) {
    let s = "";
    if (typeof throttle === 'undefined') throttle = Helper.get_throttle ();
    if (throttle) {
      s = "CPU THROTTLED: " + throttle;
      if (throttle != this.tt) {
        this.warn_lvl = 2;
        s += "\nTHROTTLE SPEED: " + Math.round ((throttle - this.tt) / 2);
        this.tt_time = Date.now ();
      } else if ((this.warn_lvl == 0) && ((Date.now() - this.tt_time) < 600000)) this.warn_lvl = 1;
      this.tt = throttle;
      if (this.warnmsg.length > 0) this.warnmsg += "\n" + s;
      else this.warnmsg = s;
    }
  },

  get_memory: function () {
    Helper.get_content_async ("/proc/meminfo", (res, text) => {
      if (!res) return;
      let content = text.split ("\n");
      content.forEach (s => {
        if (s.indexOf ("MemTotal:") > -1) {
          this.mem_total = this.parse_int (s) * 1024;
        } else if (s.indexOf ("MemFree:") > -1) {
          this.mem_free = this.parse_int (s) * 1024;
        } else if (s.indexOf ("MemAvailable:") > -1) {
          this.mem_available = this.parse_int (s) * 1024;
        } else if (s.indexOf ("SwapTotal:") > -1) {
          this.swap_total = this.parse_int (s) * 1024;
        } else if (s.indexOf ("SwapFree:") > -1) {
          this.swap_free = this.parse_int (s) * 1024;
        }
      });
    });
  },

  parse_int: function (row) {
    let num, val = 0;
    row.split(" ").forEach (w => {
      if (w && !num) {
        num = parseInt (w);
        if (num) val = num;
      }
    });
    return val;
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
    this.get_memory ();
    Helper.get_governors ();
    this.cores.forEach (core => {
      core.update ();
    });
    this.warnmsg = "";
    this.warn_lvl = 0;
    this._load.value = this.loadavg;
    this._load.set_info ((this._load.value * 100).toFixed (0) + "%");
    if (Helper.thermal_throttle) this.get_throttle ();
    else this.get_throttle (this.tt);
    this.get_balance ();
    if (this.mem_total) {
      this._memory.value = (this.mem_total - this.mem_available) / this.mem_total;
      this._memory.set_info ((this._memory.value * 100).toFixed (1) + "%");
      this._memory.tooltip_text = "%s / %s (%s available)".format (
        GLib.format_size (this.mem_total - this.mem_available), GLib.format_size (this.mem_total), GLib.format_size (this.mem_available)
      );
    }
    if (this.swap_total != this.swap_free) {
      this._swap.value = (this.swap_total - this.swap_free) / this.swap_total;
      this._swap.set_info ((this._swap.value * 100).toFixed (1) + "%");
      this._swap.tooltip_text = "%s / %s (%s free)".format (
        GLib.format_size (this.swap_total - this.swap_free), GLib.format_size (this.swap_total), GLib.format_size (this.swap_free)
      );
      this._swap.visible = true;
    } else this._swap.visible = false;
    this._warn.update (this.warn_lvl, this.warnmsg);
    if (this.wlold != this.warn_lvl) {
      this.wlold = this.warn_lvl;
      this.emit ("warn_level");
    }
    Logger.info ("InfoPanel", "updated");
  }
});

var InfoLabel = new Lang.Class({
  Name: "InfoLabel",
  Extends: Gtk.Box,

  _init: function (props={}) {
    props.orientation = props.orientation || Gtk.Orientation.HORIZONTAL;
    this.parent (props);

    this.label = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
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

var InfoLevel = new Lang.Class({
  Name: "InfoLevel",
  Extends: Gtk.Box,

  _init: function (title, info, tooltip, props={}) {
    props.orientation = props.orientation || Gtk.Orientation.VERTICAL;
    props.margin_top = props.margin_top || 12;
    this.parent (props);
    this.tooltip_text = tooltip || "";

    this.infolabel = new InfoLabel ();
    this.infolabel.label.set_text (title);
    this.infolabel.info.xalign = 1;
    this.infolabel.info.set_text (info);
    this.add (this.infolabel);

    this.levelbar = Gtk.LevelBar.new_for_interval (0, 1);
    //this.levelbar.mode = Gtk.LevelBarMode.DISCRETE;
    this.levelbar.margin = 8;
    this.levelbar.get_style_context ().add_class ("level-bar");
    this.levelbar.set_size_request (8, 11);
    this.add (this.levelbar);
  },

  set_info: function (text) {
    this.infolabel.info.set_text (text);
  },

  get value () { return this.levelbar.value; },
  set value (val) {
    this.levelbar.value = val || 0;
  }
});

var WarningInfo = new Lang.Class({
  Name: "WarningInfo",
  Extends: InfoLabel,

  _init: function () {
    this.parent ({margin:2});
    this.get_style_context ().add_class ("status");
    this.margin_top = 28;
    this.update (0);
  },

  update: function (level, message) {
    this.parent (message || "SYSTEM STATUS OK");
    var style = this.get_style_context ();
    style.remove_class ("status-warning");
    style.remove_class ("status-critical");
    if (level > 1) {
      this.label.set_text ("☹");
      style.add_class ("status-critical");
    } else if (level > 0) {
      this.label.set_text ("");
      style.add_class ("status-warning");
    } else {
      this.label.set_text ("☺");
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

    this.cpulabel = new Gtk.Label ({label:"CPU" + this.core, xalign:0.5, margin:0});
    this.add (this.cpulabel);

    this.freqlabel = new Gtk.Label ({label:"---", xalign:0.5, margin_top:0, opacity:0.8});
    this.add (this.freqlabel);

    this.govlabel = new Gtk.Label ({label:"\uf06c", xalign:0.5, margin_top:0, opacity:0.8});
    this.add (this.govlabel);

    this.update ();
    this.connect ("destroy", () => {this.frequency_callback = null;});
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
    Helper.get_frequency_async (this.core, this.frequency_cb.bind (this));
  },

  frequency_cb: function (val) {
    let label = "---"
    if (!this.frequency_cb) return;
    if (val >= 1000000) {
      label = (val / 1000000).toFixed(2).toString () + " \u3393";
    } else {
      label = (val / 1000).toFixed(0).toString () + "  \u3392";
    }
    this.freqlabel.set_text (label);
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
