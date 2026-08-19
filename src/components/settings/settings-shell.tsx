import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import {
  ArchiveIcon,
  BookOpenIcon,
  HighlighterIcon,
  MenuIcon,
  PaperclipIcon,
  QuoteIcon,
  SettingsIcon,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { generalSettings, loadSettings, saveSettings } from "@/utils/storage-utils"

export function SettingsShell() {
  const requestedSection = new URLSearchParams(window.location.search).get("section")
  const initialSection = requestedSection === "reader" || requestedSection === "highlighter" || requestedSection === "interpreter" || requestedSection === "properties" || requestedSection === "templates" ? requestedSection : "general"
  const [activeSection, setActiveSection] = useState(initialSection)
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [settings, setSettings] = useState(() => ({
    ...generalSettings,
    readerSettings: { ...generalSettings.readerSettings },
  }))

  useEffect(() => {
    let mounted = true
    void loadSettings().then((loaded) => {
      if (mounted) {
        setSettings({ ...loaded, readerSettings: { ...loaded.readerSettings } })
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const updateDialog = (event: Event) => {
      const { id, open } = (event as CustomEvent<{ id: string; open: boolean }>).detail
      setOpenDialog(open ? id : null)
    }
    window.addEventListener("aria-dialog-change", updateDialog)
    return () => window.removeEventListener("aria-dialog-change", updateDialog)
  }, [])

  useEffect(() => {
    const updateActiveSection = () => {
      const section = new URLSearchParams(window.location.search).get("section")
      setActiveSection(section === "reader" || section === "highlighter" || section === "interpreter" || section === "properties" || section === "templates" ? section : "general")
    }
    window.addEventListener("popstate", updateActiveSection)
    return () => window.removeEventListener("popstate", updateActiveSection)
  }, [])

  return (
    <div id="settings" className="group/settings h-dvh overflow-hidden bg-background text-foreground">
      <SidebarProvider id="settings-container">
        <Sidebar id="sidebar" collapsible="offcanvas">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton id="settings-sidebar-title" type="button" size="lg">
                  <SettingsIcon />
                  <span data-i18n="settings">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem data-section="general">
                    <SidebarMenuButton type="button" isActive={activeSection === "general"}><PaperclipIcon /><span data-i18n="general">General</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem data-section="reader">
                    <SidebarMenuButton type="button" isActive={activeSection === "reader"}><BookOpenIcon /><span data-i18n="reader">Reader</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem data-section="highlighter">
                    <SidebarMenuButton type="button" isActive={activeSection === "highlighter"}><HighlighterIcon /><span data-i18n="highlighter">Highlighter</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem data-section="interpreter">
                    <SidebarMenuButton type="button" isActive={activeSection === "interpreter"}><QuoteIcon /><span data-i18n="interpreter">Interpreter</span></SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem data-section="properties">
                    <SidebarMenuButton type="button" isActive={activeSection === "properties"}><ArchiveIcon /><span data-i18n="properties">Properties</span></SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel data-i18n="templatesHeading">Templates</SidebarGroupLabel>
              <SidebarGroupContent>
                <Button type="button" id="new-template-btn" variant="secondary" className="mb-2 w-full" data-i18n="newTemplate">New template</Button>
                <SidebarMenu id="template-list" />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <ScrollArea id="content" className="h-dvh min-w-0">
          <div id="navbar" className="sticky top-0 z-30 hidden items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur max-md:flex">
            <div id="navbar-title" className="text-sm font-medium">Aria Clip</div>
            <SidebarTrigger id="hamburger-menu" aria-label="Open navigation"><MenuIcon /></SidebarTrigger>
          </div>

          <div className="mx-auto w-full max-w-5xl px-8 py-10 max-md:px-4 max-md:py-6">
            <section id="general-section" className={cn("settings-section space-y-8", activeSection !== "general" && "hidden")}>
              <h1 className="font-heading text-xl font-semibold tracking-tight" data-i18n="generalSettings">General settings</h1>
              <form id="general-settings-form" className="space-y-8">
                <Card id="usage-chart-container">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle data-i18n="activity">Activity</CardTitle>
                    <div className="usage-chart-controls flex flex-wrap gap-2">
                      <NativeSelect id="usage-metric-select">
                        <NativeSelectOption value="saved" data-i18n="saved">Saved</NativeSelectOption>
                        <NativeSelectOption value="read" data-i18n="read">Read</NativeSelectOption>
                      </NativeSelect>
                      <NativeSelect id="usage-period-select">
                        <NativeSelectOption value="30d" data-i18n="last30Days">Last 30 days</NativeSelectOption>
                        <NativeSelectOption value="all" data-i18n="allTime">All time</NativeSelectOption>
                      </NativeSelect>
                      <NativeSelect id="usage-aggregation-select">
                        <NativeSelectOption value="day" data-i18n="byDay">Days</NativeSelectOption>
                        <NativeSelectOption value="week" data-i18n="byWeek">Weeks</NativeSelectOption>
                      </NativeSelect>
                    </div>
                  </CardHeader>
                  <CardContent><div id="usage-chart" className="usage-chart min-h-28" /></CardContent>
                </Card>

                <div id="rate-extension" className="is-hidden hidden">
                  <Alert><AlertDescription data-i18n="rateExtensionDescription">Are you enjoying Clip? Help us by giving it a rating.</AlertDescription></Alert>
                  <div className="star-rating mt-2 flex gap-1 text-lg">
                    {[1,2,3,4,5].map(rating => <button type="button" className="star text-muted-foreground [&.is-active]:text-foreground" data-rating={rating} key={rating}>★</button>)}
                  </div>
                </div>

                <FieldSet>
                  <FieldLegend>Application</FieldLegend>
                  <Card><CardContent><FieldGroup>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="readerAppearance">Appearance</FieldTitle><FieldDescription data-i18n="readerAppearanceDescription">Use the system appearance or choose light or dark mode.</FieldDescription></FieldContent>
                    <NativeSelect id="reader-appearance">
                      <NativeSelectOption value="auto" data-i18n="readerAppearanceAuto">System</NativeSelectOption>
                      <NativeSelectOption value="light" data-i18n="readerAppearanceLight">Light</NativeSelectOption>
                      <NativeSelectOption value="dark" data-i18n="readerAppearanceDark">Dark</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="language">Language</FieldTitle><FieldDescription data-i18n="languageDescription">Choose the display language for the extension interface.</FieldDescription></FieldContent>
                    <NativeSelect id="language-select"><NativeSelectOption value="">System default</NativeSelectOption></NativeSelect>
                  </Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="version">Version</FieldTitle><FieldDescription><span id="using-latest-version" data-i18n="usingLatestVersion">You are using the latest version.</span><span id="update-available" className="hidden text-destructive" data-i18n="updateAvailable">An update is available.</span></FieldDescription></FieldContent>
                    <div className="flex items-center gap-2"><span id="version-number" className="text-xs text-muted-foreground" /><a id="changelog-link" href="https://github.com/uicnz/aria-clip/releases" target="_blank" className={buttonVariants({ variant: "outline" })} data-i18n="changelog">Changelog</a></div>
                  </Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="help">Help</FieldTitle><FieldDescription data-i18n="helpDescription">Learn how to use Clip and get help troubleshooting.</FieldDescription></FieldContent>
                    <a id="help-open-btn" href="https://docs.aria.bot" target="_blank" className={buttonVariants({ variant: "outline" })} data-i18n="open">Open</a>
                  </Field>
                  </FieldGroup></CardContent></Card>
                </FieldSet>

                <FieldSet>
                  <FieldLegend data-i18n="vaults">Vaults</FieldLegend>
                  <Card><CardContent><Field>
                    <FieldContent><FieldTitle>Vault names</FieldTitle><FieldDescription data-i18n="vaultsDescription">Vault names must exactly match the name of the Aria vault. Press enter to add a vault.</FieldDescription></FieldContent>
                    <div className="grid gap-2">
                      <Input id="vault-input" placeholder="Press enter to add a vault" autoComplete="off" spellCheck={false} />
                      <ul id="vault-list" className="setting-item-list grid gap-1" />
                    </div>
                  </Field></CardContent></Card>
                </FieldSet>

                <div id="hotkeys-subsection">
                  <FieldSet><FieldLegend data-i18n="hotkeys">Hotkeys</FieldLegend><Card><CardContent><FieldGroup>
                    <FieldDescription className="shortcut-instructions" />
                    <div id="keyboard-shortcuts-list" />
                  </FieldGroup></CardContent></Card></FieldSet>
                </div>

                <FieldSet>
                  <FieldLegend data-i18n="behavior">Behavior</FieldLegend>
                  <Card><CardContent><FieldGroup>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="saveBehaviorLabel">Save behavior</FieldTitle><FieldDescription data-i18n="saveBehaviorDescription">Choose the default option for saving pages.</FieldDescription></FieldContent>
                    <NativeSelect id="save-behavior-dropdown">
                      <NativeSelectOption value="addToAria" data-i18n="addToAria">Add to Aria</NativeSelectOption>
                      <NativeSelectOption value="copyToClipboard" data-i18n="copyToClipboard">Copy to clipboard</NativeSelectOption>
                      <NativeSelectOption value="saveFile" data-i18n="saveFile">Save file</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="openBehaviorTitle">Default open behavior</FieldTitle><FieldDescription data-i18n="openBehaviorDescription">Choose how Clip opens by default.</FieldDescription></FieldContent>
                    <NativeSelect id="open-behavior-dropdown">
                      <NativeSelectOption value="popup" data-i18n="popup">Popup</NativeSelectOption>
                      <NativeSelectOption value="embedded" data-i18n="embedded">Embedded</NativeSelectOption>
                      <NativeSelectOption value="reader" data-i18n="reader">Reader</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="silentOpen">Save without opening</FieldTitle><FieldDescription data-i18n="silentOpenDescription">Save the clipped note without opening it.</FieldDescription></FieldContent><Switch id="silent-open-toggle" checked={settings.silentOpen} onCheckedChange={(checked) => { setSettings((current) => ({ ...current, silentOpen: checked })); void saveSettings({ silentOpen: checked }) }} /></Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="legacyMode">Legacy mode</FieldTitle><FieldDescription data-i18n="legacyModeDescription">Use the URI clipping method for Aria 1.6.7 or earlier.</FieldDescription></FieldContent><Switch id="legacy-mode-toggle" checked={settings.legacyMode} onCheckedChange={(checked) => { setSettings((current) => ({ ...current, legacyMode: checked })); void saveSettings({ legacyMode: checked }) }} /></Field>
                  </FieldGroup></CardContent></Card>
                </FieldSet>

                <FieldSet>
                  <FieldLegend data-i18n="advanced">Advanced</FieldLegend>
                  <Card><CardContent><FieldGroup>
                    <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="resetDefaultTemplate">Reset default template</FieldTitle><FieldDescription data-i18n="resetDefaultTemplateDescription">Remove changes made to the default template.</FieldDescription></FieldContent><Button id="reset-default-template-btn" type="button" variant="destructive" data-i18n="reset">Reset</Button></Field>
                    <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="exportAllSettings">Export all settings</FieldTitle><FieldDescription data-i18n="exportAllSettingsDescription">Export settings, templates, and properties.</FieldDescription></FieldContent><Button id="export-all-settings-btn" type="button" variant="outline" data-i18n="export">Export</Button></Field>
                    <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="importAllSettings">Import all settings</FieldTitle><FieldDescription data-i18n="importAllSettingsDescription">Import and replace the current configuration.</FieldDescription></FieldContent><Button id="import-all-settings-btn" type="button" variant="outline" data-i18n="import">Import</Button></Field>
                  </FieldGroup></CardContent></Card>
                </FieldSet>
              </form>
            </section>

            <section id="reader-section" className={cn("settings-section space-y-8", activeSection !== "reader" && "hidden")}>
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-heading text-xl font-semibold tracking-tight" data-i18n="reader">Reader</h1>
                <a href="reader.html" id="open-reader" target="_blank" className={buttonVariants({ variant: "outline" })} data-i18n="openReader">Open Reader</a>
              </div>
              <Card id="reader-preview" className="aria-reader-active">
                <CardContent className="space-y-2 pt-1">
                  <p className="reader-preview-title text-lg font-semibold">File over app</p>
                  <p className="reader-preview-meta text-xs text-muted-foreground">Steph Ango · July 1, 2023 · stephango.com</p>
                  <p className="reader-preview-body max-w-2xl text-sm leading-relaxed"><em>File over app</em> is a philosophy: if you want to create <strong>digital artifacts that last</strong>, they must be files you can control, in formats that are easy to retrieve and read.</p>
                </CardContent>
              </Card>
              <form id="reader-settings-form" className="space-y-8">
                <FieldSet>
                  <FieldLegend data-i18n="readerTypography">Typography</FieldLegend>
                  <Card><CardContent><FieldGroup>
                    <Field orientation="horizontal">
                      <FieldContent><FieldTitle data-i18n="readerFontSize">Base font size</FieldTitle></FieldContent>
                      <div className="flex w-48 items-center gap-3"><Slider min={9} max={24} step={1} value={[settings.readerSettings.fontSize]} onValueChange={(value) => { const fontSize = Number(Array.isArray(value) ? value[0] : value); setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, fontSize } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, fontSize } }) }} /><span className="w-6 text-right text-xs text-muted-foreground">{settings.readerSettings.fontSize}</span></div>
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldTitle data-i18n="readerLineHeight">Line height</FieldTitle></FieldContent>
                      <div className="flex w-48 items-center gap-3"><Slider min={1.1} max={2} step={0.1} value={[settings.readerSettings.lineHeight]} onValueChange={(value) => { const lineHeight = Number(Array.isArray(value) ? value[0] : value); setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, lineHeight } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, lineHeight } }) }} /><span className="w-6 text-right text-xs text-muted-foreground">{settings.readerSettings.lineHeight.toFixed(1)}</span></div>
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldTitle data-i18n="readerLineWidth">Line width</FieldTitle></FieldContent>
                      <div className="flex w-48 items-center gap-3"><Slider min={30} max={60} step={1} value={[settings.readerSettings.maxWidth]} onValueChange={(value) => { const maxWidth = Number(Array.isArray(value) ? value[0] : value); setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, maxWidth } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, maxWidth } }) }} /><span className="w-6 text-right text-xs text-muted-foreground">{settings.readerSettings.maxWidth}</span></div>
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent><FieldTitle data-i18n="readerColorLinks">Color links</FieldTitle></FieldContent>
                      <Switch id="reader-color-links" checked={settings.readerSettings.colorLinks} onCheckedChange={(colorLinks) => { setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, colorLinks } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, colorLinks } }) }} />
                    </Field>
                  </FieldGroup></CardContent></Card>
                </FieldSet>
                <FieldSet>
                  <FieldLegend data-i18n="readerImages">Images</FieldLegend>
                  <Card><CardContent><Field orientation="horizontal">
                    <FieldContent><FieldTitle data-i18n="readerBlendImages">Blend images</FieldTitle><FieldDescription data-i18n="readerBlendImagesDescription">Blend images with the page background in reader mode.</FieldDescription></FieldContent>
                    <Switch id="reader-blend-images" checked={settings.readerSettings.blendImages} onCheckedChange={(blendImages) => { setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, blendImages } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, blendImages } }) }} />
                  </Field></CardContent></Card>
                </FieldSet>
                <FieldSet>
                  <FieldLegend data-i18n="readerTranscripts">Transcripts</FieldLegend>
                  <Card><CardContent><FieldGroup>
                    <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="readerPinPlayer">Pin player</FieldTitle></FieldContent><Switch id="reader-pin-player" checked={settings.readerSettings.pinPlayer} onCheckedChange={(pinPlayer) => { setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, pinPlayer } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, pinPlayer } }) }} /></Field>
                    <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="readerAutoScroll">Auto scroll</FieldTitle></FieldContent><Switch id="reader-auto-scroll" checked={settings.readerSettings.autoScroll} onCheckedChange={(autoScroll) => { setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, autoScroll } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, autoScroll } }) }} /></Field>
                    <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="readerHighlightActiveLine">Highlight active line</FieldTitle></FieldContent><Switch id="reader-highlight-active-line" checked={settings.readerSettings.highlightActiveLine} onCheckedChange={(highlightActiveLine) => { setSettings((current) => ({ ...current, readerSettings: { ...current.readerSettings, highlightActiveLine } })); void saveSettings({ readerSettings: { ...generalSettings.readerSettings, highlightActiveLine } }) }} /></Field>
                  </FieldGroup></CardContent></Card>
                </FieldSet>
                <FieldSet>
                  <FieldLegend data-i18n="advanced">Advanced</FieldLegend>
                  <Card><CardContent><Field><FieldContent><FieldTitle data-i18n="readerCustomCss">Custom CSS</FieldTitle><FieldDescription data-i18n="readerCustomCssDescription">CSS applied only to Reader content.</FieldDescription></FieldContent><Textarea id="reader-custom-css" rows={6} spellCheck={false} className="font-mono" /></Field></CardContent></Card>
                </FieldSet>
              </form>
            </section>

            <section id="highlighter-section" className={cn("settings-section space-y-8", activeSection !== "highlighter" && "hidden")}>
              <div className="flex items-center justify-between gap-4"><h1 className="font-heading text-xl font-semibold tracking-tight" data-i18n="highlighterSettings">Highlighter</h1><a href="highlights.html" id="view-highlights" target="_blank" className={buttonVariants({ variant: "outline" })} data-i18n="openHighlights">Open highlights</a></div>
              <form id="highlighter-settings-form" className="space-y-8">
                <FieldSet><FieldLegend>Highlighting</FieldLegend><Card><CardContent><FieldGroup>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="alwaysShowHighlights">Always show highlights</FieldTitle><FieldDescription data-i18n="alwaysShowHighlightsDescription">Display saved highlights whenever a page loads.</FieldDescription></FieldContent><Switch id="highlighter-visibility" checked={settings.alwaysShowHighlights} onCheckedChange={(alwaysShowHighlights) => { setSettings((current) => ({ ...current, alwaysShowHighlights })); void saveSettings({ alwaysShowHighlights }) }} /></Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="clipBehavior">Clip behavior</FieldTitle><FieldDescription data-i18n="clipBehaviorDescription">Choose how highlighted content is saved.</FieldDescription></FieldContent><NativeSelect id="highlighter-behavior"><NativeSelectOption value="highlight-inline" data-i18n="highlightInline">Highlight inline</NativeSelectOption><NativeSelectOption value="replace-content" data-i18n="replaceContent">Replace page content</NativeSelectOption><NativeSelectOption value="no-highlights" data-i18n="noHighlights">Do nothing</NativeSelectOption></NativeSelect></Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="exportHighlights">Export highlights</FieldTitle><FieldDescription data-i18n="exportHighlightsDescription">Export your highlights to a file.</FieldDescription></FieldContent><Button id="export-highlights" type="button" variant="outline" data-i18n="export">Export</Button></Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="importHighlights">Import highlights</FieldTitle><FieldDescription data-i18n="importHighlightsDescription">Import highlights from a file.</FieldDescription></FieldContent><Button id="import-highlights" type="button" variant="outline" data-i18n="import">Import</Button></Field>
                </FieldGroup></CardContent></Card></FieldSet>
              </form>
            </section>

            <section id="interpreter-section" className={cn("settings-section space-y-8", activeSection !== "interpreter" && "hidden")}>
              <h1 className="font-heading text-xl font-semibold tracking-tight" data-i18n="interpreter">Interpreter</h1>
              <form id="interpreter-settings-form" className="space-y-8">
                <FieldSet><FieldLegend>Interpreter</FieldLegend><Card><CardContent><FieldGroup>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="enableInterpreter">Enable interpreter</FieldTitle><FieldDescription data-i18n="enableInterpreterDescription">Use natural language to extract structured data from pages.</FieldDescription></FieldContent><Switch id="interpreter-toggle" checked={settings.interpreterEnabled} onCheckedChange={(interpreterEnabled) => { setSettings((current) => ({ ...current, interpreterEnabled })); void saveSettings({ interpreterEnabled }) }} /></Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="autoRunInterpreter">Automatically run</FieldTitle><FieldDescription data-i18n="autoRunInterpreterDescription">Run prompt variables immediately when a template contains them.</FieldDescription></FieldContent><Switch id="interpreter-auto-run-toggle" checked={settings.interpreterAutoRun} onCheckedChange={(interpreterAutoRun) => { setSettings((current) => ({ ...current, interpreterAutoRun })); void saveSettings({ interpreterAutoRun }) }} /></Field>
                </FieldGroup></CardContent></Card></FieldSet>
                <FieldSet><FieldLegend data-i18n="providers">Providers</FieldLegend><Card><CardContent><FieldGroup>
                  <Alert id="api-keys-warning-container"><AlertDescription data-i18n="apiKeysWarning">Interpreter requests are sent directly to your selected provider.</AlertDescription></Alert>
                  <div id="provider-list" />
                  <Button id="add-provider-btn" type="button" variant="outline" data-i18n="addProvider">Add provider</Button>
                </FieldGroup></CardContent></Card></FieldSet>
                <FieldSet><FieldLegend data-i18n="models">Models</FieldLegend><Card><CardContent><FieldGroup><div id="model-list" /><Button id="add-model-btn" type="button" variant="outline" data-i18n="addModel">Add model</Button></FieldGroup></CardContent></Card></FieldSet>
                <FieldSet><FieldLegend data-i18n="advanced">Advanced</FieldLegend><Card><CardContent><Field><FieldContent><FieldTitle data-i18n="defaultInterpreterContext">Default interpreter context</FieldTitle><FieldDescription data-i18n="defaultInterpreterContextDescription">Override the context used to interpret prompt variables.</FieldDescription></FieldContent><Textarea id="default-prompt-context" rows={4} placeholder="{{fullHtml}}" spellCheck={false} className="font-mono" /></Field></CardContent></Card></FieldSet>
              </form>
            </section>

            <section id="properties-section" className={cn("settings-section space-y-8", activeSection !== "properties" && "hidden")}>
              <h1 className="font-heading text-xl font-semibold tracking-tight" data-i18n="propertiesSettings">Properties</h1>
              <form id="property-types-form" className="space-y-8">
                <FieldSet><FieldLegend>Manage properties</FieldLegend><Card><CardContent><FieldGroup>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="importProperties">Import properties</FieldTitle><FieldDescription data-i18n="importPropertiesDescription">Import types.json from your vault.</FieldDescription></FieldContent><Button id="import-types-btn" type="button" variant="outline" data-i18n="import">Import</Button></Field>
                  <Field orientation="horizontal"><FieldContent><FieldTitle data-i18n="exportProperties">Export properties</FieldTitle><FieldDescription data-i18n="exportPropertiesDescription">Export Clip properties as types.json.</FieldDescription></FieldContent><Button id="export-types-btn" type="button" variant="outline" data-i18n="export">Export</Button></Field>
                  <Field className="setting-item" orientation="horizontal"><FieldContent><FieldTitle data-i18n="removeUnusedProperties">Remove unused properties</FieldTitle><FieldDescription data-i18n="removeUnusedPropertiesDescription">Remove properties not used by a template.</FieldDescription></FieldContent><Button id="delete-unused-properties-btn" type="button" variant="destructive" data-i18n="remove">Remove</Button></Field>
                </FieldGroup></CardContent></Card></FieldSet>
                <FieldSet><FieldLegend data-i18n="allProperties">All properties</FieldLegend><Card><CardContent><FieldGroup><Button id="add-property-type-btn" type="button" variant="outline">Add property</Button><div id="property-types-list" className="properties-list" /></FieldGroup></CardContent></Card></FieldSet>
              </form>
            </section>

            <section id="templates-section" className={cn("settings-section space-y-8", activeSection !== "templates" && "hidden")}>
              <div className="flex items-center justify-between gap-4"><h1 id="template-editor-title" className="font-heading text-xl font-semibold tracking-tight" data-i18n="editTemplate">Edit template</h1><div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={() => window.dispatchEvent(new Event("aria-template-export"))} data-i18n="export">Export</Button><Button type="button" variant="outline" onClick={() => window.dispatchEvent(new Event("aria-template-import"))} data-i18n="import">Import</Button><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="outline" />}><span data-i18n="more">More</span></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => window.dispatchEvent(new Event("aria-template-duplicate"))} data-i18n="duplicate">Duplicate</DropdownMenuItem><DropdownMenuItem onClick={() => window.dispatchEvent(new Event("aria-template-copy"))} data-i18n="copyAsJson">Copy as JSON</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => window.dispatchEvent(new Event("aria-template-delete"))} data-i18n="delete">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
              <form id="template-settings-form" className="space-y-8">
                <div id="template-editor" className="space-y-8">
                  <div id="template-error-summary" className="hidden" />
                  <FieldSet><FieldLegend data-i18n="template">Template</FieldLegend><Card><CardContent><FieldGroup>
                    <Field><FieldTitle data-i18n="templateName">Template name</FieldTitle><Input id="template-name" placeholder="Template name" /></Field>
                    <Field><FieldTitle data-i18n="urlPatterns">URL patterns</FieldTitle><Textarea id="url-patterns" rows={2} placeholder="https://example.com/" className="font-mono" /></Field>
                  </FieldGroup></CardContent></Card></FieldSet>
                  <FieldSet><FieldLegend data-i18n="templateGroupLocation">Location</FieldLegend><Card><CardContent><FieldGroup>
                    <Field orientation="horizontal"><FieldTitle data-i18n="behavior">Behavior</FieldTitle><NativeSelect id="template-behavior"><NativeSelectOption value="create">Create</NativeSelectOption><NativeSelectOption value="append-specific">Append</NativeSelectOption><NativeSelectOption value="prepend-specific">Prepend</NativeSelectOption><NativeSelectOption value="overwrite">Overwrite</NativeSelectOption><NativeSelectOption value="append-daily">Append daily</NativeSelectOption><NativeSelectOption value="prepend-daily">Prepend daily</NativeSelectOption></NativeSelect></Field>
                    <div id="note-name-format-container" className="hidden"><Field><FieldTitle data-i18n="noteName">Note name</FieldTitle><Input id="note-name-format" placeholder="{{title}}" className="font-mono" /></Field></div>
                    <div id="path-name-container" className="hidden"><Field><FieldTitle data-i18n="folder">Folder</FieldTitle><Input id="template-path-name" placeholder="Clips" /></Field></div>
                    <Field orientation="horizontal"><FieldTitle data-i18n="vault">Vault</FieldTitle><NativeSelect id="template-vault"><NativeSelectOption value="">Current vault</NativeSelectOption></NativeSelect></Field>
                  </FieldGroup></CardContent></Card></FieldSet>
                  <FieldSet><FieldLegend data-i18n="templateGroupContent">Content</FieldLegend><Card><CardContent><FieldGroup>
                    <div id="properties-container"><div id="template-properties" className="properties-list" /><Button id="add-property-btn" type="button" variant="outline" className="mt-3" data-i18n="addProperty">Add property</Button></div>
                    <Field><FieldTitle data-i18n="noteContent">Note content</FieldTitle><Textarea id="note-content-format" rows={8} placeholder="{{content}}" className="font-mono" /></Field>
                  </FieldGroup></CardContent></Card></FieldSet>
                  <div id="template-advanced-section"><FieldSet><FieldLegend data-i18n="advanced">Advanced</FieldLegend><Card><CardContent><div id="prompt-context-container"><Field><FieldTitle data-i18n="promptContext">Prompt context</FieldTitle><Textarea id="prompt-context" rows={4} className="font-mono" /></Field></div></CardContent></Card></FieldSet></div>
                  <datalist id="property-name-suggestions" />
                  <div id="variables-search" className="hidden" /><button id="show-variables" type="button" className="hidden" />
                </div>
              </form>
            </section>
          </div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={openDialog === "model-modal"} onOpenChange={(open) => setOpenDialog(open ? "model-modal" : null)}>
        <DialogContent id="model-modal">
          <DialogHeader><DialogTitle className="modal-title" data-i18n="addModelTitle">Add model</DialogTitle></DialogHeader>
          <form id="model-form"><FieldGroup>
            <Field><Label htmlFor="model-provider" data-i18n="provider">Provider</Label><NativeSelect id="model-provider" name="providerId"><NativeSelectOption value="">Select a provider</NativeSelectOption></NativeSelect></Field>
            <div className="model-selection-container hidden"><div id="model-selection-radios" className="radio-container" /></div>
            <Field><Label htmlFor="model-name" data-i18n="modelName">Display name</Label><Input id="model-name" name="name" placeholder="Model name" required /></Field>
            <Field className="setting-item"><FieldContent><Label htmlFor="provider-model-id" data-i18n="providerModelId">Model ID</Label><FieldDescription /></FieldContent><Input id="provider-model-id" name="providerModelId" placeholder="Model ID" required /></Field>
          </FieldGroup></form>
          <DialogFooter><Button type="button" variant="outline" className="model-cancel-btn" data-i18n="cancel">Cancel</Button><Button type="button" className="model-confirm-btn" data-i18n="save">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "provider-modal"} onOpenChange={(open) => setOpenDialog(open ? "provider-modal" : null)}>
        <DialogContent id="provider-modal">
          <DialogHeader><DialogTitle className="modal-title" data-i18n="addProviderTitle">Add provider</DialogTitle></DialogHeader>
          <form id="provider-form"><FieldGroup>
            <Field><Label htmlFor="provider-preset" data-i18n="provider">Provider</Label><NativeSelect id="provider-preset" name="preset"><NativeSelectOption value="">Custom</NativeSelectOption></NativeSelect></Field>
            <Field><Label htmlFor="provider-name" data-i18n="providerName">Provider name</Label><Input id="provider-name" name="name" placeholder="Provider name" required /></Field>
            <Field><Label htmlFor="provider-base-url" data-i18n="providerBaseUrl">Base URL</Label><Input id="provider-base-url" name="baseUrl" placeholder="Base URL" required /></Field>
            <Field className="setting-item"><FieldContent><Label htmlFor="provider-api-key" data-i18n="providerApiKey">API key</Label><FieldDescription /></FieldContent><Input id="provider-api-key" name="apiKey" placeholder="API key" /></Field>
          </FieldGroup></form>
          <DialogFooter><Button type="button" variant="outline" className="provider-cancel-btn" data-i18n="cancel">Cancel</Button><Button type="button" className="provider-confirm-btn" data-i18n="save">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "import-modal"} onOpenChange={(open) => setOpenDialog(open ? "import-modal" : null)}>
        <DialogContent id="import-modal">
          <DialogHeader><DialogTitle className="modal-title" data-i18n="importModalTitle">Import</DialogTitle></DialogHeader>
          <FieldGroup>
            <Button type="button" variant="outline" className="import-drop-zone h-auto border-dashed py-8"><p data-i18n="dragAndDropFile">Drag and drop file here</p></Button>
            <FieldDescription className="import-or-text">Or paste below</FieldDescription>
            <Textarea id="import-json-textarea" className="import-json-textarea font-mono" rows={8} />
          </FieldGroup>
          <DialogFooter><Button type="button" variant="outline" className="import-cancel-btn" data-i18n="cancel">Cancel</Button><Button type="button" className="import-confirm-btn" data-i18n="import">Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "feedback-modal"} onOpenChange={(open) => setOpenDialog(open ? "feedback-modal" : null)}>
        <DialogContent id="feedback-modal">
          <DialogHeader><DialogTitle data-i18n="feedbackTitle">Thanks for your feedback</DialogTitle><DialogDescription data-i18n="feedbackDescription">Visit the help page to report bugs or suggest features.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="outline" className="feedback-close-btn" data-i18n="close">Close</Button><a className={buttonVariants()} href="https://docs.aria.bot/troubleshoot" target="_blank" data-i18n="help">Help</a></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function mountSettingsShell() {
  const root = document.getElementById("settings-root")
  if (!root) throw new Error("Settings root was not found")
  flushSync(() => createRoot(root).render(<SettingsShell />))
}
