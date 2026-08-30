---
permalink: clip/capture
aliases:
  - Aria Clip/Capture web pages
---

Once you install the [[Introduction to Aria Clip|Clip]] browser extension, you can access it in several ways, depending on your browser:

1. The Aria icon in your browser toolbar.
2. Hotkeys, to activate the extension from your keyboard.
3. Context menu, by right-clicking the web page you are visiting.

To save a page to Aria click the **Send to aria** button.

## Capture a page

When you open the extension, Clip extracts data from the current web page following the settings in your [[Aria Clip/Templates|template]]. You can create your own templates, and customize the output using [[variables]] and [[filters]].

By default Clip attempts to intelligently extract only the main article content, excluding other elements on the page. However, you can override this behavior in the following ways:

- If a custom template is present it uses your template.
- If a selection is present, it uses the selection. You can use `Ctrl/Cmd+A` to select the entire page.
- If any [[Highlight web pages|highlights]] are present, it uses the highlights.

## Download images

Images are not automatically downloaded when you use Clip. Instead, images link to their web-based URL. This saves space in your vault but it means the images will not be accessible offline, or if the URL stops working.

You can download images for any file in Aria using the [[Command palette|command]] named **Download attachments for current file**. This command can also be mapped to a hotkey in Aria.

## Hotkeys

Clip includes keyboard shortcuts you can use to speed up your workflow. To change key mappings go to **Clip Settings** → **General** and follow the instructions for your browser. Mappings can be changed for all browsers except Safari which does not support editing hotkeys.

| Action                  | macOS         | Windows/Linux  |
| ----------------------- | ------------- | -------------- |
| Open clip            | `Cmd+Shift+O` | `Ctrl+Shift+O` |
| Quick clip              | `Opt+Shift+O` | `Alt+Shift+O`  |
| Toggle highlighter mode | `Opt+Shift+H` | `Alt+Shift+H`  |

## Interface functionality

The Clip interface is divided into four sections:

1. **Header** where you can switch templates, turn on [[Highlight web pages|highlighting]], and access settings.
2. **Properties** shows the [[Properties|metadata]] extracted from the page that will be saved as [[Properties]] in Aria.
3. **Note content** that will be saved to Aria.
4. **Footer** allows you select the vault and folder, and send to aria.

Header functionality includes:

- **Template** dropdown to switch between your saved [[Aria Clip/Templates|templates]] added in Clip settings.
- **More (...)** button to display page variables you can use in templates.
- **Highlighter** button to turn on [[Highlight web pages|highlighting]].
- **Cog** button to open Clip settings.

Footer functionality includes:

- **Send to aria** button to save data to Aria.
- **Vault** dropdown to switch between saved vaults added in Clip settings.
- **Folder** field to define which folder to save to.
- **Interpreter** to run [[Interpret web pages|natural language prompts]] on the page.
