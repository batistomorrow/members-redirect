const moment = require('moment-timezone');
const {fixFalseUTC} = require('./date');

const Parse = require('./parse');
const Cours = Parse.Object.extend('Cours');
const Booking = Parse.Object.extend('Booking');
const Client = Parse.Object.extend('Client');
const Club = Parse.Object.extend('Club');

module.exports = bookingCreate;

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


function bookingCreate (courseId, userId, waiting){
	const now = Date.now();

	return getClassById(courseId)
	.then(cours => {
		if( cours.get('dateBookingOpened') && fixFalseUTC(cours.get('dateBookingOpened')).getTime() > now ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'TOO_EARLY_TO_BOOK',
				userMsg: 'Les réservations ne sont pas encore ouvertes'
			});
		}

		if( cours.get('dateBookingClosed') && fixFalseUTC(cours.get('dateBookingClosed')).getTime() < now ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'TOO_LATE_TO_BOOK',
				userMsg: 'Les réservations sont fermées'
			});
		}

		if( !cours.get('dateBookingClosed') && fixFalseUTC(cours.get('date')).getTime() < now ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'PAST_CLASS',
				userMsg: 'Ce cours a déjà commencé'
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
				reason: 'WEEK_LIMIT_REACHED',
				userMsg: `Ce cours est limité à ${limit} par semaine`
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
				reason: 'MONTH_LIMIT_REACHED',
				userMsg: `Ce cours est limité à ${limit} par mois`
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
			
			if ( !waiting ) {
				return Promise.reject({
					statusCode : 409,
					restCode   : 'cannotBook',
					reason: 'FULL_BEFORE',
					userMsg: 'Ce cours est complet'
				});
			} else if ( !cours.get('waitingListEnabled') ) {
				return Promise.reject({
					statusCode : 409,
					restCode   : 'cannotBook',
					reason: 'WAITING_LIST_NOT_ENABLED',
					userMsg: "Pas de liste d'attente pour ce cours"
				});
			}
		}

		let booking = new Booking();
		let userBookings = bookings.filter( b => b.get('client').id === userId );
		
		if (userBookings.length) {
			booking = userBookings[0];
			//FARV: OK we cannot patch everything at once so this is a little trick... temporary... you know what I mean :D
			userBookings.slice(1).forEach( b => b.destroy().catch(e => console.error(e)) );
		}

		const user = Client.createWithoutData(userId);
		booking.set('client', user);
		booking.set('cours', cours);
		booking.set('dateCourse', cours.get('date'));
		booking.set('courseName', cours.get('name'));
		booking.set('canceled', false);
		
		booking.set('waiting', waiting);
		!waiting && booking.set('dateBooking', new Date());
		waiting && booking.set('dateQueue', new Date() );

		return booking.save()
		.then( created => {
			return { created, cours, bookings};
		})
	})
	.then( ({ created, cours, bookings}) => {
		if(waiting) return created;

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
					reason: 'FULL_BEFORE',
					userMsg: 'Ce cours est complet'
				});
			})
			;
		})
	})
}
