module.exports = function concat ( inputdir, outputdir, options, callback, errback ) {
	var sander = require( 'sander' );

	if ( !options.dest ) {
		throw new Error( 'You must pass a \'dest\' option to gobble-concat' );
	}

	sander.lsr( inputdir ).then( function ( allFiles ) {
		var mapSeries = require( 'promise-map-series' ),
			minimatch = require( 'minimatch' ),
			patterns = options.files,
			alreadySeen = {},
			fileContents = [];

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
				return sander.readFile( inputdir, filename ).then( function ( contents ) {
					fileContents.push( contents.toString() );
				});
			});
		}

		function writeResult () {
			return sander.writeFile( outputdir, options.dest, fileContents.join( options.separator || '\n\n' ) );
		}
	}).then( callback, errback );
};
