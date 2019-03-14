/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];

const cpu = imports.common.HelperCPUFreq;
const InfoPanel = imports.common.ui.InfoPanel;
const ControlPanel = imports.common.ui.ControlPanel;

let theme_gui = APPDIR + "/data/themes/default/gtk.css";
let cssp = null;

var MainWindow = new Lang.Class ({
  Name: "MainWindow",
  Extends: Gtk.ApplicationWindow,

  _init: function (params) {
    this.parent (params);
    this.set_icon_name ("org.konkor.cpufreq");
    if (!this.icon) try {
      this.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/cpufreq.svg").pixbuf;
    } catch (e) {
      error (e.message);
    }

    this.build ();

    //this.restore_position ();
    //if (this.settings.window_maximized) this.maximize ();
  },

  build: function() {
    this.window_position = Gtk.WindowPosition.MOUSE;
    //Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
    this.set_default_size (480, 720);
    cssp = get_css_provider ();
    if (cssp) {
      Gtk.StyleContext.add_provider_for_screen (
        this.get_screen(), cssp, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    }
    this.get_style_context ().add_class ("main");
    this.hb = new Gtk.HeaderBar ();
    this.hb.set_show_close_button (!this.application.extension);
    this.hb.get_style_context ().add_class ("hb");
    this.set_titlebar (this.hb);

    this.prefs_button = new Gtk.Button ({always_show_image: true, tooltip_text:"Preferences"});
    this.prefs_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/application-menu-symbolic.svg");
    this.prefs_button.get_style_context ().add_class ("hb-button");
    this.prefs_button.set_relief (Gtk.ReliefStyle.NONE);
    this.hb.pack_end (this.prefs_button);

    this.cpanel = new ControlPanel.ControlPanel (this.application);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
    this.add (box);

    this.sidebar = new InfoPanel.InfoPanel ();
    box.add (this.sidebar);
    box.pack_end (this.cpanel, true, true, 8);
    this.cpanel.set_size_request (320, 160);
    this.sidebar.set_size_request (360, 160);

    if (this.application.extension) this.connect ("focus-out-event", ()=>{ this.application.quit();});
    this.prefs_button.connect ("clicked", () => {
      GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences");
    });

    this.connect ('unmap', Lang.bind (this, this.save_geometry));
  },

  save_geometry: function () {
    //TODO:
    //this.settings.save_geometry (this);
  },

  restore_position: function () {
    if (!this.is_maximized)
      this.move (this.settings.window_x, this.settings.window_y);
  }
});

function get_css_provider () {
  let cssp = new Gtk.CssProvider ();
  let css_file = Gio.File.new_for_path (theme_gui);
  try {
    cssp.load_from_file (css_file);
  } catch (e) {
    print (e);
    cssp = null;
  }
  return cssp;
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
  let file = Gio.File.new_for_path (path).get_parent().get_parent();
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
