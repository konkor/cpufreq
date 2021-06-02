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
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

var APPDIR = getCurrentFile ()[1];

const Logger = imports.common.Logger;
const cpu = imports.common.HelperCPUFreq;
const InfoPanel = imports.common.ui.InfoPanel;
const ControlPanel = imports.common.ui.ControlPanel;
const SensorsView = imports.common.ui.SensorsView;

const Gettext = imports.gettext.domain ('org-konkor-cpufreq');
const _ = Gettext.gettext;

let theme_gui = APPDIR + "/data/themes/default/gtk.css";
let cssp = null;
let MENU_LOCK = false;

var MainWindow = new Lang.Class ({
  Name: "MainWindow",
  Extends: Gtk.ApplicationWindow,

  _init: function (params) {
    this.parent (params);
    this.settings = this.application.settings;
    Gtk.IconTheme.get_default().append_search_path (APPDIR + "/data/icons");
    this.set_icon_name ("cpufreq");
    if (!this.icon) try {
      this.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/cpufreq.svg").pixbuf;
    } catch (e) {
      Logger.error (e.message);
    }
    if (!cpu.installed) this.install ();
    else if (!cpu.updated) this.install (true);
    else this.build ();
  },

  install: function (update) {
    update = update || false;
    let msg = ("<b>" + _("%s required system components?") + "</b>\n").format (update ? _("Update") : _("Install"));
    let sec = _("This action will be require root permissions to complete installation. ");
    sec += _("It could take some time depending on your system configuration. It will try to execute the command:\n\n");
    sec += "<i>pkexec " + APPDIR + "/cpufreqctl --install</i>\n\n";
    sec += "<i><b>" + _("Note:") + "</b> " + _("You can press \'Cancel\' button and make it manually as an administrator to complete the installation.") + "</i>\n"
    let dlg = new Gtk.MessageDialog ({
      message_type: Gtk.MessageType.WARNING, buttons: Gtk.ButtonsType.OK_CANCEL,
      text: msg, use_markup: true, secondary_text: sec, secondary_use_markup: true, icon: this.icon
    });
    let res = dlg.run ();
    dlg.hide ();
    dlg.destroy ();
    if (res == Gtk.ResponseType.OK) {
      if (cpu.install_components (update)) this.build ();
      else {
        if (!cpu.pkexec_path)
          this.error_message (_("The application is requiring pkexec package installed."));
        else
          this.error_message (_("Error during installation of system components..."));
      }
    }
  },

  error_message: function (msg, secondary) {
    msg = "<b>" + (msg || _("ERROR: Something going wrong!")) + "</b>";
    secondary = secondary || null;
    let dlg = new Gtk.MessageDialog ({
      message_type: Gtk.MessageType.ERROR, buttons: Gtk.ButtonsType.OK,
      text: msg, use_markup: true, secondary_text: secondary, icon: this.icon
    });
    dlg.run ();
    dlg.destroy ();
  },

  build: function() {
    let box;
    if (this.application.extension) this.window_position = Gtk.WindowPosition.MOUSE;
    else if (!cpu.is_wayland ()) this.window_position = Gtk.WindowPosition.CENTER;
    Gtk.Settings.get_default().gtk_application_prefer_dark_theme = this.settings.dark;
    this.set_default_size (this.settings.window_width, this.settings.window_height);
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

    this.menu_button = this.build_menu ();
    this.hb.pack_end (this.menu_button);

    this.home_button = new Gtk.Button ({always_show_image: true, tooltip_text:_("Feed the project's 🐱")});
    this.home_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/feedcat.svg");
    //this.home_button.get_style_context ().add_class ("hb-button");
    this.home_button.set_relief (Gtk.ReliefStyle.NONE);
    this.hb.pack_start (this.home_button);
    this.home_button.connect ('clicked', () => {
      let app = Gio.AppInfo.get_default_for_type ("text/x-markdown", false);
      if (app) app.launch_uris (["file://" + APPDIR + "/BACKERS.md"], null);
    });

    this.cpanel = new ControlPanel.ControlPanel (this.application);
    this.cpanel.margin = 20;

    let vbox = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.add (vbox);

    this.topbar = new Topbar ();
    this.hb.pack_start (this.topbar);
    //vbox.add (this.topbar);

    box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:0});
    box.margin_bottom = box.margin_end = 12;
    //vbox.pack_start (box, true, true, 8);

    let index = 1;
    this.stack = new Gtk.Stack ();
    this.stack.transition_type = Gtk.StackTransitionType.SLIDE_UP_DOWN;
    vbox.pack_start (this.stack, true, true, 0);

    this.stack.add_named (box, "0");

    if (cpu.sensors_path) {
      this.sensors = new SensorsView.SensorsView (this.application);
      this.stack.add_named (this.sensors, (index++).toString ());
    }
    //this.stack.add_named (new ResponsiveBox ({}), (index++).toString ());

    this.statebar = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:16});
    this.statebar.margin_start = 28; this.statebar.margin_end = 0;
    this.statebar.set_size_request (8, 160);
    this.statebar.get_style_context ().add_class ("status-bar");
    box.add (this.statebar);

    //box.pack_start (new Gtk.Box (), true, false, 0);
    this.resbox = new ResponsiveBox ({orientation:Gtk.Orientation.HORIZONTAL, margin:2});
    //box.margin_bottom = 12;
    box.pack_start (this.resbox, true, true, 0);

    //let space = new Gtk.Box ();
    //box.pack_start (new Gtk.Box (), true, false, 0);

    this.infobar = new InfoPanel.InfoPanel ();
    this.infobar.margin_start = 22;
    this.resbox.content.add (this.infobar);
    this.resbox.content.pack_end (new Gtk.Box (), true, false, 0);
    this.resbox.content.pack_end (this.cpanel, true, true, 8);
    //this.resbox.content.pack_end (new Gtk.Box (), true, false, 0);

    if (this.application.extension) this.connect ("focus-out-event", () => {
      if (MENU_LOCK) return;
      this.save_geometry ();
      this.application.quit();
    });
    /*this.prefs_button.connect ("clicked", () => {
      GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences");
    });*/
    this.settings.connect ("changed", this.on_settings.bind (this));

    this.connect ('unmap', this.save_geometry.bind (this));
    this.infobar.connect ("warn_level", this.on_warn_level.bind (this));
    this.resbox.connect ("orientation", this.on_orientation.bind (this));
    this.topbar.connect ('stack_update', this.on_stack_update.bind (this));
    if (!this.application.extension)
      this.restore_position ();
    //if (this.settings.window_maximized) this.maximize ();
  },

  build_menu: function () {
    let mmenu = new Gtk.Menu (), mii;
    let menu_button = new Gtk.MenuButton ({tooltip_text:"Application Menu"});
    menu_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/open-menu-symbolic.svg");
    //menu_button.image = Gtk.Image.new_from_icon_name ("application-menu-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    menu_button.set_relief (Gtk.ReliefStyle.NONE);

    mii = new Gtk.MenuItem ({label:"System"});
    this.set_accel (mii, "Home");
    mmenu.add (mii);
    mii.connect ("activate", () => {GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences")});

    mii = new Gtk.MenuItem ({label:"Sensors"});
    this.set_accel (mii, "<Alt>S");
    mmenu.add (mii);
    mii.connect ("activate", () => {GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences")});

    mii = new Gtk.MenuItem ({label:"Benchmarks"});
    this.set_accel (mii, "<Alt>B");
    mmenu.add (mii);
    mii.connect ("activate", () => {GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences")});

    mmenu.add (new Gtk.SeparatorMenuItem ());
    mii = new Gtk.MenuItem ({label:"Preferences"});
    mmenu.add (mii);
    mii.connect ("activate", () => {GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences")});

    mmenu.add (new Gtk.SeparatorMenuItem ());
    mii = new Gtk.MenuItem ({label:"About"});
    mmenu.add (mii);
    mii.connect ("activate", () => {this.about ()});

    mmenu.show_all ();
    menu_button.set_popup (mmenu);
    mmenu.connect ("show", () => {MENU_LOCK = true});
    mmenu.connect ("hide", () => {MENU_LOCK = false});
    return menu_button;
  },

  set_accel: function (mi, accel) {
    if (!accel || !mi) return;
    let [key,mods] = Gtk.accelerator_parse (accel);
    let label = mi.get_child ();
    if (label && key) label.set_accel (key, mods);
  },

  on_settings: function (o, key) {
    if ((key == "profile-id") || (key == "save-settings")) {
      this.update ();
    } else if (key == "dark-theme") {
      Gtk.Settings.get_default().gtk_application_prefer_dark_theme = this.settings.dark;
    }
  },

  on_warn_level: function (o) {
    var style = this.statebar.get_style_context ();
    style.remove_class ("warning-bar");
    style.remove_class ("critical-bar");
    if (o.warn_lvl > 1) {
      style.add_class ("critical-bar");
    } else if (o.warn_lvl > 0) {
      style.add_class ("warning-bar");
    }
  },

  on_orientation: function (o, orientation) {
    //TODO: add changes
    print (orientation?"VERTICAL":"HORIZONTAL");
  },

  on_stack_update: function (o, index) {
    this.stack.visible_child_name = index.toString ();
  },

  update: function () {
    //TODO: name of current prf on --no-save
    let s, p = this.settings.get_profile (this.settings.guid);
    if (p) s = p.name;
    else if (this.settings.guid == "default") s = cpu.get_default_profile().name;
    else if (this.settings.guid == "battery") s = cpu.get_battery_profile().name;
    else if (this.settings.guid == "balanced") s = cpu.get_balanced_profile().name;
    else if (this.settings.guid == "performance") s = cpu.get_performance_profile().name;
    else if (this.settings.guid == "user") s = this.settings.user_profile.name;
    else s = "Current system settings";
    this.cpanel.update (s);
  },

  save_geometry: function () {
    this.settings.save_geometry (this);
  },

  restore_position: function () {
    if (this.is_maximized) return;
    if ((this.settings.window_x >= 0) && (this.settings.window_y >= 0))
      this.move (this.settings.window_x, this.settings.window_y);
  },

  about: function () {
    let dlg = new Gtk.AboutDialog ({
      transient_for: this,
      program_name: "OSPower CPUFreq",
      copyright: "Copyright © 2016-2021 konkor <konkor.github.io>",
      license_type: Gtk.License.GPL_3_0,
      authors: ["konkor"],
      website: "https://github.com/konkor/cpufreq",
      logo: this.icon,
      logo_icon_name: "cpufreq"
    });
    dlg.run ();
    dlg.destroy ();
  }
});

var Topbar = new Lang.Class({
  Name: "Topbar",
  Extends: Gtk.Box,
  Signals: {
    'stack_update': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_INT]},
  },

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
    this.get_style_context ().add_class ("sb");
    this.buttons = [];

    this.add_button ("System", "System Management", "application-menu-symbolic");
    if (cpu.sensors_path) this.add_button ("Sensors", "Sensors View", "ac-adapter-symbolic");
    this.add_button ("Benchmarks", "Performance Measurements", "system-run-symbolic");

    this.current = 0;
  },

  add_button: function (label, tooltip, icon) {
    let btn = new Gtk.ToggleButton ({tooltip_text:tooltip, always_show_image: true});
    btn.text = label;
    btn.set_relief (Gtk.ReliefStyle.NONE);
    if (icon) {
      btn.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/" + icon + ".svg");
      //Gtk.Image.new_from_icon_name (icon, Gtk.IconSize.SMALL_TOOLBAR);
    }
    btn.get_style_context ().add_class ("sb-button");
    btn.index = this.buttons.length;
    if (btn.index == 0) btn.active = true;
    this.pack_start (btn, true, true, 0);
    this.buttons.push (btn);
    btn.connect ('toggled', this.on_toggle.bind (this));
    btn.connect ('enter_notify_event', (o) => { o.label = o.text });
    btn.connect ('leave_notify_event', (o) => { o.label = "" });
  },

  on_toggle: function (o) {
    if (this.toggle_lock) return;
    if (o.index == this.current) {
      if (!o.active) o.active = true;
      return;
    }
    this.toggle_lock = true;
    this.buttons[this.current].active = false;
    this.current = o.index;
    this.emit ('stack_update', o.index);
    this.toggle_lock = false;
  }
});

var ResponsiveBox = new Lang.Class({
  Name: "ResponsiveBox",
  Extends: Gtk.ScrolledWindow,
  Signals: {
    'orientation': {
      flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
      param_types: [GObject.TYPE_INT]
    },
  },

  _init: function (prefs) {
    this.parent ();
    this.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.shadow_type = Gtk.ShadowType.NONE;

    this.old_state = prefs.orientation = prefs.orientation || Gtk.Orientation.VERTICAL;
    prefs.margin = prefs.margin || 8;
    this.content = new Gtk.Box (prefs);
    this.add (this.content);

    this.connect ('draw', this.on_drawn.bind (this));
  },

  on_drawn: function (area, context) {
    let state = this.old_state;
    let [w, h] = [this.get_allocated_width (), this.get_allocated_height ()];
    if (w < h) state = Gtk.Orientation.VERTICAL;
    else state = Gtk.Orientation.HORIZONTAL;
    this.content.orientation = state;
    if (state != this.old_state) {
      this.old_state = state;
      this.emit ('orientation', state);
    }
    //print ("width:", w, h);
  }

});

function get_css_provider () {
  let cssp = new Gtk.CssProvider ();
  let css_file = Gio.File.new_for_path (theme_gui);
  try {
    cssp.load_from_file (css_file);
  } catch (e) {
    Logger.error (e);
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
