---
permalink: clip/troubleshoot
---

If you encounter issues with [[Introduction to Aria Clip|Clip]] you can get help via the [official Discord channel](https://github.com/uicnz/aria-clip/issues). You can also report bugs on the [GitHub repo](https://github.com/uicnz/aria-clip).

## General

### Some content is missing

By default, Clip tries to intelligently capture content from the page. However it may not be successful in doing so across all websites.

Clip uses [Defuddle](https://github.com/kepano/defuddle) to capture only the main content of the page. This excludes header, footer, and other elements, but sometimes it can be overly conservative and remove content that you want to keep. You can [report bugs](https://github.com/kepano/defuddle) to Defuddle.

To bypass Defuddle in Clip use the following methods:

- Select text, or use `Cmd/Ctrl+A` to select all text.
- [[Highlight web pages|Highlight content]] to choose exactly what you want to capture.
- Use a [[Aria Clip/Templates|custom template]] for the site.

### No content appears in Aria

If you don't see any content in Aria when you click **Send to aria**:

- Check for errors in the Aria [[Help and support#Capture console logs|developer console]].
- Check that your vault name in Clip settings exactly matches your *vault name* in Aria *not the vault path*.
- Check that the folder name is correctly formatted.

## Linux

### Aria does not open

- Make sure the [[Aria URI]] protocol [[Aria URI#Register Aria URI|is registered]].
- If you are using Firefox you may need to [register it the browser settings](https://kb.mozillazine.org/Register_protocol).

#### Aria opens but only the file name is saved

It is likely that Aria cannot access your clipboard. Clipboard access is necessary to pass data from your browser to Aria. Your configuration can affect how apps are sandboxed, and clipboard permissions.

If you use Wayland, make sure that Aria has the permissions to read the clipboard when the app is not focused. For example, in your Hyprland configuration:

```ini
# hyprland.conf
misc {
    focus_on_activate = true
}
```

- If you use Flatpak consider trying an [officially supported Aria version](https://aria.bot/download).
- As a fallback, try switching to **Legacy mode** in **Clip Settings** → **General**. This will bypass the clipboard and save content directly via URI. Note that this will limit the number of characters that can be clipped depending on your browser and Linux distribution.

## iOS and iPadOS

To enable the Clip extension for Safari:

1. Go to Safari, tap the leftmost button in the browser URL bar, it looks like a rectangle with lines beneath it.
2. Tap **Manage Extensions**.
3. Enable **Aria Clip** in the Extensions list.
4. Exit the menu.
5. To use the extension **tap the puzzle piece icon** in the URL bar.

To allow Clip to run on all websites:

1. Go to iOS **[[Settings]]** →  **Apps** →  **Safari** →  **Extensions**.
2. Under **Permissions** allow it to run on all websites.

To allow Aria to always receive Clip content:

1. Go to iOS **[[Settings]]** →  **Apps** →  **Aria**.
2. Set **Paste from other apps** to **Allow**.
