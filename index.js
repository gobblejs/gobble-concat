var sander = require( 'sander' ),
    path = require( 'path' ),
    mapSeries = require( 'promise-map-series' ),
    minimatch = require( 'minimatch' );
var SourceNode = require( 'source-map' ).SourceNode;
var SourceMapConsumer = require( 'source-map' ).SourceMapConsumer;

var sourceMapRegExp = new RegExp(/(?:\/\/#|\/\/@|\/\*#)\s*sourceMappingURL=(.*?)\s*(?:\*\/\s*)?$/);
var extensionsRegExp = new RegExp(/(\.js|\.css)$/);

module.exports = function concat ( inputdir, outputdir, options ) {

	if ( !options.dest ) {
		throw new Error( 'You must pass a \'dest\' option to gobble-concat' );
	}

	if ( options.writeSourcemap === undefined ) {
		options.writeSourcemap = !!options.dest.match( extensionsRegExp );
	}

	return sander.lsr( inputdir ).then( function ( allFiles ) {
		var patterns = options.files,
			alreadySeen = {},
			nodes = [];

		if ( !patterns ) {
			// use all files
			return processFiles( allFiles.sort( options.sort ) ).then( writeResult );
		}

		if ( typeof patterns === 'string' ) {
			patterns = [ patterns ];
		}

		return mapSeries( patterns, function ( pattern ) {
			var filtered = allFiles.filter( function ( filename ) {
				var shouldInclude = !alreadySeen[ filename ] && minimatch( filename, pattern );

				if ( shouldInclude ) {
					alreadySeen[ filename ] = true;
				}

				return shouldInclude;
			});

			return processFiles( filtered.sort( options.sort ) );
		}).then( writeResult );


		function processFiles ( filenames ) {
			return mapSeries( filenames.sort( options.sort ), function ( filename ) {
				return sander.readFile( inputdir, filename ).then( function ( fileContents ) {

					/// Run a regexp against the code to check for source mappings.
					var match = sourceMapRegExp.exec(fileContents);

					if (!match) {
// 						if (options.verbose)	console.log('Creating ident sourcemap for ', filename);
						var newNode = new SourceNode(1, 1, filename, fileContents.toString());
						newNode.setSourceContent(filename, fileContents.toString());
						nodes.push( newNode );
					} else {
						var sourcemapFilename = match[1];

						return sander.readFile( inputdir, path.dirname(filename), sourcemapFilename ).then( function ( mapContents ) {
							// Sourcemap exists
							var parsedMap = new SourceMapConsumer( mapContents.toString() );
							nodes.push( SourceNode.fromStringWithSourceMap( fileContents.toString(), parsedMap ) );
// 							if (options.verbose) console.log('Loaded sourcemap for ', filename + ': ' + sourcemapFilename + "(" + mapContents.length + " bytes)");
						}, function(err) {
							throw new Error('File ' + inputdir + ' / ' + filename + ' refers to a non-existing sourcemap at ' + sourcemapFilename + ' ' + err);
						});
					}
				});
			});
		}

		function writeResult () {
			if (!nodes[0]) {
				// Degenerate case: no matched files
				return sander.writeFile( outputdir, options.dest, '' );
			}

			var dest = new SourceNode(null, null, null, '');

			if ( options.banner ) {
				dest.add( new SourceNode(null, null, null, options.banner) );
			}

			var separatorNode = new SourceNode(null, null, null, options.separator || '\n\n');

			dest.add(nodes[0]);

			for (var i=1; i<nodes.length; i++) {
				dest.add(separatorNode);
				dest.add(nodes[i]);
			}
			var generated = dest.toStringWithSourceMap();

			if ( options.writeSourcemap ) {
				var sourceMapLocation = '\n\n//# sourceMappingURL=' + path.join(outputdir, options.dest + '.map') + '\n'

				return sander.Promise.all([
					sander.writeFile( outputdir, options.dest, generated.code + sourceMapLocation ),
					sander.writeFile( outputdir, options.dest + '.map', generated.map.toString() )
				]);
			} else {
				return sander.writeFile( outputdir, options.dest, generated.code);
			}

		}
	});
};
