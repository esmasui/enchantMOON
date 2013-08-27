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

/**
 * enchantMOON QUnit runner
 */
var port = process.env.PORT || 3000;
var http = require('http');
var socketio = require('socket.io');
var fs = require('fs')
var server = http.createServer(function(req, res) {
	res.writeHead(200, {
		"Content-Type" : "text/html"
	});
	res.end("OK");
}).listen(port);

var cheerio = require("cheerio");
var request = require("request");
var async = require("async");

function invocation(s) {
	return "(" + s + ")();"
}

var initStatement = invocation(function() {
	location.search = location.search || "";
	QUnit = (void 0);
}.toString());

var loggingStatement = invocation(function() {

	if(window._QUnitRunner) {
		return;
	}

	window._QUnitRunner = true;

	/*
	 * taken from http://www.atmarkit.co.jp/ait/articles/1211/29/news012_3.html
	 */
	window.document.addEventListener("DOMContentLoaded", function() {
		var testCount = 0;
		var testModuleCount = 1;
		var current_test_assertions = [];

		QUnit.testDone(function(result) {

			testCount = 0;
			var moduleName = '';
			var testName = '';
			var i;
			if (result.module)
				moduleName = result.module;
			if (result.name != '')
				testName = result.name;

			console.log('\n' + testModuleCount + '. Test Module: "'
					+ moduleName + '", Test Name: "' + testName + '"');

			for (i = 0; i < current_test_assertions.length; i++) {
				console.log(current_test_assertions[i]);
			}

			current_test_assertions = [];
			testModuleCount++;
		});

		QUnit.log(function(details) {

			testCount++;
			var response;

			response = '"' + details.message + '"' || '';

			if (details.result) {
				current_test_assertions.push('    ' + testCount + ') Passed: '
						+ response);
				return;
			}

			if (typeof details.expected !== 'undefined') {
				if (response) {
					response += ', ';
				}

				response += 'expected: ' + details.expected + ', but was: '
						+ details.actual;
			}
			response += '\x1b[36m \n    ';
			response += details.source.replace(/\n/g, '\n    ');
			current_test_assertions.push('\x1b[31m\n    ' + testCount
					+ ') Failed assertion: ' + response + "\x1b[39m");
		});

		QUnit.done(function(result) {

			console.log('\nTook ' + result.runtime + 'ms to run '
					+ result.total + ' tests. ' + result.passed + ' passed, '
					+ result.failed + ' failed.');
			if(console.socket) {
				console.socket.emit("QUnit.done", result.failed <= 0);
			}
		});
	}, false);
}.toString());

/**
 * Force dispatch document.DOMContentLoaded for initializing Logger
 * and window.load for invoke QUnit.load()
 */
var loadStatement = invocation(function() {
	document.addEventListener("DOMContentLoaded", function() {
		window.dispatchEvent((function() {
			var evt = document.createEvent("Event");
			evt.initEvent("load", true, false);
			return evt
		})());
	});
	document.dispatchEvent((function() {
		var evt = document.createEvent("MutationEvent");
		evt.initEvent("DOMContentLoaded", true, false);
		return evt
	})());
}.toString());

function ready(uri, $, socket) {

	var endpoints = [];

	$('script').each(function(i, elem) {
		var src = $(this).attr("src");
		if (src) {
			if (uri.indexOf('http') == 0) {
				endpoints.push(function(callback) {
					var url = uri.substring(0, uri.lastIndexOf("/")+1)+src;

					console.log("Loading " + url);

					request({
						url : url
					}, function(error, response, body) {
						if (!error && response.statusCode == 200) {
							callback(error, body);
						} else {
							callback(error, null);
						}
					});
				});
			} else {
				endpoints.push(function(callback) {

					var url = null;
					if(uri.indexOf("/") > -1) {
						url = uri.substring(0, uri.lastIndexOf("/")+1)+src;
					} else {
						url = src;
					}
					
					console.log("Loading " + url);

					callback(null, fs.readFileSync(url));
				});
			}
		} else {
			var text = $(this).text();

			console.log("Loading " + text.replace(/[\r\n\t]/g, " ").substring(0, 20)+"...");

			endpoints.push(function(callback) {
				callback(null, text);
			});
		}
	});

	async.parallel(endpoints, function(err, results) {
		var scripts = [];
		scripts.push(initStatement);
		scripts.push(results.join(";\n"));
		scripts.push(loggingStatement, loadStatement);
		runTests(scripts, socket);
	});
}

function runTests(scripts, socket) {

	console.log("Running tests...");

	var commands = scripts.slice();

	socket.on("console.log", function(data){
		console.log(data);
	});

	socket.on("proceed", function(data) {
		if (data) {
			console.log(data);
			process.exit(-1);
		}
		var command = commands.shift();
		if (command) {
			socket.emit("command", command);
		}
	});

	var command = commands.shift();
	socket.emit("command", command);
}

// Eagle hack
(function() {
	function boundary(s) {
		return s + "\ufeff\ufeff";
	}

	var encodePacket = socketio.parser.encodePacket;
	socketio.parser.encodePacket = function(packet) {
		return boundary(encodePacket(packet));
	};
})();

var io = socketio.listen(server, {
	"polling duration": 0
	, "log level": 1
	, "transports": ["xhr-polling"]
});

if (require.main == module) {
	if (process.argv.length < 3) {
		console.log("runner.js <htmlfile | url>");
		process.exit(1);
	}

	var uri = process.argv[2];

	io.sockets.on("connection", function(socket) {

		console.log("Loading resources...");

		if (uri.indexOf('http') == 0) {
			request({
				url : uri
			}, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					ready(uri, cheerio.load(body), socket);
				}
			});
		} else {
			ready(uri, cheerio.load(fs.readFileSync(uri)), socket);
		}

		socket.on("QUnit.done", function(succeed) {
			process.exit(succeed ? 0 : -1);
		});
	});
} 

