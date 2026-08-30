const path = require('path');
const fs = require('fs');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const packageJson = require('./package.json');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

// Remove .DS_Store files
function removeDSStore(dir) {
	const files = fs.readdirSync(dir);
	files.forEach(file => {
		const filePath = path.join(dir, file);
		if (fs.statSync(filePath).isDirectory()) {
			removeDSStore(filePath);
		} else if (file === '.DS_Store') {
			fs.unlinkSync(filePath);
		}
	});
}

function buildManifest(content) {
	const manifest = JSON.parse(content.toString());

	if ('version' in manifest) {
		throw new Error('Source manifests must not declare a version. Set it once in package.json.');
	}

	if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
		throw new Error(`package.json version must use numeric X.Y.Z format: ${packageJson.version}`);
	}

	manifest.version = packageJson.version;
	return `${JSON.stringify(manifest, null, '\t')}\n`;
}

module.exports = (env, argv) => {
	const isFirefox = env.BROWSER === 'firefox';
	const isSafari = env.BROWSER === 'safari';
	const isProduction = argv.mode === 'production';
	const browserName = isFirefox ? 'firefox' : (isSafari ? 'safari' : 'chrome');
	const outputDir = path.join(isProduction ? 'dist' : 'dev', browserName);

	const mainConfig = {
		mode: argv.mode,
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
			'reader-script': './src/entrypoints/reader-script.ts'
		},
		output: {
			path: path.resolve(__dirname, outputDir),
			filename: '[name].js',
			assetModuleFilename: 'fonts/[hash][ext][query]',
			module: false,
			clean: true,
		},
		devtool: isProduction ? false : 'source-map',
		optimization: {
			minimize: true,
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						mangle: false,
						compress: {
							defaults: true,
							global_defs: {
								DEBUG_MODE: !isProduction
							},
							unused: true,
							dead_code: true,
							passes: 2,
							ecma: 2020,
							module: false
						},
						format: {
							ascii_only: true,
							comments: false,
							ecma: 2020
						},
						module: false,
						toplevel: true,
						keep_classnames: true,
						keep_fnames: true
					},
					extractComments: false
				})
			],
			moduleIds: 'named',
			chunkIds: 'named'
		},
		experiments: {
			outputModule: false,
		},
			resolve: {
				extensions: ['.tsx', '.ts', '.jsx', '.js'],
				extensionAlias: {
					'.js': ['.tsx', '.ts', '.js']
				},
				alias: {
					'@': path.resolve(__dirname, 'src'),
				'../platform/browser/browser-polyfill.js$': path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'../../platform/browser/browser-polyfill.js$': path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'../../../platform/browser/browser-polyfill.js$': path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'./browser-polyfill.js$': path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'),
				'../browser-polyfill.js$': path.resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js')
			}
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: 'esbuild-loader',
					options: {
						target: 'esnext',
						jsx: 'automatic'
					},
					exclude: /node_modules/,
				},
				{
					test: /\.css$/,
					use: [
						MiniCssExtractPlugin.loader,
						{
							loader: 'css-loader',
							options: {
								sourceMap: !isProduction
							}
						},
						{
							loader: 'postcss-loader',
							options: {
								sourceMap: !isProduction,
								postcssOptions: {
									plugins: ['@tailwindcss/postcss']
								}
							}
						}
					]
				}
			]
		},
		plugins: [
			new CopyPlugin({
				patterns: [
					{
						from: isFirefox ? "src/manifests/firefox.json" :
							(isSafari ? "src/manifests/safari.json" : "src/manifests/chrome.json"),
						to: "manifest.json",
						transform: buildManifest
					},
					{ from: "src/pages/popup.html", to: "popup.html" },
					{ from: "src/pages/side-panel.html", to: "side-panel.html" },
					{ from: "src/pages/settings.html", to: "settings.html" },
					{ from: "src/pages/highlights.html", to: "highlights.html" },
					{ from: "src/pages/reader.html", to: "reader.html" },
					{
						from: "src/icons",
						to: "icons",
						globOptions: { ignore: ["**/*.ts", "**/.DS_Store"] }
					},
					{ from: "node_modules/webextension-polyfill/dist/browser-polyfill.min.js", to: "browser-polyfill.min.js" },
					{
						from: 'src/_locales',
						to: '_locales',
						globOptions: { ignore: ['**/.DS_Store'] }
					}
				],
			}),
			new MiniCssExtractPlugin({
				filename: '[name].css'
			}),
			{
				apply: (compiler) => {
					compiler.hooks.afterEmit.tap('RemoveDSStore', (compilation) => {
						removeDSStore(path.resolve(__dirname, outputDir));
					});
				}
			},
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(argv.mode),
				'DEBUG_MODE': JSON.stringify(!isProduction),
				'BUILD_BROWSER': JSON.stringify(browserName)
			}),
			...(isProduction ? [
				new ZipPlugin({
					path: path.resolve(__dirname, 'builds'),
					filename: `aria-clip-${packageJson.version}-${browserName}.zip`,
				})
			] : [])
		]
	};

	return [mainConfig];
};
