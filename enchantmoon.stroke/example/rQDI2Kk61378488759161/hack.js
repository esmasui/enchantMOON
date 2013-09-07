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
importJS(['lib/MOON.js', 'lib/drawStroke.js'], function() {

    var sticker = Sticker.create();

    sticker.ontap = function() {
        var script = document.createElement('script');
        script.src = "main.js";
        script.type = 'text/javascript';
        script.language = 'javascript';
        document.body.appendChild(script);
    };

    sticker.onattach = function () {
        MOON.finish();
    };
    
    sticker.ondetach = function () {
        MOON.finish();
    };

    sticker.register();
});
