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
    evt.preventDefault();

    const that = this;
    const { form } = that.state;

    this.setState({ isCalling: true })
    if (that.isFormValid()) {
      new Parse.Query(Client)
      .equalTo('email', form.email)
      .first()
      .then(client => {
        if(!client || !client.id) {
          that.setState({ isCalling: false, error: { email: 'Utilisateur introuvable' } });
          return;
        }
        const clubIds = client.get('clubs').map(row => row.id);
        new Parse.Query(Club)
        .containedIn('objectId', clubIds)
        .find()
        .then(clubs => {
          if (clubs.length > 1) {
            that.setState({ clubs, isCalling: false, client })
          } else {
            that.handleLogin(client, clubs[0])
          }
        })
        ;
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
              {clubs.map( club =>
                <div key={club.id} onClick={this.handleClubChoice.bind(this, club)}>
                  <span>{club.get('name')}</span>
                </div>
              )}
            </div>
          ) : (
            <form className={'Login__form'} onSubmit={this.handleSubmit}>
              <label htmlFor="email">Adresse e-mail</label>
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

        <div className="Login__create"><a href="/signin">Créer un compte</a></div>
      </div>
    )
  }
}

export default withRouter(Login)