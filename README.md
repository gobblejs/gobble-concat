# gobble-concat

Concatenate files with gobble.

## Installation

First, you need to have gobble installed - see the [gobble readme](https://github.com/gobblejs/gobble) for details. Then,

```bash
npm i -D gobble-concat
```

## Usage

**gobblefile.js**

```js
var gobble = require( 'gobble' );
module.exports = gobble( 'js' ).transform( 'concat', { dest: 'bundle.js' });
```

The `dest` option is required. Other options - `files`, `separator` and `writeSourcemap`, explained below - are optional.

### `files`

You can specify which files are included, and their order, like so:

```js
var gobble = require( 'gobble' );
module.exports = gobble( 'js' )
  .transform( 'concat', {
    dest: 'bundle.js',
    files: [ 'foo.js', 'bar.js', 'baz.js' ]
  });
```

The `files` option can be a [minimatch](https://github.com/isaacs/minimatch) pattern:

```js
var gobble = require( 'gobble' );
module.exports = gobble( 'js' )
  .transform( 'concat', {
    dest: 'bundle.js',
    files: [ 'vendor/**/*.js', 'src/**/*.js' ]
  });
```

If a file matches more than one minimatch pattern, only its first appearance is taken into account. The order of the patterns will decide the order of the files (in the previous example, all the `vendor/` files will appear before any `src` files).

### `separator`

By default, files will be separated by newlines. You can change this to be any string:

```js
var gobble = require( 'gobble' );
module.exports = gobble( 'js' )
  .transform( 'concat', {
    dest: 'bundle.js',
    separator: '/* YOLO */'
  });
```

### `writeSourcemap`

Concatenating javascript or CSS files requires some extra handling of their sourcemaps, specially in complex workflows. With this option set to `true`, the sourcemaps of the files to be concatenated will be parsed, files with no sourcemap will be assigned an identity (1:1) sourcemap, and a new sourcemap will be generated from all of them.

The default value is `true` when `dest` is a file with a `.js` or `.css` extension, and `false` otherwise.


## License

MIT. Copyright 2014 Rich Harris

---

"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.

---
