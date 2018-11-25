import _ from 'lodash'
import request from 'superagent'

export default class Suggestrap {

  constructor(req, option = {}) {
    this.req = this._reqInitialize(req)
    this.option = this._optionInitialize(option)
    // A state of suggestions
    this.state = this._stateInitialize()
    // Html elements for showing suggestions
    this.element = this._elementInitialize()
    this._setEventListener()
    this.hide()
    this.keyUpHandler = _.debounce((event) => {
      if (this.isReadyToShow()) {
        // Show suggestions
        this.state['query'] = event.target.value
        if (this.hasUrl()) {
          this._fetchJson((json) => {
            if (json.length > 0) {
              this.add(json)
              this.show()
            }
          })
        } else {
          if (this.req.values.length > 0) {
            this.add(this.suggestions)
            this.show()
          }
        }
      } else {
        // Hide suggestions
        this.state['query'] = ''
        this.hide()
        this.remove()
      }
    }, this.option['delay'])
  }

  get jsonUrl() {
    if (this.hasUrl()) {
      if ('values' in this.req) {
        return this.req.values.replace(this.option.wildcard, this.state.query)
      } else {
        return this.req.url.replace(this.option.wildcard, this.state.query)
      }
    } else {
      return ""
    }
  }

  get suggestions() {
    let res = []
    if (this.req.values && this.state.query) {
      let pattern = new RegExp(this.state.query, 'i')
      for (let index = 0; index < this.req.values.length && res.length < this.option.count; index++){
        if (this.req.values[index][this.req.key].match(pattern)) {
          res.push(this.req.values[index])
        }
      }
    }
    return res
  }

  show() {
    // Set suggest position
    let rect = this.element['target'].getBoundingClientRect()
    let x = window.pageXOffset + rect.left
    let y = window.pageYOffset + rect.top + rect.height
    this.element['suggest'].style.left = Math.round(x).toString() + 'px'
    this.element['suggest'].style.top = Math.round(y).toString() + 'px'
    this.element['suggest'].style.display = 'block'
    this.state['isShow'] = true
  }

  hide() {
    this.element['suggest'].style.display = 'none'
    this.state['isShow'] = false
  }

  moveUpSuggest() {
    if (this.state['isShow']) {
      if (this.state['currentIndex'] > -1) {
        this.state['currentIndex'] -= 1
      } else {
        this.state['currentIndex'] = this.element['suggest'].childNodes.length - 1
      }
      this.activeCurrentSuggest()
    }
  }

  moveDownSuggest() {
    if (this.state['isShow']) {
      if (this.state['currentIndex'] == this.element['suggest'].childNodes.length - 1) {
        this.state['currentIndex'] = -1
      } else {
        this.state['currentIndex'] += 1
      }
      this.activeCurrentSuggest()
    }
  }

  activeCurrentSuggest() {
    for (let i = 0; i < this.element['suggest'].childNodes.length; i++) {
      this.element['suggest'].childNodes[i].className = ''
    }
    switch (this.state['currentIndex']) {
      case -1:
        break
      default:
        this.element['suggest'].childNodes[this.state['currentIndex']].className = 'suggestrap-active'
        // Insert current suggest value into the target form
        this.element['target'].value = this.element['suggest'].childNodes[this.state['currentIndex']].innerHTML
    }
  }

  add(json) {
    this.remove()
    let appendedCount = 0
    for (let val of this._parseJson(json)) {
      let suggestItem = document.createElement('li')
      suggestItem.style.textAlign = 'left'
      suggestItem.style.whiteSpace = 'nowrap'
      suggestItem.style.overflow = 'hidden'
      suggestItem.style.padding = '1px 6px'
      suggestItem.innerHTML = val[this.req['key']]
      suggestItem.addEventListener('click', (event) => {
        this.element['target'].value = event.target.innerHTML
        this.hide()
      })
      this.element['suggest'].appendChild(suggestItem)
      // Break this loop when appendCount reaches this.option['count']
      appendedCount += 1
      if (appendedCount >= this.option['count']) break
    }
    this.state['currentIndex'] = -1
  }

  remove() {
    while (this.element['suggest'].firstChild) {
      this.element['suggest'].removeChild(this.element['suggest'].firstChild)
    }
    this._stateInitialize()
  }

  isReadyToShow() {
    return (
      document.activeElement.id == this.req.target &&
      this.element.target.value.length >= this.option.minlength &&
      this.element.target.value != this.state.query
    )
  }

  hasValues() {
    return (
      'values' in this.req &&
      typeof this.req.values == 'object' &&
      this.req.values.length > 0
    )
  }

  hasUrl() {
    return (
      ('values'in this.req &&
        typeof this.req.values == 'string' &&
        this.validateUrl(this.req.values)
      ) ||
      ('url' in this.req &&
        typeof this.req.url == 'string' &&
        this.validateUrl(this.req.url)
      )  
    )
  }

