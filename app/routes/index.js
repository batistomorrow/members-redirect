import React from 'react'
import { Home, Notifications, Planning, Settings } from 'containers'

export const routes = [
  {
    path: '/home',
    name: 'Accueil',
    exact: true,
    position: 'top',
    component: () => <Home />
  },
  {
    path: '/planning',
    name: 'Planning',
    exact: true,
    position: 'top',
    component: () => <Planning />
  },
  {
    path: '/notifications',
    name: 'Notifications',
    exact: true,
    position: 'top',
    component: () => <Notifications />
  },
  {
    path: '/settings',
    name: 'Paramètres',
    exact: true,
    position: 'bottom',
    component: () => <Settings />
  }
]