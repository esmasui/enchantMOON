/*
 * Copyright (C) 2013 uPhyca Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var port = process.env.PORT || 3000;
var http = require('http');
var socketio = require('socket.io');
var fs = require('fs')
var server = http.createServer(function(req, res) {
     res.writeHead(200, {"Content-Type":"text/html"});
     var output = fs.readFileSync("./local.html", "utf-8");
     res.end(output);
}).listen(port);

//Eagle hack
(function() {
	function boundary(s) {
		return s + "\ufeff\ufeff";
	}

	var encodePacket = socketio.parser.encodePacket;
	socketio.parser.encodePacket = function(packet) {
		return boundary(encodePacket(packet));
	};
})();

var io = socketio.listen(server);

io.configure(function () { 
	if (process.env.PORT) {
		io.set("transports", ["xhr-polling"]); 
		io.enable('browser client minification');  // send minified client
		io.enable('browser client etag');          // apply etag caching logic based on version number
		io.enable('browser client gzip');          // gzip the file
		io.set('log level', 1);                    // reduce logging		
	}
	io.set("polling duration", 0); 
});


var privateRouter = {

	onConnection: function(socket) {
		socket.broadcast.emit('join', socket.id);
	}

	, onHostEvent: function(socket, evt) {
		socket.on(evt, function(message, responder) {
			socket.broadcast.emit(evt, message);
		});
	}

	, onEagleEvent: function(socket, evt) {
		socket.on(evt, function(message, responder) {
			socket.broadcast.emit(evt, message);
		});
	}

	, onDisconnect: function(socket) {
		socket.broadcast.emit('leave', socket.id);
	}
};

var publicRouter = {

	onConnection: function(socket) {
		if (!socket.handshake.query.host) {
			return
		};
		var host = io.sockets.socket(socket.handshake.query.host);
		host.set('peerid', socket.id, function () {
			host.emit('join', socket.id);
    	});
	}

	, onHostEvent: function(socket, evt) {
		socket.on(evt, function(message, responder) {
			var host = io.sockets.socket(socket.handshake.query.host);
			host.emit(evt, message);
		});
	}

	, onEagleEvent: function(socket, evt) {
		socket.on(evt, function(message, responder) {
			socket.get('peerid', function (err, peerid) {
				var peer = io.sockets.socket(peerid);
				peer.emit(evt, message);
	    	});
		});
	}

	, onDisconnect: function(socket) {
		socket.get('peerid', function (err, peerid) {
			var peer = io.sockets.socket(peerid);
			if(peer.id == peerid) {
				peer.disconnect();
			}
    	});
		if(socket.handshake.query.host) {
			var host = io.sockets.socket(socket.handshake.query.host);
			host.emit('leave', socket.id);
		}
	}
}

var router = process.env.PORT ? publicRouter : privateRouter;

io.sockets.on("connection", function(socket) {

	router.onConnection(socket);

	['command'].forEach(function(evt) {
		router.onHostEvent(socket, evt);
	});

	['accept', 'proceed', 'message', 'console.log'].forEach(function(evt) {
		router.onEagleEvent(socket, evt);
	});

	socket.on('disconnect', function () {
		router.onDisconnect(socket);
	});
});
