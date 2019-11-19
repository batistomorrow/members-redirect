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
    const { isFetching } = this.props;
    const user = JSON.parse(localStorage.getItem('user'));

    let coursDate = fixFalseUTC(rowCourse.get('date'));
    if (!rowCourse.get('bookingEnabled')) return null;
    if (rowCourse.get('bookingLink')) return null;

    let clientBooking = rowCourse.bookings.find( b => b.get('client').id === user.id && !b.get('canceled') );

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

    if( !courses.length ){
      return (
        <div className="PlanningResamania_list" style={{ paddingTop: isFilterListVisible ? '0' : '104px' }} >
          <div className="no-course">
            <p>Il n'y a aucun cours ce jour là qui correspond à votre recherche !</p>
          </div>
        </div>
      );
    }

    let displayCollection = courses.map(cours => {
      return (
        <div
          key={cours.id}
          className="PlanningResamania_list--item"
          data-id={cours.id}
        >
          <div className="container">
            <React.Fragment>
              {cours.get('pictureFileName')
                ? (
                  <div
                    className={'picture pictureFile'}
                    style={{
                      backgroundImage: `url(https://s3-eu-west-1.amazonaws.com/com.clubconnect.bucket0/${cours.get('pictureFileName')})`
                    }}
                  />
                ) : (
                  <div
                    className={'picture'}
                    style={{
                      backgroundColor: `#${cours.get('hexColor')}`
                    }}
                  />
                )
              }
            </React.Fragment>
            <div className={cours.get('coach') ? 'mainContent coachAdded' : 'mainContent'}>
              <div className={'course'}>
                <p>{cours.get('name')}</p>
              </div>
              <p>{cours.get('club').get('name')}</p>
              <div className={'schedules'}>
                <p>
                  {moment(cours.get('date'))
                    .subtract(moment(cours.get('date')).utcOffset(), 'm')
                    .format('HH[h]mm')}{' '}
                  -{' '}
                  {moment(cours.get('date'))
                    .add(cours.get('duration'), 'm')
                    .subtract(moment(cours.get('date')).utcOffset(), 'm')
                    .format('HH[h]mm')}
                </p>
              </div>
              {!!cours.coach && !!cours.coach.name && <div className={'coach'}> <p>avec {cours.coach.surname}</p></div> }
            </div>
          </div>
          {this.bookingButton(cours)
            ? <div className="bookingContainer">{this.bookingButton(cours)}</div>
            : null
          }
        </div>
      )
    });

    return (
      <div className="PlanningResamania_list" style={{ paddingTop: isFilterListVisible ? '0' : '104px' }} >
        {displayCollection}
      </div>
    );
  }
}
