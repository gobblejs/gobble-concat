module.exports = function concat ( inputDir, outputDir, options, done ) {
	var gobble = require( 'gobble' );

	if ( !options.dest ) {
		throw new Error( 'You must pass a \'dest\' option to gobble-concat' );
	}

	gobble.file.ls( inputDir ).then( function ( allFiles ) {
		var mapSeries = require( 'promise-map-series' ),
			minimatch = require( 'minimatch' ),
			patterns = options.files,
			alreadySeen = {},
			fileContents = [],
			writeResult;

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
				alreadySeen[ filename ] = true;

				return shouldInclude;
			});

			return processFiles( filtered.sort( options.sort ) );
		}).then( writeResult );

		function processFiles ( filenames ) {
			return mapSeries( filenames.sort( options.sort ), function ( filename ) {
				return gobble.file.read( inputDir, filename ).then( function ( contents ) {
					fileContents.push( contents.toString() );
				});
			});
		}

		function writeResult () {
			return gobble.file.write( outputDir, options.dest, fileContents.join( options.separator || '\n\n' ) );
		}
	}).then( done, done );
};
