import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack, { type Compiler, type Configuration } from 'webpack';
import ZipPlugin from 'zip-webpack-plugin';
import { z } from 'zod';
import data from './package.json' with { type: 'json' };

const PackageSchema = z.strictObject({
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
}).passthrough();

const BrowserSchema = z.enum(['chrome', 'firefox', 'safari']);
const ModeSchema = z.enum(['development', 'production']);

type Browser = z.infer<typeof BrowserSchema>;
type Mode = z.infer<typeof ModeSchema>;

interface Env {
	BROWSER?: string;
}

interface Args {
	mode?: string;
}

const pkg = PackageSchema.parse(data);
const root = import.meta.dir;

function clean(dir: string): void {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) clean(path);
		else if (name === '.DS_Store') unlinkSync(path);
	}
}

function manifest(content: Buffer): string {
	const value = z.record(z.string(), z.json()).parse(JSON.parse(content.toString()));
	if ('version' in value) {
		throw new Error('Source manifests must not declare a version. Set it once in package.json.');
	}
	return `${JSON.stringify({ ...value, version: pkg.version }, null, '\t')}\n`;
}

function browser(env: Env): Browser {
	return BrowserSchema.parse(env.BROWSER ?? 'chrome');
}

function mode(args: Args): Mode {
	return ModeSchema.parse(args.mode ?? 'development');
}

function debris(dir: string): { apply(compiler: Compiler): void } {
	return {
		apply(compiler): void {
			compiler.hooks.afterEmit.tap('RemoveDSStore', () => clean(dir));
		},
	};
}

export default function config(env: Env = {}, args: Args = {}): Configuration[] {
	const target = browser(env);
	const buildMode = mode(args);
	const production = buildMode === 'production';
	const output = resolve(root, production ? 'dist' : 'dev', target);
	const sourceManifest = target === 'firefox'
		? 'src/manifests/firefox.json'
		: target === 'safari'
			? 'src/manifests/safari.json'
			: 'src/manifests/chrome.json';

	const result: Configuration = {
		mode: buildMode,
		entry: {
			popup: './src/entrypoints/popup.ts',
			settings: './src/entrypoints/settings.ts',
			highlights: './src/entrypoints/highlights.ts',
			'reader-page': './src/entrypoints/reader-page.ts',
			content: './src/entrypoints/content.ts',
			'flatten-shadow-dom': './src/entrypoints/flatten-shadow-dom.ts',
			background: './src/entrypoints/background.ts',
			style: './src/styles/app.css',
			highlighter: './src/styles/highlighter.css',
			reader: './src/styles/reader.css',
			'reader-script': './src/entrypoints/reader-script.ts',
		},
		output: {
			path: output,
			filename: '[name].js',
			assetModuleFilename: 'fonts/[hash][ext][query]',
			module: false,
			clean: true,
		},
		devtool: production ? false : 'source-map',
		optimization: {
			minimize: true,
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						mangle: false,
						compress: {
							defaults: true,
							global_defs: { DEBUG_MODE: !production },
							unused: true,
							dead_code: true,
							passes: 2,
							ecma: 2020,
							module: false,
						},
						format: {
							ascii_only: true,
							comments: false,
							ecma: 2020,
						},
						module: false,
						toplevel: true,
						keep_classnames: true,
						keep_fnames: true,
					},
					extractComments: false,
				}),
			],
			moduleIds: 'named',
			chunkIds: 'named',
		},
		experiments: { outputModule: false },
		resolve: {
			extensions: ['.tsx', '.ts', '.jsx', '.js'],
			extensionAlias: { '.js': ['.tsx', '.ts', '.js'] },
			alias: {
				'@': resolve(root, 'src'),
				'../platform/browser/browser-polyfill.js$': resolve(root, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'../../platform/browser/browser-polyfill.js$': resolve(root, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'../../../platform/browser/browser-polyfill.js$': resolve(root, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'./browser-polyfill.js$': resolve(root, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'../browser-polyfill.js$': resolve(root, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
			},
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: 'esbuild-loader',
					options: { target: 'esnext', jsx: 'automatic' },
					exclude: /node_modules/,
				},
				{
					test: /\.css$/,
					use: [
						MiniCssExtractPlugin.loader,
						{ loader: 'css-loader', options: { sourceMap: !production } },
						{
							loader: 'postcss-loader',
							options: {
								sourceMap: !production,
								postcssOptions: { plugins: ['@tailwindcss/postcss'] },
							},
						},
					],
				},
			],
		},
		plugins: [
			new CopyPlugin({
				patterns: [
					{ from: sourceManifest, to: 'manifest.json', transform: manifest },
					{ from: 'providers.json', to: 'providers.json' },
					{ from: 'src/pages/popup.html', to: 'popup.html' },
					{ from: 'src/pages/side-panel.html', to: 'side-panel.html' },
					{ from: 'src/pages/settings.html', to: 'settings.html' },
					{ from: 'src/pages/highlights.html', to: 'highlights.html' },
					{ from: 'src/pages/reader.html', to: 'reader.html' },
					{ from: 'src/icons', to: 'icons', globOptions: { ignore: ['**/*.ts', '**/.DS_Store'] } },
					{ from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js', to: 'browser-polyfill.min.js' },
					{ from: 'src/_locales', to: '_locales', globOptions: { ignore: ['**/.DS_Store'] } },
				],
			}),
			new MiniCssExtractPlugin({ filename: '[name].css' }),
			debris(output),
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(buildMode),
				'DEBUG_MODE': JSON.stringify(!production),
				'BUILD_BROWSER': JSON.stringify(target),
			}),
			...(production
				? [new ZipPlugin({
					path: resolve(root, 'builds'),
					filename: `aria-clip-${pkg.version}-${target}.zip`,
				})]
				: []),
		],
	};

	return [result];
}
