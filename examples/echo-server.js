var   sys = require('sys'),
      rpc = require('../src/bertrpc');

var server = rpc.createServer(7000, 'localhost');

server.addListener('client_disconnected', function() {
  sys.debug('a client disconnected');
});

server.addListener('client_connected', function() {
  sys.debug('a client connected');
});

server.addListener('remote_invocation', function(type, mod, fun, args, res) {
  sys.debug('remote invocation: ' + mod + ':' + fun);
});

server.expose('echo', {
  // return 'hello' no matter what
  hello: function(what) {
    return "hello";
  },

  // return arguments exactly as provided
  echo: function() {
    var args = [];
    for ( var i = 0; i < arguments.length; i++ )
      args[i] = arguments[i];
    return args;
  }
});

server.listen();
