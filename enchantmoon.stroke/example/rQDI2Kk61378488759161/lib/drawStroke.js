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
(function(global) {

	var defaultOpts = {
		fps: 60,
		unit: 120,
		resolution: 0.5,
		minimumAlpha: 0.1,
		minimumWidth: 0.5,
		transparent: true,
		easing: function(s) { return s},
		callback: function() {},
		debug: false
	};

	function parseColor(color) {
		var rgba = [];
		for ( var c = 2; c >= 0; --c)
			rgba.push((color >> (c * 8)) & 0xFF);
		rgba.push((color >> 24) & 0xFF);
		return rgba;
	}

	function applyVelocity(v, s, easing) {
		return v * easing(s, s, 0.0, 1.0, 1.0);
	}

	function setAlpha(rgba, alpha, easing) {
		var c = rgba.slice();
		c[3] = applyVelocity(c[3], alpha, easing) << 0;
		return c;
	}

	function styleOf(color, minimumAlpha) {
		minimumAlpha = minimumAlpha || 0.0;
		return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ','
				+ Math.max(minimumAlpha, (color[3] / 255)) + ')';
	}

	/**
	 * taken from http://d.hatena.ne.jp/shi3z/20130502/1367490202
	 */
	function catmullRom(p0, p1, p2, p3, t) {
		var v0 = (p2 - p0) * 0.5, v1 = (p3 - p1) * 0.5, t2 = t * t, t3 = t2 * t;
		return ((p1 - p2) * 2.0 + v0 + v1) * t3
				+ ((p2 - p1) * 3.0 - 2.0 * v0 - v1) * t2 + v0 * t + p1;
	}

	function distance(x1, y1, x2, y2) {
		return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
	}

	function valueAt(arr, b, p, o) {
		var i = b + (p * 3 + o);
		if (i < 0) {
			return arr[o];
		} else if (i >= arr.length) {
			return arr[arr.length - 3 + o];
		}
		return arr[i];
	}

	var Rect = function(t, l, b, r) {
		this.set(typeof t === 'number' ? t : Number.MAX_VALUE,
				typeof l === 'number' ? l : Number.MAX_VALUE,
				typeof b === 'number' ? b : Number.MIN_VALUE,
				typeof r === 'number' ? r : Number.MIN_VALUE);
	};

	Rect.prototype.maximize = function(other) {
		var m = Math;
		this.t = m.min(this.t, other.t);
		this.l = m.min(this.l, other.l);
		this.b = m.max(this.b, other.b);
		this.r = m.max(this.r, other.r);
		return this;
	};

	Rect.prototype.set = function(t, l, b, r) {
		this.t = t;
		this.l = l;
		this.b = b;
		this.r = r;
		return this;
	};

	Rect.prototype.expand = function(d) {
		var r = d * 0.5;
		this.t -= d;
		this.l -= d;
		this.b += d;
		this.r += d;
		return this;
	};

	Rect.prototype.contract = function(d) {
		var r = d * 0.5;
		this.t += d;
		this.l += d;
		this.b -= d;
		this.r -= d;
		return this;
	};

	Rect.prototype.intersect = function(other) {
		var m = Math;
		this.t = m.max(this.t, other.t);
		this.l = m.max(this.l, other.l);
		this.b = m.min(this.b, other.b);
		this.r = m.min(this.r, other.r);		
		return this;
	};

	Rect.prototype.clone = function() {
		return new Rect(this.t, this.l, this.b, this.r);
	};

	var nodes = [ -1, 0, 1, 2 ];
	function drawStroke(info, stroke, index, strokes, opts) {
		var strokeData = stroke.data,
			lineWidth = stroke.width,
			strokeColor = parseColor(stroke.color);

		for ( var j = 0; j < strokeData.length; j += 3) {

			var lastX = nodes.map(function(each) {
				return valueAt(strokeData, j, each, 0) + info.x;
			}),
				lastY = nodes.map(function(each) {
					return valueAt(strokeData, j, each, 1) + info.y;
				}),
				lastP = nodes.map(function(each) {
					return valueAt(strokeData, j, each, 2);
				}),
				lastData = (j == strokeData.length - 3);
				lastStroke = (index == strokes.length - 1);

			tasks.push(function(strokeColor, lineWidth, lastX, lastY,
						lastP, lastStroke, lastData, opts, ctx) {
					var d = distance(lastX[1], lastY[1], lastX[2], lastY[2]),
						num = (Math.ceil((d / opts.resolution) + 0.5)) << 0,
						returnThis = new Rect(),
						rect = new Rect();
					for ( var i = 0; i < num; i++) {
						var t = i / num,
							x = catmullRom(lastX[0], lastX[1], lastX[2], lastX[3],
								t),
							y = catmullRom(lastY[0], lastY[1], lastY[2], lastY[3],
								t),
							p = catmullRom(lastP[0], lastP[1], lastP[2], lastP[3],
								t),
							w = Math.max(opts.minimumWidth, applyVelocity(lineWidth, p, opts.easing));
							r = w * 0.5;
							l = x - w;
							t = y - w;
							c = setAlpha(strokeColor, p, opts.easing);
						ctx.fillStyle = styleOf(c, opts.minimumAlpha);
						ctx.fillRect(l, t, w, w);
						returnThis.maximize(rect.set(t - 1, l - 1, t + w + 1, l + w + 1));
					}
					returnThis.lastStroke = lastStroke;
					returnThis.lastData = lastData;
					returnThis.hasNext = !(lastStroke && lastData);
					return returnThis;
			}.bind(null, strokeColor, lineWidth, lastX, lastY, lastP, lastStroke, lastData, opts));
		}
	}

	/**
	 * taken from http://yomotsu.net/blog/2013/01/05/fps.html
	 */
	var requestAnimationFrame = (function() {
		return  window.requestAnimationFrame       || 
            	window.webkitRequestAnimationFrame || 
            	window.mozRequestAnimationFrame    || 
            	window.oRequestAnimationFrame      || 
            	window.msRequestAnimationFrame     || 
            	function(callback){
					var timer = window.setTimeout(function() {
						window.clearTimeout(timer);
						callback.call()}, 1000.0 / 60.0 );
				};
	})();

	var now = window.performance && (
			performance.now || 
			performance.mozNow || 
			performance.msNow || 
			performance.oNow || 
			performance.webkitNow );

	var getTime = function() {
		return ( now && now.call( performance ) ) || ( new Date().getTime() );
	}	

	function mergeOpts(a, b) {
		if (!b) {
			return a;
		}
		var o = {};
		for (var n in a) {
			o[n] = typeof(b[n]) !== 'undefined' ? b[n] : a[n];
		}
		return o;
	}

	var tasks = [];

	function setup(info, canvas, ctx, transparent) {
		if(transparent && info['transparent']) {
			return;
		}
		var fillStyle;
		if (info['transparent']) {
			fillStyle = styleOf([ 0x80, 0x80, 0x80, 0xff ]);
		} else {
			fillStyle = styleOf(parseColor(info.color));
		}
		ctx.fillStyle = fillStyle;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	function drawStrokes(info, canvas, opts) {
		opts = mergeOpts(defaultOpts, opts);
		var strokes = info.strokes,
			ctx = canvas.getContext('2d'),
			mCanvas = document.createElement('canvas'),
			border = new Rect(0, 0, canvas.height, canvas.width),
			returnThis = new Rect();

		mCanvas.width = canvas.width;
		mCanvas.height = canvas.height;

		var mCtx = mCanvas.getContext('2d'),
			lastRenderMillis = 0,
			millisPerFrame = 1E3 / (opts.fps || 60);

		setup(info, canvas, ctx, opts.transparent);

		function update(timestamp) {
			var delta = getTime() - lastRenderMillis,
				min = Math.min,
				max = Math.max;

			if (delta < millisPerFrame) {
				requestAnimationFrame(update);				
				return;
			}

			var rendered = false,
				rect = new Rect(),
				hasNext = true;

			for (var i = 0; i < opts.unit; ++i) {
				var task = tasks.shift();

				if (!task) {
					break;
				}

				rendered = true;

				var res = task.call(null, mCtx);
				rect.maximize(res);
				hasNext = res.hasNext;

				// delta = getTime() - lastRenderMillis;
				// if (i > 0 && delta > millisPerFrame) {
				// 	break;
				// }
			}

			if (rendered) {
				rect.expand(4);
				rect.intersect(border);
				var w = rect.r - rect.l,
				    h = rect.b - rect.t;

				if (opts.debug) {
					mCtx.strokeStyle = "rgba(80, 128, 255, 0.75)";
					mCtx.lineWidth = 0.75;
					var frame = rect.clone().contract(2);
					mCtx.strokeRect(frame.l, frame.t, frame.r - frame.l, frame.b - frame.t);
				}

				ctx.drawImage(mCanvas, rect.l, rect.t, w, h, rect.l, rect.t, w, h);
				mCtx.clearRect(rect.l, rect.t, w, h);				

				returnThis.maximize(rect);

				lastRenderMillis = getTime();
			}
			
			if (hasNext) {
				requestAnimationFrame(update);
				return;
			}

			if (opts.callback) {
				opts.callback.call(null, returnThis);
			}
		}
		requestAnimationFrame(update);		
		
		var count = 0;
		var poll = function () {
			var length = opts.unit;
			for(var i = 0; i < length; ++i) {
				if (count >= strokes.length) {
					return;
				}
				if (tasks.length < length) {
					drawStroke(info, strokes[count], count, strokes, opts);
					++count;
				}
			}
			requestAnimationFrame(poll);
		};
		requestAnimationFrame(poll);
	}

	var Module = (function() {
		return {
			drawStrokes : drawStrokes
		};
	})();

	global.Strokes = Module;

})(window);
