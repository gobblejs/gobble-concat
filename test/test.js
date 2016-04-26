const assert = require( 'assert' );
const { extname, resolve } = require( 'path' );
const { lsrSync, mkdir, mkdirSync, readdirSync, readFileSync, rimraf } = require( 'sander' );
const { describe, it, afterEach } = require( 'mocha' );
const glob = require( 'glob' );
const concat = require( '..' );

const TMP = resolve( __dirname, 'tmp' );

describe( 'gobble-concat', () => {
	const TESTS = resolve( __dirname, 'tests' );

	readdirSync( TESTS ).forEach( dir => {
		if ( dir[0] === '.' ) return;

		const input = resolve( TESTS, dir, 'input' );
		const expected = resolve( TESTS, dir, 'expected' );
		const output = resolve( TESTS, dir, 'output' );

		it( dir, () => {
			const options = require( resolve( TESTS, dir, 'options.js' ) );

			mkdirSync( output );

			function catalogue ( x ) {
				return glob.sync( '**', { cwd: x })
					.map( file => {
						let contents = readFileSync( TESTS, dir, x, file, { encoding: 'utf-8' }).trim();

						if ( extname( file ) === '.map' ) {
							contents = JSON.parse( contents );

							if ( contents.sources ) {
								contents.sources = contents.sources.map( source => resolve( dir, x, source ) );
							}
						}

						return { file, contents };
					});
			}

			return concat( input, output, options )
				.then( () => {
					assert.deepEqual(
						catalogue( output ),
						catalogue( expected )
					);
				});
		});
	});
});
