import { setItem, getItem, removeItem } from 'utils/localStorage/index'
import isObject from 'lodash/isObject'

export const isLoggedIn = () => {
  const user = getItem('user')
  const club = getItem('club')

  return user && isObject(user) && club && isObject(club) ? true : false
}

export const login = (user, club) => {
  setItem('user', user)
  setItem('club', club)
}

export const logout = () => {
  removeItem('user')
  removeItem('club')  
}