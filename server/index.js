const express = require('express')
const path = require('path')
const http = require('http')
const bodyParser = require("body-parser");
const bookingCreate = require('./duplicate/bookingCreate');

const app = express();
app.use(bodyParser.json());

app.post('/api/booking', (req, res) => {
	bookingCreate(req.body.coursId, req.body.userId)
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

app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('/*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'))
});

const port = process.env.PORT || '3000'
app.set('port', port)

const server = http.createServer(app);
server.listen(port);
