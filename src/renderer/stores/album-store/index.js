import _ from 'lodash'
import async from 'async'
import mousetrap from 'mousetrap'

import {
  observable,
  computed,
  autorun,
  action,
  IObservableArray,
  toJS,
} from 'mobx'
import { Album } from 'models'
import { getItem, setItem } from 'support/storage'

import AppState from 'stores/app-state'
import Connection from 'stores/connection'
import { OrderFn, match } from './support'

export default class AlbumStore {
  @observable isLoading = false
  @observable isFiltering = false
  @observable albums = observable.array()
  @observable matches = observable.array()

  @observable query = getItem('query', '')
  @observable order = getItem('order', Object.keys(OrderFn)[0])

  constructor(appState) {
    this.appState = appState

    autorun(() => {
      setItem('query', this.query)
      setItem('order', this.order)
    }, 500)

    autorun(() => {
      this.setIsFiltering(true)
      async.filter(
        this.albums,
        (album, done) => {
          done(null, match(album, this.filterSet))
        },
        (err, matches) => {
          this.setMatches(matches.sort(OrderFn[this.order]))
          this.setIsFiltering(false)
        },
      )
    }, 500)

    autorun(this.serialize)

    Object.keys(OrderFn).forEach((order, i) => {
      mousetrap.bind(`command+${i + 1}`, () => this.setOrder(order))
    })

    this.deserialize()
  }

  get connection() {
    return this.appState.connection
  }

  get sectionAlbumsKey() {
    if (this.appState.sectionKey) {
      return `${this.appState.sectionKey}:albums`
    }
  }

  @action.bound
  deserialize() {
    if (this.appState.sectionKey) {
      this.setAlbums(getItem(this.sectionAlbumsKey, []).map(a => new Album(this.connection, a)))
    }
  }

  serialize = () => {
    if (this.appState.sectionKey) {
      setItem(
        this.sectionAlbumsKey,
        this.albums.map(({ connection, ...props }) => props),
      )
    }
  }

  @action.bound
  async fetch(displaySpinner = this.albums.length === 0) {
    this.setIsLoading(displaySpinner)
    try {
      this.setAlbums(await this.appState.connection.albums.findAll(this.appState.section))
    } finally {
      this.setIsLoading(false)
    }
  }

  @action.bound
  setIsFiltering(value) {
    this.isFiltering = value
  }

  @action.bound
  setIsLoading(value) {
    this.isLoading = value
  }

  @action.bound
  setMatches(albums) {
    this.matches.replace(albums)
  }

  @action.bound
  setAlbums(albums) {
    this.albums.replace(albums)
  }

  @action.bound
  clearFilter() {
    this.setQuery('')
  }

  @action.bound
  setQuery(text) {
    this.query = text
  }

  @action.bound
  setOrder(value) {
    this.order = value
  }

  @computed
  get filterSet() {
    const predicates = {}
    const query = _.reduce(
      [/(\w+):(\w+)/g, /(\w+):"([^"]+)"/g, /(\w+):'([^']+)'/g],
      (_query, regex) =>
        _query.replace(regex, (__, key, value) => {
          predicates[key] = value
          return ''
        }),
      this.query,
    )

    return { query: query.trim(), ...predicates }
  }
}
