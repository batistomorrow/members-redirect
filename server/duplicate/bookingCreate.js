const Parse = require('parse/node');
const {fixFalseUTC} = require('./date');
const moment = require('moment-timezone');

const config = {
  serverURL: 'https://club-connect-parse-server.herokuapp.com/parse',
  appId: 'vj84kC1bckQ8VVeCPDUf',
  clientId: 'V4GJLX5Vh0ZpOyMfpJ0m',
  JSId: 'bKs82bwRSPA8C8yTV7jB',
  masterKey: 'bKs82bwRSPA8C8yTV7jB'
};

Parse.initialize(config.appId, config.clientId, config.JSId);
Parse.serverURL = config.serverURL;
Parse.masterKey = config.masterKey;

const Cours = Parse.Object.extend('Cours');
const Booking = Parse.Object.extend('Booking');
const Client = Parse.Object.extend('Client');
const Club = Parse.Object.extend('Club');

const getClassById = (id) => {
	return new Parse.Query(Cours)
	.equalTo("objectId", id)
	.first()
	.then( cours => {
		if ( cours ) return cours;
		return Promise.reject({
			statusCode  : 404,
			restCode  : 'resourceNotFound',
			resource  : {
				type : 'Cours',
				id   : id
			}
		});
	});
};

module.exports = bookingCreate;

function bookingCreate (courseId, userId){
	const now = Date.now();

	return getClassById(courseId)
	.then(cours => {
		if( cours.get('dateBookingOpened') && fixFalseUTC(cours.get('dateBookingOpened')).getTime() > now ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'TOO_EARLY_TO_BOOK'
			});
		}

		if( cours.get('dateBookingClosed') && fixFalseUTC(cours.get('dateBookingClosed')).getTime() < now ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'TOO_LATE_TO_BOOK'
			});
		}

		if( !cours.get('dateBookingClosed') && fixFalseUTC(cours.get('date')).getTime() < now ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'PAST_CLASS'
			});
		}

		return cours;
	})
	.then( cours => {
		const limit = cours.get('concurrentLimitWeekCount');
		if( ! limit ) return cours;
		
		const user = Client.createWithoutData(userId);
		let seanceDate = moment( fixFalseUTC(cours.get('date')) );
		const forThisClub = new Parse.Query(Cours).equalTo('club', cours.get('club') );

		return new 	Parse.Query(Booking)
		.include(['cours', 'cours.club'])
		.matchesQuery("cours", forThisClub)
		.equalTo('courseName', cours.get('name'))
		.equalTo('client', user)
		.equalTo('canceled', false)
		.greaterThanOrEqualTo('dateCourse', seanceDate.startOf('isoWeek').toDate())
		.lessThanOrEqualTo('dateCourse', seanceDate.endOf('isoWeek').toDate())
		.limit(limit)
		.count()
		.then( c => {
			if( c < limit ) return cours;

			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'WEEK_LIMIT_REACHED'
			});
		})
		;
	})
	.then( cours => {
		const limit = cours.get('concurrentLimitMonthCount');
		if( ! limit ) return cours;

		const user = Client.createWithoutData(userId);
		let seanceDate = moment( fixFalseUTC(cours.get('date')) );
		const forThisClub = new Parse.Query(Cours).equalTo('club', cours.get('club') );

		return new 	Parse.Query(Booking)
		.include(['cours', 'cours.club'])
		.matchesQuery("cours", forThisClub)
		.whereEqualTo('courseName', cours.get('name'))
		.whereEqualTo('client', user)
		.whereEqualTo('canceled', false)
		.greaterThanOrEqualTo('dateCourse', seanceDate.startOf('month').toDate())
		.lessThanOrEqualTo('dateCourse', seanceDate.endOf('month').toDate())
		.setLimit(limit)
		.count()
		.then( c => {
			if( c < limit ) return cours;

			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'MONTH_LIMIT_REACHED'
			});
		})
		;
	})
	.then( cours => {
		return new Parse.Query(Booking)
		.equalTo('cours', cours)
		.find()
		.then( bookings => {
			return { cours, bookings };
		})
		;
	})
	.then( ({cours, bookings}) => {
		let activeBookings = bookings.filter( b=> !b.get('waiting') && !b.get('canceled'));
		let bookingLimit = cours.get('bookingLimit');
		if (bookingLimit && activeBookings.length >= bookingLimit) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'FULL_BEFORE'
			});
		}

		let booking = new Booking();
		let userBookings = bookings.filter( b => b.get('client').id === userId );
		
		if (userBookings.length) {
			//FARV: we should ensure there is a most 1 booking for the gived user !
			booking = userBookings[0];
		}
		const user = Client.createWithoutData(userId);
		booking.set('dateCourse', cours.get('date'));
		booking.set('courseName', cours.get('name'));
		booking.set('dateBooking', new Date());
		booking.set('cours', cours);
		booking.set('client', user);
		booking.set('waiting', false);
		booking.set('canceled', false);
		return booking.save()
		.then( created => {
			return { created, cours, bookings};
		})
	})
	.then( ({ created, cours, bookings}) => {
		return new Parse.Query(Booking)
		.equalTo('cours', cours)
		.equalTo('waiting', false)
		.equalTo('canceled', false)
		.count()
		.then(count => {
			let bookingLimit = cours.get('bookingLimit');
			if ( count <= bookingLimit ) return created;

			return booking.destroy()
			.then( () => {
				return Promise.reject({
					statusCode : 409,
					restCode   : 'cannotBook',
					reason: 'FULL_BEFORE'
				});
			})
			;
		})
	})
}
