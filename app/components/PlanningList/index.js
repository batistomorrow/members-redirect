import React, { Component } from 'react';
import moment from 'moment';
import {fixFalseUTC} from '../../clean/date';
import Loader from 'components/Loader';

import './style.scss';

export default class PlanningResamaniaList extends Component {

  constructor(props) {
    super(props);
    this.bookingButton = this.bookingButton.bind(this);

    this.state = {
      displayCollection: []
    };
  }

  bookingButton(rowCourse) {
    const { isFilterListVisible, courses, isFetching } = this.props;
    const user = JSON.parse(localStorage.getItem('user'));
    let booked = false;
    let waiting = false;
    let bookings = rowCourse.bookings;

    let coursDate = fixFalseUTC(rowCourse.get('date'));
    if (!rowCourse.get('bookingEnabled')) return null;
    if (rowCourse.get('bookingLink')) return null;
    if (!moment().isBefore(coursDate)) return null;

    if (moment().isBefore(moment(rowCourse.get('dateBookingOpened')))
      || moment().isAfter(moment(rowCourse.get('dateBookingClosed')))) {
      return (
        <p className={`book ${isFetching ? 'disabled' : null}`} style={{ color: "#27ae60", borderColor: "#27ae60", opacity: '0.4' }}>
          RÉSERVATION BLOQUÉE
        </p>
      );
    }
    let clientBooking = rowCourse.bookings.find( b => b.get('client').id === user.id && !b.get('canceled') );

    bookings
    .forEach(booking => {
      if (booking.get('client').id === user.id) {
        if (!booking.get('canceled') && !booking.get('waiting')) {
          booked = true;
        }
        if (!booking.get('canceled') && booking.get('waiting')) {
          waiting = true;
        }
      }
    });

    if ( clientBooking ) {
      let bId = clientBooking.id;
      if( !clientBooking.get('waiting')) {
        return (
          <p onClick={() => { this.props.handleUnbook(bId) }} className={`book cancel ${isFetching ? 'disabled' : null}`} style={{ color: "#D00", borderColor: "#D00" }}>
            ANNULER
          </p>
        );
      } else {
        return (
          <p onClick={() => { this.props.handleUnwait(bId) }} className={`book cancel ${isFetching ? 'disabled' : null}`} style={{ color: '#D00', borderColor: '#D00' }}>
            QUITTER LA LISTE D'ATTENTE
          </p>
        );  
      }
    } else {
      if (rowCourse.get('bookingLimit') > rowCourse.bookings.length) {
         return (
          <p onClick={() => { this.props.handleBook(rowCourse) }} className={`book ${isFetching ? 'disabled' : null}`} style={{ color: "#27ae60", borderColor: "#27ae60" }}>
            RÉSERVER
          </p>
        );
      } else if ( !rowCourse.get('waitingListEnabled') ){
        return (
          <p className={`book cancel ${isFetching ? 'disabled' : null}`} style={{ color: '#D00', borderColor: '#D00' }}>
            COMPLET
          </p>
        );
      } else {
        return (
          <p onClick={() => { this.props.handleWait(rowCourse) }} className={`book cancel ${isFetching ? 'disabled' : null}`} style={{ color: '#34495e', borderColor: '#34495e' }}>
            REJOINDRE LA LISTE D'ATTENTE
          </p>
        );
      }
    }
  }

  render() {
    const { isFilterListVisible, courses, isFetching } = this.props;

    if( isFetching )
      return (
        <div className="PlanningResamania_list" style={{ paddingTop: isFilterListVisible ? '0' : '104px' }} >
          <Loader />
        </div>
      );

    const user = JSON.parse(localStorage.getItem('user'));
    let displayCollection = courses.map(rowCourse => {
      let bookLink;
      let booked = false;
      let bookings = rowCourse.bookings;
      
      return (
        <div
          key={rowCourse.id}
          className="PlanningResamania_list--item"
          data-id={rowCourse.id}
        >
          <div className="container">
            <React.Fragment>
              {rowCourse.get('pictureFileName')
                ? (
                  <div
                    className={'picture pictureFile'}
                    style={{
                      backgroundImage: `url(https://s3-eu-west-1.amazonaws.com/com.clubconnect.bucket0/${rowCourse.get('pictureFileName')})`
                    }}
                  />
                ) : (
                  <div
                    className={'picture'}
                    style={{
                      backgroundColor: `#${rowCourse.get('hexColor')}`
                    }}
                  />
                )
              }
            </React.Fragment>
            <div className={rowCourse.get('coach') ? 'mainContent coachAdded' : 'mainContent'}>
              <div className={'course'}>
                <p>{rowCourse.get('name')}</p>
              </div>
              <div className={'schedules'}>
                <p>
                  {moment(rowCourse.get('date'))
                    .subtract(moment(rowCourse.get('date')).utcOffset(), 'm')
                    .format('HH[h]mm')}{' '}
                  -{' '}
                  {moment(rowCourse.get('date'))
                    .add(rowCourse.get('duration'), 'm')
                    .subtract(moment(rowCourse.get('date')).utcOffset(), 'm')
                    .format('HH[h]mm')}
                </p>
              </div>
              {!!rowCourse.coach && !!rowCourse.coach.name && <div className={'coach'}> <p>avec {rowCourse.coach.surname}</p></div> }
            </div>
          </div>
          {this.bookingButton(rowCourse)
            ? <div className="bookingContainer">{this.bookingButton(rowCourse)}</div>
            : null
          }
        </div>
      )
    });

    return (
      <div className="PlanningResamania_list" style={{ paddingTop: isFilterListVisible ? '0' : '104px' }} >
        {displayCollection.length > 0
          ? displayCollection
          : (
            <div className="no-course">
              <p>Il n'y a aucun cours ce jour là qui correspond à votre recherche !</p>
            </div>
            )
        }
      </div>
    );
  }
}
