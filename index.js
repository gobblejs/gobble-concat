var ref = require( 'path' ), basename = ref.basename, extname = ref.extname, join = ref.join;
var sander = require( 'sander' );
var mapSeries = require( 'promise-map-series' );
var minimatch = require( 'minimatch' );
var ref$1 = require( 'vlq' ), encode = ref$1.encode;

var getSourcemapComment = {
	'.js': function ( file ) { return ("//# sourceMappingURL=" + file + ".map"); },
	'.css': function ( file ) { return ("/*# sourceMappingURL=" + file + ".map */"); }
};

module.exports = function concat ( inputdir, outputdir, options ) {
	if ( !options.dest ) throw new Error( ("You must pass a 'dest' option to gobble-concat") );

	var ext = extname( options.dest );

	var shouldCreateSourcemap = ( ext in getSourcemapComment ) && options.sourceMap !== false;
	var separator = options.separator || '\n\n';
	var separatorSemis = separator.split( '\n' ).join( ';' )

	return sander.lsr( inputdir ).then( function ( allFiles ) {
		var patterns = options.files;
		var alreadySeen = {};
		var fileContents = [];

		var sourceMap = shouldCreateSourcemap ? {
			version: 3,
			file: basename( options.dest ),
			sources: [],
			sourcesContent: [],
			mappings: ''
		} : null;

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

				if ( shouldInclude ) alreadySeen[ filename ] = true;
				return shouldInclude;
			});

			return processFiles( filtered.sort( options.sort ) );
		}).then( writeResult );

		function processFiles ( filenames ) {
			var sourceIndexOffset = 0;
			var sourceLineOffset = 0;
			var sourceColumnOffset = 0;

			var lineCount = 0;

			return mapSeries( filenames.sort( options.sort ), function ( filename ) {
				return sander.readFile( inputdir, filename, { encoding: 'utf-8' }).then( function ( contents ) {
					if ( sourceMap ) {
						sourceMap.sources.push( join( inputdir, filename ) );
						sourceMap.sourcesContent.push( contents );

						contents = contents.replace( /^(?:\/\/[@#]\s*sourceMappingURL=(\S+)|\/\*#?\s*sourceMappingURL=(\S+)\s?\*\/)$/gm, '' );
						var lines = contents.split( '\n' );

						var encoded = lines
							.map( function ( line ) {
								var encodedLine = '';

								if ( line.length ) {
									encodedLine += encode([ 0, sourceIndexOffset, sourceLineOffset, sourceColumnOffset ]);

									for ( var i = 1; i <= line.length; i += 1 ) {
										encodedLine += ',CAAC'; // equivalent to encode([ 1, 0, 0, 1 ])
									}

									sourceLineOffset = 1;
									sourceIndexOffset = 0;
									sourceColumnOffset = -( line.length );

									lineCount += 1;
								}

								return encodedLine;
							})
							.join( ';' );

						sourceLineOffset = -lineCount;
						lineCount = 0;

						sourceMap.mappings += encoded + separatorSemis;
					}

					fileContents.push( contents );

					sourceIndexOffset = 1;
				});
			});
		}

		function writeResult () {
			var code = fileContents.join( separator );

			if ( shouldCreateSourcemap ) {
				var comment = getSourcemapComment[ ext ]( basename( options.dest ) );

				code += "\n" + comment;

				return sander.Promise.all([
					sander.writeFile( outputdir, options.dest, code ),
					sander.writeFile( outputdir, options.dest + '.map', JSON.stringify( sourceMap, null, '  ' ) )
				]);
			}

			return sander.writeFile( outputdir, options.dest, code );
		}
	});
};
