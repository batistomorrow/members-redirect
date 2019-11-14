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
      isFetching: false,
      bookingDisabled: false
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
    // that.getFilters()
    that.getClient()
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

        const initialRoom = club.get('initialRoom')
        const rooms = club.get('classesRooms')

        that.setState({
          rooms: rooms,
          filters: {
            room: initialRoom && Number.isInteger(initialRoom) ? rooms[initialRoom] : 'Toutes',
            concept: 'Tous'
          },
          concepts
        }, () => that.getCourses())
      })
    })
  }

  getClient() {

    const that = this

    let query = new Parse.Query(Client)

    query.equalTo('objectId', JSON.parse(localStorage.getItem('user')).id)

    query.first().then(client => {

      that.setState({
        bookingDisabled: client.get('bookingDisabled')
      }, () => that.getFilters())

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

    query.find()
    .then(courses => {
      // query all bookings for the selected day courses, not matter their status
      new Parse.Query(Booking)
      .containedIn('cours', courses)
      .include('cours')
      .equalTo('client', Client.createWithoutData(user.id))
      .include('client')
      .descending('date')
      .limit(150)
      .find()
      .then(fetchedBookings => {
        courses.forEach(aCourse => {
          aCourse.bookings = []
          fetchedBookings.forEach(aFetchedBooking => {
            if (aCourse.id === aFetchedBooking.get('cours').id) {
              aFetchedBooking.userId = user.id
              aCourse.bookings.push(aFetchedBooking)
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

  handleBook(cours) {
    if(this.state.isFetching) return;

    this.setState({ isFetching: true });
    const that = this;

    let userId = JSON.parse(localStorage.getItem('user')).id;
    let coursId = cours.id;
    fetch('/api/booking', { 
      method:'POST',
      body : JSON.stringify({userId, coursId}),
      headers : {
        'content-type' : 'application/json'
      }
    })
    .then( result => {
      if(result.status === 201) {
        toast.success("Votre réservation a bien été acceptée");
        return;
      }
      toast.error("La réservation a échouée");

      result.json()
      .then( js => console.error("Cannot book", js) )
      .catch( e => console.error(e) );

    })
    .catch( e => {
      console.error(e);
      toast.error("La réservation a échouée");
    })
    .finally( () => this.setState({ isFetching: false }, function () { that.getCourses() }) )
    ;
  }

  handleBookWTF(rowCourse) {
    if(this.state.isFetching) return;
    this.setState({ isFetching: true });

    const that = this;
    const courseProductTemplates = rowCourse.get('productTemplates');
    const creditsCost = rowCourse.get('creditsCost');
    const user = JSON.parse(localStorage.getItem('user'));

    if (courseProductTemplates && courseProductTemplates.length > 0) {

      const { user, club } = that.state

      let queryUserSubProducts1 = new Parse.Query("Product")
      .equalTo("type", 'PRODUCT_TYPE_SUBSCRIPTION')
      .greaterThanOrEqualTo('expireAt', moment().toDate());

      let queryUserSubProducts2 = new Parse.Query("Product")
      .equalTo("type", 'PRODUCT_TYPE_SUBSCRIPTION')
      .doesNotExist('expireAt');

      let mainQuerySub = Parse.Query.or(queryUserSubProducts1, queryUserSubProducts2)

      let queryUserTicketProducts1 = new Parse.Query("Product")
      .descending('createdAt')
      .equalTo('type', 'PRODUCT_TYPE_TICKET')
      .greaterThanOrEqualTo('expireAt', moment().toDate())
      .greaterThan('credit', 0);

      let queryUserTicketProducts2 = new Parse.Query("Product")
      .descending('createdAt')
      .equalTo('type', 'PRODUCT_TYPE_TICKET')
      .doesNotExist('expireAt')
      .greaterThan('credit', 0);

      let mainQueryTicket = Parse.Query.or(queryUserTicketProducts1, queryUserTicketProducts2)

      Parse.Query.or(mainQuerySub, mainQueryTicket)
      .equalTo('client', that.state.user)
      .equalTo('club', that.state.club)
      .find()
      .then( userValidProducts => {

        let hasRight = false;
        const courseProductTemplates = rowCourse.get('productTemplates');

        courseProductTemplates.forEach(r => {
          userValidProducts.forEach(s => {
            if (s.get('template').id == r.id) {
              hasRight = true;
            }
          })
        });

        if(!hasRight) {
          toast.error("Vous ne disposez pas de l'abonnement/des tickets nécessaire(s) pour réserver ce cours.")
          that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
          return;
        }

        const { courses } = that.state;

        let mBooking = null;
        // check if there's already a booking for this course and this user
        rowCourse.bookings.forEach(eachBooking => {
          if (eachBooking.userId === user.id) {
            mBooking = eachBooking
          }
        })
        if (mBooking) {
          mBooking.set('dateBooking', new Date())
          mBooking.set('waiting', false)
          mBooking.set('canceled', false)
          mBooking.save()
          .then( myObject => {

            if (courseProductTemplates && courseProductTemplates.length > 0) {

              const queryProductSubtract = new Parse.Query(Product)
              .equalTo('client', that.state.user)
              .equalTo('club', that.state.club)
              .descending('createdAt')
              .equalTo('type', 'PRODUCT_TYPE_TICKET')
              .greaterThanOrEqualTo('expireAt', moment().toDate())
              .greaterThan('credit', 0);

              const queryProductSubtract2 = new Parse.Query(Product)
              .equalTo('client', that.state.user)
              .equalTo('club', that.state.club)
              .descending('createdAt')
              .equalTo('type', 'PRODUCT_TYPE_TICKET')
              .doesNotExist('expireAt')
              .greaterThan('credit', 0);

              Parse.Query.or(queryProductSubtract, queryProductSubtract2)
              .first()
              .then(toSubtract => {
                if (toSubtract) {
                  toSubtract.set('credit', toSubtract.get('credit') - creditsCost)
                  toSubtract.save()
                  .then( () => {
                    toast.success("Votre réservation a bien été acceptée")
                    that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
                  })
                } else {
                  toast.success("Votre réservation a bien été acceptée")
                  that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
                }
              })
            }
            else {
              toast.success("Votre réservation a bien été acceptée")
              that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
            }
          })
        } else {
          const booking = new Booking()
          booking.set('dateBooking', new Date())
          booking.set('waiting', false)
          booking.set('canceled', false)
          booking.set('client', Client.createWithoutData(getItem('user').id))
          booking.set('cours', rowCourse)
          booking.set('courseName', rowCourse.get('name'))
          booking.set('dateCourse', rowCourse.get('date'))
          booking.save()
          .then( () => {
            if ( !courseProductTemplates || !courseProductTemplates.length ) {
              toast.success("Votre réservation a bien été acceptée")
              that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
            } else {
              const queryProductSubtract = new Parse.Query(Product)
              .equalTo('client', that.state.user)
              .equalTo('club', that.state.club)
              .descending('createdAt')
              .equalTo('type', 'PRODUCT_TYPE_TICKET')
              .greaterThanOrEqualTo('expireAt', moment().toDate())
              .greaterThan('credit', 0)
              ;

              const queryProductSubtract2 = new Parse.Query(Product)
              .equalTo('client', that.state.user)
              .equalTo('club', that.state.club)
              .descending('createdAt')
              .equalTo('type', 'PRODUCT_TYPE_TICKET')
              .doesNotExist('expireAt')
              .greaterThan('credit', 0)
              ;

              Parse.Query.or(queryProductSubtract, queryProductSubtract2)
              .first()
              .then(toSubtract => {
                if (toSubtract) {
                  toSubtract.set('credit', toSubtract.get('credit') - creditsCost)
                  toSubtract.save()
                  .then( () => {
                    toast.success("Votre réservation a bien été acceptée")
                    that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
                  })
                } else {
                  toast.success("Votre réservation a bien été acceptée")
                  that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
                }
              })
            }
          })
        }
      })
      .catch( error => {
        console.error(error)
      })
      ;
    }

    else { // logic w/o products rules

      const { courses } = that.state

      // check if there's already a booking for this course and this user
      let mBooking = null
      rowCourse.bookings.forEach(eachBooking => {
        if (eachBooking.userId === user.id) {
          mBooking = eachBooking
        }
      })
      if (mBooking) {
        mBooking.set('dateBooking', new Date())
        mBooking.set('waiting', false)
        mBooking.set('canceled', false)
        mBooking.save()
        .then( () => {
          toast.success("Votre réservation a bien été acceptée !")
          that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
        })
      }
      else {
        const booking = new Booking()
        booking.set('dateBooking', new Date())
        booking.set('waiting', false)
        booking.set('canceled', false)
        booking.set('client', Client.createWithoutData(getItem('user').id))
        booking.set('cours', rowCourse)
        booking.set('courseName', rowCourse.get('name'))
        booking.set('dateCourse', rowCourse.get('date'))
        booking.save()
        .then( () => {
          toast.success("Votre réservation a bien été acceptée !")
          that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
        })
      }

    }
  }

  handleUnbook(rowCourse) {
    if ( this.state.isFetching) return;
    this.setState({ isFetching: true })

    const that = this;
    const { courses } = this.state;
    const creditsCost = rowCourse.get('creditsCost');
    const user = JSON.parse(localStorage.getItem('user'));

    let waitingList = rowCourse.bookings.filter(o => o.get('waiting') && !o.get('canceled') );

    waitingList.sort(function (a, b) {
      return new Date(b.get('createdAt')) - new Date(a.get('createdAt'));
    });

    rowCourse.bookings.filter(b => b.userId === user.id)
    .forEach(b => {
      b.set("canceled", true);
      b.set("waiting", false);
      b.set("dateCanceled", new Date());
      b.save()
      .then((result) => {
        // if there's a product rule, the next booking can only be taken in "shotgun mode" - first arrived, first served
        // so we notify all clients on the waiting list

        if (rowCourse.productTemplates && rowCourse.productTemplates.length > 0) {
          const queryProductAdd = new Parse.Query(Product)
          .equalTo('client', that.state.user)
          .equalTo('club', that.state.club)
          .descending('createdAt')
          .equalTo('type', 'PRODUCT_TYPE_TICKET')
          .greaterThanOrEqualTo('expireAt', moment().toDate())
          .greaterThan('credit', 0)

          const queryProductAdd2 = new Parse.Query(Product)
          .equalTo('client', that.state.user)
          .equalTo('club', that.state.club)
          .descending('createdAt')
          .equalTo('type', 'PRODUCT_TYPE_TICKET')
          .doesNotExist('expireAt')
          .greaterThan('credit', 0)

          Parse.Query.or(queryProductAdd, queryProductAdd2)
          .first()
          .then(toAdd => {
            if (toAdd) {
              toAdd.set('credit', toAdd.get('credit') + creditsCost)
              toAdd.save().then(added => {
                if (waitingList.length > 0) {that.sendWaitingListAlert(waitingList)}
                else {
                  toast.success("Votre réservation a bien été annulée")
                  that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
                }
              })
            }
            else {
              if (waitingList.length > 0) {that.sendWaitingListAlert(waitingList)}
              else {
                toast.success("Votre réservation a bien été annulée")
                that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
              }
            }
          })
        }
        else {
          // no products - automatically book first guy on the list AND alert him w/ a push notification
          if (waitingList.length > 0) {
            let listRecipients = []
            let oldest = waitingList[0]
            listRecipients.push(oldest)
            oldest.set("canceled", false);
            oldest.set("waiting", false);
            oldest.set("dateBooking", new Date());
            // insert waiting item in current booking list
            oldest.save().then((result) => {
              // warn the guy
              that.sendWaitingListAlert(listRecipients)
            })
          }
          else {
            toast.success("Votre réservation a bien été annulée.")
            that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
          }
        }
      })
    })
  }

  handleWait(rowCourse) {
    if ( this.state.isFetching) return;
    this.setState({ isFetching: true })

    const that = this
    const courseProductTemplates = rowCourse.get('productTemplates')
    const creditsCost = rowCourse.get('creditsCost')
    const user = JSON.parse(localStorage.getItem('user'))


    if (courseProductTemplates && courseProductTemplates.length > 0) {

      const { user, club } = that.state

      let queryUserSubProducts1 = new Parse.Query("Product")
      .equalTo("type", 'PRODUCT_TYPE_SUBSCRIPTION')
      .greaterThanOrEqualTo('expireAt', moment().toDate())

      let queryUserSubProducts2 = new Parse.Query("Product")
      .equalTo("type", 'PRODUCT_TYPE_SUBSCRIPTION')
      .doesNotExist('expireAt')
      ;

      let mainQuerySub = Parse.Query.or(queryUserSubProducts1, queryUserSubProducts2)

      let queryUserTicketProducts1 = new Parse.Query("Product")
      .descending('createdAt')
      .equalTo('type', 'PRODUCT_TYPE_TICKET')
      .greaterThanOrEqualTo('expireAt', moment().toDate())
      .greaterThan('credit', 0)
      ;

      let queryUserTicketProducts2 = new Parse.Query("Product")
      .descending('createdAt')
      .equalTo('type', 'PRODUCT_TYPE_TICKET')
      .doesNotExist('expireAt')
      .greaterThan('credit', 0)
      ;

      let mainQueryTicket = Parse.Query.or(queryUserTicketProducts1, queryUserTicketProducts2)

      Parse.Query.or(mainQuerySub, mainQueryTicket)
      .equalTo('client', that.state.user)
      .equalTo('club', that.state.club)
      .find()
      .then( userValidProducts => {
        let hasRight = false
        const courseProductTemplates = rowCourse.get('productTemplates')

        courseProductTemplates.forEach(r => {
          userValidProducts.forEach(s => {
            if (s.get('template').id == r.id) {
              hasRight = true
            }
          })
        })

        if (hasRight) {

          const { courses } = that.state

          const booking = new Booking()
          booking.set('dateQueue', new Date())
          booking.set('waiting', true)
          booking.set('canceled', false)
          booking.set('client', Client.createWithoutData(getItem('user').id))
          booking.set('cours', rowCourse)
          booking.set('courseName', rowCourse.get('name'))
          booking.set('dateCourse', rowCourse.get('date'))

          // check if there's already a booking for this course and this user
          let mBooking = null
          rowCourse.bookings.forEach(eachBooking => {
            if (eachBooking.userId === user.id) {
              mBooking = eachBooking
            }
          })
          if (mBooking) {

            mBooking.set('dateQueue', new Date())
            mBooking.set('waiting', true)
            mBooking.set('canceled', false)
            mBooking.save()
            .then( () => {
              toast.success("Vous êtes maintenant en liste d'attente")
              that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
            })
          }
          else {
            const booking = new Booking()
            booking.set('dateQueue', new Date())
            booking.set('waiting', true)
            booking.set('canceled', false)
            booking.set('client', Client.createWithoutData(getItem('user').id))
            booking.set('cours', rowCourse)
            booking.set('courseName', rowCourse.get('name'))
            booking.set('dateCourse', rowCourse.get('date'))
            booking.save()
            .then( () => {
              toast.success("Vous êtes maintenant en liste d'attente")
              that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
            })
          }
        }
        else {
          toast.error("Vous ne disposez pas de l'abonnement/des tickets nécessaire(s) pour vous mettre en liste d'attente.")
          that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
        }
      })
      .catch( error => {
        console.log(error)
      })
    }
    else {
      const { courses } = that.state;
      // check if there's already a booking for this course and this user
      let mBooking = rowCourse.bookings.find(b => b.userId === user.id);
      if (mBooking) {
        mBooking.set('dateQueue', new Date());
        mBooking.set('waiting', true);
        mBooking.set('canceled', false);
        mBooking.save()
        .then( () => {
          toast.success("Vous avez bien rejoint la liste d'attente.");
          that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() });
        })
      }
      else {
        const booking = new Booking();
        booking.set('dateQueue', new Date());
        booking.set('waiting', true);
        booking.set('canceled', false);
        booking.set('client', Client.createWithoutData(getItem('user').id));
        booking.set('cours', rowCourse);
        booking.set('courseName', rowCourse.get('name'));
        booking.set('dateCourse', rowCourse.get('date'));
        booking.save()
        .then( () => {
          toast.success("Vous avez bien rejoint la liste d'attente.");
          that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() });
        })
      }
    }
  }

  handleUnwait(rowCourse) {
    if ( this.state.isFetching) return;
    this.setState({ isFetching: true })

    const that = this
    const user = JSON.parse(localStorage.getItem('user'))

    const { courses } = this.state

    rowCourse.bookings.filter(b => b.userId === user.id)
    .forEach(b => {
      b.set("canceled", true);
      b.set("waiting", false);
      b.set("dateCanceled", new Date());
      b.save()
      .then( result => {
        toast.success("Vous n'êtes plus sur la liste d'attente.");
        that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() });
      })
      .catch(e => {
        console.error(e);
      })
      ;
    })
    ;
  }

  sendWaitingListAlert(bookings) {
    let course = bookings[0].get('cours')
    let recipients = bookings.map(b => b.get('client').id );

    const that = this;
    const clubObjectId = JSON.parse(localStorage.getItem('club')).id;
    let alert = null;
    if (bookings.length>1){
      alert = `🎉 Une place s'est libérée pour le cours de ` + course.get('name') + `. `
      + `Réservez votre place si vous souhaitez venir !`
      ;
    }
    else {
      alert = `🎉 Une place s'est libérée pour le cours de ` + course.get('name') + `. `
      + `Votre place a été réservée automatiquement comme vous étiez sur liste d'attente. Pensez à annuler si vous ne pouvez plus assister au cours.`
      ;
    }

    let queryInstallation = new Parse.Query(Parse.Installation)
    .containedIn('clientObjectId', recipients)
    .equalTo('clubObjectId', clubObjectId)
    ;

    Parse.Push.send(
      {
        where: queryInstallation,
        data: {
          alert,
          badge: 1,
          sound: 'default'
        }
      },
      { useMasterKey: true }
    )
    .then( () => {
      
      const Club = Parse.Object.extend('Club')
      const Notification = Parse.Object.extend('Notification')

      let notification = new Notification()
      notification.set('clients', recipients)
      notification.set('date', new Date())
      notification.set('club', Club.createWithoutData(clubObjectId))
      notification.set('alert', alert)
      notification.set('labels', ['A un ou plusieurs adhérents'])

      return notification
      .save()
      .then( () => {
        toast.success("Votre réservation a bien été annulée.")
        that.setState({ isFetching: false, isCalling: true }, function () { that.getCourses() })
      })
      ;
    })
    .catch( e => {
      console.log('Push error', e);
    })
    ;
  }

  render() {

    const { isCalling, courses, rooms, concepts, filters, date, focused, isFilterListVisible } = this.state

    if (isCalling) {
      return <div>Chargement</div>
    }

    let filteredCourses = courses
    .filter( c => {
      if (filters.room === 'Toutes') return true;
      return row.get('room') === filters.room;
    })
    .filter( c => {
      if (filters.concept === 'Tous') return true;
      return c.get('name') === filters.concept;
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
