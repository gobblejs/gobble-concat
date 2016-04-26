
// Given a file name, reads it, checks it if has a sourcemap attached, then either:
// - Creates an identity sourcemap if it doesn't exist,
// - Reads the file with the sourcemap, or
// - Decodes an embedded base64 sourcemap


var SourceNode = require('source-map').SourceNode;
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var sander = require('sander'),
	readFile = sander.readFile,
	readFileSync = sander.readFileSync,
	realpathSync = sander.realpathSync;

var sourceMapRegExp = new RegExp(/(?:\/\/#|\/\/@|\/\*#)\s*sourceMappingURL=(\S*)\s*(?:\*\/\s*)?$/);
var dataUriRegexp = new RegExp(/^(data:)([\w\/\+]+)(;charset[=:][\w-]+)?(;base64)?,(.*)/);	// From https://github.com/ragingwind/data-uri-regex, modified


function getSourceNode(filepath, filename) {
	return readFile(filepath, filename).then( srcBuffer => {

		var srcStr = srcBuffer.toString();

		/// Run a regexp against the code to check for source mappings.
		var match = sourceMapRegExp.exec(srcStr);

		if (!match) {
			// Create identity sourcemap
			var realPath = realpathSync(filepath);
			var realFilename = realpathSync(realPath, filename);
			var lines = srcStr.split('\n');
			var lineCount = lines.length;

			var identNode = new SourceNode(null, null, null, '');
			identNode.setSourceContent(realFilename, srcStr);

			for (var i=0; i<lineCount; i++) {
				var lineNode = new SourceNode(i+1, 0, realFilename, lines[i] + '\n');
				identNode.add(lineNode);
			}
// 			console.log('Created inline sourcemap for ', filename);
			return identNode;
		} else {
			// Read sourcemap
			srcStr = srcStr.replace(sourceMapRegExp, '');
			var sourcemapFilename = match[1];
			var dataUriMatch = dataUriRegexp.exec(match[1]);
			if (dataUriMatch) {
				// Read inline sourcemap
				var data = dataUriMatch[5];
				if (dataUriMatch[4] === ';base64') {
					data = Buffer(data, 'base64').toString('utf8');
				}
				var parsedMap = new SourceMapConsumer( data.toString() );

// 				console.log('Loaded inline sourcemap for ', filename + ": (" + data.length + " bytes)");
				return SourceNode.fromStringWithSourceMap( srcStr, parsedMap );
			} else {
				// Read external sourcemap
				return readFile(filepath, sourcemapFilename )
				.then( mapContents => {
// 					console.log('Loaded external sourcemap for ', filename + ": (" + sourcemapFilename + ")");
					var parsedMap = new SourceMapConsumer( mapContents.toString() );
					return SourceNode.fromStringWithSourceMap( srcStr, parsedMap );
				}, err => {
					throw new Error('File ' + filename + ' refers to a non-existing sourcemap at ' + sourcemapFilename + ' ' + err);
				});
			}
		}
	});
}

module.exports = getSourceNode;
