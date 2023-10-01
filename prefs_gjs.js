/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Lang = imports.lang;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;

var Format = imports.format;
String.prototype.format = Format.format;

const APPDIR = get_appdir ();
imports.searchPath.unshift(APPDIR);
const Logger = imports.common.Logger;

const SAVE_SETTINGS_KEY = 'save-settings';
const NOTIFY_KEY    = 'notifications';
const DARK_THEME_KEY = 'dark-theme';
const PROFILES_KEY = 'profiles';
const EPROFILES_KEY = 'event-profiles';
const MONITOR_KEY = 'monitor';
const LABEL_KEY = 'label';
const LABEL_SHOW_KEY = 'label-show';
const UNITS_SHOW_KEY = 'units-show';
const LOAD_SHOW_KEY = 'load-show';
const GOVS_SHOW_KEY = 'governors-show';
const FREQ_SHOW_KEY = 'frequency-show';

const COLOR_SHOW_KEY = 'color-show';
const COLOR_SHOW_CUSTOM_KEY = 'color-show-custom';
const COLOR_SHOW_CUSTOM_NORMAL_KEY = 'color-show-custom-normal';
const COLOR_SHOW_CUSTOM_WARNING_KEY = 'color-show-custom-warning';
const COLOR_SHOW_CUSTOM_CRITICAL_KEY = 'color-show-custom-critical';

const Gettext = imports.gettext.domain ('org-konkor-cpufreq');
const _ = Gettext.gettext;

const EXTENSIONDIR = getCurrentFile ()[1];
imports.searchPath.unshift (EXTENSIONDIR);
const Convenience = imports.convenience;

var EventType = {
CHARGING:     0,
DISCHARGING:  1
};

const suggestions = ["☃","⚡","㎒","㎓","","","","","","","","CPU"];

let save = false;
let dark = false;
let profiles = [];
let monitor_timeout = 500;
let label_text = "\u269b";
let label_show = false;
let frequency_show = true;
let governor_show = false;
let load_show = false;
let units_show = true;
let system_notifications = false;

let auto_profiles = [
  {name:_("Battery"), guid:"battery"},
  {name:_("Balanced"), guid:"balanced"},
  {name:_("High Performance"), guid:"performance"}
];

let color_show = false;
let color_show_custom = false;
let color_show_custom_normal = '#ebebeb';
let color_show_custom_warning = '#ebebeb';
let color_show_custom_critical = '#ff0000';

let eprofiles = [
    {percent:0, event:EventType.CHARGING, guid:""},
    {percent:100, event:EventType.DISCHARGING, guid:""}
];

let settings = false;

