import React, { Component } from 'react'
import Parse from 'parse'
import moment from 'moment'
import 'moment/locale/fr'

import 'react-dates/initialize'
import { SingleDatePicker } from 'react-dates'

import Ionicon from 'react-ionicons'

import { getItem } from 'utils/localStorage'
import { Club, Client, Booking, Cours, CoursTemplate, Product } from 'utils/parse'

import PlanningList from 'components/PlanningList'

import { toast } from 'react-toastify'

import './style.scss'

export default class Planning extends Component {
  constructor(props) {
    super(props)
  
    this.state = {
      club: Club.createWithoutData(getItem('club').id),
      user: Client.createWithoutData(getItem('user').id),
      focused: false,
      courses: [],
      rooms: [],
      concepts: [],
      filters: {
        room: 'Toutes',
        concept: 'Tous'
      },
      date: moment(),
      isCalling: true,
      isFilterListVisible: false,
      isFetching: false
    }

    this.handleSelectChange = this.handleSelectChange.bind(this)
    this.triggerFilters = this.triggerFilters.bind(this)
    this.handleBook = this.handleBook.bind(this)
    this.handleUnbook = this.handleUnbook.bind(this)
    this.handleWait = this.handleWait.bind(this)
    this.handleUnwait = this.handleUnwait.bind(this)

    moment.locale('fr')
  }

  componentWillMount() {
    const that = this
    
    that.getFilters()
  }

  getFilters() {
    const that = this

    let queryClub = new Parse.Query(Club)

    queryClub.equalTo('objectId', that.state.club.id)

    queryClub.first().then(club => {
      let queryConcepts = new Parse.Query(CoursTemplate)

      queryConcepts.equalTo('club', that.state.club)
      queryConcepts.limit(1000)
      queryConcepts.ascending('name')

      queryConcepts.find().then(conceptsList => {
        const concepts = conceptsList.map(row => {
          return row.get('name')
        })

        that.setState({
          rooms: club.get('classesRooms'),
          concepts
        }, () => that.getCourses())
      })
    })
  }
  
  getCourses() {
    this.setState({ isCalling: true })

    const that = this

    const { filters, date } = that.state
    const user = JSON.parse(localStorage.getItem('user'))

    let query = new Parse.Query(Cours)

    query.equalTo('club', that.state.club)
    query.greaterThanOrEqualTo('date', date.startOf('d').toDate())
    query.lessThan('date', date.endOf('d').toDate())
    query.ascending('date')
    query.limit(1000)  

    query.find().then(courses => {
      let queryBookings = new Parse.Query(Booking)
      queryBookings.containedIn('cours', courses)
      
      queryBookings.find().then(list => {
        courses.forEach(row => {
          row.bookings = []
          list.forEach(rowBook => {
            if (row.id === rowBook.get('cours').id) {
              if (rowBook.get('client').id === user.id && !rowBook.get('cancelled') && !rowBook.get('waiting')) {
                row.isBooked = true
                row.booking = rowBook
              } else if (rowBook.get('client').id === user.id && !rowBook.get('cancelled') && rowBook.get('waiting')) {
                row.isBooked = true
                row.isWaiting = true
                row.booking = rowBook
              }

              row.bookings.push(rowBook)
            }
          })
        })

        that.setState({ courses, isCalling: false })
      })
    })
  }

  handleLabelClick (elem) {
    if (document.createEvent) {
      let e = document.createEvent('MouseEvents')
      e.initMouseEvent(
        'mousedown',
        true,
        true,
        window,
        0,
        0,
        0,
        0,
        0,
        false,
        false,
        false,
        false,
        0,
        null
      )
      this.refs[elem].dispatchEvent(e)
    }

    this.refs[elem].focus()
  }

  handleSelectChange (event) {
    const name = event.target.name
    const value = event.target.value

    this.setState(
      prevState => ({
        filters: {
          ...prevState.filters,
          [name]: value
        }
      })
    )
  }

  onDateChange (date) {
      this.setState(
        prevState => ({
          date
        }),
        function () {
          this.getCourses()
        }
      )
  }
  nextDay () {
      const date = this.state.date
      date.add(1, 'd')

      this.setState(
        prevState => ({
          date
        }),
        function () {
          this.getCourses()
        }
      )
  }
  previousDay () {
      const date = this.state.date
      date.subtract(1, 'd')

      this.setState(
        prevState => ({
          date
        }),
        function () {
          this.getCourses()
        }
      )
  }

  triggerFilters () {
    this.setState({
      isFilterListVisible: !this.state.isFilterListVisible,
      focused: false
    })
  }
  
