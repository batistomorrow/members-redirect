const Parse = require('./parse');
const Booking = Parse.Object.extend('Booking');

module.exports = bookingCancel;

//TODO Check cours not past
//TODO check bookingCancelation limit
function bookingCancel(id) {
	return new 	Parse.Query(Booking)
	.equalTo('objectId', id)
	.include('product')
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
		if(b.get('canceled')){
			return Promise.reject({
				statusCode  : 409,
				restCode  : 'resourceGone',
				resource  : {
					type : 'Booking',
					id   : id
				}
			});	
		}
		b.set('canceled', true);
		b.set("dateCanceled", new Date() );
		b.set('repaymentDate', new Date() );
		
		return b.save()
		.then( canceled => {
			let product = b.get('product');
			let credit = b.get('credit');
			if( !credit || !product ){
				return canceled;
			}
			product
			.set('credit', product.get('credit') + credit)
			.save()
			.then( () => {
				return canceled;
			})
			;
		});

	})
	;
}
