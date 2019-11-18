const Parse = require('./parse');
const Club = Parse.Object.extend('Club');
const Booking = Parse.Object.extend('Booking');
const Cours = Parse.Object.extend('Cours');
const Notification = Parse.Object.extend('Notification')

module.exports = notifiyWaiting;

//This is completly useless, never worked
function notifiyWaiting(coursId) {
	return new 	Parse.Query(Booking)
	.equalTo('cours', Cours.createWithoutData(coursId))
	.include(['client', 'cours','cours.club'])
	.equalTo('canceled', false)
	.equalTo('waiting', true)
	.find()
	.then( waitings => {
		if(!waitings.length) return [];

		let msg = `🎉 Une place s'est libérée pour le cours de ${cours.get('name')}. Réservez votre place si vous souhaitez venir !`;
		
		return new Notification()
		.set('clients', waitings.map(b => b.get('client').id ) )
		.set('date', new Date())
		.set('club', Club.createWithoutData(clubObjectId))
		.set('alert', msg)
		.set('labels', ['A un ou plusieurs adhérents'])
		.save();

		// let cours = waitings[0].get('cours');
		// let club = cours.get('club');
		// let msg = `🎉 Une place s'est libérée pour le cours de ${cours.get('name')}. Réservez votre place si vous souhaitez venir !`;
		
		// let recipients = waitings.map(b => b.get('client').id );
		// let queryInstallation = new Parse.Query(Installation)
		// .containedIn('clientObjectId', recipients)
		// .equalTo('clubObjectId', club.id)
		// ;
		// queryInstallation.find().then( res => console.log(res) );
		// console.log(recipients);
		// console.log(club.id);
		// return Parse.Push.send(
		// 	{
		// 		where: queryInstallation,
		// 		data: {
		// 			alert:msg,
		// 			badge: 1,
		// 			sound: 'default'
		// 		}
		// 	},
		// 	{ useMasterKey: true }
		// )
	})
	;
}
