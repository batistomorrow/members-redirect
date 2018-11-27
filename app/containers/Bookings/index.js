import React from 'react'
import Parse from 'parse'

import moment from 'moment'

import { getItem } from 'utils/localStorage'
import { Club, Client, Booking, Cours, CoursTemplate, Product } from 'utils/parse'

import './style.scss'

class Bookings extends React.Component {
  constructor(props) {
    super(props)
    
    this.state = {
      club: Club.createWithoutData(getItem('club').id),
      user: Client.createWithoutData(getItem('user').id),
      isLoading: true,
      isCalling: false,
      bookings: [],
      products: [],
      activeWindow: "bookings"
    }
  }

  componentWillMount() {
    const that = this
    const { club, user } = that.state

    const queryBookings = new Parse.Query(Booking)

    queryBookings.limit(100).include('cours')
    queryBookings.equalTo('client', user)

    queryBookings.find().then(bookings => {
      const queryProduct = new Parse.Query(Product)

      queryProduct.limit(100)
      queryProduct.equalTo('club', club).equalTo('client', user)
      queryProduct.include('template')

      queryProduct.find().then(products => {
        that.setState({ bookings, products })
      })
    })
  }

  changeWindow (name) {
    this.setState({ activeWindow: name })
  }

  render() {
    const { bookings, products, activeWindow } = this.state

    // Réservations
    const formatted = []
    const formattedPast = []

    bookings.forEach(row => {
      // À venir
      if (moment(row.get('cours').get('date')).isAfter(moment())) {
        formatted.push(row)
      // Passée
      } else if (!row.get('waiting') && !row.get('canceled')) {
        formattedPast.push(row)
      }
    })
 
    // Tickets
    const currentTickets = []
    const pastTickets = []

    products
      .filter(r => r.get('type') === 'PRODUCT_TYPE_TICKET')
      .forEach(r => {
        const name = `${r.get('name')} - ${r.get('price')} € TTC`

        if (r && r.get('expireAt')) {
          if (
            r &&
            moment(r.get('expireAt')).isAfter(moment()) &&
            r.get('credit') > 0
          ) {
            currentTickets.push(
              <div
                key={r.id}
              >
                <p style={{ float: 'left' }}>{name} - {r.get('credit')} crédits restants</p>
                <p style={{ float: 'right' }}>
                  {moment(r.get('expireAt')).format('L')}
                </p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          }
        } else if (r && !r.get('expireAt') && r.get('credit') > 0) {
          currentTickets.push(
            <div
              key={r.id}
            >
              <p style={{ float: 'left' }}>{name} - {r.get('credit')} crédits restants</p>
              <div style={{clear: 'both'}}></div>
            </div>
          )
        }

        if (r && r.get('expireAt')) {
          if (
            (r && moment(r.get('expireAt')).isBefore(moment())) ||
            (r && r.get('credit') <= 0)
          ) {
            pastTickets.push(
              <div
                key={r.id}
                className='item past'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <p style={{ float: 'right' }}>
                  {moment(r.get('expireAt')).format('L')}
                </p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          }
        } else if (r && !r.get('expireAt') && r.get('credit') <= 0) {
          pastTickets.push(
            <div
              key={r.id}
              className='item past'
            >
              <p style={{ float: 'left' }}>{name}</p>
              <div style={{clear: 'both'}}></div>
            </div>
          )
        }
      })

    // Tickets
    const currentSubs = []
    const pastSubs = []

    products
      .filter(r => r.get('type') === 'PRODUCT_TYPE_SUBSCRIPTION')
      .forEach(r => {
        const name = `${r.get('name')} - ${r.get('price')} € TTC`
        
        if (r && r.get('expireAt')) {
          if (r && moment(r.get('expireAt')).isAfter(moment())) {
            currentSubs.push(
              <div
                key={r.id}
                className='item'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <p style={{ float: 'right' }}>
                  {moment(r.get('expireAt')).format('L')}
                </p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          } else if (r && !r.get('expireAt')) {
            currentSubs.push(
              <div
                key={r.id}
                className='item'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          }
        } else {
          if (
            r &&
            r.get('expireAt') &&
            moment(r.get('expireAt')).isAfter(moment())
          ) {
            currentSubs.push(
              <div
                key={r.id}
                className='item'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <p style={{ float: 'right' }}>
                  {moment(r.get('expireAt')).format('L')}
                </p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          } else if (r && !r.get('expireAt')) {
            currentSubs.push(
              <div
                key={r.id}
                className='item'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          }
        }

        if (r && r.get('expireAt')) {
          if (r && moment(r.get('expireAt')).isBefore(moment())) {
            pastSubs.push(
              <div
                key={r.id}
                className='item past'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <p style={{ float: 'right' }}>
                  {moment(r.get('expireAt')).format('L')}
                </p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          }
        } else {
          if (r && moment(r.get('expireAt')).isBefore(moment())) {
            pastSubs.push(
              <div
                key={r.id}
                className='item past'
              >
                <p style={{ float: 'left' }}>{name}</p>
                <p style={{ float: 'right' }}>
                  {moment(r.get('expireAt')).format('L')}
                </p>
                <div style={{clear: 'both'}}></div>
              </div>
            )
          }
        }
      })

    return (
      <div className={"Bookings MainContainer"}>
        <div className={"Bookings__topBar"}>
          <div onClick={this.changeWindow.bind(this, "bookings")} className={activeWindow === "bookings" ? 'active' : null}>
            <p>Réservations</p>
          </div>
          <div onClick={this.changeWindow.bind(this, "tickets")} className={activeWindow === "tickets" ? 'active' : null}>
            <p>Tickets</p>
          </div>
          <div onClick={this.changeWindow.bind(this, "subs")} className={activeWindow === "subs" ? 'active' : null}><p>Abonnements</p></div>
        </div>

        <div className={"Bookings__content"}>
          {activeWindow === "bookings"
            ? (
              <div>
                <h3>À venir</h3>
                {formatted.map((row, index) => 
                  <div key={index}>
                    <p>
                      {row.get('cours').get('name')} - {moment(row.get('cours').get('date')).format('L')} à{' '}
                      {moment(row.get('cours').get('date')).format('LT')}
                    </p>
                    <p>
                      Réservation effectuée le {moment(row.get('dateBooking')).format('L')} à{' '}
                      {moment(row.get('dateBooking')).format('LT')}.
                    </p>
                  </div>
                )}
                <h3>Passées</h3>
                {formattedPast.map((row, index) => 
                  <div key={index}>
                    <p>
                      {row.get('cours').get('name')} - {moment(row.get('cours').get('date')).format('L')} à{' '}
                      {moment(row.get('cours').get('date')).format('LT')}
                    </p>
                    <p>
                      Réservation effectuée le {moment(row.get('dateBooking')).format('L')} à{' '}
                      {moment(row.get('dateBooking')).format('LT')}.
                    </p>
                  </div>
                )}
              </div>
            ) : null
          }
          {activeWindow === "tickets"
            ? (
              <div>
                <h3>Actifs</h3>
                {currentTickets}
                <h3>Expirés/finis</h3>
                {pastTickets}
              </div>
            ) : null
          }
          {activeWindow === "subs"
            ? (
              <div>
                <h3>Actifs</h3>
                {currentSubs}
                <h3>Expirés/finis</h3>
                {pastSubs}
              </div>
            ) : null
          }
        </div>
      </div>
    )
  }
}

export default Bookings