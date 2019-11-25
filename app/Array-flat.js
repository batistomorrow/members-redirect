if ( !Array.prototype.flat )
  console.warn('Polyfill Array.flat');
	Object.defineProperty(Array.prototype, 'flat', {
		value: function(depth = 1) {
			return this.reduce(function (flat, toFlatten) {
				return flat.concat((Array.isArray(toFlatten) && (depth>1)) ? toFlatten.flat(depth-1) : toFlatten);
			}, []);
		}
	});