  handleBook(rowCourse) {
    const that = this

    if (!that.state.isFetching) {
      that.setState({ isFetching: true })

      // On check si il a le droit

      const { courses } = that.state

      console.log(rowCourse)

      const booking = new Booking()
      booking.set('dateBooking', new Date())
      booking.set('waiting', false)
      booking.set('canceled', false)
      booking.set('client', Client.createWithoutData(getItem('user').id))
      booking.set('cours', rowCourse)
      booking.set('courseName', rowCourse.get('name'))
      booking.set('dateCourse', rowCourse.get('date'))

      booking.save().then((myObject) => {      
        courses.forEach(row => {
          if (row.id === rowCourse.id) {
            row.isBooked = true
            row.booking = myObject
          }
        })

        if (rowCourse.productTemplates && rowCourse.productTemplates.length > 0) {
          const queryProductSubtract = new Parse.Query(Product)
      
          queryProductSubtract.equalTo('client', that.state.user)
          queryProductSubtract.equalTo('club', that.state.club)
          queryProductSubtract.descending('createdAt')
          queryProductSubtract.equalTo('type', 'PRODUCT_TYPE_TICKET')
          queryProductSubtract.greaterThanOrEqualTo('expireAt', moment().toDate())
          queryProductSubtract.greaterThan('credit', 0)
        
          const queryProductSubtract2 = new Parse.Query(Product)
        
          queryProductSubtract2.equalTo('client', that.state.user)
          queryProductSubtract2.equalTo('club', that.state.club)
          queryProductSubtract2.descending('createdAt')
          queryProductSubtract2.equalTo('type', 'PRODUCT_TYPE_TICKET')
          queryProductSubtract2.doesNotExist('expireAt')
          queryProductSubtract2.greaterThan('credit', 0)
        
          const mainQuerySubtract = Parse.Query.or(queryProductSubtract, queryProductSubtract2)

          mainQuerySubtract.first().then(toSubtract => {
            toSubtract.set('credit', toSubtract.get('credit') - 1)

            toSubtract.save().then(subtracted => {
              toast.success("Votre réservation a bien été acceptée")

              that.setState({ courses, isFetching: false })
            })
          })
        } else {
          toast.success("Votre réservation a bien été acceptée")

          that.setState({ courses, isFetching: false })
        }
      })
    }
  }

  handleUnbook (rowCourse) {
    const that = this
    const { courses } = this.state

    if (!that.state.isFetching) {
      that.setState({ isFetching: true })

      rowCourse.booking.destroy().then((myObject) => {      
        courses.forEach(row => {
          if (row.id === rowCourse.id) {
            row.isBooked = false
            delete row.booking
          }
        })

        if (rowCourse.productTemplates && rowCourse.productTemplates.length > 0) {
          const queryProductAdd = new Parse.Query(Product)
      
          queryProductAdd.equalTo('client', that.state.user)
          queryProductAdd.equalTo('club', that.state.club)
          queryProductAdd.descending('createdAt')
          queryProductAdd.equalTo('type', 'PRODUCT_TYPE_TICKET')
          queryProductAdd.greaterThanOrEqualTo('expireAt', moment().toDate())
          queryProductAdd.greaterThan('credit', 0)
        
          const queryProductAdd2 = new Parse.Query(Product)
        
          queryProductAdd2.equalTo('client', that.state.user)
          queryProductAdd2.equalTo('club', that.state.club)
          queryProductAdd2.descending('createdAt')
          queryProductAdd2.equalTo('type', 'PRODUCT_TYPE_TICKET')
          queryProductAdd2.doesNotExist('expireAt')
          queryProductAdd2.greaterThan('credit', 0)
        
          const mainQueryAdd = Parse.Query.or(queryProductAdd, queryProductAdd2)
        
          mainQueryAdd.first().then(toAdd => {
            toAdd.set('credit', toAdd.get('credit') + 1)
    
            toAdd.save().then(added => {
              toast.success("Votre réservation a bien été annulée")
    
              that.setState({ courses, isFetching: false })
            })
          })
        } else {
          toast.success("Votre réservation a bien été annulée")
  
          that.setState({ courses, isFetching: false })
        }
      })
    }
  }

  handleWait (rowCourse) {
    const that = this

    if (!that.state.isFetching) {
      that.setState({ isFetching: true })

      const { courses } = that.state

      const booking = new Booking()
      booking.set('dateQueue', new Date())
      booking.set('waiting', true)
      booking.set('canceled', false)
      booking.set('client', Client.createWithoutData(getItem('user').id))
      booking.set('cours', rowCourse)

      booking.save().then((myObject) => {      
        courses.forEach(row => {
          if (row.id === rowCourse.id) {
            row.isBooked = true
            row.isWaiting = true
            row.booking = myObject
          }
        })

        toast.success("Vous êtes maintennt en liste d'attente")

        that.setState({ courses, isFetching: false })
      })
    }
  }

