import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
import { withRouter } from 'react-router'

import { routes } from 'routes'
import { isLoggedIn } from 'utils/user'

import { Login, NotFound, SignIn } from 'containers'
import TopBar from 'components/TopBar'
import MenuBar from 'components/MenuBar'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/scss/main.scss'

import './style.scss'

class App extends Component {
  constructor(props) {
    super(props)

    console.log(this)
  }

  render() {
    return (
      <div className="App">
        <ToastContainer />
        {isLoggedIn()
          ? (
            <React.Fragment>
              <TopBar title={this.props.location.pathname.replace('/', '')} />

              {/* <MenuBar /> */}

              <Switch>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    exact={route.exact}
                    component={route.component}
                  />
                ))}
                
                <Route component={NotFound} />
              </Switch>
            </React.Fragment>
          ) : (
            <Switch>
              <Route
                path={'/signin'}
                exact={true}
                component={() => <SignIn/>}
              />

              <Route
                path={'/login'}
                exact={true}
                component={() => <Login/>}
              />
            </Switch>
          )
        }
      </div>
    )
  }
}

export default withRouter(App)