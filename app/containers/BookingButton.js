import React from 'react';

export default ({seance, disabled, book, unbook, wait, unwait}) => {
  let coursDate = new Date(seance.starts);
  if ( !!seance.bookingRules.cannotBookReason ) return null;

  let clientBooking = seance.booking;

  if ( clientBooking ) {
    let bId = clientBooking.id;
    if( !clientBooking.waiting ) {
      return (
        <p onClick={() => { e => book(bId) }} className={`book cancel ${disabled ? 'disabled' : null}`} style={{ color: "#D00", borderColor: "#D00" }}>
          ANNULER
        </p>
      );
    } else {
      return (
        <p onClick={() => { e => unwait(bId) }} className={`book cancel ${disabled ? 'disabled' : null}`} style={{ color: '#D00', borderColor: '#D00' }}>
          QUITTER LA LISTE D'ATTENTE
        </p>
      );  
    }
  } else {
    if (!seance.bookingRules.seats.total || seance.bookingRules.seats.total > seance.bookingRules.seats.total.booked) {
       return (
        <p onClick={() => { e => book(seance) }} className={`book ${disabled ? 'disabled' : null}`} style={{ color: "#27ae60", borderColor: "#27ae60" }}>
          RÉSERVER
        </p>
      );
    } else if ( seance.bookingRules.waitingListEnabled ){
      return (
        <p onClick={() => { e => wait(seance) }} className={`book cancel ${disabled ? 'disabled' : null}`} style={{ color: '#34495e', borderColor: '#34495e' }}>
          REJOINDRE LA LISTE D'ATTENTE
        </p>
      );
    } else {
      return (
        <p className={`book cancel ${disabled ? 'disabled' : null}`} style={{ color: '#D00', borderColor: '#D00' }}>
          COMPLET
        </p>
      );
    }
  }

  return null;
};
