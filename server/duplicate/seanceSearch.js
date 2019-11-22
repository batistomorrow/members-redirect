const moment = require('moment');
const Parse = require('./parse');
const {fixFalseUTC} = require('./date');

const Cours = Parse.Object.extend('Cours');
const Booking = Parse.Object.extend('Booking');
const Club = Parse.Object.extend('Club');

module.exports = seanceSearch;

function seanceSearch({clubs, date_min, date_max}) {
	let q =  new Parse.Query(Cours)
	.greaterThanOrEqualTo('date', new Date(date_min) )
	.lessThan('date', new Date(date_max) )
	.include('club')
	.ascending('date')
	.limit(100)
	;

	if(clubs.length)
		q.containedIn('club', clubs.map( id => Club.createWithoutData(id)) );
	else
		q.exists('club');

	return q.find()
	.then(seances => {
		return new Parse.Query(Booking)
		.containedIn('cours', seances)
		.equalTo('canceled', false)
		.equalTo('waiting', false)
		.limit(999999)
		.find()
		.then(bookings => ({bookings, seances}))
		;
	})
	.then( ({bookings, seances}) => {
		let cleanedSeances = seances.map( s => {
			var c = {
				id      : s.id,
				name    : s.get('name'),
				starts  : fixFalseUTC(s.get('date')),
				ends  : new Date(fixFalseUTC(s.get('date')).getTime() + 1000 * 60 * s.get('duration') ),
				club : {
					id : s.get('club').id,
					name : s.get('club').get('name')
				},
				room	: !s.get('room') ? null : {
					id : s.get('room'),
					name : s.get('room')
				},
				bookingRules : {
					enabled : !!s.get('bookingEnabled'),
				},
				display : {
					color   : s.get('hexColor'),
					picture : !s.get('pictureFileName') ? null : "https://s3-eu-west-1.amazonaws.com/com.clubconnect.bucket0/"+s.get('pictureFileName')
				},
				coach : null //TODO
			};
			c.bookingRules.seats = {};
			c.bookingRules.seats.booked = 0;
			if( s.get('bookingLimit') ) {
				c.bookingRules.seats.total = s.get('bookingLimit');
			}
			c.bookingRules.waitingListEnabled = !!s.get('waitingListEnabled');
			return c;
		});

		bookings.forEach( b => {
			let s = cleanedSeances.find(s => s.id === b.get('cours').id);
			if(!s) return console.warn('Cannot associate booking with seance');
			s.bookingRules.seats.booked++;
		});
		return cleanedSeances;
	})
	;
}
