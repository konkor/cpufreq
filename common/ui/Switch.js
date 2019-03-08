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

var Switch = new Lang.Class({
  Name: "Switch",
  Extends: Gtk.Box,

  _init: function (text, state, tooltip) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL,margin:8});
    state = state || false;
    this.margin_left = 16;
    //this.margin_bottom = 8;
    this.get_style_context ().add_class ("switch");
    this.tooltip_text = tooltip;

    this.label = new Gtk.Label ({label:"<b>"+text+"</b>", use_markup:true, xalign:0});
    this.pack_start (this.label, true, true, 0);
    this.sw = new Gtk.Switch ();
    this.sw.get_style_context ().add_class ("switch-item");
    this.sw.active = state;
    this.pack_end (this.sw, false, false, 0);

    this.show_all ();
  },

  get active () { return this.sw.active; },
  set active (val) {
    this.sw.active = val;
  }


});
