import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Read the package.json
const packageJsonPath = join(projectRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Update the defuddle dependency to use local version
packageJson.dependencies.defuddle = 'file:../defuddle';

// Write the updated package.json
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, '\t')}\n`);

// Run bun install to update the dependency
try {
	execSync('bun install', { stdio: 'inherit', cwd: projectRoot });
} catch (error) {
	console.error('Failed to install dependencies:', error);
	process.exit(1);
}