var CPUFreqPreferences = new Lang.Class({
    Name: 'CPUFreqPreferences',

    _init: function () {
        this.parent (0.0, "CPUFreq Preferences", false);
        let label, s;

        settings = Convenience.getSettings ();
        save = settings.get_boolean (SAVE_SETTINGS_KEY);
        dark = settings.get_boolean (DARK_THEME_KEY);
        monitor_timeout = settings.get_int (MONITOR_KEY);
        label_text = settings.get_string (LABEL_KEY);
        label_show = settings.get_boolean (LABEL_SHOW_KEY);
        load_show = settings.get_boolean (LOAD_SHOW_KEY);
        governor_show = settings.get_boolean (GOVS_SHOW_KEY);
        frequency_show = settings.get_boolean (FREQ_SHOW_KEY);
        units_show = settings.get_boolean (UNITS_SHOW_KEY);
        system_notifications = settings.get_boolean (NOTIFY_KEY);

        color_show = settings.get_boolean (COLOR_SHOW_KEY);
        color_show_custom = settings.get_boolean (COLOR_SHOW_CUSTOM_KEY);
        color_show_custom_normal = settings.get_string (COLOR_SHOW_CUSTOM_NORMAL_KEY);
        color_show_custom_warning = settings.get_string (COLOR_SHOW_CUSTOM_WARNING_KEY);
        color_show_custom_critical = settings.get_string (COLOR_SHOW_CUSTOM_CRITICAL_KEY);

        s = settings.get_string (EPROFILES_KEY);
        if (s) try {
          eprofiles = JSON.parse (s);
        } catch (e) {
          Logger.error ("%s\nPARSING DATA: %s".format (e.message, s));
        }
        s =  settings.get_string (PROFILES_KEY);
        if (s) try {
          profiles = JSON.parse (s);
        } catch (e) {
          Logger.error ("%s\nPARSING DATA: %s".format (e.message, s));
        }

        this.notebook = new Gtk.Notebook ({expand:true});
        let cssp = get_css_provider ();
        if (cssp) {
          Gtk.StyleContext.add_provider_for_screen (
            this.notebook.get_screen(), cssp, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }

        this.general = new PageGeneralCPUFreq ();
        this.notebook.add (this.general);
        label = new Gtk.Label ({label: _("General")});
        this.notebook.set_tab_label (this.general, label);

        this.monitor_page = new PageMonitorCPUFreq ();
        this.notebook.add (this.monitor_page);
        label = new Gtk.Label ({label: _("Monitor")});
        this.notebook.set_tab_label (this.monitor_page, label);

        this.power = new PagePowerCPUFreq ();
        this.notebook.add (this.power);
        label = new Gtk.Label ({label: _("Power Events")});
        this.notebook.set_tab_label (this.power, label);

        this.notebook.show_all ();
    }
});


var PageGeneralCPUFreq = new Lang.Class({
    Name: 'PageGeneralCPUFreq',
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.border_width = 6;

        this.add (new Gtk.Label ({label: "<b>" + _("System") + ("</b>"), use_markup:true, xalign:0, margin_top:8}));
        this.cb_startup = Gtk.CheckButton.new_with_label (_("Remember settings"));
        this.cb_startup.tooltip_text = _("Check to restore settings on startup");
        this.cb_startup.margin = 6;
        this.add (this.cb_startup);
        this.cb_startup.active = save;
        this.cb_startup.connect ('toggled', () => {
            save = this.cb_startup.active;
            settings.set_boolean (SAVE_SETTINGS_KEY, save);
        });

        this.cb_notify = Gtk.CheckButton.new_with_label (_("Notifications"));
        this.cb_notify.tooltip_text = _("Show System Notifications on Critical States");
        this.cb_notify.margin = 6;
        this.add (this.cb_notify);
        this.cb_notify.active = system_notifications;
        this.cb_notify.connect ('toggled', () => {
            system_notifications = this.cb_notify.active;
            settings.set_boolean (NOTIFY_KEY, system_notifications);
        });

        this.add (new Gtk.Label ({label: _("<b>Extension</b>"), use_markup:true, xalign:0, margin_top:12}));
        this.cb_mode = Gtk.CheckButton.new_with_label (_("Extension mode"));
        this.cb_mode.tooltip_text = _("Run main application without window decorations");
        this.cb_mode.margin = 6;
        this.add (this.cb_mode);
        this.cb_mode.active = settings.get_boolean ("extension-mode");;
        this.cb_mode.connect ('toggled', () => {
            settings.set_boolean ("extension-mode", this.cb_mode.active);
        });
        this.cb_splash = Gtk.CheckButton.new_with_label (_("Splash Screen"));
        this.cb_splash.tooltip_text = _("Show a splash screen on selecting main application");
        this.cb_splash.margin = 6;
        this.add (this.cb_splash);
        this.cb_splash.active = settings.get_boolean ("show-splash");;
        this.cb_splash.connect ('toggled', () => {
            settings.set_boolean ("show-splash", this.cb_splash.active);
        });

        this.add (new Gtk.Label ({label: _("<b>User Interface</b>"), use_markup:true, xalign:0, margin_top:12}));
        this.cb_dark = Gtk.CheckButton.new_with_label (_("Dark theme"));
        this.cb_dark.tooltip_text = _("Prefer dark theme");
        this.cb_dark.margin = 6;
        this.add (this.cb_dark);
        this.cb_dark.active = dark;
        this.cb_dark.connect ('toggled', () => {
            dark = this.cb_dark.active;
            settings.set_boolean (DARK_THEME_KEY, dark);
        });

        this.show_all ();
    }
});

