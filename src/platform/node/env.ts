import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';

export function ariaHome(): string {
	return resolve(process.env.ARIA_HOME ?? join(homedir(), '.aria'));
}

export function envPath(): string {
	return join(ariaHome(), '.env');
}

export function loadEnv(): string {
	const path = envPath();
	if (!existsSync(path)) return path;
	const values = parse(readFileSync(path));
	for (const [name, value] of Object.entries(values)) {
		if (process.env[name] === undefined) process.env[name] = value;
	}
	return path;
}
