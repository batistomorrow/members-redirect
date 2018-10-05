import React from 'react'

import './style.scss'

const propTypes = {}
const defaultProps = {}

function Loader () {
  return (
    <div className="loader">
      <div className="loader__spinner">
        <div />
        <div />
      </div>
    </div>
  )
}
Loader.propTypes = propTypes
Loader.defaultProps = defaultProps

export default Loader
