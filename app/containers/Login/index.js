import React, { Component } from 'react'
import Parse from 'parse'

import { withRouter } from 'react-router'

import { Club, Client } from 'utils/parse'
import { login } from 'utils/user'

import './style.scss'

class Login extends Component {
  constructor(props) {
    super(props)

    this.state = {
      form: {
        email: ''
      },
      error: {
        email: ''
      },
      client: {},
      clubs: [],
      isCalling: false
    }

    this.handleEmailChange = this.handleEmailChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleEmailChange (event) {
    this.setState({
      form: {
        email: event.target.value
      }
    })
  }

  handleClubChoice (club) {
    const { client } = this.state

    this.handleLogin(client, club)
  }

  isFormValid() {
    let isValid = true
    const { form, error } = this.state

    // Email
    if (!form.email || form.email.length <= 0) {
      error.email = 'Merci de rentrer un email valide'

      isValid = false
    } else {
      error.email = ''
    }

    return isValid
  }
  
  handleSubmit (evt) {
    evt.preventDefault()

    const that = this

    that.setState({ isCalling: true })

    const { form } = that.state

    if (that.isFormValid()) {
      let query = new Parse.Query(Client)

      query.equalTo('email', form.email)

      query.first().then(client => {
        if (client && client.id) {
          const clubIds = client.get('clubs').map(row => {
            return row.id
          })

          const queryClubs = new Parse.Query(Club)

          queryClubs.containedIn('objectId', clubIds)

          queryClubs.find().then(clubs => {
            if (clubs.length > 1) {
              that.setState({ clubs, isCalling: false, client })
            } else {
              that.handleLogin(client, clubs[0])
            }
          })
        } else {
          that.setState({ isCalling: false, error: { email: 'Utilisateur introuvable' } })
        }
      })
    }
  }

  handleLogin(currentClient, currentClub) {
    const user = {
      id: currentClient.id,
      email: currentClient.get('email'),
      firstname: currentClient.get('firstname')
    }
    const club = {
      id: currentClub.id,
      name: currentClub.get('name'),
      color: `#${currentClub.get('themeColor')}`
    }

    login(user, club)
    this.props.history.push('/planning')
  }

  render() {
    const { form, error, clubs, isCalling } = this.state

    return (
      <div className={"Login"}>
        <div className="Login__header">
          <p>Club Connect</p>
          <p>Interface membre</p>
        </div>

        {clubs && clubs.length > 0
          ? (
            <div className={'Login__clubs'}>
              <p>Veuillez séléctionner votre club</p>
              {clubs.map((row, index) =>
                <div key={index} onClick={this.handleClubChoice.bind(this, row)}>
                  <img src={row.get('appicon')} alt={`Icône de l'application ${row.get('name')}`}/>
                  <span>{row.get('name')}</span>
                </div>
              )}
            </div>
          ) : (
            <form className={'Login__form'} onSubmit={this.handleSubmit}>
              <label htmlFor="email">Email address</label>
              <input type="email" name="email" id="email" value={form.email} onChange={this.handleEmailChange} disabled={isCalling}/>
              {error.email && error.email.length > 0
                ? (
                  <p className="error">{error.email}</p>
                ) : null
              }
              <input type="submit" value="Se connecter" disabled={isCalling} />
            </form>
          )
        }
      </div>
    )
  }
}

export default withRouter(Login)