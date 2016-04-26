const { basename, extname, join } = require( 'path' );
const sander = require( 'sander' );
const mapSeries = require( 'promise-map-series' );
const minimatch = require( 'minimatch' );
const { encode } = require( 'vlq' );

const getSourcemapComment = {
	'.js': file => `//# sourceMappingURL=${file}.map`,
	'.css': file => `/*# sourceMappingURL=${file}.map */`
};

module.exports = function concat ( inputdir, outputdir, options ) {
	if ( !options.dest ) throw new Error( `You must pass a 'dest' option to gobble-concat` );

	const ext = extname( options.dest );

	const shouldCreateSourcemap = ( ext in getSourcemapComment ) && options.sourceMap !== false;
	const separator = options.separator || '\n\n';
	const separatorSemis = separator.split( '\n' ).join( ';' )

	return sander.lsr( inputdir ).then( allFiles => {
		let patterns = options.files;
		let alreadySeen = {};
		let fileContents = [];

		let sourceMap = shouldCreateSourcemap ? {
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

		return mapSeries( patterns, pattern => {
			let filtered = allFiles.filter( filename => {
				const shouldInclude = !alreadySeen[ filename ] && minimatch( filename, pattern );

				if ( shouldInclude ) alreadySeen[ filename ] = true;
				return shouldInclude;
			});

			return processFiles( filtered.sort( options.sort ) );
		}).then( writeResult );

		function processFiles ( filenames ) {
			let sourceIndexOffset = 0;
			let sourceLineOffset = 0;
			let sourceColumnOffset = 0;

			let lineCount = 0;

			return mapSeries( filenames.sort( options.sort ), filename => {
				return sander.readFile( inputdir, filename, { encoding: 'utf-8' }).then( contents => {
					if ( sourceMap ) {
						sourceMap.sources.push( join( inputdir, filename ) );
						sourceMap.sourcesContent.push( contents );

						contents = contents.replace( /^(?:\/\/[@#]\s*sourceMappingURL=(\S+)|\/\*#?\s*sourceMappingURL=(\S+)\s?\*\/)$/gm, '' );
						const lines = contents.split( '\n' );

						const encoded = lines
							.map( line => {
								let encodedLine = '';

								if ( line.length ) {
									encodedLine += encode([ 0, sourceIndexOffset, sourceLineOffset, sourceColumnOffset ]);

									for ( let i = 1; i <= line.length; i += 1 ) {
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
			let code = fileContents.join( separator );

			if ( shouldCreateSourcemap ) {
				const comment = getSourcemapComment[ ext ]( basename( options.dest ) );

				code += `\n${comment}`;

				return sander.Promise.all([
					sander.writeFile( outputdir, options.dest, code ),
					sander.writeFile( outputdir, options.dest + '.map', JSON.stringify( sourceMap, null, '  ' ) )
				]);
			}

			return sander.writeFile( outputdir, options.dest, code );
		}
	});
};
