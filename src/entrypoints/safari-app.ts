interface SafariBridge {
	messageHandlers: {
		controller: {
			postMessage(message: 'open-preferences'): void;
		};
	};
}

declare const webkit: SafariBridge;

type Platform = 'ios' | 'mac';

function first(selector: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(selector);
}

function text(selector: string, value: string): void {
	const element = first(selector);
	if (element) element.innerText = value;
}

function show(platform: Platform, enabled: boolean | null, useSettings: boolean): void {
	document.body.classList.add(`platform-${platform}`);

	if (useSettings) {
		text('.platform-mac.state-on', 'Aria Clip is currently on. You can turn it off in the Extensions section of Safari Settings.');
		text('.platform-mac.state-off', 'Aria Clip is currently off. You can turn it on in the Extensions section of Safari Settings.');
		text('.platform-mac.state-unknown', 'You can turn on Aria Clip in the Extensions section of Safari Settings.');
		text('.platform-mac.open-preferences', 'Close and Open Safari Settings…');
	}

	if (typeof enabled === 'boolean') {
		document.body.classList.toggle('state-on', enabled);
		document.body.classList.toggle('state-off', !enabled);
	} else {
		document.body.classList.remove('state-on', 'state-off');
	}
}

function openPreferences(): void {
	webkit.messageHandlers.controller.postMessage('open-preferences');
}

first('button.open-preferences')?.addEventListener('click', openPreferences);

Object.assign(globalThis, { show });
