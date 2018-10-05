import React, { Component } from 'react'
import { NavLink } from 'react-router-dom'

import { withRouter } from 'react-router'

import { routes } from 'routes'

import { logout } from 'utils/user'

import './style.scss'

class MenuBar extends Component {
  constructor() {
    super()

    this.handleLogout = this.handleLogout.bind(this)
  }

  handleLogout() {
    logout()
    this.props.history.push('/')
  }

  render () {
    const topList = []
      const bottomList = []

      routes
        .filter(row => { return row.position })
        .forEach((row, index) => {
          if (row.position === "top") {
            topList.push(
              <NavLink activeClassName={'active'} key={index} to={row.path}>{row.name}</NavLink>
            )
          } else {
            bottomList.push(
              <NavLink activeClassName={'active'} key={index} to={row.path}>{row.name}</NavLink>
            )
          }
        })

      return (
        <nav className="MenuBar">
          <ul>
            {topList}
          </ul>
          <ul>
            {bottomList}
            <div onClick={this.handleLogout}>Déconnexion</div>
          </ul>
        </nav>
      )
  }
}

export default withRouter(MenuBar)