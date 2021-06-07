/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2021 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const GObject = imports.gi.GObject;
const GLib    = imports.gi.GLib;
const Gtk     = imports.gi.Gtk;
const Lang    = imports.lang;

var APPDIR = imports.searchPath[0];

const Gettext = imports.gettext.domain ('org-konkor-cpufreq');
const _ = Gettext.gettext;

var Utils;
const SideMenu = imports.common.ui.SideMenu;
const Widgets = imports.common.ui.Widgets;

var results = {};

var BenchmarksView = new Lang.Class({
  Name: "BenchmarksView",
  Extends: Gtk.ScrolledWindow,

  _init: function (owner) {
    this.parent ();
    Utils = owner.cpufreq;
    this.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.shadow_type = Gtk.ShadowType.NONE;

    this.content = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:24});
    this.add (this.content);

    this.build ();
  },

  build: function () {
    this.content.add (new Gtk.Label ({label:_("THIS MACHINE")}));
    this.rating = new Gtk.Label ({label:"0"});
    this.rating.get_style_context ().add_class ("rating");
    this.content.pack_start (this.rating, false, false, 16);

    this.button_start = new Gtk.Button ({label:"START TESTING", tooltip_text:_("Run All Performance Tests")});
    this.button_start.get_style_context ().add_class ("suggested-action");
    this.button_start.get_style_context ().add_class ("benchmarks");
    this.button_start.set_relief (Gtk.ReliefStyle.NONE);
    this.button_start.margin_bottom = 24;
    this.content.add (this.button_start);

    this.button_start.connect ("clicked", this.on_button_start.bind (this));
    this.connect ("map", () => {if (!this.testmenu) this.build_menu ()});
  },

  build_menu: function () {
    this.testmenu = new SideMenu.SideMenu ();
    this.content.add (this.testmenu);

    this.memtest = new BenchmarksMenu ("MEM", _("Memory Benchmarks"));
    this.testmenu.add_submenu (this.memtest);
    this.memtest.add_test ("memtest", APPDIR + "/common/benchmarks/memtest");

    this.cputest = new SideMenu.SideSubmenu ("CPU", "RATING", _("CPU Benchmarks"));
    this.testmenu.add_submenu (this.cputest);

    this.iotest = new SideMenu.SideSubmenu ("IO", "RATING", _("IO Benchmarks"));
    this.testmenu.add_submenu (this.iotest);

    this.guitest = new SideMenu.SideSubmenu ("UX", "RATING", _("GUI Benchmarks"));
    this.testmenu.add_submenu (this.guitest);

    this.show_all ();

    this.memtest.connect ("results", this.on_results.bind (this));
  },

  on_results: function (o, res) {
    print ("results:", res);
    let rating = 0, r = res.split (" ");
    if (r[0] && r[1]) {
      results[r[0]] = parseInt (r[1]);
    }
    for (let p in results) {
      rating += results[p];
    }
    this.rating.set_text (rating.toString ());
  },

  on_button_start: function (o) {
    this.testmenu.submenus.forEach ((p) => {
      this.run_category (p);
      p.expanded = false;
    });
  },

  run_category: function (o) {
    o.section.get_children ().forEach ((p) => {
      o.run_test (p);
    });
  }

});

var BenchmarksMenu = new Lang.Class({
  Name: "BenchmarksMenu",
  Extends: SideMenu.SideSubmenu,
  Signals: {
    'results': {
      flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
      param_types: [GObject.TYPE_STRING]},
  },

  _init: function (title, description) {
    this.parent (title, "RATING", description);
    this.results = {};
  },

  add_test: function (name, cmd) {
    let item = new BenchmarksItem (name, "0", "", cmd);
    //let item = new SideMenu.SideItem (name, "");
    //item.cmd = cmd;
    this.add_item (item);
    item.connect ("clicked", this.run_test.bind (this));
  },

  run_test: function (o) {
    print ("run_test:", o.cmd);
    if (!o.cmd) return;
    let text = Utils.get_command_line_string (o.cmd);
    if (text) this.emit ("results", text);
    o.tooltip_text = text;
    let rating = 0, r = text.split (" ");
    if (r[0] && r[1]) {
      this.results[r[0]] = parseInt (r[1]);
      o.info.info.set_text (r[1]);
    }
    for (let p in this.results) {
      rating += this.results[p];
    }
    this.info.info.set_text (rating.toString ());
  }

});

var BenchmarksItem = new Lang.Class({
  Name: "BenchmarksItem",
  Extends: Gtk.Button,

  _init: function (text, info, tooltip, cmd) {
    tooltip = tooltip || "";
    this.cmd = cmd;
    this.parent ({tooltip_text:tooltip, xalign:0});
    this.get_style_context ().add_class ("sideitem");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.no_show_all = false;

    this.info = new Widgets.InfoLabel ({no_show_all:false});
    this.info.label.set_text (text);
    this.info.label.margin = 0;
    this.info.info.set_text (info);
    this.info.info.xalign = 1;
    this.add (this.info);

    this.show_all ();
  }
});
