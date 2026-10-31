import { createHash } from 'node:crypto';
import { expect, test } from 'bun:test';
import manifest from './chrome.json' with { type: 'json' };

test('unpacked Chrome builds use the store extension ID admitted by Aria DeepLink', () => {
	const id = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex')
		.slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
	expect(id).toBe('domljlnekkjgagdpeaafaoojdkkhfgff');
});
