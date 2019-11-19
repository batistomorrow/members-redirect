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
        concept: 'Tous',
        place : 'Tous'
      },
      date: moment(),
      isCalling: true,
      isFilterListVisible: false,
      isFetching: false,
      bookingDisabled: false
    }

    this.handleSelectChange = this.handleSelectChange.bind(this)
    this.triggerFilters = this.triggerFilters.bind(this)
    this.handleBook = this.handleBook.bind(this)
    this.handleUnbook = this.handleUnbook.bind(this)
    this.handleWait = this.handleWait.bind(this)
    this.getClient = this.getClient.bind(this);

    moment.locale('fr')
  }

  componentWillMount() {
    this.getClient();
  }

  getFilters() {
    const that = this;
    let queryClub = new Parse.Query(Club)
    .equalTo('objectId', that.state.club.id)
    .first()
    .then(club => {
      let r = club.get('relatedCompanies');
      if( ! r || !r.length ) {
        return {club, relatedClubs:[]};
      }
      return new Parse.Query(Club)
      .containedIn('objectId', r.map(c=>c.id) )
      .find()
      .then( relatedClubs => {
        return {club, relatedClubs}
      });
    })
    .then( ({club,relatedClubs}) => {
      let clubs = [that.state.club].concat(that.state.relatedClubs);
      return new Parse.Query(CoursTemplate)
      .containedIn('club', [that.state.club].concat(that.state.relatedClubs))
      .limit(1000)
      .ascending('name')
      .find()
      .then(conceptsList => {
        const concepts = conceptsList.map(row => row.get('name') );
        const initialRoom = club.get('initialRoom');
        const rooms = relatedClubs.map( c => c.get('classesRooms') ).flat();
        that.setState({
          relatedClubs: relatedClubs,
          rooms: rooms,
          filters: {
            room: initialRoom && Number.isInteger(initialRoom) ? rooms[initialRoom] : 'Toutes',
            concept: 'Tous',
            place : club.get('name')
          },
          concepts
        }, () => that.getCourses())
      })
    })
    .catch( e => {
      console.error(e);
    })
    ;
  }

  getClient() {

    const that = this

    return new Parse.Query(Client)
    .equalTo('objectId', JSON.parse(localStorage.getItem('user')).id)
    .first()
    .then(client => {
      that.setState({
        bookingDisabled: client.get('bookingDisabled')
      }, () => that.getFilters())
    })
    .catch( e => {
      console.error(e);
    })
    ;
  }

  getCourses() {
    this.setState({ isCalling: true })

    const that = this

    const { filters, date } = that.state
    const user = JSON.parse(localStorage.getItem('user'))

    new Parse.Query(Cours)
    .containedIn('club', [that.state.club].concat(that.state.relatedClubs))
    .greaterThanOrEqualTo('date', date.startOf('d').toDate())
    .lessThan('date', date.endOf('d').toDate())
    .ascending('date')
    .limit(1000)
    .find()
    .then(courses => {
      new Parse.Query(Booking)
      .containedIn('cours', courses)
      .include('cours')
      .equalTo('canceled', false)
      //.equalTo('client', Client.createWithoutData(user.id))
      .include('client')
      .descending('date')
      .limit(courses.length * 30)
      .find()
      .then(bookings => {
        courses.forEach(c => {
          c.bookings = [];
          bookings.forEach(b => {
            if (c.id === b.get('cours').id) {
              b.userId = user.id;
              c.bookings.push(b);
            }
          });
        });
        that.setState({ courses, isCalling: false });
      })
    })
  }

  handleLabelClick(elem) {
    if (document.createEvent) {
      let e = document.createEvent('MouseEvents')
      e.initMouseEvent('mousedown',true,true,window,0,0,0,0,0,false,false,false,false,0,null);
      this.refs[elem].dispatchEvent(e);
    }

    this.refs[elem].focus();
  }

  handleSelectChange(event) {
    const name = event.target.name;
    const value = event.target.value;

    this.setState(
      prevState => ({
        filters: {
          ...prevState.filters,
          [name]: value
        }
      })
    );
  }

  onDateChange(date) {
    this.setState(
      prevState => ({
        date
      }),
      function () {
        this.getCourses();
      }
    );
  }

  nextDay() {
    const date = this.state.date;
    date.add(1, 'd');

    this.setState(
      prevState => ({
        date
      }),
      function () {
        this.getCourses();
      }
    );
  }

  previousDay() {
    const date = this.state.date;
    date.subtract(1, 'd');

    this.setState(
      prevState => ({
        date
      }),
      function () {
        this.getCourses();
      }
    );
  }

  triggerFilters() {
    this.setState({
      isFilterListVisible: !this.state.isFilterListVisible,
      focused: false
    });
  }

  handleWait(cours) {
    return this.handleBook(cours, true);
  }

  handleBook(cours, waiting=false) {
    if(this.state.isFetching) return;

    this.setState({ isFetching: true });
    const that = this;

    let userId = JSON.parse(localStorage.getItem('user')).id;
    let coursId = cours.id;
    fetch('/api/booking', { 
      method:'POST',
      body : JSON.stringify({userId, coursId, waiting}),
      headers : {
        'content-type' : 'application/json'
      }
    })
    .then( result => {
      if(result.status === 201) {
        toast.success("Votre réservation a bien été acceptée");
        return;
      }
      return result.json()
      .then( js => {
        toast.error(js.userMsg || "La réservation a échouée");
      })
    })
    .catch( e => {
      console.error(e);
      toast.error("La réservation a échouée");
    })
    .finally( () => this.setState({ isFetching: false }, function () { that.getCourses() }) )
    ;
  }

  handleUnbook(bookingId) {
    if(this.state.isFetching) return;
    this.setState({ isFetching: true });

    const that = this;

    fetch(`/api/booking/${bookingId}`, { 
      method:'DELETE',
    })
    .then( result => {
      if(result.status === 204) {
        toast.success("Votre annulation a bien été acceptée");
        return;
      }
      return result.json()
      .then( js => {
        toast.error(js.userMsg || "L'annulation a échouée");
      })
    })
    .catch( e => {
      console.error(e);
      toast.error("L'annulation a échouée");
    })
    .finally( () => this.setState({ isFetching: false }, function () { that.getCourses() }) )
    ;
  }

  render() {

    const { isCalling, club, relatedClubs, courses, rooms, concepts, filters, date, focused, isFilterListVisible } = this.state

    if (isCalling) {
      return <div>Chargement</div>
    }

    let filteredCourses = courses
    .filter( c => {
      if (filters.room === 'Toutes') return true;
      return c.get('room') === filters.room;
    })
    .filter( c => {
      if (filters.concept === 'Tous') return true;
      return c.get('name') === filters.concept;
    })
    .filter( c => {
      if (filters.place === 'Tous') return true;
      return c.get('club').get('name') === filters.place;
    })
    ;

    // Create room's filters
    const roomFilters = rooms
    .map((rowRoom) => {
      return (
        <option key={rowRoom} value={rowRoom}>
          {rowRoom}
        </option>
      )
    });

    // Create courses' filters
    const conceptFilter = concepts
    .map((rowCourse) => {
      return (
        <option key={rowCourse} value={rowCourse}>
          {rowCourse}
        </option>
      )
    });

    const placeFilter = relatedClubs.length && relatedClubs.map( (c,i) => <option key={i} value={c.get('name')}>{c.get('name')}</option> );

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
              {placeFilter && (
                  <div className={'Planning_filters--item'}>
                  <label
                    htmlFor="place"
                    onClick={this.handleLabelClick.bind(this, 'placeFilter')}
                  >
                    Club
                  </label>
                  <select
                    className={'right'}
                    ref={'placeFilter'}
                    value={filters.place}
                    name="place"
                    onChange={this.handleSelectChange}
                  >
                    <option value="Tous">Tous</option>
                    {placeFilter}
                  </select>
                </div>
              )}
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
                handleUnwait={this.handleUnbook}
                isFetching={this.state.isFetching}
                color={getItem('club').color}
              />
            </div>
          )}
      </div>
    )
  }
}
