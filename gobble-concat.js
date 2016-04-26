// 🦃namespace concat
// Concatenates some files into one file.

var sander = require( 'sander' ),
    sandermatch = require( 'sandermatch' ),
    path = require( 'path' ),
    mapSeries = require( 'promise-map-series' ),
    getSourceNode = require( './get-source-node' );
var SourceNode = require('source-map').SourceNode;

var extensionsRegExp = new RegExp(/(\.js|\.css)$/);


module.exports = function concat ( inputdir, outputdir, options ) {

	// 🦃option dest: String; The destination filename where everything will be concatenated to. Required.
	if ( !options.dest ) {
		throw new Error( 'You must pass a \'dest\' option to gobble-concat' );
	}

	// 🦃option writeSourcemap: Boolean; By default, sourcemaps are handled if the destination filename ends in `*.js` or `*.css`. Set this option to override that.
	if ( options.writeSourcemap === undefined ) {
		options.writeSourcemap = !!options.dest.match( extensionsRegExp );
	}

	// 🦃option files: Minimatch; A Minimatch expression (or an array of Minimatch expressions) matching the files to be concatenated.
	return sandermatch.lsrMatch( inputdir, options.files ).then( function ( filenames ) {
		var nodes = [];
		function getSourceNodes ( filenames ) {
			var nodes = [];

			var nodePromises = [];
			filenames.forEach(function (filename) {
				nodePromises.push(getSourceNode( inputdir, filename ));
			});
			return Promise.all(nodePromises);
		}

		function writeResult (nodes) {
			if (!nodes[0]) {
				// Degenerate case: no matched files
				return sander.writeFile( outputdir, options.dest, '' );
			}

			// 🦃option separator: String='\n\n'; The string which will be added between files.
			var separatorNode = new SourceNode(null, null, null, options.separator || '\n\n');

			var dest = new SourceNode(null, null, null, '');
			dest.add(nodes[0]);

			for (var i=1; i<nodes.length; i++) {
				dest.add(separatorNode);
				dest.add(nodes[i]);
			}
			var generated = dest.toStringWithSourceMap();

			if ( options.writeSourcemap ) {
				var sourceMapLocation;
				if (options.dest.match(/\.css$/)) {
					sourceMapLocation = '\n\n/*# sourceMappingURL=' + path.join(outputdir, options.dest + '.map') + ' */\n';
				} else {
					sourceMapLocation = '\n\n//# sourceMappingURL=' + path.join(outputdir, options.dest + '.map') + '\n'
				}
				return sander.Promise.all([
					sander.writeFile( outputdir, options.dest, generated.code + sourceMapLocation ),
					sander.writeFile( outputdir, options.dest + '.map', generated.map.toString() )
				]);
			} else {
				return sander.writeFile( outputdir, options.dest, generated.code);
			}
		}

		return getSourceNodes(filenames).then(writeResult);
	});
};