  handleUnwait (rowCourse) {
    const that = this

    if (!that.state.isFetching) {
      that.setState({ isFetching: true })

      const { courses } = this.state

      rowCourse.booking.destroy().then((myObject) => {      
        courses.forEach(row => {
          if (row.id === rowCourse.id) {
            row.isBooked = false
            row.isWaiting = false
            delete row.booking
          }
        })

        toast.success("Votre place en liste d'attente a bien été annulée")

        that.setState({ courses, isFetching: false })
      })
    }
  }
  
  render() {
    const { isCalling, courses, rooms, concepts, filters, date, focused, isFilterListVisible } = this.state

    if (isCalling) {
      return <div>Chargement</div>
    } else {
      let filteredCourses = courses

      // Filtering
      if (filters.room !== 'Toutes') {
        filteredCourses = filteredCourses.filter(row => {
          return row.get('room') === filters.room
        })
      }
      if (filters.concept !== 'Tous') {
        filteredCourses = filteredCourses.filter(row => {
          return row.get('name') === filters.concept
        })
      }

      // Create room's filters
      const roomFilters = rooms
        .map((rowRoom) => {
          return (
            <option key={rowRoom} value={rowRoom}>
              {rowRoom}
            </option>
          )
        })

      // Create courses' filters
      const conceptFilter = concepts
        .map((rowCourse) => {
          return (
            <option key={rowCourse} value={rowCourse}>
              {rowCourse}
            </option>
          )
        })

      return (
        <div className={'Planning MainContainer'}>
          <div
            className={'Planning_topBar'}
            style={{ backgroundColor: getItem('club').color }}
          >
            <div
              className={'Planning_topBar--filtersToggler'}
              onClick={this.triggerFilters}
            >
              <div>
                <span>
                  FILTRER LES COURS<Ionicon
                    icon="md-funnel"
                    fontSize="14px"
                    color={getItem('club').color}
                  />
                </span>
              </div>
            </div>
          </div>
          <div className={'Planning_dateBar'}>
            <div
              className={'Planning_dateBar--arrow-back'}
              onClick={this.previousDay.bind(this)}
            >
              <Ionicon
                icon="ios-arrow-back"
                fontSize="32px"
                color={getItem('club').color}
              />
            </div>
            <SingleDatePicker
              date={date}
              onDateChange={date => this.onDateChange(date)}
              focused={focused}
              onFocusChange={({ focused }) => this.setState({ focused })}
              id="your_unique_id"
              orientation="vertical"
              withFullScreenPortal
              hideKeyboardShortcutsPanel
              enableOutsideDays
              noBorder
              regular
              displayFormat="dddd DD MMMM"
            />
            <div
              className={'Planning_dateBar--arrow-forward'}
              onClick={this.nextDay.bind(this)}
            >
              <Ionicon
                icon="ios-arrow-forward"
                fontSize="32px"
                color={getItem('club').color}
              />
            </div>
          </div>
          {isFilterListVisible ? (
            <div>
              <div className={'Planning_filters'}>
                <div className={'Planning_filters--item'}>
                  <label
                    htmlFor="room"
                    onClick={this.handleLabelClick.bind(this, 'roomFilter')}
                  >
                    Salle
                  </label>
                  <select
                    className={'right'}
                    ref={'roomFilter'}
                    value={filters.room}
                    name="room"
                    onChange={this.handleSelectChange}
                  >
                    <option value="Toutes">Toutes</option>
                    {roomFilters}
                  </select>
                </div>
                <div className={'Planning_filters--item'}>
                  <label
                    htmlFor="concept"
                    onClick={this.handleLabelClick.bind(this, 'conceptFilter')}
                  >
                    Cours
                  </label>
                  <select
                    className={'right'}
                    ref={'conceptFilter'}
                    value={filters.concept}
                    name="concept"
                    onChange={this.handleSelectChange}
                  >
                    <option value="Tous">Tous</option>
                    {conceptFilter}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '153px' }} />
            </div>
          ) : null}
          {isCalling.list ? (
            <Loader />
          ) : (
            <div>
              <PlanningList
                isFilterListVisible={isFilterListVisible}
                courses={filteredCourses}
                handleBook={this.handleBook}
                handleUnbook={this.handleUnbook}
                handleWait={this.handleWait}
                handleUnwait={this.handleUnwait}
                isFetching={this.state.isFetching}
                color={getItem('club').color}
              />
            </div>
          )}
        </div>
      )
    }
  }
}
