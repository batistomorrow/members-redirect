const Parse = require('./parse');
const Booking = Parse.Object.extend('Booking');

module.exports = bookingCancel;

function bookingCancel(id) {
	return new 	Parse.Query(Booking)
	.equalTo('objectId', id)
	.first()
	.then( b => {
		if(!b) {
			return Promise.reject({
				statusCode  : 404,
				restCode  : 'resourceNotFound',
				resource  : {
					type : 'Booking',
					id   : id
				}
			});
		}
		b.set('canceled', true);
		b.set("dateCanceled", new Date());
		return b.save();
	})
	;
}
