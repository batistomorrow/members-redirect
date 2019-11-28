import React, { Component } from 'react'
import Parse from 'parse'
import moment from 'moment'
import 'moment/locale/fr'
import Loader from '../../components/Loader/';
import 'react-dates/initialize'
import { SingleDatePicker } from 'react-dates'

import Ionicon from 'react-ionicons'

import { getItem } from 'utils/localStorage'
import { Club, Client, Booking, Cours, CoursTemplate } from 'utils/parse'

import PlanningList from 'components/PlanningList'

import { toast } from 'react-toastify'

import './style.scss'

let listSeances = ({clubs, dmin, dmax})=> {
  return fetch(`/api/seance?clubs=${clubs}&date_min=${dmin}&date_max=${dmax}`)
  .then( result => result.json() )
};

let listBookings = ({userId}) => {
  return fetch(`/api/booking?user=${userId}`)
  .then( result => result.json())
  ;
}

function loadClubsDatas(clubId) {
  return new Parse.Query(Club)
  .equalTo('objectId', clubId)
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
    let allClubs = [club].concat(relatedClubs);
    return new Parse.Query(CoursTemplate)
    .containedIn('club', allClubs)
    .limit(1000)
    .ascending('name')
    .find()
    .then(conceptsList => {
      const concepts = conceptsList.map(row => row.get('name') );
      const rooms = allClubs.map( c => c.get('classesRooms') ).flat();
      return { club, relatedClubs, concepts, rooms};
    })
  })
  ;
}

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
      isFetching: false
    }

    this.handleSelectChange = this.handleSelectChange.bind(this)
    this.triggerFilters = this.triggerFilters.bind(this)
    this.handleBook = this.handleBook.bind(this)
    this.handleUnbook = this.handleUnbook.bind(this)
    this.handleWait = this.handleWait.bind(this)
    this.firstLoad = this.firstLoad.bind(this);
    this.reload = this.reload.bind(this);
    moment.locale('fr')
  }

  componentWillMount() {
    this.firstLoad();
  }

  firstLoad(){
    this.setState({ isCalling:true});
    let club = this.state.club;
    loadClubsDatas(club.id)
    .then( ({club, relatedClubs, concepts, rooms}) => {
      this.setState({
        isCalling:false,
        relatedClubs, concepts, rooms,
        initialRoom : club.get('initialRoom'),
        filters: {
          room: 'Toutes',
          concept: 'Tous',
          place : club.get('name')
        }
      }, () => this.reload() );
    })
    .catch( e => {
      console.error(e);
    })
    ;

  }

  reload(){
    this.setState({ isCalling: true });
    let userId = JSON.parse(localStorage.getItem('user')).id;
    let clubs = [this.state.club].concat(this.state.relatedClubs).map(c=>c.id).join(',');
    let dmin = this.state.date.startOf('d').toDate().getTime();
    let dmax = this.state.date.endOf('d').toDate().getTime();

    return Promise.all([listSeances({clubs,dmin,dmax}), listBookings({userId})])
    .then( ([seances, bookings]) => {
      bookings.forEach(b => {
        let s = seances.find(s => s.id === b.seance.id);
        if(s) s.booking = b;
      })
      this.setState({ isCalling: false, courses:seances })
    })
    .catch( e => {
      console.error(e);
    })
    ;    
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
    this.setState( prevState => ({date}), () => this.reload() );
  }

  nextDay() {
    const date = this.state.date;
    date.add(1, 'd');

    this.setState( prevState => ({date}), () => this.reload() );
  }

  previousDay() {
    const date = this.state.date;
    date.subtract(1, 'd');

    this.setState( prevState => ({date}), () => this.reload() );
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
    .finally( () => this.setState({ isFetching: false },  ()=> { that.reload() }) )
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
    .finally( () => this.setState({ isFetching: false }, function () { that.reload() }) )
    ;
  }

  render() {
    const { isCalling, club, relatedClubs, courses, rooms, concepts, filters, date, focused, isFilterListVisible } = this.state

    if (isCalling) return <Loader />;

    let filteredCourses = courses
    .filter( c => {
      if (filters.room === 'Toutes') return true;
      return c.room.name === filters.room;
    })
    .filter( c => {
      if (filters.concept === 'Tous') return true;
      return c.name === filters.concept;
    })
    .filter( c => {
      if (filters.place === 'Tous') return true;
      return c.club.name === filters.place;
    })
    ;

    const roomFilters = !!rooms.length && rooms.map( rowRoom => <option key={rowRoom} value={rowRoom}>{rowRoom}</option> );
    const conceptFilter = !!concepts.length && concepts.map( rowCourse => <option key={rowCourse} value={rowCourse}>{rowCourse}</option> );

    let allClubs = [club].concat(relatedClubs);
    const placeFilter = !!relatedClubs.length && allClubs.map( (c,i) => <option key={i} value={c.get('name')}>{c.get('name')}</option> );

    return (
      <div className={'Planning MainContainer'}>
        <div className={'Planning_topBar'} style={{ backgroundColor: getItem('club').color }} >
          <div className={'Planning_topBar--filtersToggler'} onClick={this.triggerFilters}>
            <div>
              <span>
                FILTRER LES COURS<Ionicon icon="md-funnel" fontSize="14px" color={getItem('club').color} />
              </span>
            </div>
          </div>
        </div>
        <div className={'Planning_dateBar'}>
          <div className={'Planning_dateBar--arrow-back'} onClick={this.previousDay.bind(this)}>
            <Ionicon icon="ios-arrow-back" fontSize="32px" color={getItem('club').color}/>
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
          <div className={'Planning_dateBar--arrow-forward'} onClick={this.nextDay.bind(this)} >
            <Ionicon icon="ios-arrow-forward" fontSize="32px" color={getItem('club').color} />
          </div>
        </div>
        {!!isFilterListVisible && (
          <div>
            <Filters onFilterChange = {this.handleSelectChange}
              placeChoices = {placeFilter} placeValue = {this.state.filters.place}
              roomChoices={roomFilters} roomValue = {this.state.filters.rooms}
              conceptChoices = {conceptFilter} conceptValue  = {this.state.filters.rooms}
            />
            <div style={{ marginTop: '153px' }} />
          </div>
        )}
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
      </div>
    )
  }
}

const Filters = ({onFilterChange, placeChoices, placeValue, roomChoices, roomValue, conceptChoices, conceptValue}) => {
  return (
    <div className={'Planning_filters'}>
      {!!placeChoices && !!!!placeChoices.length && (
          <div className={'Planning_filters--item'}>
          <label htmlFor="place">Club</label>
          <select className={'right'} value={placeValue} name="place" onChange={onFilterChange} >
            <option value="Tous">Tous</option>
            {placeChoices}
          </select>
        </div>
      )}
      {!!roomChoices && !!!!roomChoices.length && (
        <div className={'Planning_filters--item'}>
          <label htmlFor="room">Salle</label>
          <select className={'right'} value={roomValue} name="room" onChange={onFilterChange} >
            <option value="Toutes">Toutes</option>
            {roomChoices}
          </select>
        </div>
      )}

      {!!conceptChoices && !!!!conceptChoices.length && (
        <div className={'Planning_filters--item'}>
          <label htmlFor="concept">Cours</label>
          <select className={'right'} value={conceptValue} name="concept" onChange={onFilterChange}>
            <option value="Tous">Tous</option>
            {conceptChoices}
          </select>
        </div>
      )}
    </div>
  );
}