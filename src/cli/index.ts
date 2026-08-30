#!/usr/bin/env bun

import { installDom } from './dom.js';
import { loadEnv } from '../platform/node/env.js';

loadEnv();
installDom();

void import('./main.js').then(({ main }) => main()).then(code => {
	process.exitCode = code;
});
