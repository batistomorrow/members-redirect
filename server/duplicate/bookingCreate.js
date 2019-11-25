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

		return {cours, bookings};
	})
	.then( ({cours, bookings}) => {
		if( bookings.some( b => b.get('client').id === userId && b.get('canceled') === false) ) {
			return Promise.reject({
				statusCode : 409,
				restCode   : 'cannotBook',
				reason: 'ALREADY_BOOKED',
				userMsg: 'Vous avez déjà une réservation pour ce cours'
			});
		}

		return {cours, bookings};
	})
	.then( ({cours, bookings}) => {
		const courseProductTemplates = cours.get('productTemplates');
		
		if(!courseProductTemplates || !courseProductTemplates.length)
			return Promise.resolve({cours, bookings});

		return Parse.Query.or(
			new Parse.Query("Product").doesNotExist('expireAt')
			,  new Parse.Query("Product").greaterThanOrEqualTo('expireAt', moment().toDate())
		)
		.equalTo('client', Client.createWithoutData(userId))
		.equalTo('club', cours.get('club'))
		.find()
		.then(userProducts => {
			let creditsCost = cours.get('creditsCost');

			let match = userProducts
			.find( product => {
				return courseProductTemplates.some( template => {
					return product.get('template').id === template.id
					&& (
						product.get('type') === 'PRODUCT_TYPE_SUBSCRIPTION'
						|| ( product.get('credit') >= creditsCost )
					);
				})
			});

			if(!match) {
				return Promise.reject({
					statusCode : 409,
					restCode   : 'cannotBook',
					reason: 'MISSING_SUBSCRIPTION_REQUIREMENT',
					userMsg: "Vous ne disposez pas de l'abonnement/des tickets nécessaire(s) pour réserver ce cours."
				});
			}

			if( match.get('type') !== 'PRODUCT_TYPE_TICKET' || !creditsCost ){
				return Promise.resolve({cours, bookings});
			}

			return Promise.resolve({
				cours,
				bookings,
				creditsCost : creditsCost,
				productToDebit: match
			});
		});
	})
	.then( ({cours, bookings, creditsCost, productToDebit}) => {
		let booking = new Booking();
		let userBookings = bookings.filter( b => b.get('client').id === userId );
		
		if (userBookings.length) {
			booking = userBookings[0];
			//FARV: OK we cannot patch everything at once so this is a little trick... temporary... you know what I mean :D
			userBookings.slice(1).forEach( b => b.destroy().catch(e => console.error(e)) );
		}

		const user = Client.createWithoutData(userId);
		booking.set('createdOn', 'member');
		booking.set('client', user);
		booking.set('cours', cours);
		booking.set('dateCourse', cours.get('date'));
		booking.set('courseName', cours.get('name'));
		booking.set('canceled', false);
		
		if(creditsCost)
			booking.set('credit', creditsCost);
		if(productToDebit)
			booking.set('product', productToDebit);

		booking.set('waiting', waiting);
		!waiting && booking.set('dateBooking', new Date());
		waiting && booking.set('dateQueue', new Date() );

		let makePayment = null;
		if(creditsCost && productToDebit){
			makePayment = () => productToDebit.set('credit', productToDebit.get('credit') - creditsCost).save() ;
		}

		return booking.save()
		.then( created => {
			return { created, cours, bookings, makePayment};
		})
	})
	.then( ({ created, cours, bookings, makePayment}) => {
		if(waiting) return created;

		return new Parse.Query(Booking)
		.equalTo('cours', cours)
		.equalTo('waiting', false)
		.equalTo('canceled', false)
		.count()
		.then(count => {
			let bookingLimit = cours.get('bookingLimit');


			if ( count > bookingLimit )
				return created.destroy()
				.then( () => {
					return Promise.reject({
						statusCode : 409,
						restCode   : 'cannotBook',
						reason: 'FULL_BEFORE',
						userMsg: 'Ce cours est complet'
					});
				})
				;

			if(!makePayment) return created;

			return makePayment()
			.then( () => created)
			.catch( e => {
				//I'd like a transaction to rollback everything :/
				console.error(e);
			})
			;
		})
	})
}
