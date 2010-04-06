var   sys = require('sys'),
      rpc = require('../src/bertrpc');

server = rpc.createServer(7001, 'localhost');

server.addListener('client_disconnected', function() {
  sys.debug('a client disconnected');
});

server.addListener('client_connected', function() {
  sys.debug('a client connected');
});

// server.addListener('remote_invocation', function(type, mod, fun, args, res) {
  // sys.debug('remote invocation: ' + mod + ':' + fun);
// });

server.expose('math', {
    // return the sum of an array of numeric values
    sum: function(values) {
      var res = 0;
      for (var i = 0; i < values.length; i++)
          res += values[i];
      return res;
    },

    // return the average of an array of numeric values
    avg: function(values) {
      return this.sum(values) / values.length;
    }
});

server.listen();
