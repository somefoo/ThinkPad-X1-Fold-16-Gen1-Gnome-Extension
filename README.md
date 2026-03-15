# ThinkPad-X1-Fold-16-Gen1-Gnome-Extension

<table>
<tr>
<td width="420" valign="top">

<img src="https://github.com/user-attachments/assets/1d668f37-43c0-4fd9-8d1c-7d7630694d87" width="400">

</td>
<td valign="top">

## Bottom Half Blocker

GNOME Shell extension for the ThinkPad X1 Fold 16 Gen 1.

**Warning 1:** this extension has only been tested on GNOME Shell 50.

**Warning 2:** this extension only provides an approximation of the Windows behaviour. Full-screen applications and GNOME pop-ups will ignore the mode :D

It adds a small panel indicator that shows the current mode:

- `Laptop`: keyboard attached, bottom half of the primary display is blocked  
- `Tablet`: keyboard detached, full display is available

The extension also exposes a `Force Tablet` switch in the panel menu to override the detected state.

</td>
</tr>
</table>

## How it works

The extension polls:

`/sys/devices/platform/thinkpad_acpi/keyboard_attached_on_screen`

If the value is `1`, it treats the system as `Laptop`. If the value is `0`, it treats the system as `Tablet`.

This polling-based detection requires kernel support for that sysfs node.

## Automatic keyboard detection

Automatic detection depends on kernel support for the `keyboard_attached_on_screen` sysfs node.

If you want to use automatic keyboard detection, your kernel needs that patch, or an equivalent upstream version of it, applied.

I already submitted the [patch upstream](https://lore.kernel.org/all/20260314142236.74514-1-pithenrich2d@gmail.com/), but it may still change before it is merged.

Without that kernel support, the extension still loads, but automatic mode detection will not work.

## Install the GNOME Extension

Run:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/bottom-half-blocker@local
cp extension.js metadata.json ~/.local/share/gnome-shell/extensions/bottom-half-blocker@local/
```

Then reload GNOME Shell, or log out and back in, and enable the extension:

```bash
gnome-extensions enable bottom-half-blocker@local
```
