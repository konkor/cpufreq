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
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

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
    //this.get_style_context ().add_class ("sideitem");
    this.edit_mode = false;

    this.button = new Gtk.Button ({label:text, xalign:0});
    this.button.set_relief (Gtk.ReliefStyle.NONE);
    this.button.get_style_context ().add_class ("sideitem");
    this.pack_start (this.button, true, true, 0);

    this.entry = new Gtk.Entry ();
    this.entry.input_purpose = Gtk.InputPurpose.NAME;
    //this.entry.text = placeholder;
    this.entry.placeholder_text = placeholder;
    this.entry.no_show_all = true;
    this.pack_start (this.entry, true, true, 0);
    this.entry.set_icon_from_icon_name (Gtk.EntryIconPosition.SECONDARY, "edit-clear-symbolic");
    this.entry.connect ('icon-press', (o, pos, e) => {
      if (pos == Gtk.EntryIconPosition.SECONDARY)
      if (this.entry.text) this.entry.text = "";
      else this.toggle ();
    });
    this.entry.connect ('key_press_event', (o, e) => {
      var [,key] = e.get_keyval ();
      if (key == Gdk.KEY_Escape) {
        if (this.entry.text) this.entry.text = "";
        else this.toggle ();
      }
    });

    this.entry.connect ('activate', this.on_entry_activate.bind (this));
    this.button.connect ('clicked', this.on_button_clicked.bind (this));

    this.show_all ();
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
    'edit': {},
  },

  _init: function (name) {
    this.parent (name, name, "Profile Name");
    this.entry.text = name;

    this.pack_end (new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL}), false, false, 2);

    this.delete_button = new MenuButton ("edit-delete-symbolic", "Delete", "delete-button");
    this.pack_end (this.delete_button, false, false, 0);

    this.edit_button = new MenuButton ("open-menu-symbolic", "Edit", "edit-button");
    this.pack_end (this.edit_button, false, false, 0);

    this.delete_button.connect ('clicked', () => {
      this.emit ('delete');
    });
    this.edit_button.connect ('clicked', () => {
      this.toggle ();
      if (this.edit_mode) {
        this.entry.text = this.button.label;
        this.emit ('edit');
      }
    });
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

    this.button.connect ('clicked', () => {
      this.emit ('clicked');
    });
  }
});