var PageMonitorCPUFreq = new Lang.Class({
    Name: 'PageMonitorCPUFreq',
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        let id = 0, i = 0, rb;
        this.border_width = 6;

        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
        this.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label: _("Monitoring Interval (ms)")}));
        this.timeout = Gtk.SpinButton.new_with_range (0, 1000000, 50);
        this.timeout.tooltip_text = _("1000ms - default, 0 - disable");
        this.timeout.value = monitor_timeout;
        this.timeout.connect ('value_changed', () => {
            monitor_timeout = this.timeout.value;
            settings.set_int (MONITOR_KEY, monitor_timeout);
        });
        hbox.pack_end (this.timeout, false, false, 0);

        hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6, margin_left:32});
        this.pack_start (hbox, false, false, 0);
        hbox.pack_start (new Gtk.Label ({label: _("Show"), xalign:0.0}), false, false, 0);

        let cb_units = Gtk.CheckButton.new_with_label (_("Frequency"));
        cb_units.tooltip_text = _("Monitor frequency");
        cb_units.margin_start = 32;
        cb_units.active = frequency_show;
        hbox.pack_start (cb_units, true, true, 8);
        cb_units.connect ('toggled', (o) => {
            frequency_show = o.active;
            settings.set_boolean (FREQ_SHOW_KEY, frequency_show);
        });

        cb_units = Gtk.CheckButton.new_with_label (_("Governors"));
        cb_units.tooltip_text = _("Monitor governors");
        cb_units.active = governor_show;
        hbox.pack_start (cb_units, true, true, 8);
        cb_units.connect ('toggled', (o) => {
            governor_show = o.active;
            settings.set_boolean (GOVS_SHOW_KEY, governor_show);
        });

        cb_units = Gtk.CheckButton.new_with_label (_("Loading"));
        cb_units.tooltip_text = _("Monitor system loading");
        cb_units.active = load_show;
        hbox.pack_start (cb_units, true, true, 8);
        cb_units.connect ('toggled', (o) => {
            load_show = o.active;
            settings.set_boolean (LOAD_SHOW_KEY, load_show);
        });

        this.cb_units = Gtk.CheckButton.new_with_label (_("Show Measurement Units"));
        this.cb_units.tooltip_text = _("Show measurement units for frequencies");
        this.cb_units.margin = 6;
        this.add (this.cb_units);
        this.cb_units.active = units_show;
        this.cb_units.connect ('toggled', (o) => {
            units_show = o.active;
            settings.set_boolean (UNITS_SHOW_KEY, units_show);
        });

        this.cb_label = Gtk.CheckButton.new_with_label (_("Show Custom Label"));
        this.cb_label.tooltip_text = _("Always show the custom label");
        this.cb_label.margin = 6;
        this.add (this.cb_label);
        this.cb_label.active = label_show;
        this.cb_label.connect ('toggled', (o) => {
            label_show = o.active;
            settings.set_boolean (LABEL_SHOW_KEY, label_show);
        });

        hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
        this.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label: _("Custom label when monitoring disabled")}));
        this.store = new Gtk.ListStore ();
        this.store.set_column_types ([GObject.TYPE_STRING]);
        this.completion = new Gtk.EntryCompletion ();
        this.completion.minimum_key_length = 0;
        this.completion.set_model (this.store);
        this.completion.set_text_column (0);
        suggestions.forEach ( l => {
            this.store.set (this.store.append (), [0], [l]);
        });

        this.label = new Gtk.Entry ();
        this.label.set_completion (this.completion);
        this.label.get_style_context().add_class ("cpufreq-text");
        this.label.tooltip_text = _("Label or just a symbol to show when monitor disabled");
        this.label.set_text (label_text);
        this.label.connect ('changed', (o) => {
            var s = o.text;
            settings.set_string (LABEL_KEY, s);
        });

        hbox.pack_end (this.label, false, false, 0);

        hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:6});
        this.pack_start (hbox, false, false, 0);
        this.cb_color = Gtk.CheckButton.new_with_label (_("Use color"));
        this.cb_color.tooltip_text = _("Colorful Monitor's title depending on warning state");
        this.cb_color.active = color_show;
        hbox.pack_start (this.cb_color, true, true, 0);
        this.cb_color.connect ('toggled', (o) => {
            color_show = o.active;
            settings.set_boolean (COLOR_SHOW_KEY, color_show);
            this.colorbox.sensitive = color_show && color_show_custom;
        });
        rb = Gtk.RadioButton.new_with_label_from_widget (null, _("Default colors"));
        rb.active = !settings.get_boolean (COLOR_SHOW_CUSTOM_KEY);
        rb.id = 0;
        hbox.pack_start(rb, true, true, 8);
        rb.connect ('toggled', (o) => {
            color_show_custom = !o.active;
            settings.set_boolean (COLOR_SHOW_CUSTOM_KEY, color_show_custom);
        });
        rb = Gtk.RadioButton.new_with_label_from_widget (rb, _("Custom colors"));
        rb.active = settings.get_boolean (COLOR_SHOW_CUSTOM_KEY);
        rb.id = 1;
        hbox.pack_start (rb, true, true, 8);
        rb.connect ('toggled', (o) => {
            color_show_custom = o.active;
            settings.set_boolean (COLOR_SHOW_CUSTOM_KEY, color_show_custom);
            this.colorbox.sensitive = color_show && color_show_custom;
        });

        this.colorbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
        this.pack_start (this.colorbox, false, false, 0);

        this.colorbox.add (new Gtk.Label ({label: _("Normal")}));
        let [ ,color] = Gdk.Color.parse (color_show_custom_normal);
        this.color_normal = Gtk.ColorButton.new_with_color (color);
        this.color_normal.connect ('color-set', (o) => {
            settings.set_string (COLOR_SHOW_CUSTOM_NORMAL_KEY, this.color_string (o.rgba));
        });
        this.colorbox.pack_start (this.color_normal, true, false, 0);

        this.colorbox.add (new Gtk.Label ({label: _("Warning")}));
        [ ,color] = Gdk.Color.parse (color_show_custom_warning);
        this.color_warning = Gtk.ColorButton.new_with_color (color);
        this.color_warning.connect ('color-set', (o) => {
            settings.set_string (COLOR_SHOW_CUSTOM_WARNING_KEY, this.color_string (o.rgba));
        });
        this.colorbox.pack_start (this.color_warning, true, false, 0);

        this.colorbox.add (new Gtk.Label ({label: _("Critical")}));
        [ ,color] = Gdk.Color.parse (color_show_custom_critical);
        this.color_critical = Gtk.ColorButton.new_with_color (color);
        this.color_critical.connect ('color-set', (o) => {
            settings.set_string (COLOR_SHOW_CUSTOM_CRITICAL_KEY, this.color_string (o.rgba));
        });
        this.colorbox.pack_start (this.color_critical, true, false, 0);
        this.colorbox.sensitive = color_show && color_show_custom;

        this.show_all ();
    },

    color_string: function (rgba) {
        let s = "#%02x%02x%02x".format (
            this.scale_round (rgba.red),
            this.scale_round (rgba.green),
            this.scale_round (rgba.blue)
        );
        return s;
    },

    scale_round: function (val) {
        val = Math.floor (val * 255 + 0.5);
        val = Math.max (val, 0);
        val = Math.min (val, 255);
        return val;
    }
});

