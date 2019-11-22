const moment = require('moment-timezone');
const {fixFalseUTC} = require('./date');

const Parse = require('./parse');
const Cours = Parse.Object.extend('Cours');
const Booking = Parse.Object.extend('Booking');
const Client = Parse.Object.extend('Client');
const Club = Parse.Object.extend('Club');

module.exports = bookingSearch;

function bookingSearch (userId){
	return new Parse.Query(Booking)
	.include(['cours'])
	.equalTo('client', Client.createWithoutData(userId))
	.equalTo('canceled', false)
	.descending('date')
	.limit(300)
	.find()
	.then(bookings => {
		return bookings.map(b=>{
			return {
				id : b.id,
				waiting: b.get('waiting'),
				seance : {
					id : b.get('cours').id,
					name : b.get('cours').get('name')
				}
			};
		});
	})
	;
}
