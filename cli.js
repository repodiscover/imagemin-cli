#!/usr/bin/env node
'use strict';
const arrify = require('arrify');
const meow = require('meow');
const getStdin = require('get-stdin');
const imagemin = require('imagemin');
const stripIndent = require('strip-indent');

const cli = meow(`
	Usage
	  $ imagemin <path|glob> ... --out-dir=build [--plugin=<name> ...]
	  $ imagemin <file> > <output>
	  $ cat <file> | imagemin > <output>

	Options
	  -p, --plugin   Override the default plugins
	  -o, --out-dir  Output directory

	Examples
	  $ imagemin images/* --out-dir=build
	  $ imagemin foo.png > foo-optimized.png
	  $ cat foo.png | imagemin > foo-optimized.png
	  $ imagemin --plugin=pngquant foo.png > foo-optimized.png
`, {
	string: [
		'plugin',
		'out-dir'
	],
	alias: {
		p: 'plugin',
		o: 'out-dir'
	}
});

const DEFAULT_PLUGINS = [
	'gifsicle',
	'jpegtran',
	'optipng',
	'svgo'
];

const requirePlugins = plugins => plugins.map(x => {
	try {
		x = require(`imagemin-${x}`)();
	} catch (err) {
		console.error(stripIndent(`
			Unknown plugin: ${x}

			Did you forgot to install the plugin?
			You can install it with:

			  $ npm install -g imagemin-${x}
		`).trim());
		process.exit(1);
	}

	return x;
});

const run = (input, opts) => {
	opts = Object.assign({plugin: DEFAULT_PLUGINS}, opts);

	const use = requirePlugins(arrify(opts.plugin));

	if (Buffer.isBuffer(input)) {
		imagemin.buffer(input, {use}).then(buf => process.stdout.write(buf));
		return;
	}

	imagemin(input, opts.outDir, {use}).then(files => {
		if (!opts.outDir) {
			files.forEach(x => process.stdout.write(x.data));
		}
	});
};

if (!cli.input.length && process.stdin.isTTY) {
	console.error('Specify at least one filename');
	process.exit(1);
}

if (cli.input.length) {
	run(cli.input, cli.flags);
} else {
	getStdin.buffer().then(buf => run(buf, cli.flags));
}