  validateUrl(url) {
    return RegExp(/^https?:\/\//, 'i').test(url)
  }

  _parseJson(json) {
    if (typeof json === 'string') {
      return JSON.parse(json)
    } else if (typeof json == 'object') {
      return json
    } else {
      throw new Error('It must be JSON or Object.')
    }
  }

  _fetchJson(callbackFunc) {
    new Promise((resolve, reject) => {
      request
        .get(this.jsonUrl)
        .end((err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })
    }).then((res) => {
      callbackFunc(res.text)
      }).catch((err) => {
      console.log(err)
    })
  }

  _setEventListener() {
    // Set event when input text in target
    this.element['target'].addEventListener('keyup', (event) => {
      let invalidKeyCode = [38, 40, 37, 39, 16, 17, 13]
      let keyCode = event.keyCode
      if (!invalidKeyCode.includes(keyCode)) {
        // When valid key
        this.keyUpHandler(event)
      } else if (keyCode == 38) {
        // When press Up key
        this.moveUpSuggest()
      } else if (keyCode == 40) {
        // When press Down key
        this.moveDownSuggest()
      } else if (keyCode == 13) {
        // When press Enter key
        if (this.state['isShow'] && this.state['currentIndex'] != -1) {
          this.hide()
        } else {
          this.keyUpHandler(event)
        }
      }   
    })
    // Set event when blur on target
    this.element['target'].addEventListener('blur', (event) => {
      // Do delay for give proprity to event that suggest is clicked
      _.delay(() => {
        this.hide()
      }, 200)
    })
    // Set event when focus on target
    this.element['target'].addEventListener('focus', (event) => {
      this.keyUpHandler(event)
    })
    // Solve that the target can't fire keyup event when do auto correct in Mobile Safari
    this.element['target'].addEventListener('textInput', (event) => {
      this.keyUpHandler(event)
    })
    // Solve that the displacement of suggestion element's position occurs when resize window
    window.onresize = () => {
      if(this['show']) this.show()
    }
  }

  _reqInitialize(req) {
    // Necessary params
    if (!('target' in req)) {
      throw new Error('target is not found. This key is necessary.')
    } else if (typeof req['target'] != 'string') {
      throw new Error('target must be a string.')
    }
    if (!('key' in req)) {
      throw new Error('key is not found. This key is necessary.')
    } else if (typeof req['key'] != 'string') {
      throw new Error('key must be a string.')
    }
    if (!('values' in req) && !('url' in req)) {
      throw new Error('values and url are not found. Either key is necessary.')
    } else if ('values' in req && typeof req['values'] != 'string' && typeof req['values'] != 'object') {
      throw new Error('values must be a string or an array that has hashes.')
    } else if ('url' in req && typeof req['url'] != 'string') {
      throw new Error('url must be a string.')
    }
    return req
  }

  _optionInitialize(option) {
    // Set default options
    if (!('wildcard' in option)) option['wildcard'] = '%QUERY'
    if (!('minlength' in option)) option['minlength'] = 2
    if (!('delay' in option)) option['delay'] = 400
    if (!('count' in option)) option['count'] = 5
    return option
  }

  _stateInitialize() {
    return this.state = { query: '', isShow: false, currentIndex: -1 }
  }

  _elementInitialize() {
    let element = {
      target: document.getElementById(this.req['target']),
      suggest: document.createElement('ul'),
      style: document.createElement('style'),      
    }
    // Check whether target element exists
    if(!(element.target)) throw(this.req.target + ' element is not found.')
    // Set style element
    let _css = `
    ul#suggestrap{
      background: #fff;
      border-radius: 3px;
      box-shadow: -2px 2px 7px rgba(0,0,0,0.3);
      list-style: none;
      padding: 3px 0;
      margin: 0;
      position: absolute;
      z-index: 1000;
      width: auto;
      height: auto;
    }
    ul#suggestrap li{
      color: #333;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      padding: 1px 6px;
    }
    ul#suggestrap li.suggestrap-active{
      background: #0099ff;
      color: #fff;
    }
    ul#suggestrap li.suggestrap-active,
    ul#suggestrap li:hover{
      cursor: pointer;
      background: #4b89bf;
      color: #fff;
    }
    `
    element['style'].appendChild(document.createTextNode(_css))
    document.getElementsByTagName('head')[0].appendChild(element['style'])
    // Set target form element
    element['target'].autocomplete = 'off'
    // Set suggest element
    element['suggest'].id = 'suggestrap'
    // Insert suggest element in the next to target element
    element['target'].parentNode.insertBefore(element['suggest'], element['target'].nextSibling)
    return element
  }

}