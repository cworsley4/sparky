
var Socket = function (url, callback) {
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
  console.log('🐶' + message + ' 🐶');
}

Socket.prototype.connect = function (callback) {
  callback = callback || noop;
  var self = this;
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

Socket.prototype.on = function (event, callback) {
  this.subscribers[event] = this.subscribers[event] || [];
  this.subscribers[event].push(callback);
};

Socket.prototype.emit = function (event, data) {
  var payload = {
    event: event,
    scope: 'roommates',
    role: this.role,
    data: data
  };
  
  this.ws.send(JSON.stringify(payload));
};

Socket.prototype.broadcast = function (payload) {
  for (idx in this.subscribers[payload.event]) {
    this.subscribers[payload.event][idx].call(payload.event, payload.data);
  }
};

Socket.prototype.reconnect = function () {
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

function broadcast() {
  
}

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

//////////////////////////////////////////

var lookml = {
    "view": "user",
    "fields": {
        "dimensions": [
            {
                "name": "id",
                "primary_key": true,
                "type": "int",
                "sql": "${TABLE}.id"
            },
            {
                "name": "deleted",
                "type": "yesno",
                "sql": "${TABLE}.deleted"
            },
            {
                "name": "name",
                "sql": "CONCAT(${first_name} , ' ' , ${last_name})"
            },
            {
                "dimension": "first_name",
                "hidden": true,
                "sql": "${TABLE}.first_name"
            },
            {
                "dimension": "last_name",
                "hidden": true,
                "sql": "${TABLE}.last_name"
            }
        ],
        "measures": [
            {
                "name": "name_list",
                "type": "list",
                "list_field": "name"   
            },
            {
                "name": "count",
                "type": "count",
                "detail": "detail*"
            }
        ]
    }
}

