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
  * drawStroke.jsのデモシール。
  * 画像化したストロークを軌跡に沿って移動させる。
  *
  * Usage:
  * 1. 適当な絵を書く
  * 2. 移動させたい軌跡を一筆で書く
  * 3. シールをタップする
  * 
  * @author masui@uphyca.com, uPhyca Inc.
  */
var backing = MOON.getPaperJSON(MOON.getCurrentPage().backing),
    div = window.document.createElement("div"),
    canvas = window.document.createElement("canvas");

canvas.width = backing.width;
canvas.height = backing.height; 

window.document.body.appendChild(div);

var tracks = backing.strokes.pop();
window.Strokes.drawStrokes(backing, canvas, {debug: false, callback: function(rect) {

	var ctx = canvas.getContext('2d'),
		imgData = ctx.getImageData(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);

	var w = imgData.width,
		h = imgData.height,
		hw = w * 0.5,
		hh = h * 0.5,
		px = rect.l,
		py = rect.t,
		data = tracks.data,
		pos = 0,
		c = backing.color;

	ctx.fillStyle = ['rgba(', c << 24, c << 16, c & 0xff, (c << 32) / 255, ')'].join(',');
	div.appendChild(canvas); 

	var delay = 3 * 10,
		skip = 1,
		partclePosition = 0.8,
		fps = 60,
		lastRendered = new Date(),
		millisPerFrame = 1E3 / fps,
		skipFrames = 0;

	var move = function() {
		if (pos >= data.length) {
			sync(backing, rect, data);
			return;
		}

		var x = data[pos++],
			y = data[pos++],
			p = data[pos++];

		if(skipFrames < 10 && new Date() - lastRendered < millisPerFrame) {
			++skipFrames;
			requestAnimationFrame(move);
			return;
		}

		skipFrames = 0;

		pos += (skip * 3);

		if(pos > delay) {
			var partcles = [];

			var ox = data[pos - delay];
			var oy = data[pos - delay + 1];

			function addParticle(x, y) {
				var vx = Math.random() * 0.4 * (x > ox ? -1 : 1),
					vy = Math.random() * 0.4 * (y > oy ? -1 : 1),
					life = 30;
				partcles.push(x, y, vx, vy, life);
			}

			addParticle(ox - hw * partclePosition, oy - hh * partclePosition);
			addParticle(ox - hw * partclePosition, oy + hh * partclePosition);
			addParticle(ox + hw * partclePosition, oy - hh * partclePosition);
			addParticle(ox + hw * partclePosition, oy + hh * partclePosition);
			MOON.showParticles(partcles);
		}

		ctx.fillRect(px, py, w, h);
		ctx.putImageData(imgData, x - hw, y - hh);

		px = x - hw;
		py = y - hh;
		lastRendered = new Date();
		requestAnimationFrame(move);
	};
	requestAnimationFrame(move);
}});

/**
 * 移動後の位置にストロークを移動する
 * @param backing strokesプロパティから軌跡を除外したbackingのデータ。
 * @rect 軌跡を除外ストロークの矩形範囲。 {l, t, b, r}
 * @tracksData 軌跡のデータ。 [x1, y1, p1, x2, y2, p2, ...]
 */
function sync(backing, rect, tracksData) {
	var firstX = rect.l,
		firstY = rect.t,
		w = rect.r - rect.l,
		h = rect.b - rect.t,
		hw = w * 0.5,
		hh = h * 0.5,
		lastX = tracksData[tracksData.length - 3] - hw,
		lastY = tracksData[tracksData.length - 2] - hh,
		deltaX = lastX - firstX,
		deltaY = lastY - firstY;
	for(var i = 0, l = backing.strokes.length; i < l; i++) {
		var data = backing.strokes[i].data;
		for(var j = 0, ll = data.length; j < ll; j += 3) {
			data[j] += deltaX;
			data[j + 1] += deltaY;
		}
	}
	MOON.setPaperJSON(MOON.getCurrentPage().backing, backing);
	setTimeout(function(){
		MOON.finish();
	}, 500);
}

