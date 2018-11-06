import React, { Component } from 'react'

import { withRouter } from 'react-router'

import { logout } from 'utils/user'

import './style.scss'

class TopBar extends Component {
  constructor(props) {
    super(props)

    this.handleLogout = this.handleLogout.bind(this)
  }

  handleLogout() {
    logout()
    this.props.history.push('/')
  }

  render () {
    return (
      <div className="TopBar">
        <div className="logout" onClick={this.handleLogout}>
          Déconnexion
        </div>
        <h1>{this.props.title.toUpperCase()}</h1>
      </div>
    )
  }
}

export default withRouter(TopBar)