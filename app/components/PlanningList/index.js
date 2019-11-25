import React, { Component } from 'react';
import moment from 'moment';
import {fixFalseUTC} from '../../clean/date';
import Loader from 'components/Loader';
import BookingButton from '../../containers/BookingButton';
import './style.scss';

export default class PlanningResamaniaList extends Component {

  constructor(props) {
    super(props);

    this.state = {
      displayCollection: []
    };
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
          <div className="bookingContainer">
            <BookingButton seance= {cours} disabled= {isFetching} book= {this.props.handleBook} unbook= {this.props.handleUnbook} wait= {this.props.handleWait} unwait ={this.props.handleUnwait}/>
          </div>
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
