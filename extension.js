import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const KEYBOARD_ATTACHED_PATH = '/sys/devices/platform/thinkpad_acpi/keyboard_attached_on_screen';

export default class BottomHalfBlockerExtension extends Extension {
    enable() {
        this._blocked = false;
        this._keyboardAttached = false;
        this._forceTablet = false;
        this._overlay = null;
        this._allocationSignalId = 0;
        this._pollSourceId = 0;
        this._keyboardAttachedFile = Gio.File.new_for_path(KEYBOARD_ATTACHED_PATH);

        this._button = new PanelMenu.Button(0.0, 'Bottom Half Blocker', false);
        this._label = new St.Label({
            text: 'Laptop',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._button.add_child(this._label);

        this._toggleItem = new PopupMenu.PopupSwitchMenuItem('Keyboard Attached', false);
        this._toggleItem.setSensitive(false);
        this._button.menu.addMenuItem(this._toggleItem);

        this._forceTabletItem = new PopupMenu.PopupSwitchMenuItem('Force Tablet', false);
        this._forceTabletItem.connect('toggled', (_item, state) => {
            this._forceTablet = state;
            this._syncState();
        });
        this._button.menu.addMenuItem(this._forceTabletItem);
        Main.panel.addToStatusArea(this.uuid, this._button);

        this._signals = [
            [
                Main.layoutManager,
                Main.layoutManager.connect('monitors-changed', () => this._syncOverlay()),
            ],
        ];

        this._refreshBlockedState();
        this._pollSourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            1,
            () => this._refreshBlockedState()
        );
    }

    disable() {
        for (const [source, signalId] of this._signals ?? [])
            source.disconnect(signalId);

        this._signals = null;

        if (this._pollSourceId) {
            GLib.Source.remove(this._pollSourceId);
            this._pollSourceId = 0;
        }

        this._destroyOverlay();

        if (this._button) {
            this._button.destroy();
            this._button = null;
        }

        this._label = null;
        this._keyboardAttachedFile = null;
    }

    _applyBlockedState() {
        if (this._blocked) {
            this._ensureOverlay();
            this._syncOverlay();
        } else {
            this._destroyOverlay();
            Main.layoutManager._queueUpdateRegions();
        }
    }

    _refreshBlockedState() {
        this._keyboardAttached = this._readKeyboardAttachedOnScreen();
        this._syncState();
        return GLib.SOURCE_CONTINUE;
    }

    _syncState() {
        const blocked = this._keyboardAttached && !this._forceTablet;

        this._label?.set_text(blocked ? 'Laptop' : 'Tablet');
        this._toggleItem?.setToggleState(this._keyboardAttached);

        if (this._blocked === blocked)
            return;

        this._blocked = blocked;
        this._applyBlockedState();
    }

    _readKeyboardAttachedOnScreen() {
        try {
            if (!this._keyboardAttachedFile.query_exists(null))
                return false;

            const [, contents] = this._keyboardAttachedFile.load_contents(null);
            return new TextDecoder().decode(contents).trim() === '1';
        } catch (error) {
            console.debug(`${this.uuid}: failed to read ${KEYBOARD_ATTACHED_PATH}: ${error}`);
            return false;
        }
    }

    _ensureOverlay() {
        if (this._overlay)
            return;

        this._overlay = new St.Widget({
            name: 'bottom-half-blocker',
            reactive: true,
            can_focus: false,
            style: 'background-color: #000;',
        });
        this._overlay.set_size(1, 1);
        this._allocationSignalId = this._overlay.connect(
            'notify::allocation',
            Main.layoutManager._queueUpdateRegions.bind(Main.layoutManager)
        );

        try {
            Main.layoutManager.addChrome(this._overlay, {
                affectsInputRegion: true,
                affectsStruts: true,
                trackFullscreen: true,
            });
        } catch (error) {
            if (!`${error}`.includes('Unrecognized parameter "affectsInputRegion"'))
                throw error;

            Main.layoutManager.addChrome(this._overlay, {
                affectsStruts: true,
                trackFullscreen: true,
            });
        }
    }

    _destroyOverlay() {
        if (!this._overlay)
            return;

        if (this._allocationSignalId) {
            this._overlay.disconnect(this._allocationSignalId);
            this._allocationSignalId = 0;
        }

        Main.layoutManager.removeChrome(this._overlay);
        this._overlay.destroy();
        this._overlay = null;
    }

    _syncOverlay() {
        if (!this._overlay || !this._blocked)
            return;

        const monitor = Main.layoutManager.primaryMonitor;

        if (!monitor) {
            this._overlay.hide();
            return;
        }

        const blockedHeight = Math.floor(monitor.height / 2);
        const y = monitor.y + monitor.height - blockedHeight;

        this._overlay.set_position(monitor.x, y);
        this._overlay.set_size(monitor.width, blockedHeight);
        this._overlay.show();
        Main.layoutManager._queueUpdateRegions();
    }
}
