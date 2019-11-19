import React from 'react'
import { Home, Notifications, Bookings, Planning, Settings, Login, SignIn } from 'containers'

export const routes = [
  {
    path: '/',
    name: 'Planning',
    exact: true,
    component: () => <Planning />
  },
  {
    path: '/login',
    name: 'Connexion',
    exact: true,
    component: () => <Login />
  },
  {
    path: '/signin',
    name: 'Créer un compte',
    exact: true,
    component: () => <SignIn />
  },
  {
    path: '/planning',
    name: 'Planning',
    exact: true,
    position: 'top',
    component: () => <Planning />
  },
  {
    path: '/bookings',
    name: 'Réservations',
    exact: true,
    position: 'top',
    component: () => <Bookings />
  }
]
;