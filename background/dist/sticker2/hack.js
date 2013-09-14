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
importJS(["lib/MOON.js", "lib/drawStroke.js"], function() {

    //taken from Evernote sticker.
    function kirakira(paper, deltaX, deltaY) {
        var strokes = paper.strokes,
            positions = [],
            data,
            x,
            y;
        for(var i = 0, l = strokes.length; i < l; i++) {
            data = strokes[i].data;
            for(var j = 0, ll = data.length; j < ll; j += 3) {
                x = data[j] + deltaX;
                y = data[j + 1] + deltaY;
                positions.push(x, y);
            }
        }
        var positionsNum = positions.length / 2,
            particles = [],
            t = positionsNum / 50,
            p,
            x,
            y,
            vx,
            vy;
        for(var i = 0; i < t; i++) {
            p = Math.floor(Math.random() * positionsNum) * 2;
            x = positions[p];
            y = positions[p + 1];

            //taken from RectEraserParticles
            vx = (Math.random()-0.5)/10.0;
            vy = (Math.random()-0.5)/10.0;

            if(Math.random() < 0.3) {
                vx = vy = 0;
            }
            particles.push(x, y, vx, vy, 100);
        }
        setTimeout(function(){
            MOON.showParticles(particles);
        }, 0);
    };

    var sticker = Sticker.create();

    sticker.ontap = function() {

        var page = MOON.getCurrentPage(),
            backing = MOON.getPaperJSON(page.backing),
            canvas = document.createElement("canvas"),
            w = 768,
            h = 1024;

        //https://twitter.com/k_ohga/status/378845564344877056
        canvas.width = w;
        canvas.height = h;
        kirakira(backing, 0, 0);
        Strokes.drawStrokes(backing, canvas, {
            unit: 2048,
            callback: function(rect) {
                var bg = "background.png";
                MOON.saveImage(page.backing + "/" + bg, canvas);
                backing["transparent"] = true;
                backing["image"] = bg;
                backing["clip"] = {"width":1.0,"color":0,"type":"pen","data":[0.0,0.0,1.0, w,0.0,1.0, w,h,1.0, 0.0,h,1.0]};
                MOON.setPaperJSON(page.backing, backing);
                MOON.finish();
        }});
    };

    sticker.onattach = function () {
        MOON.finish();
    };
    
    sticker.ondetach = function () {
        MOON.finish();
    };

    sticker.register();
});
