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

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

var Submenu = new Lang.Class({
  Name: "Submenu",
  Extends: Gtk.Expander,

  _init: function (text, tooltip, id, scroll) {
    this.parent ({label:text, label_fill:false, expanded:false, resize_toplevel:false});
    scroll = scroll || false;
    this.get_style_context ().add_class ("submenu");
    this.get_style_context ().add_class ("status");
    this.tooltip_text = tooltip;
    this.id = id;

    this.scroll = new Gtk.ScrolledWindow ();
    this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.scroll.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.scroll.shadow_type = Gtk.ShadowType.NONE;
    if (scroll) this.add (this.scroll);

    this.section = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.section.get_style_context ().add_class ("submenu-section");

    if (scroll) this.scroll.add (this.section);
    else this.add (this.section);
  },

  add_menuitem: function (menuitem) {
    this.section.add (menuitem);
  },

  set_label: function (text) {
    text = text || "";
    this.label = text; //"\u26A1 " + text;
  }
});
