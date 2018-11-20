const express = require('express')
const path = require('path')
const http = require('http')

const app = express()

app.use(express.static(path.join(__dirname, '..', 'dist')))

app.get('/*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'))
})

const port = process.env.PORT || '3000'
app.set('port', port)

const server = http.createServer(app)

server.listen(port)
