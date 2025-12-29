/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2023 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const SAVE_SETTINGS_KEY = 'save-settings';
const EXTENSION_MODE_KEY = 'extension-mode';
const SHOW_SPLASH_KEY = 'show-splash';
const PROFILE_ID_KEY = 'profile-id';
const MONITOR_KEY = 'monitor';
const EPROFILES_KEY = 'event-profiles';
const LABEL_KEY = 'label';
const LABEL_SHOW_KEY = 'label-show';
const UNITS_SHOW_KEY = 'units-show';
const FREQ_SHOW_KEY = 'frequency-show';
const GOVS_SHOW_KEY = 'governors-show';
const LOAD_SHOW_KEY = 'load-show';

const COLOR_SHOW_KEY = 'color-show';
const COLOR_SHOW_CUSTOM_KEY = 'color-show-custom';
const COLOR_SHOW_CUSTOM_NORMAL_KEY = 'color-show-custom-normal';
const COLOR_SHOW_CUSTOM_WARNING_KEY = 'color-show-custom-warning';
const COLOR_SHOW_CUSTOM_CRITICAL_KEY = 'color-show-custom-critical';

const UP_BUS_NAME = 'org.freedesktop.UPower';
const UP_OBJECT_PATH = '/org/freedesktop/UPower/devices/DisplayDevice';
const DisplayDeviceInterface = `<node>
<interface name="org.freedesktop.UPower.Device">
  <property name="Type" type="u" access="read"/>
  <property name="State" type="u" access="read"/>
  <property name="Percentage" type="d" access="read"/>
  <property name="TimeToEmpty" type="x" access="read"/>
  <property name="TimeToFull" type="x" access="read"/>
  <property name="IsPresent" type="b" access="read"/>
  <property name="IconName" type="s" access="read"/>
</interface>
</node>`;
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const BUS_NAME = 'org.konkor.cpufreq.service';
const OBJECT_PATH = '/org/konkor/cpufreq/service';
const CpufreqServiceIface = `<node>
<interface name="org.konkor.cpufreq.service">
  <property name="Frequency" type="t" access="read"/>
  <signal name="MonitorEvent">
    <arg name="metrics" type="s"/>
  </signal>
  <signal name="LoadingEvent">
    <arg name="loading" type="t"/>
  </signal>
  <signal name="StyleChanged">
    <arg name="style" type="s"/>
  </signal>
</interface>
</node>`;
const CpufreqServiceProxy = Gio.DBusProxy.makeProxyWrapper(CpufreqServiceIface);

function byteArrayToString(value) {
  if (typeof value === 'string')
    return value;

  if (value instanceof Uint8Array)
    return new TextDecoder().decode(value);

  return String(value);
}

function getUiGroup() {
  return Main.uiGroup ?? Main.layoutManager?.uiGroup;
}

function addChild(container, child) {
  if (!container)
    return;

  if (container.add_child)
    container.add_child(child);
  else if (container.add_actor)
    container.add_actor(child);
}

function removeChild(container, child) {
  if (!container)
    return;

  if (container.remove_child)
    container.remove_child(child);
  else if (container.remove_actor)
    container.remove_actor(child);
}

function removeActor(actor) {
  if (!actor)
    return false;

  let parent = actor.get_parent?.();
  removeChild(parent ?? getUiGroup(), actor);
  actor.destroy();
  return false;
}

function sessionBusNameHasOwner(name) {
  try {
    const result = Gio.DBus.session.call_sync(
      'org.freedesktop.DBus',
      '/org/freedesktop/DBus',
      'org.freedesktop.DBus',
      'NameHasOwner',
      new GLib.Variant('(s)', [name]),
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null
    );

    return result?.deepUnpack?.()?.[0] ?? false;
  } catch {
    return false;
  }
}

