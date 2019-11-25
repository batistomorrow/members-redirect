import React from 'react';
import Parse from 'parse';
import moment from 'moment';
import { getItem } from 'utils/localStorage';
import { Club, Client, Booking, Cours, CoursTemplate, Product } from 'utils/parse';
import {fixFalseUTC} from '../../clean/date';
import BookingButton from '../BookingButton';

import './style.scss';

let listBookings = ({userId}) => {
  return fetch(`/api/booking?user=${userId}`)
  .then( result => result.json())
  ;
}

let listProducts = (user) => {
  return new Parse.Query(Product)
  .limit(100)
  .containedIn('club')
  .equalTo('client', user)
  .include('template')
  .find()
  ;
}

export default class Bookings extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = {
      club: Club.createWithoutData(getItem('club').id),
      user: Client.createWithoutData(getItem('user').id),
      isLoading: true,
      bookings: [],
      products: [],
      activeWindow: "bookings"
    };
  }

  componentWillMount() {
    this.setState({ isLoading : true });

    const { club, user } = this.state;

    return Promise.resolve()
    .then( () => {
      let r = club.get('relatedCompanies');
      if( ! r || !r.length ) {
        return [club];
      }
      return new Parse.Query(Club)
      .containedIn('objectId', r.map(c=>c.id).concat(club.get('id')) )
      .find()
      ;
    })
    .then( allClubs => {
      return Promise.all([
        listProducts(user),
        listBookings({userId:user.id}),
      ])
      .then( ([products, bookings]) => {
        this.setState({ bookings, products, isLoading:false });
      })
      ;
    })    
    .catch( e => {
      console.error(e);
    })
    ;
  }

  changeWindow (name) {
    this.setState({ activeWindow: name });
  }

  render() {
    const { isLoading, bookings, products, activeWindow } = this.state;

    if(isLoading) {
      return (
        <div className={"Bookings MainContainer"}>
          <p>Chargement...</p>
        </div>
      );
    }
    // Réservations
    const formatted = [];
    const formattedPast = [];

    bookings
    .filter( b => !b.canceled)
    .forEach(b => {
      if (moment(b.seance.starts).isAfter(moment())) {
        formatted.push(b);
      } else if (!b.waiting ) {
        formattedPast.push(b);
      }
    });
 
    // Tickets
    const currentTickets = [];
    const pastTickets = [];

    products
    .filter(r => r && r.get('type') === 'PRODUCT_TYPE_TICKET')
    .forEach(r => {
      const name = `${r.get('name')} - ${r.get('price')} € TTC`

      if (r.get('expireAt')) {
        if ( moment(r.get('expireAt')).isAfter(moment()) && r.get('credit') > 0 ) {
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
      } else if (!r.get('expireAt') && r.get('credit') > 0) {
        currentTickets.push(
          <div
            key={r.id}
          >
            <p style={{ float: 'left' }}>{name} - {r.get('credit')} crédits restants</p>
            <div style={{clear: 'both'}}></div>
          </div>
        )
      }

      if (r.get('expireAt')) {
        if ( moment(r.get('expireAt')).isBefore(moment()) || r.get('credit') <= 0 ) {
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
      } else if (!r.get('expireAt') && r.get('credit') <= 0) {
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
    const currentSubs = [];
    const pastSubs = [];

    products
    .filter(r => r && r.get('type') === 'PRODUCT_TYPE_SUBSCRIPTION')
    .forEach(r => {
      const name = `${r.get('name')} - ${r.get('price')} € TTC`
      
      if (r.get('expireAt')) {
        if (moment(r.get('expireAt')).isAfter(moment())) {
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
        } else if (!r.get('expireAt')) {
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
        if ( r.get('expireAt') && moment(r.get('expireAt')).isAfter(moment()) ) {
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
        } else if (!r.get('expireAt') ) {
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

      if (r.get('expireAt')) {
        if (moment(r.get('expireAt')).isBefore(moment())) {
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
        if (moment(r.get('expireAt')).isBefore(moment())) {
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
                {formatted.map( b => {
                  let coursDate = moment(new Date(b.seance.starts) );
                  return (
                    <div key={b.id}>
                      <p>
                        {b.seance.name} - {coursDate.format('L')} à{' '}
                        {coursDate.format('LT')}
                      </p>
                      <p>{b.seance.club.name}</p>
                      <p>
                        Réservation effectuée le {moment(b.creation.date).format('L')} à{' '}
                        {moment(b.creation.date).format('LT')}.
                      </p>
                    </div>
                  );
                }
                )}
                <h3>Passées</h3>
                {formattedPast.map( b => {
                  let coursDate = moment(new Date(b.seance.starts) );
                  return (
                    <div key={b.id}>
                      <p>
                        {b.seance.name} - {coursDate.format('L')} à{' '}
                        {coursDate.format('LT')}
                      </p>
                      <p>{b.seance.club.name}</p>
                      <p>
                        Réservation effectuée le {moment(b.creation.date).format('L')} à{' '}
                        {moment(b.creation.date).format('LT')}.
                      </p>
                    </div>
                  );
                }
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
