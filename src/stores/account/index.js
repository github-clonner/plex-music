import Axios from 'axios'
import UUID from 'uuid'
import { flow, filter, map } from 'lodash/fp'
import { observable, action } from 'mobx'
import { AppState } from 'stores'
import { getItem, setItem } from 'support/storage'

import Device from './device'

export default class Account {
  @observable isLoggedIn = false
  @observable isLoggingIn = false

  constructor(appState) {
    this.appState = appState
    const loginParams = this.getLoginParams()
    if (loginParams) {
      this.login(loginParams)
    }
  }

  async login(loginParams) {
    const clientIdentifier = this.getClientIdentifier()

    this.setIsLoggingIn(true)
    try {
      const auth = await this.performLogin(loginParams, clientIdentifier)
      if (auth && auth.data && auth.data.authToken) {
        if (typeof auth.data.authToken === 'string') {
          this.setDevices(await this.fetchDevices(auth.data.authToken))
          setItem('loginParams', loginParams)
          this.setLoginParams(loginParams)
          this.setIsLoggedIn(true)

          if (this.devices.length === 1) {
            this.appState.connect(this.devices[0])
          }
        }
      }
    } finally {
      this.setIsLoggingIn(false)
    }
  }

  @action
  logOut() {
    this.setLoginParams({ login: '', password: '' })
    this.setDevices([])
    this.setIsLoggedIn(false)
    localStorage.removeItem('loginParams')
  }

  @action
  setLoginParams(loginParams) {
    this.loginParams = loginParams
  }

  @action
  setDevices(devices) {
    this.devices = devices
  }

  @action
  setIsLoggingIn(value) {
    this.isLoggingIn = value
  }

  @action
  setIsLoggedIn(value) {
    this.isLoggedIn = value
  }

  @action
  getLoginParams() {
    return getItem('loginParams')
  }

  @action
  getClientIdentifier() {
    const value = getItem('X-Plex-Client-Identifier')
    if (value) {
      return value
    }
    const newValue = UUID.v4()
    setItem('X-Plex-Client-Identifier', newValue)
    return newValue
  }

  async fetchDevices(authToken) {
    const res = await Axios.get('https://plex.tv/api/resources', {
      params: { includeHttps: 0, includeRelay: 1, 'X-Plex-Token': authToken },
      responseType: 'document',
    })
    return flow(
      map(device => Device.parse(device)),
      filter(d => d.presence && d.provides === 'server'),
    )(res.data.getElementsByTagName('Device'))
  }

  async performLogin(loginParams, clientIdentifier) {
    return Axios.post('https://plex.tv/api/v2/users/signin', loginParams, {
      headers: {
        'X-Plex-Client-Identifier': clientIdentifier,
        'X-Plex-Device-Name': 'Plex Music',
        'X-Plex-Product': 'Plex Music',
        'X-Plex-Device': 'OSX',
        Accept: 'application/json',
      },
    })
  }
}
