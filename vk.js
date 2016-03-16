'use strict'

function copy(from, to) {
  for (var i in from)
    to[i] = from[i]
}

function merge(map1, map2) {
  var map = {}
  copy(map1, map)
  copy(map2, map)
  return map
}

function date(seconds) {
  var pad = s => (s+='').length < 2 ? '0'+s : s
  var d = new Date(seconds*1000)
  
  var year  = d.getFullYear()
  var date  = d.getDate()
  var month = d.getMonth() + 1
  
  return year+'-'+pad(month)+'-'+pad(date)
}

var proto = (module.exports = function(locale, domain) {
  this.domain = domain
  this.locale = locale
}).prototype

proto.params = {
  version: '5.45',
  method: 'wall.get',
  owner: '1',
}

proto.map = {
  ru: domain => 'ru.'+domain,
}

proto.domainLocal = function(domain) {
  var locale = this.locale || ''
  var map = this.map[locale] || (domain => domain)
  return map(domain || this.domain)
}

var VkSdk = require('vksdk')

proto.request = function(method, params, listener) {
  params = merge(this.params, params)
  params.domain = this.domainLocal(params.domain)
  let vk = new VkSdk({
    appId: 1, // no matter
    version: '5.45',
  })
  vk.request(method, params, listener)
  return vk
}

proto.get = function(params, listener, filter) {
  let self = this
  
  copy({ vesion: '5.45' }, params)
  
  function call(result) {
    copy({ domain: self.domainLocal(params.domain) }, result)
    listener(result)
  }
  function err(text, e) {
    console.error(text, e)
    call({ error: { text: text, instance: e } })
  }
  
  let vk = this.request('wall.get', params, function(res) {
    if (res.error || !res.response)
      return err('VK error')
    if (!res.response.items)
      return err('no items')
    
    filter = filter || (item => item)
    
    let items = []
    for (let i in res.response.items) {
      let item = res.response.items[i]
      items.push(filter(merge(item, { date: date(item.date) })))
    }
    call({ items: items })
  })
  for (let error in ['http-error', 'parse-error'])
    vk.on(error, e => err(error, e))
  
  return vk
}

