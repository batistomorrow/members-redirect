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

    let coursDate = new Date(rowCourse.starts);
    if ( !!rowCourse.bookingRules.cannotBookReason ) return null;

    let clientBooking = rowCourse.booking;

    if ( clientBooking ) {
      let bId = clientBooking.id;
      if( !clientBooking.waiting ) {
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
      if (!rowCourse.bookingRules.seats.total || rowCourse.bookingRules.seats.total > rowCourse.bookingRules.seats.total.booked) {
         return (
          <p onClick={() => { this.props.handleBook(rowCourse) }} className={`book ${isFetching ? 'disabled' : null}`} style={{ color: "#27ae60", borderColor: "#27ae60" }}>
            RÉSERVER
          </p>
        );
      } else if ( rowCourse.bookingRules.waitingListEnabled ){
        return (
          <p onClick={() => { this.props.handleWait(rowCourse) }} className={`book cancel ${isFetching ? 'disabled' : null}`} style={{ color: '#34495e', borderColor: '#34495e' }}>
            REJOINDRE LA LISTE D'ATTENTE
          </p>
        );
      } else {
        return (
          <p className={`book cancel ${isFetching ? 'disabled' : null}`} style={{ color: '#D00', borderColor: '#D00' }}>
            COMPLET
          </p>
        );
      }
    }

    return null;
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
              {cours.display.picture
                ? (
                  <div className={'picture pictureFile'} style={{backgroundImage: `url(${cours.display.picture})`}} />
                ) : (
                  <div className={'picture'} style={{ backgroundColor: `#${cours.display.color}` }}
                  />
                )
              }
            </React.Fragment>
            <div className={cours.coach ? 'mainContent coachAdded' : 'mainContent'}>
              <div className={'course'}>
                <p>{cours.name}</p>
              </div>
              <p><b>{cours.club.name}</b>{cours.room.name}</p>
              <div className={'schedules'}>
                <p>
                  { moment(cours.starts).format('HH[h]mm')}{' '}
                  -{' '}
                  {moment(cours.ends).format('HH[h]mm')}
                </p>
              </div>
            </div>
          </div>
          <div className="bookingContainer">{this.bookingButton(cours)}</div>
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
