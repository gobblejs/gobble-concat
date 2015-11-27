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

The `dest` property is required. Other values - `files`, `sort`, `separator` and `writeSourcemap`, explained below - are optional.

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

### `sort`

Within each pattern, if multiple files are found, they will be sorted alphabetically by default. You can override this by passing a `sort` option, which is a standard [compare function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)].

If files match multiple patterns, they will only be included once (upon the first match).

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
