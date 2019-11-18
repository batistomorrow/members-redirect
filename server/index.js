const express = require('express')
const path = require('path')
const http = require('http')
const bodyParser = require("body-parser");
const bookingCreate = require('./duplicate/bookingCreate');
const bookingCancel = require('./duplicate/bookingCancel');
// const notifiyWaiting = require('./duplicate/notifiyWaiting');

const app = express();
app.use(bodyParser.json());

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
