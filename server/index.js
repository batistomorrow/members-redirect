const express = require('express')
const path = require('path')
const http = require('http')
const bodyParser = require("body-parser");
const bookingCreate = require('./duplicate/bookingCreate');
const bookingSearch= require('./duplicate/bookingSearch');
const bookingCancel = require('./duplicate/bookingCancel');
const seanceSearch = require('./duplicate/seanceSearch');
// const notifiyWaiting = require('./duplicate/notifiyWaiting');

const app = express();

app.use( (req, res, next) => {
	return res.redirect(301, 'https://members.clubconnect.fr' + req.originalUrl);
});

app.use(bodyParser.json());

app.get('/api/seance', (req, res) => {
	seanceSearch({
		clubs : !req.query.clubs? null : req.query.clubs.split(','),
		date_min : +req.query.date_min  || Date.now(),
		date_max : +req.query.date_max  || Date.now()+24*3600*1000,
	})
	.then( seances => {
		return res.status(200).send(seances);
	})
	.catch( e => {
		console.error(e);
		return res
		.status(e.statusCode || 500)
		.json(e)
		;
	})
	;
});

app.post('/api/booking', (req, res) => {
	bookingCreate(req.body.coursId, req.body.userId, req.body.waiting)
	.then( created => {
		return res.status(201).send(created);
	})
	.catch( e => {
		console.error(e);
		return res
		.status(e.statusCode || 500)
		.json(e)
		;
	})
	;
});

app.get('/api/booking', (req, res) => {
	bookingSearch(req.query.user)
	.then( bookings => {
		return res.status(200).send(bookings);
	})
	.catch( e => {
		console.error(e);
		return res
		.status(e.statusCode || 500)
		.json(e)
		;
	})
	;
});

app.delete('/api/booking/:id', (req, res) => {
	bookingCancel(req.params.id)
	.then( canceled => {
		res.sendStatus(204);
		// notifiyWaiting(canceled.get('cours').id)
		// .catch( e => console.error(e) );
	})
	.catch( e => {
		console.error(e);
		return res
		.status(e.statusCode || 500)
		.json(e)
		;
	})
	;
});

app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('/*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'))
});

const port = process.env.PORT || '3000'
app.set('port', port)

const server = http.createServer(app);
server.listen(port);