var PagePowerCPUFreq = new Lang.Class({
    Name: 'PagePowerCPUFreq',
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.border_width = 6;

        this.unplug = new PowerProfile (eprofiles[EventType.DISCHARGING],
          _("On Battery"),
          _("You can set less than 100% of the battery level. ") +
          _("It will do not apply \"Powersaving Profile\" immediately on the event. ") +
          _("It could be helpful on temporary disconnections, issues with a power connector, etc.")
        );
        this.add (this.unplug);
        this.unplug.combo.connect ('changed', (o) => {
            if (o.active == 0)
              eprofiles[EventType.DISCHARGING].guid = "";
            else if (o.active <= auto_profiles.length)
              eprofiles[EventType.DISCHARGING].guid = auto_profiles[o.active - 1].guid;
            else
              eprofiles[EventType.DISCHARGING].guid = profiles[o.active - auto_profiles.length - 1].guid;
            //this.unplug.slider.set_value (100);
            settings.set_string (EPROFILES_KEY, JSON.stringify (eprofiles));
        });
        this.unplug.slider.connect ('value_changed', (o) => {
            eprofiles[EventType.DISCHARGING].percent = Math.round (o.get_value ());
            settings.set_string (EPROFILES_KEY, JSON.stringify (eprofiles));
        });

        this.show_all ();
    }
});

