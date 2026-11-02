import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { filesBelow } from './release.js';

test('Safari resource inventory ignores Finder metadata recreated after the build', () => {
	const root = mkdtempSync(join(tmpdir(), 'aria-clip-resources-'));
	try {
		mkdirSync(join(root, 'icons'));
		for (const path of ['manifest.json', 'icons/icon.png', '.required']) {
			writeFileSync(join(root, path), 'resource');
		}
		const before = filesBelow(root).sort();
		writeFileSync(join(root, '.DS_Store'), 'Finder metadata');
		writeFileSync(join(root, 'icons', '.DS_Store'), 'Finder metadata');
		expect(filesBelow(root).sort()).toEqual(before);
		expect(before).toEqual(['.required', 'icons/icon.png', 'manifest.json']);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

