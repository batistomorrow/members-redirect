import React, { Component } from 'react'
import moment from 'moment'

import Loader from 'components/Loader'

import './style.scss'

class PlanningResamaniaList extends Component {
  constructor (props) {
    super(props)

    this.state = {
      isCalling: false,
      displayCollection: []
    }
  }
 
  render () {
    const { isFilterListVisible, courses } = this.props
    const { isCalling } = this.state

    let displayCollection = courses.map(rowCourse => {
      let bookLink

      // WAITING LIST ANNULER
      // ANNULER

      // WAITING LIST DONE
      // DONE
      if (rowCourse.get('bookingEnabled') && !rowCourse.get('bookingLink')) {
        if (rowCourse.isBooked && rowCourse.booking && moment().isBefore(moment(rowCourse.get('date'))) && rowCourse.isWaiting && rowCourse.get('waitingListEnabled')) {
          bookLink = (
            <p
              onClick={() => {this.props.handleUnwait(rowCourse)}}
              className={`book cancel ${isCalling ? 'disabled' : null}`}
              style={{ color: '#D00', borderColor: '#D00' }}
            >
              SE DÉSINSCRIRE DE LA LISTE D'ATTENTE
            </p>
          )
        }  else if (moment().isBefore(moment(rowCourse.get('date'))) && rowCourse.get('bookingLimit') <= rowCourse.bookings.length && rowCourse.get('waitingListEnabled')) {
          bookLink = (
            <p
              onClick={() => {this.props.handleWait(rowCourse)}}
              className={`book cancel ${isCalling ? 'disabled' : null}`}
              style={{ color: '#34495e', borderColor: '#34495e' }}
            >   
              S'INSCRIRE SUR LA LISTE D'ATTENTE
            </p>
          )
        } else if (rowCourse.isBooked && rowCourse.booking && moment().isBefore(moment(rowCourse.get('date')))) {
          bookLink = (
            <p
              onClick={() => {this.props.handleUnbook(rowCourse)}}
              className={`book cancel ${isCalling ? 'disabled' : null}`}
              style={{ color: '#D00', borderColor: '#D00' }}
            >
              ANNULER
            </p>
          )
        } else if (rowCourse.isBooked && rowCourse.booking && moment().isAfter(moment(rowCourse.get('date')))) {
          bookLink = (
            <p
              className={`book cancel ${isCalling ? 'disabled' : null}`}
              style={{ color: '#D00', borderColor: '#D00', opacity: '0.4' }}
            >
              ANNULER
            </p>
          )
        } else if (rowCourse.get('bookingLimit') <= rowCourse.bookings.length) {
          bookLink = (
            <p
              className={`book cancel ${isCalling ? 'disabled' : null}`}
              style={{ color: '#D00', borderColor: '#D00' }}
            >
              COMPLET
            </p>
          )
        } else if (moment().isAfter(moment(rowCourse.get('date'))) || moment().isBefore(moment(rowCourse.get('dateBookingOpened'))) || moment().isAfter(moment(rowCourse.get('dateBookingClosed')))) {
          bookLink = (
            <p
              className={`book ${isCalling ? 'disabled' : null}`}
              style={{ color: "#27ae60", borderColor: "#27ae60", opacity: '0.4' }}
            >
              RÉSERVER
            </p>
          )
        } else {
          bookLink = (
            <p
            onClick={() => {this.props.handleBook(rowCourse)}}
              className={`book ${isCalling ? 'disabled' : null}`}
              style={{ color: "#27ae60", borderColor: "#27ae60" }}
            >
              RÉSERVER
            </p>
          )
        }
      }

      // #34495e

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
                    .subtract(2, 'h')
                    .format('HH[h]mm')}{' '}
                  -{' '}
                  {moment(rowCourse.get('date'))
                    .add(rowCourse.get('duration'), 'm')
                    .subtract(2, 'h')
                    .format('HH[h]mm')}
                </p>
              </div>
              {rowCourse.coach && rowCourse.coach.name ? (
                <div className={'coach'}>
                  <p>avec {rowCourse.coach.surname}</p>
                </div>
              ) : null}
            </div>
          </div>
          {bookLink ? (
            <div className="bookingContainer">{bookLink}</div>
            ) : null
          }
        </div>
      )
    })

    return !isCalling ? (
      <div
        className="PlanningResamania_list"
        style={{ paddingTop: isFilterListVisible ? '0' : '104px' }}
      >
        {displayCollection.length > 0 ? (
          displayCollection
        ) : (
          <div className="no-course">
            <p>
              Il n'y a aucun cours ce jour là qui correspond à votre recherche !
            </p>
          </div>
        )}
      </div>
    ) : (
      <div
        className="PlanningResamania_list"
        style={{ paddingTop: isFilterListVisible ? '0' : '104px' }}
      >
        <Loader />
      </div>
    )
  }
}

export default PlanningResamaniaList
