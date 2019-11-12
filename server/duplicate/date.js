const moment = require('moment-timezone');

function fixFalseUTC(date){
	return moment.tz(
		date.toISOString().replace(/Z/, '')
		,'Europe/Paris'
	).toDate();
};

module.exports = {
	fixFalseUTC
};
