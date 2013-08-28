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

(function(global){
    function connect(address, callback) {
        var socket = io.connect(address, {'transports': ["xhr-polling"], "try multiple transports": false, "connect timeout": 20000, "max reconnection attempts": Infinity});

        global.console.log = function (message) {
            socket.emit("console.log", message);
        };

        if (callback) {
            socket.on("connect", function() {
                callback(socket);
            });
        }

        socket.on("command", function(command) {
            try{
                socket.emit("accept", command);
            } catch(e){
            }

            var r = null;
            try{
                r = eval(command);
            } catch(e){
                r = e.toString();
            };
    
            try{
                socket.emit("proceed", r);
            } catch(e){
                socket.emit("proceed", e.toString());
            }
        });

        global.console.socket = socket;
    };

    global.console.ready = function (address, callback) {
        importJS(["lib/socket.io.js"], function() {

        //Eagle hack
        (function(){
            function truncate(s) {
                if(s) {
                    var i = s.indexOf("\ufeff\ufeff");
                    if (i < 0) {
                      return s;
                    }
                    return s.substring(0, i);
                }
            }

            var decodePacket = io.parser.decodePacket;
            io.parser.decodePacket = function (data) {
                return decodePacket(truncate(data));
            }
        })();

            connect(address, callback);
        });
    };
})(window);
