const moment = require('moment-timezone');

export const fixFalseUTC = (date) => {
	return moment.tz(
		date.toISOString().replace(/Z/, '')
		,'Europe/Paris'
	).toDate();
};
