require('poly/Array-flat');
require('poly/Object-assign');

import React from 'react'
import ReactDOM from 'react-dom'
import { Router } from 'react-router-dom'
import createBrowserHistory from 'history/createBrowserHistory'

import Parse from 'parse'

import { App } from 'containers'

import 'styles/global.scss'

Parse.initialize(
  'vj84kC1bckQ8VVeCPDUf',
  'V4GJLX5Vh0ZpOyMfpJ0m',
  'bKs82bwRSPA8C8yTV7jB'
)
Parse.serverURL = 'https://club-connect-parse-server.herokuapp.com/parse'
Parse.masterKey = 'bKs82bwRSPA8C8yTV7jB'

const customHistory = createBrowserHistory()

const Provider = () => (
  <Router history={customHistory}>
    <App />
  </Router>
)
  
ReactDOM.render(
  <Provider />,
  document.getElementById('root')
)
