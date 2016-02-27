var vk = new (require('vksdk'))({
  appId: 1,
  https: true,
  version: '5.45',
})

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

proto.request = function(params, listener) {
  if ("undefined" === listener) {
    listener = domain
    domain = false
  }
  
  params = merge(this.params, params)
  params.domain = this.domainLocal(params.domain)
  
  vk.request('wall.get', params, listener)
  return vk
}

proto.get = function(params, listener, filter) {
  self = this
  function call(result) {
    copy({ domain: self.domainLocal(params.domain) }, result)
    listener(result)
  }
  function err(text, e) {
    call({ error: { text: text, instance: e } })
  }
  copy({ vesion: '5.45' }, params)
  var req = this.request(params, function(res) {
    if (res.error || !res.response)
      return err('VK error')
    if (!res.response.items)
      return err('no items')
    
    filter = filter || (item => item)
    defalt = item => filter(merge(item, {
      date: date(item.date)
    }))
    
    var items = []
    for (var i in res.response.items)
      items.push(defalt(res.response.items[i]))
    call({ items: items })
  })
  for (var error in ['http-error', 'parse-error'])
    req.on(error, e => err(error, e))
  
  return req
}

