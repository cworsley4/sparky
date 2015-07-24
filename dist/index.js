(function outer(modules, cache, entries){

  /**
   * Global
   */

  var global = (function(){ return this; })();

  /**
   * Require `name`.
   *
   * @param {String} name
   * @api public
   */

  function require(name){
    if (cache[name]) return cache[name].exports;
    if (modules[name]) return call(name, require);
    throw new Error('cannot find module "' + name + '"');
  }

  /**
   * Call module `id` and cache it.
   *
   * @param {Number} id
   * @param {Function} require
   * @return {Function}
   * @api private
   */

  function call(id, require){
    var m = cache[id] = { exports: {} };
    var mod = modules[id];
    var name = mod[2];
    var fn = mod[0];
    var threw = true;

    try {
      fn.call(m.exports, function(req){
        var dep = modules[id][1][req];
        return require(dep || req);
      }, m, m.exports, outer, modules, cache, entries);
      threw = false;
    } finally {
      if (threw) {
        delete cache[id];
      } else if (name) {
        // expose as 'name'.
        cache[name] = cache[id];
      }
    }

    return cache[id].exports;
  }

  /**
   * Require all entries exposing them on global if needed.
   */

  for (var id in entries) {
    if (entries[id]) {
      global[entries[id]] = require(id);
    } else {
      require(id);
    }
  }

  /**
   * Duo flag.
   */

  require.duo = true;

  /**
   * Expose cache.
   */

  require.cache = cache;

  /**
   * Expose modules
   */

  require.modules = modules;

  /**
   * Return newest require.
   */

   return require;
})({
1: [function(require, module, exports) {

var sparky = require('./lib/sparky');

}, {"./lib/sparky":2}],
2: [function(require, module, exports) {

var debugLogger = require('debug')('ws:sparky');

var Sparky = function (url, callback) {
  this.url = url;
  this.connect(callback);
  this.subscribers = {};
  
  registerInternalListeners();
};

var noop = function () {}

var externalBroadcast = noop;

function registerInternalListeners() {
  console.log('Registering listeners that don\'t yet exist');
}

function debug(message) {
  if (message instanceof Object) {
    message = JSON.stringify(message);
  }
  
  debugLogger('🐶' + message + ' 🐶');
}

Sparky.prototype.connect = function (callback) {
  var self = this;
  callback = callback || noop;

  var ws = new WebSocket(this.url);
  ws.onopen = function () {
    onOpen.apply(arguments);
    callback(true);
  };
  
  ws.onclose = function () {
    onClose.apply(arguments);
    callback(false);
  };
 
  ws.onmessage = function (data) {
    // Is valid?
    var payload = JSON.parse(data.data);

    debug(payload.data);
    debug(payload.event);
    
    if(!payload.event || !payload.event.length) {
      self.emit('system::invalid:message', payload.data);
      return;
    }
    
    var systemMessage = payload.event.indexOf('system::');
    if (systemMessage > -1) {
      internalBroadcast();
    }
    
    self.broadcast(payload);
  };
  
  this.ws = ws;
}

Sparky.prototype.on = function (event, callback) {
  this.subscribers[event] = this.subscribers[event] || [];
  this.subscribers[event].push(callback);
};

Sparky.prototype.emit = function (event, data) {
  var emitHooks = this.subscribers['system::emit'];
  var payload = {
    event: event,
    scope: 'roommates',
    role: this.role,
    data: data
  };
  
  this.ws.send(JSON.stringify(payload));
};

Sparky.prototype.broadcast = function (payload) {
  for (idx in this.subscribers[payload.event]) {
    this.subscribers[payload.event][idx].call(payload.event, payload.data);
  }
};

Sparky.prototype.reconnect = function () {
  var self = this;
  var attempts = 0;
  var timeout = 1000;

  var connect = function () {
    self.connect(function (isConnected) {
      if (isConnected) {
        attempts = 0;
        return clearTimeout(ticker); 
      } else if (attempts < 5 || !isConnected) {
        ticker();
      }
      
      attempts++;
    });
  };
  
  var ticker = function () {
    setTimeout(connect, calc());
  };
  
  var calc = function () {
    timeout = (timeout * timeout);
    return timeout;
  };
  
  ticker();
};

// Private

function internalBroadcast(event, payload) {
  if (!payload instanceof Object) {
    payload = JSON.parse(payload);
  }

  var sub, eventSubscribers;
  var events = Object.keys(this.subscribers);

  for(var i=0; i < events.length; i++) {
    eventSubscribers = this.subscribers[events[i]];
    eventSubscribers = eventSubscribers || [];

    for(var j=0; j < eventSubscribers.length; j++) {
      sub = eventSubscribers[j];
      sub.call(event, payload);
    }
  }
}

function onOpen () {
  console.log('Sparky is by your side 🐶');
}

function onMessage () {
  console.log(arguments);
}

function onClose () {
  console.log('Sparky ran away');
  this.reconnect();
}

function castSystemEvent (event) {
  if (!event) {
    return false;
  }
  
  return 'system::' + event;
}

}, {}]}, {}, {"1":""})