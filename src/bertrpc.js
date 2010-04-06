// bertrpc.js
//
// BERT-RPC is a schemaless binary remote procedure call
// protocol by Tom Preston-Warner. It's based on the BERT
// (Binary ERlang Term) serialization format.
// <http://bert-rpc.org/>
//
// Copyright (c) 2009 Ryan Tomayko <tomayko.com/about>
// See COPYING for licensing information.
// <http://github.com/rtomayko/node-bertrpc>
//
// TODO errors
// TODO client interface should be more node-like
// TODO better client calling interface
// TODO cast

var sys = require('sys'),
    events = require('events'),
    tcp = require('tcp'),
    bert = require('./bert');

// Client

function Client(port, host, callback) {
  var self = this;

  this.connection = tcp.createConnection(port, host);
  this.callbacks = [];
  this.connection.setEncoding('binary');
  this.reader = new Reader(function(size, term) {
    var callback = self.callbacks.shift();
    var reply = term[0];
    var value = term[1];
    callback(value);
  });

  this.connection.addListener('connect', function() {
    callback(self);
  });

  this.connection.addListener('end', function() {
    self.emit('end');
  });

  this.connection.addListener('data', function(data) {
    self.reader.read(data);
  });
};
sys.inherits(Client, process.EventEmitter);

Client.prototype.call = function(mod, fun, args, callback) {
  var packet = bert.tuple(bert.atom('call'), bert.atom(mod), bert.atom(fun),
                          args);
  var data = bert.encode(packet);
  this.callbacks.push(callback);
  this.connection.write(bert.int_to_bytes(data.length, 4));
  this.connection.write(data);
};

Client.prototype.mod = function(mod) {
  var self = this;
  return {
    call: function(fun, args, callback) {
      self.call(mod, fun, args, callback);
    }
  };
};

Client.prototype.close = function() {
  this.connection.close();
};

// Server

function Server(port, host) {
  var self = this;

  this.port = port;
  this.host = host;
  this.modules = [];

  this.connection = tcp.createServer(function(connection) {
    connection.setEncoding('binary');
    connection.reader = new Reader(function(size, term) {
      var type = term[0].toString();
      var mod = term[1].toString();
      var fun = term[2].toString();
      var args = term[3];
      var result = self.dispatch(type, mod, fun, args);
      var packet = bert.tuple(bert.atom('reply'), result);
      var data = bert.encode(packet);
      connection.write(bert.int_to_bytes(data.length, 4));
      connection.write(data);
      self.emit('remote_invocation', type, mod, fun, args, result);
    });

    connection.addListener('data', function(data) {
      this.reader.read(data);
    });

    connection.addListener('end', function() {
      self.emit('client_disconnected');
      connection.close();
    });

    self.emit('client_connected');
  });
};
sys.inherits(Server, process.EventEmitter);

Server.prototype.listen = function() {
  this.connection.listen(this.port, this.host);
};

Server.prototype.expose = function(mod, obj) {
  var funs = [];
  for (var fun in obj) {
    if (typeof(obj[fun]) == 'function')
      funs.push(fun);
  }
  this.modules[mod] = obj;
  return obj;
};

Server.prototype.dispatch = function(type, mod, fun, args) {
  if (module = this.modules[mod]) {
    if (fun = module[fun]) {
      if (fun.apply) {
        return fun.apply(module, args);
      } else {
        throw 'no such fun';
      }
    } else {
      throw 'no such fun'
    }
  } else {
    throw 'no such module'
  }
};

Server.prototype.close = function() {
  this.connection.close();
};

// Buffered Reader

function Reader(callback) {
  this.buf = "";
  this.size = null;
  this.callback = callback;
}

Reader.prototype.read = function(data) {
  this.buf += data;
  while (this.size || this.buf.length >= 4) {
    if (this.size == null) {
      this.size = bert.bytes_to_int(this.buf, 4);
      this.buf = this.buf.substring(4);
    } else if (this.buf.length >= this.size) {
      this.callback(this.size, bert.decode(this.buf.substring(0, this.size)));
      this.buf = this.buf.substring(this.size);
      this.size = null;
    } else {
      break;
    }
  }
};

// External Interface

exports.createServer = function(host, port) {
  return new Server(host, port);
};

exports.connect = function(host, port, callback) {
  return new Client(host, port, callback);
};

// vim: ts=2 sw=2 expandtab
