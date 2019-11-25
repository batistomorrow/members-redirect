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
	.include(['cours', 'cours.club'])
	.equalTo('client', Client.createWithoutData(userId))
	.equalTo('canceled', false)
	.descending('date')
	.limit(300)
	.find()
	.then(bookings => {
		return bookings
		.filter( b => !! b.get('cours') )
		.map(b=>{
			let c = b.get('cours');
			let p = c.get('club');
			return {
				id : b.id,
				creation : {
					date : fixFalseUTC(b.get('createdAt'))
				},
				waiting: b.get('waiting'),
				seance : {
					id : c.id,
					name : c.get('name'),
					starts : fixFalseUTC(c.get('date')),
					club : {
						id : p.id,
						name : p.get('name')
					}
				}
			};
		});
	})
	;
}