var PowerProfile = new Lang.Class({
    Name: 'PowerProfile',
    Extends: Gtk.Box,

    _init: function (profile, text, tooltip) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:6});
        this.tooltip_text = tooltip;
        this.border_width = 6;
        let id = 0, i = 1;

        let hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        this.pack_start (hbox, false, false, 0);
        hbox.add (new Gtk.Label ({label:"<b>"+text+"</b>",use_markup:true,xalign:0}));
        this.combo = new Gtk.ComboBoxText ();
        this.combo.tooltip_text = _("Power Profile");
        this.combo.append_text (_("do nothing"));
        auto_profiles.forEach (s => {
            this.combo.append_text (s.name);
            if (s.guid == profile.guid) id = i;
            i++;
        });
        profiles.forEach (s => {
            this.combo.append_text (s.name + " (user profile)");
            if (s.guid == profile.guid) id = i;
            i++;
        });
        this.combo.active = id;
        hbox.pack_end (this.combo, false, false, 0);

        hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        hbox.margin_top = 8;
        this.add (hbox);
        this.label = new Gtk.Label ({label:_("Level"), use_markup:true, xalign:0});
        hbox.pack_start (this.label, true, true, 0);
        this.info = new Gtk.Label ({label:"<i>"+profile.percent+"%</i>", use_markup:true});
        hbox.pack_end (this.info, false, false, 0);
        this.slider = Gtk.Scale.new_with_range (Gtk.Orientation.HORIZONTAL, 0, 100, 1);
        this.slider.draw_value = false;
        this.slider.set_value (profile.percent);
        this.add (this.slider);
        this.slider.connect('value_changed', (o) => {
            this.update_info (Math.round (o.get_value ()).toString ());
        });

        this.show_all ();
    },

    update_info: function (info) {
        this.info.set_markup ("<i>" + info + "%</i>");
    }
});

const css_theme = " \
.cpufreq-text { font-family: cpufreq, roboto, cantarell} \
";

function get_css_provider () {
    let cssp = new Gtk.CssProvider ();
    try {
        cssp.load_from_data (css_theme);
    } catch (e) {
        print (e);
        cssp = null;
    }
    return cssp;
}

function getCurrentFile () {
    let stack = (new Error()).stack;
    let stackLine = stack.split('\n')[1];
    if (!stackLine)
        throw new Error ('Could not find current file');
    let match = new RegExp ('@(.+):\\d+').exec(stackLine);
    if (!match)
        throw new Error ('Could not find current file');
    let path = match[1];
    let file = Gio.File.new_for_path (path);
    return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

function debug (msg) {
    if (msg) print ("[cpufreq][prefs] " + msg);
}

function error (msg) {
    log ("[cpufreq][prefs] (EE) " + msg);
}

function init () {
    Convenience.initTranslations ();
}

function buildPrefsWidget () {
    if (Gtk.MAJOR_VERSION > 3) {
      GLib.spawn_command_line_async (APPDIR + "/cpufreq-preferences");
      let widget = new DumpWidget ();
      return widget;
    }
    let widget = new CPUFreqPreferences ();
    return widget.notebook;
}

var DumpWidget = new Lang.Class({
    Name: 'DumpWidget',
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({});
        /*this.connect ('realize', () => {
          this.get_parent ().get_parent ().close ();
        });*/
    }
});

function get_appdir () {
    let s = getCurrentFile ()[1];
    if (GLib.file_test (s + "/prefs_gjs.js", GLib.FileTest.EXISTS)) return s;
    s = GLib.get_home_dir () + "/.local/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/prefs_gjs.js", GLib.FileTest.EXISTS)) return s;
    s = "/usr/local/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/prefs_gjs.js", GLib.FileTest.EXISTS)) return s;
    s = "/usr/share/gnome-shell/extensions/cpufreq@konkor";
    if (GLib.file_test (s + "/prefs_gjs.js", GLib.FileTest.EXISTS)) return s;
    throw "CPUFreq installation not found...";
    return s;
}