const FrequencyIndicator = GObject.registerClass(
class FrequencyIndicator extends PanelMenu.Button {
  _init(extension) {
    super._init(0.0, 'CPU Frequency Indicator', false);

    this._extension = extension;
    this._extensionDir = extension.path;
    this._appPath = `${this._extensionDir}/cpufreq-application`;

    this._event = 0;
    this._eventStyle = 0;
    this._monitorEventId = 0;
    this._settingsChangedId = 0;
    this._powerChangedId = 0;
    this._scheduleId = 0;

    this._titleText = '⚠';
    this._titleStyle = '';

    this._colorShow = false;
    this._colorShowCustom = false;
    this._colorShowDefaultNormal = '';
    this._colorShowDefaultWarning = 'orange';
    this._colorShowDefaultCritical = 'red';
    this._colorShowCustomNormal = '#ebebeb';
    this._colorShowCustomWarning = '#ebebeb';
    this._colorShowCustomCritical = '#ff0000';

    this._save = false;
    this._extensionMode = true;
    this._splashEnabled = true;
    this._labelText = '';
    this._labelShow = false;
    this._unitsShow = true;
    this._frequencyShow = true;
    this._governorShow = false;
    this._loadShow = false;

    this._monitorTimeout = 500;
    this._eprofiles = [
      {percent: 0, event: 0, guid: ''},
      {percent: 100, event: 1, guid: ''},
    ];

    this._firstBoot = true;
    this._guidBattery = '';
    this._guid = '';

    this._settings = this._extension.getSettings();
    this._onSettingsChanged(null, null);

    this._statusLabel = new St.Label({
      text: this._titleText,
      y_expand: true,
      y_align: 2,
      style_class: 'cpufreq-text',
    });
    this._statusLabel.style = this._titleStyle;

    let box = new St.BoxLayout();
    addChild(box, this._statusLabel);
    addChild(this, box);

    this.connect('button-press-event', () => {
      let args = this._extensionMode ? '--extension' : '';
      if (this._splashEnabled && !this.app_running)
        this.show_splash();

      if (!this._guidBattery || this._guidBattery === this._guid)
        this.launch_app(args);
      else
        this.launch_app(`${args} --no-save`);
    });

    if (!this._monitorTimeout)
      this._statusLabel.set_text(this.get_title());

    this.add_event();

    // Workaround: force a settings change to update title.
    this._settings.set_boolean(SAVE_SETTINGS_KEY, !this._save);
    this._settings.set_boolean(SAVE_SETTINGS_KEY, this._save);

    this._settingsChangedId = this._settings.connect(
      'changed',
      this._onSettingsChanged.bind(this)
    );

    this._power = new PowerManagerProxy(
      Gio.DBus.system,
      UP_BUS_NAME,
      UP_OBJECT_PATH,
      (proxy, error) => {
        if (error) {
          logError(error, '[cpufreq] UPower proxy error');
          return;
        }

        this.on_power_state(proxy.State, proxy.Percentage);
        if (this._save && this._firstBoot && !this._guidBattery)
          this.launch_app('-p user');
        this._firstBoot = false;

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 8000, () => {
          this._powerChangedId = this._power.connect(
            'g-properties-changed',
            () => this.on_power_state(this._power.State, this._power.Percentage)
          );
          return GLib.SOURCE_REMOVE;
        });
      }
    );
  }

  _onSettingsChanged(_settings, key) {
    let s;
    let settings = _settings || this._settings;

    if (!key) {
      this._guid = settings.get_string(PROFILE_ID_KEY);
      this._monitorTimeout = settings.get_int(MONITOR_KEY);
      this._save = settings.get_boolean(SAVE_SETTINGS_KEY);
      this._extensionMode = settings.get_boolean(EXTENSION_MODE_KEY);
      this._splashEnabled = settings.get_boolean(SHOW_SPLASH_KEY);
      this._labelText = settings.get_string(LABEL_KEY);
      this._labelShow = settings.get_boolean(LABEL_SHOW_KEY);
      this._unitsShow = settings.get_boolean(UNITS_SHOW_KEY);
      this._frequencyShow = settings.get_boolean(FREQ_SHOW_KEY);
      this._governorShow = settings.get_boolean(GOVS_SHOW_KEY);
      this._loadShow = settings.get_boolean(LOAD_SHOW_KEY);

      this._colorShow = settings.get_boolean(COLOR_SHOW_KEY);
      this._colorShowCustom = settings.get_boolean(COLOR_SHOW_CUSTOM_KEY);
      this._colorShowCustomNormal = settings.get_string(COLOR_SHOW_CUSTOM_NORMAL_KEY);
      this._colorShowCustomWarning = settings.get_string(COLOR_SHOW_CUSTOM_WARNING_KEY);
      this._colorShowCustomCritical = settings.get_string(COLOR_SHOW_CUSTOM_CRITICAL_KEY);

      s = settings.get_string(EPROFILES_KEY);
      if (s)
        this._eprofiles = JSON.parse(s);
    }

    if (key === MONITOR_KEY) {
      this._monitorTimeout = settings.get_int(MONITOR_KEY);
      if (this._monitorEventId) {
        GLib.source_remove(this._monitorEventId);
        this._monitorEventId = 0;
      }
      this._monitorEventId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        1000,
        this.add_event.bind(this)
      );
    } else if (key === PROFILE_ID_KEY) {
      this._guid = settings.get_string(PROFILE_ID_KEY);
    } else if (key === EPROFILES_KEY) {
      s = settings.get_string(EPROFILES_KEY);
      if (s)
        this._eprofiles = JSON.parse(s);
    } else if (key === EXTENSION_MODE_KEY) {
      this._extensionMode = settings.get_boolean(EXTENSION_MODE_KEY);
    } else if (key === SHOW_SPLASH_KEY) {
      this._splashEnabled = settings.get_boolean(SHOW_SPLASH_KEY);
    } else if (key === LABEL_KEY) {
      this._labelText = settings.get_string(LABEL_KEY);
    } else if (key === LABEL_SHOW_KEY) {
      this._labelShow = settings.get_boolean(LABEL_SHOW_KEY);
    } else if (key === UNITS_SHOW_KEY) {
      this._unitsShow = settings.get_boolean(UNITS_SHOW_KEY);
    } else if (key === FREQ_SHOW_KEY) {
      this._frequencyShow = settings.get_boolean(FREQ_SHOW_KEY);
    } else if (key === GOVS_SHOW_KEY) {
      this._governorShow = settings.get_boolean(GOVS_SHOW_KEY);
    } else if (key === LOAD_SHOW_KEY) {
      this._loadShow = settings.get_boolean(LOAD_SHOW_KEY);
    } else if (key === COLOR_SHOW_KEY) {
      this._colorShow = settings.get_boolean(COLOR_SHOW_KEY);
    } else if (key === COLOR_SHOW_CUSTOM_KEY) {
      this._colorShowCustom = settings.get_boolean(COLOR_SHOW_CUSTOM_KEY);
    } else if (key === COLOR_SHOW_CUSTOM_NORMAL_KEY) {
      this._colorShowCustomNormal = settings.get_string(COLOR_SHOW_CUSTOM_NORMAL_KEY);
    } else if (key === COLOR_SHOW_CUSTOM_WARNING_KEY) {
      this._colorShowCustomWarning = settings.get_string(COLOR_SHOW_CUSTOM_WARNING_KEY);
    } else if (key === COLOR_SHOW_CUSTOM_CRITICAL_KEY) {
      this._colorShowCustomCritical = settings.get_string(COLOR_SHOW_CUSTOM_CRITICAL_KEY);
    }

    if (key === LABEL_KEY && !this._monitorTimeout)
      this._statusLabel.set_text(this.get_title());
  }

  on_power_state(state, percentage) {
    let id = this._eprofiles?.[1]?.guid;
    if (!id)
      return;

    if (state === 2) {
      // On battery.
      if (id === this._guidBattery)
        return;
      if (percentage < this._eprofiles[1].percent) {
        this.schedule_profile(`--no-save -p ${id}`);
        this._guidBattery = id;
      }
    } else {
      // Restoring previous state.
      if (this._guidBattery === this._guid)
        return;
      this.schedule_profile('-p user');
      this._guidBattery = this._guid;
    }
  }

  unschedule_profile() {
    if (!this._scheduleId)
      return;
    GLib.source_remove(this._scheduleId);
    this._scheduleId = 0;
  }

  schedule_profile(options) {
    if (this._scheduleId)
      this.unschedule_profile();

    this._scheduleId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
      this.launch_app(options);
      this._scheduleId = 0;
      return GLib.SOURCE_REMOVE;
    });
  }

  launch_app(options) {
    options = options || '';
    try {
      GLib.spawn_command_line_async(`${this._appPath} ${options}`.trim());
    } catch (error) {
      logError(error, '[cpufreq] Failed to launch application');
    }
  }

  get app_running() {
    try {
      let [ok, stdout] = GLib.spawn_command_line_sync('ps -A');
      if (!ok)
        return 0;
      let lines = byteArrayToString(stdout).toString().split('\n');
      for (let line of lines) {
        if (line.includes('cpufreq-app')) {
          let pid = parseInt(line.trim().split(' ')[0]);
          if (Number.isInteger(pid) && pid > 0)
            return pid;
        }
      }
    } catch (error) {
      // Ignore; best-effort check only.
    }
    return 0;
  }

  get_title(text) {
    if (!text)
      return this._titleText;

    let metrics = JSON.parse(text);
    let s = '';
    let f = 0;

    if (this._frequencyShow) {
      f = metrics.frequency_maximum;
      if (f) {
        let units;
        if (f < 1000000) {
          units = ' ㎒';
          s = (f / 1000).toFixed(0).toString();
        } else {
          units = '㎓';
          s = (f / 1000000).toFixed(2).toString();
        }
        if (this._unitsShow)
          s += units;
      }
    }

    if (this._governorShow && metrics.governor)
      s += ` ${this.get_governor_symbolyc(metrics.governor)}`;

    if (this._loadShow && Number.isInteger(metrics.state))
      s += ` ${this.get_state_symbolyc(metrics.state)}`;

    if (this._labelShow)
      s += ` ${this._labelText}`;

    if (s)
      this._titleText = s.trim();
    else
      this._titleText = this._labelText;

    if (this._colorShow && Number.isInteger(metrics.state))
      s = this.get_stylestring(metrics.state);
    else
      this._titleStyle = '';

    if (s !== this._titleStyle) {
      this._titleStyle = s;
      this._statusLabel.style = this._titleStyle;
    }

    return this._titleText;
  }

  get_governor_symbolyc(name) {
    let g = name;
    if (g === 'mixed')
      g = '◍';
    else if (g === 'powersave')
      g = '';
    else if (g === 'performance')
      g = '';
    else if (g === 'ondemand')
      g = '';
    else if (g === 'conservative')
      g = '';
    else if (g === 'schedutil')
      g = '';
    else if (g === 'userspace')
      g = '';
    else
      g = '';
    return g;
  }

  get_state_symbolyc(state) {
    let g = '☺';
    if (state === 1)
      g = '';
    else if (state === 2)
      g = '☹';
    return g;
  }

  get_stylestring(state) {
    let s;
    if (this._colorShowCustom)
      state += 3;

    switch (state) {
    case 0:
      s = `color:${this._colorShowDefaultNormal};`;
      break;
    case 1:
      s = `color:${this._colorShowDefaultWarning};`;
      break;
    case 2:
      s = `color:${this._colorShowDefaultCritical};`;
      break;
    case 3:
      s = `color:${this._colorShowCustomNormal};`;
      break;
    case 4:
      s = `color:${this._colorShowCustomWarning};`;
      break;
    case 5:
      s = `color:${this._colorShowCustomCritical};`;
      break;
    default:
      s = '';
    }

    return s;
  }

  add_event() {
    this.remove_proxy();

    if (this._monitorTimeout > 0) {
      // Only try to spawn the service if it isn't already running.
      // If spawning fails (already running, missing binary, etc.) still attempt
      // to connect to the existing DBus name.
      if (!sessionBusNameHasOwner(BUS_NAME)) {
        try {
          GLib.spawn_command_line_async(`${this._extensionDir}/cpufreq-service`);
        } catch (error) {
          logError(error, '[cpufreq] Unable to start cpufreq-service');
        }
      }

      this._proxy = new CpufreqServiceProxy(
        Gio.DBus.session,
        BUS_NAME,
        OBJECT_PATH,
        (proxy, error) => {
          if (error) {
            logError(error, '[cpufreq] DBus proxy error');
            return;
          }

          this._event = this._proxy.connectSignal('MonitorEvent', (_o, _s, metrics) => {
            if (metrics)
              this._statusLabel.set_text(this.get_title(metrics.toString()));
          });

          this._eventStyle = this._proxy.connectSignal('StyleChanged', (_o, _s, style) => {
            if (!style)
              return;
            this._titleStyle = style.toString();
            this._statusLabel.style = this._titleStyle;
          });
        }
      );
    }

    this._monitorEventId = 0;
    return GLib.SOURCE_REMOVE;
  }

  remove_proxy() {
    if (this._proxy) {
      if (this._event)
        this._proxy.disconnectSignal(this._event);
      if (this._eventStyle)
        this._proxy.disconnectSignal(this._eventStyle);
    }

    this._proxy = null;
    this._event = 0;
    this._eventStyle = 0;
  }

  remove_events() {
    this.remove_proxy();

    if (this._settingsChangedId)
      this._settings.disconnect(this._settingsChangedId);
    this._settingsChangedId = 0;

    if (this._powerChangedId)
      this._power?.disconnect(this._powerChangedId);
    this._powerChangedId = 0;

    if (this._monitorEventId)
      GLib.source_remove(this._monitorEventId);
    this._monitorEventId = 0;

    if (this._scheduleId)
      this.unschedule_profile();
  }

  show_splash() {
    let monitor = Main.layoutManager.focusMonitor ?? Main.layoutManager.primaryMonitor;
    if (!monitor && Main.layoutManager.monitors?.length)
      monitor = Main.layoutManager.monitors[0];
    if (!monitor)
      return;

    let height = monitor.height < monitor.width ? monitor.height : monitor.width;
    let width = 512 * height / 1200;

    if (!this._splash)
      this._splash = Gio.icon_new_for_string(`${this._extensionDir}/data/splash.svg`);

    let splash = new St.Icon({gicon: this._splash, icon_size: width});
    addChild(getUiGroup(), splash);

    splash.set_position(
      Math.floor(monitor.width / 2 - splash.width / 2),
      Math.floor(monitor.height / 2 - splash.height / 2)
    );

    if (splash.ease) {
      splash.ease({
        opacity: 20,
        mode: 8,
        duration: 1200,
        onComplete: () => removeActor(splash),
      });
    } else {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1200, () => removeActor(splash));
    }
  }
});

export default class CPUFreqExtension extends Extension {
  enable() {
    this._indicator = new FrequencyIndicator(this);
    Main.panel.addToStatusArea('cpufreq-indicator', this._indicator);
  }

  disable() {
    this._indicator?.remove_events();
    this._indicator?.destroy();
    this._indicator = null;
  }
}
