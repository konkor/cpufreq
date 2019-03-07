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
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

var MenuItem = new Lang.Class({
  Name: "MenuItem",
  Extends: Gtk.Button,

  _init: function (text, tooltip) {
    tooltip = tooltip || "";
    this.parent ({label:text, tooltip_text:tooltip, xalign:0});
    this.get_style_context ().add_class ("menuitem");
    this.get_style_context ().add_class ("normal");
  }
});

var NewProfileItem = new Lang.Class({
  Name: "NewProfileItem",
  Extends: Gtk.Box,
  Signals: {
    'clicked': {},
  },

  _init: function (text, tooltip, placeholder) {
    tooltip = tooltip || "";
    placeholder = placeholder || "";
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL, spacing:0, tooltip_text:tooltip});
    this.get_style_context ().add_class ("menuitem");
    this.edit_mode = false;

    this.button = new Gtk.Button ({label:text, xalign:0});
    this.button.get_style_context ().add_class ("menuitem");
    this.pack_start (this.button, true, true, 0);

    this.entry = new Gtk.Entry ();
    this.entry.input_purpose = Gtk.InputPurpose.NAME;
    //this.entry.text = placeholder;
    this.entry.placeholder_text = placeholder;
    this.entry.no_show_all = true;
    this.pack_start (this.entry, true, true, 0);
    this.entry.set_icon_from_icon_name (Gtk.EntryIconPosition.SECONDARY, "edit-clear-symbolic");
    this.entry.connect ('icon-press', Lang.bind (this, (o, pos, e)=>{
      if (pos == Gtk.EntryIconPosition.SECONDARY)
      if (this.entry.text) this.entry.text = "";
      else this.toggle ();
    }));
    this.entry.connect ('key_press_event', Lang.bind (this, (o, e)=>{
      var [,key] = e.get_keyval ();
      if (key == Gdk.KEY_Escape) {
        if (this.entry.text) this.entry.text = "";
        else this.toggle ();
      }
    }));

    this.entry.connect ('activate', Lang.bind (this, this.on_entry_activate));
    this.button.connect ('clicked', Lang.bind (this, this.on_button_clicked));
  },

  on_button_clicked: function (o) {
    this.toggle ();
  },

  on_entry_activate: function (o) {
    if (this.entry.text) {
      this.toggle ();
      this.emit ('clicked');
    }
  },

  toggle: function () {
    this.edit_mode = !this.edit_mode;
    this.button.visible = !this.edit_mode;
    this.entry.visible = this.edit_mode;
  },

  get text () { return this.entry.text; }
});

var ProfileItem = new Lang.Class({
  Name: "ProfileItem",
  Extends: NewProfileItem,
  Signals: {
    'delete': {},
    'edited': {},
  },

  _init: function (name) {
    this.parent (name, name, "Profile Name");
    this.get_style_context ().add_class ("normal");
    this.entry.text = name;

    this.delete_button = new MenuButton ("edit-delete-symbolic", "Delete", "delete-button");
    this.pack_end (this.delete_button, false, false, 0);

    this.edit_button = new MenuButton ("open-menu-symbolic", "Edit", "edit-button");
    this.pack_end (this.edit_button, false, false, 0);

    this.delete_button.connect ('clicked', Lang.bind (this, (o) => {
      this.emit ('delete');
    }));
    this.edit_button.connect ('clicked', Lang.bind (this, (o) => {
      this.toggle ();
      if (this.edit_mode) this.entry.text = this.button.label;
    }));
  },

  on_button_clicked: function (o) {
    this.emit ('clicked');
  },

  on_entry_activate: function (o) {
    if (this.entry.text) {
      this.toggle ();
      this.button.label = this.entry.text;
      this.emit ('edited');
    }
  },

  toggle: function () {
    this.parent ();
    this.delete_button.visible = this.button.visible;
  }
});


var MenuButton = new Lang.Class({
  Name: "MenuButton",
  Extends: Gtk.Box,
  Signals: {
    'clicked': {},
  },

  _init: function (iconname, tooltip, style_class) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:0});

    let space = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:0});
    this.pack_start (space, true, true, 0);

    this.button = Gtk.Button.new_from_icon_name (iconname, Gtk.IconSize.SMALL_TOOLBAR);
    this.button.get_style_context ().add_class ("menuitem");
    this.button.get_style_context ().add_class (style_class);
    this.button.set_relief (Gtk.ReliefStyle.NONE);
    this.button.tooltip_text = tooltip;
    this.pack_start (this.button, false, false, 0);

    space = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:0});
    this.pack_start (space, true, true, 0);

    this.button.connect ('clicked', Lang.bind (this, (o) => {
      this.emit ('clicked');
    }));
  }
});
