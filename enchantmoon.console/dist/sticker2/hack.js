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
importJS(["lib/MOON.js", "lib/enchant.js", "lib/ui.enchant.js", "lib/color.enchant.js", "lib/stylus.enchant.js", "lib/puppet.enchant.js", "lib/moon.puppet.enchant.js", "lib/localStorage.js"], function() {

    var KEY = 'com.uphyca.enchantmoon.console';
    var DEFAULT_ADDRESS = "http://enchantmoonconsole.herokuapp.com:80";
    var PROMPT_TITLE = "Enter address:";
    var RESTART_MESSAGE = "Restart the sticker";

    var sticker = Sticker.create();

    sticker.ontap = function() {
        var prevAddress = localStorageCompat.getItem(KEY) || DEFAULT_ADDRESS;
        var address = prompt(PROMPT_TITLE, prevAddress);
        if (typeof address === 'string') {
            if (prevAddress != address) {
                localStorageCompat.setItem(KEY, address);
                MOON.alert(RESTART_MESSAGE, function() {
                    MOON.finish();
                });
            } else {
                importJS(["lib/console.js"], function() {
                    console.ready(address, function(socket) {
                        MOON.alert(socket.socket.sessionid);
                    });
                });
            }
        } else {
            MOON.finish();
        }
    };

    sticker.onattach = function () {
        MOON.finish();
    };
    
    sticker.ondetach = function () {
        localStorageCompat.removeItem(KEY);
        MOON.finish();
    };

    sticker.register();
});
