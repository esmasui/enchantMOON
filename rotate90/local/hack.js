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
importJS(["lib/MOON.js"], function() {

    var sticker = Sticker.create();

    sticker.ontap = function() {
        var backing = MOON.getCurrentPage().backing;
        var paper = MOON.getPaperJSON(backing);
        var strokes = paper.strokes;

        var w = paper.width;
        var h = paper.height

        var radians90 = -90 * Math.PI / 180.0;
        var originX = w / 2.0;
        var originY = h / 2.0;

        for (var i = 0; i < strokes.length; ++i) {
            var data = strokes[i].data;
            for (var j = 0; j < data.length; j += 3) {
                var x = data[j];
                var y = data[j + 1];

                var x1 = x - originX;
                var y1 = originY - y;
                var radius1 = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2));
                var theeta1 = Math.atan2(y1, x1);
                var theeta2 = theeta1 + radians90;
                var x2 = Math.cos(theeta2) * radius1;
                var y2 = Math.sin(theeta2) * radius1;

                data[j] = x2 + originX;
                data[j + 1] = originY - y2;
            }
        }

        MOON.setPaperJSON(backing, paper);
        MOON.finish();
    };

    sticker.onattach = function () {
        MOON.finish();
    };
    
    sticker.ondetach = function () {
        MOON.finish();
    };

    sticker.register();
});
