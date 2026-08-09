import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run commands from the project root
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
	// Remove defuddle module and reinstall dependencies
	rmSync(join(projectRoot, 'node_modules', 'defuddle'), { force: true, recursive: true });
	execSync('bun install', {
		stdio: 'inherit',
		cwd: projectRoot
	});
} catch (error) {
	console.error('Failed to update defuddle:', error);
	process.exit(1);
}
