import root from 'window-or-global'
import isObject from 'lodash/isObject'
import isArray from 'lodash/isArray'

export const setItem = (key, value) => {
  let computed = value

  if (isObject(value) || isArray(value)) {
    computed = JSON.stringify(value)
  }

  root.localStorage.setItem(key, computed)

  return { key: computed }
}

export const removeItem = key => root.localStorage.removeItem(key)

export const getItem = key => {
  const content = localStorage.getItem(key)
  try {
    return JSON.parse(content)
  } catch (e) {
    return content
  }
}