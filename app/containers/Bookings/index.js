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

export default class BookingsAndSubs extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = { activeWindow: "bookings" };
  }

  componentWillMount() {
    this.setState({ activeWindow: "bookings" });
  }

  changeWindow (name) {
    this.setState({ activeWindow: name });
  }

  render() {
    const { activeWindow } = this.state;

    return (
      <div className={"Bookings MainContainer"}>
        <div className={"Bookings__topBar"}>
          <div onClick={this.changeWindow.bind(this, "bookings")} className={activeWindow === "bookings" ? 'active' : null}>
            <p>Réservations</p>
          </div>
          <div onClick={this.changeWindow.bind(this, "subs")} className={activeWindow === "subs" ? 'active' : null}>
            <p>Abonnements</p>
          </div>
        </div>

        <div className={"Bookings__content"}>
          {activeWindow === "bookings" && <Bookings />}
          {activeWindow === "subs" && <Subs/>}
        </div>
      </div>
    )
  }
}


class Bookings extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = {
      step: "LOADING",
      bookings: []
    };
  }

  componentWillMount() {
    this.setState({ step : "LOADING" });

    const user = Client.createWithoutData(getItem('user').id);

    return listBookings({userId:user.id})
    .then( bookings => {
      this.setState({ bookings, step:'OK' });
    })
    .catch( e => {
      console.error(e);
      this.setState({ step:'ERROR' });
    })
    ;
  }

  render() {
    const { step, bookings } = this.state;

    if(step === 'LOADING') return <p>Chargement...</p>;
    if(step === 'ERROR') return <p>Une erreur est survenue...</p>;

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
 

    return (
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
    )
  }
}


let listProducts = (user) => {
  return new Parse.Query(Product)
  .limit(100)
  .equalTo('client', user)
  .include(['template', 'template.club'])
  .find()
  ;
}

class Subs extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = {
      step: 'LOADING',
      products: []
    };
  }

  componentWillMount() {
    this.setState({ step : 'LOADING' });

    const user = Client.createWithoutData(getItem('user').id);

    return listProducts(user)
    .then( products => {
      console.log(products, 'products');
      this.setState({ products, step:'OK' });
    })    
    .catch( e => {
      console.error(e);
      this.setState({ step:'ERROR' });
    })
    ;
  }

  render() {
    const { step, products } = this.state;

    if(step === 'LOADING') return <p>Chargement...</p>;
    if(step === 'ERROR') return <p>Une erreur est survenue...</p>;

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
              <br/><p>{r.get('template').get('club').get('name')}</p>
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
            <br/><p>{r.get('template').get('club').get('name')}</p>
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
              <br/><p>{r.get('template').get('club').get('name')}</p>
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
            <br/><p>{r.get('template').get('club').get('name')}</p>
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
      <div>
        <h3>Actifs</h3>
        {currentTickets}
        {currentSubs}
        <h3>Expirés/finis</h3>
        {pastTickets}
        {pastSubs}
      </div>
    );
  }
}
