import React, { Component } from 'react'

import './style.scss'

class TopBar extends Component {
  constructor(props) {
    super(props)
  }
  render () {
    return (
      <div className="TopBar">
        <h1>{this.props.title.toUpperCase()}</h1>
      </div>
    )
  }
}

export default TopBar