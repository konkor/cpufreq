/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const InfoPanel = imports.common.ui.InfoPanel;

var SideMenu = new Lang.Class({
  Name: "SideMenu",
  Extends: Gtk.ScrolledWindow,

  _init: function () {
    this.parent ();
    this.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.shadow_type = Gtk.ShadowType.NONE;

    this.submenus = [];

    this.content = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.content.get_style_context ().add_class ("side-menu");
    this.add (this.content);
  },

  add_item: function (item) {
    this.content.add (item);
  },

  add_submenu: function (item) {
    this.content.add (item);
    item.id = this.submenus.length;
    this.submenus.push (item);
    item.connect ('activate', this.on_submenu_activate.bind (this));
  },

  on_submenu_activate: function (item) {
    this.submenus.forEach ( p => {
      if (p.id != item.id) p.expanded = false;
    });
  }
});

var SideSubmenu = new Lang.Class({
  Name: "SideSubmenu",
  Extends: Gtk.Box,
  Signals: {
    'activate': {},
  },

  _init: function (text, info, tooltip) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:0, spacing:0});
    this.id = 0;

    this.info = new InfoPanel.InfoLabel ({no_show_all:false});
    this.info.label.set_text (text);
    this.info.info.set_text (info);
    this.info.info.xalign = 1;
    this.button = new Gtk.ToggleButton ({tooltip_text:tooltip, xalign:0});
    this.button.get_style_context ().add_class ("sidesubmenu");
    this.button.set_relief (Gtk.ReliefStyle.NONE);
    this.info.info.get_style_context ().add_class ("infolabel");
    this.button.add (this.info);
    this.add (this.button);

    this.section = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:0, spacing:0});
    this.section.margin_top = this.section.margin_bottom = 6;
    this.section.no_show_all = true;
    this.section.get_style_context ().add_class ("sidesection");
    this.add (this.section);

    this.button.connect ('toggled', this.on_toggle.bind (this));
  },

  on_toggle: function (o) {
    this.section.visible = o.active;
    if (o.active) this.emit ('activate');
  },

  get expanded () { return this.button.active; },
  set expanded (val) { this.button.active = val; },

  get label () { return this.info.label.label; },
  set label (val) {
    val = val || "";
    this.info.label.set_text (val); //"\u26A1 " + text;
  },

  add_item: function (item) {
    this.section.add (item);
    item.connect ("clicked", () => {this.expanded = false;});
  }
});

var SideItem = new Lang.Class({
  Name: "SideItem",
  Extends: Gtk.Button,

  _init: function (text, tooltip) {
    tooltip = tooltip || "";
    this.parent ({label:text, tooltip_text:tooltip, xalign:0});
    this.get_style_context ().add_class ("sideitem");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.no_show_all = false;
    this.show_all ();
  }
});
