/**
 * color.enchant.js
 * @version 0.2.0
 * @require enchant.js v0.6.2+
 * @author Ubiquitous Entertainment Inc.
 *
 * @description
[lang:ja]
 * CSSの色表現とRGBの数値を簡単に変換するためのプラグイン.
 * Acknowledge:
 * https://github.com/alpicola/contextfree.js/
 * http://www.phpied.com/files/rgbcolor/rgbcolor.js
[/lang]
 */

(function() {

var RAD2DEG = 180 / Math.PI;

// https://github.com/alpicola/contextfree.js/
var hsv2rgb = function(h, s, v) {
    var r, g, b;
    if (s === 0) {
        r = g = b = Math.round(v * 0xff);
    } else {
        v *= 0xff;
        h = ((h %= 360) < 0 ? h + 360 : h) / 60;
        var hi = h | 0;
        switch (hi) {
            case 0:
                r = Math.round(v);
                g = Math.round(v * (1 - (1 - h + hi) * s));
                b = Math.round(v * (1 - s));
                break;
            case 1:
                r = Math.round(v * (1 - s * h + s * hi));
                g = Math.round(v);
                b = Math.round(v * (1 - s));
                break;
            case 2:
                r = Math.round(v * (1 - s));
                g = Math.round(v);
                b = Math.round(v * (1 - (1 - h + hi) * s));
                break;
            case 3:
                r = Math.round(v * (1 - s));
                g = Math.round(v * (1 - s * h + s * hi));
                b = Math.round(v);
                break;
            case 4:
                r = Math.round(v * (1 - (1 - h + hi) * s));
                g = Math.round(v * (1 - s));
                b = Math.round(v);
                break;
            case 5:
                r = Math.round(v);
                g = Math.round(v * (1 - s));
                b = Math.round(v * (1 - s * h + s * hi));
                break;
        }
    }
    return [r, g, b];
};

var hsl2rgb = function(h, s, l) {
    s *= (l < 0.5) ? l : 1 - l;
    l += s;
    s = 2 * s / l;
    return hsv2rgb(h, s, l);
};

var yuv2rgb = function(y, u, v) {
    return [
        y + 1.402 * v,
        y - 0.344 * u - 0.714 * v,
        y + 1.772 * u
    ];
};

var rgb2yuv = function(r, g, b) {
    return [
        0.299 * r + 0.587 * g + 0.114 * b,
        -0.169 * r - 0.331 * g + 0.5 * b,
        0.5 * r - 0.419 * g - 0.081 * b
    ];
};

/**
 * @type {Object}
 */
enchant.color = {};

/**
 * @scope enchant.color.Color.prototype
 */
enchant.color.Color = enchant.Class.create({
    /**
     * @name enchant.color.Color
     [lang:ja]
     * 色のクラス.
     * @param {Array.<Number>} rgba r, g, b, aの値を0-255で表した配列.
     [/lang]
     * @class
     * @constructs
     */
    initialize: function(rgba) {
        this._rgba = [];
        this._set(rgba);
        /**
         * {@link enchant.color.Color.FORMAT_HEX}, {@link enchant.color.Color.FORMAT_RGB}, {@link enchant.color.Color.FORMAT_RGBA}のいずれか.
         * @type {String}
         */
        this.format = enchant.color.Color.FORMAT_HEX;
    },
    _set: function(arr) {
        for (var i = 0, l = Math.min(4, arr.length); i < l; i++) {
            this._rgba[i] = arr[i];
        }
        if (typeof this._rgba[3] !== 'number') {
            this._rgba[3] = 255;
        }
    },
    /**
     [lang:ja]
     * 赤の値.
     [/lang]
     * @type {Number} red.
     */
    r: {
        get: function() {
            return this._rgba[0];
        },
        set: function(r) {
            this._rgba[0] = r;
        }
    },
    /**
     [lang:ja]
     * 緑の値.
     [/lang]
     * @type {Number} green.
     */
    g: {
        get: function() {
            return this._rgba[1];
        },
        set: function(g) {
            this._rgba[1] = g;
        }
    },
    /**
     [lang:ja]
     * 青の値.
     [/lang]
     * @type {Number} blue.
     */
    b: {
        get: function() {
            return this._rgba[2];
        },
        set: function(b) {
            this._rgba[2] = b;
        }
    },
    /**
     [lang:ja]
     * 透明度の値.
     [/lang]
     * @type {Number} alpha.
     [/lang]
     */
    a: {
        get: function() {
            return this._rgba[3];
        },
        set: function(a) {
            this._rgba[3] = a;
        }
    },
    /**
     [lang:ja]
     * RGBの値.
     [/lang]
     * @type {Array.<Number>} rgb.
     */
    rgb: {
        get: function() {
            return this._rgba.slice(0, 3);
        },
        set: function(rgb) {
            this._set(rgb);
        }
    },
    /**
     [lang:ja]
     * RGBAの値.
     [/lang]
     * @type {Array.<Number>} rgba.
     */
    rgba: {
        get: function() {
            return this._rgba;
        },
        set: function(rgba) {
            this._set(rgba);
        }
    },
    /**
     [lang:ja]
     * CSSの色表現を返す.
     * @example
     * var color = new Color([ 255, 0, 255, 128 ]);
     * color.toString(enchant.color.Color.FORMAT_HEX); // #ff00ff
     * color.toString(enchant.color.Color.FORMAT_RGB); // rgb(255,0,255)
     * color.toString(enchant.color.Color.FORMAT_RGBA); // rgba(255,0,255,0.50196078)
     * @param {String} [format] CSSの表現の種類.
     * @return {String} CSSの色表現.
     */
    toString: function(format) {
        format = (typeof format === 'string') ? format : this.format;
        format = format.toUpperCase();
        var method = this['_to' + format + 'String'];
        if (typeof method === 'function') {
            return method.call(this);
        } else {
            throw new Error('invalid color format');
        }
    },
    /**
     [lang:ja]
     * rgb(...)形式のCSSの色表現を返す.
     * @return {String} CSSの色表現.
     * @private
     [/lang]
     */
    _toRGBString: function() {
        return 'rgb(' + this.rgb + ')';
    },
    /**
     [lang:ja]
     * rgba(...)形式のCSSの色表現を返す.
     * @return {String} CSSの色表現.
     * @private
     [/lang]
     */
    _toRGBAString: function() {
        return 'rgba(' + this.rgb.concat((this.a / 255).toFixed(8)) + ')';
    },
    /**
     [lang:ja]
     * 16進数形式のCSSの色表現を返す.
     * @example
     * var color = new Color([ 255, 0, 255, 128 ]);
     * color._toHEXString(); // #ff00ff
     * color._toHEXString(); // #ff00ff80
     * @param {Boolean} [extend] 拡張表現を使用するかどうか.
     * @return {String} CSSの色表現.
     * @private
     [/lang]
     */
    _toHEXString: function(extend) {
        var l = extend ? 4 : 3;
        return '#' + this.rgba.slice(0, l).map(function(n) {
            return ('0' + n.toString(16)).slice(-2);
        }).join('');
    }
});
/**
 [lang:ja]
 * 16進数表現を指定する定数.
 [/lang]
 * @type {String}
 * @constant
 * @static
 */
enchant.color.Color.FORMAT_HEX = 'hex';
/**
 [lang:ja]
 * rgb数表現を指定する定数.
 [/lang]
 * @type {String}
 * @constant
 * @static
 */
enchant.color.Color.FORMAT_RGB = 'rgb';
/**
 [lang:ja]
 * rgba表現を指定する定数.
 [/lang]
 * @type {String}
 * @constant
 * @static
 */
enchant.color.Color.FORMAT_RGBA = 'rgba';
/**
 [lang:ja]
 * r, g, b, aの値から{@link enchant.color.Color}のインスタンスを生成する.
 * @param {Number} r 赤の値.
 * @param {Number} g 緑の値.
 * @param {Number} b 青の値.
 * @param {Number} a 透明度の値.
 * @return {enchant.color.Color} 生成したインスタンス.
 [/lang]
 * @static
 */
enchant.color.Color.createFrom = function(r, g, b, a) {
    return new enchant.color.Color(r, g, b, a);
};
/**
 [lang:ja]
 * CSSのrgb表現から{@link enchant.color.Color}のインスタンスを生成する.
 * @param {String} cssString rgb(...)フォーマットの文字列.
 * @return {enchant.color.Color} 生成したインスタンス.
 [/lang]
 * @static
 * @private
 */
enchant.color.Color._createFromCSSRGBString = function(str) {
    var rgb = str.match(/(?:\d{1,3},? ?){3}/)[0].split(/, ?/).map(function(n) {
        return parseInt(n, 10);
    });
    return new enchant.color.Color(rgb.concat(255));
};
/**
 [lang:ja]
 * CSSのrgba表現から{@link enchant.color.Color}のインスタンスを生成する.
 * @param {String} cssString rgba(...)フォーマットの文字列.
 * @return {enchant.color.Color} 生成したインスタンス.
 [/lang]
 * @static
 * @private
 */
enchant.color.Color._createFromCSSRGBAString = function(str) {
    var rgb = str.match(/(?:\d{1,3}, ?){3}/)[0].split(/, ?/).slice(0, 3).map(function(n) {
        return parseInt(n, 10);
    });
    var a = Math.round(str.match(/(?:\d{1,3}, ?){3}(\d?\.?\d{1,})/)[1] * 255);
    return new enchant.color.Color(rgb.concat(a));
};
/**
 [lang:ja]
 * CSSの16進数表現から{@link enchant.color.Color}のインスタンスを生成する.
 * #RGB, #RRGGBB, #RGBA, #RRGGBBAAが使用出来る.
 * @param {String} cssString 16進数フォーマットの文字列.
 * @return {enchant.color.Color} 生成したインスタンス.
 [/lang]
 * @static
 * @private
 */
enchant.color.Color._createFromCSSHEXString = function(str) {
    var re, s;
    if (str.length > 5) {
        re = /[\da-fA-F]{2}/g;
        s = 1;
    } else {
        re = /[\da-fA-F]/g;
        s = 17;
    }
    var rgba = str.match(re).map(function(n) {
        return parseInt(n, 16) * s;
    });
    if (rgba.length === 3) {
        rgba.push(255);
    }
    return new enchant.color.Color(rgba);
};
enchant.color.Color._createFromCSSColorNameString = function(str) {
    var hex = this.colorNames[str];
    if (hex) {
        return this._createFromCSSHEXString('#' + hex);
    } else {
        return null;
    }
};
/**
 [lang:ja]
 * CSSの文字列表現から{@link enchant.color.Color}のインスタンスを生成する.
 * rgb(...), rgba(...), #RGB, #RRGGBB, #RGBA, #RRGGBBAA, HTML color keywordをパースできる.
 * @param {String} cssString CSSの色表現.
 * @return {enchant.color.Color} 生成したインスタンス.
 [/lang]
 * @static
 */
enchant.color.Color.createFromCSSString = function(str) {
    var fromName;
    if (str.match(/^rgba/)) {
        return enchant.color.Color._createFromCSSRGBAString(str);
    } else if (str.match(/^rgb/)) {
        return enchant.color.Color._createFromCSSRGBString(str);
    } else if (str.match(/^#/)) {
        return enchant.color.Color._createFromCSSHEXString(str);
    } else {
        fromName = enchant.color.Color._createFromCSSColorNameString(str);
        if (fromName) {
            return fromName;
        } else {
            throw new Error('string is not css color format');
        }
    }
};

/**
 [lang:ja]
 * HTML color keywordに定義されている色の名前と値の連想配列.
 [/lang]
 * Acknowledge:
 * http://www.phpied.com/files/rgbcolor/rgbcolor.js
 * @type {Object}
 * @static
 */
enchant.color.Color.colorNames = {
    aliceblue: 'f0f8ff',
    antiquewhite: 'faebd7',
    aqua: '00ffff',
    aquamarine: '7fffd4',
    azure: 'f0ffff',
    beige: 'f5f5dc',
    bisque: 'ffe4c4',
    black: '000000',
    blanchedalmond: 'ffebcd',
    blue: '0000ff',
    blueviolet: '8a2be2',
    brown: 'a52a2a',
    burlywood: 'deb887',
    cadetblue: '5f9ea0',
    chartreuse: '7fff00',
    chocolate: 'd2691e',
    coral: 'ff7f50',
    cornflowerblue: '6495ed',
    cornsilk: 'fff8dc',
    crimson: 'dc143c',
    cyan: '00ffff',
    darkblue: '00008b',
    darkcyan: '008b8b',
    darkgoldenrod: 'b8860b',
    darkgray: 'a9a9a9',
    darkgreen: '006400',
    darkkhaki: 'bdb76b',
    darkmagenta: '8b008b',
    darkolivegreen: '556b2f',
    darkorange: 'ff8c00',
    darkorchid: '9932cc',
    darkred: '8b0000',
    darksalmon: 'e9967a',
    darkseagreen: '8fbc8f',
    darkslateblue: '483d8b',
    darkslategray: '2f4f4f',
    darkturquoise: '00ced1',
    darkviolet: '9400d3',
    deeppink: 'ff1493',
    deepskyblue: '00bfff',
    dimgray: '696969',
    dodgerblue: '1e90ff',
    feldspar: 'd19275',
    firebrick: 'b22222',
    floralwhite: 'fffaf0',
    forestgreen: '228b22',
    fuchsia: 'ff00ff',
    gainsboro: 'dcdcdc',
    ghostwhite: 'f8f8ff',
    gold: 'ffd700',
    goldenrod: 'daa520',
    gray: '808080',
    green: '008000',
    greenyellow: 'adff2f',
    honeydew: 'f0fff0',
    hotpink: 'ff69b4',
    indianred : 'cd5c5c',
    indigo : '4b0082',
    ivory: 'fffff0',
    khaki: 'f0e68c',
    lavender: 'e6e6fa',
    lavenderblush: 'fff0f5',
    lawngreen: '7cfc00',
    lemonchiffon: 'fffacd',
    lightblue: 'add8e6',
    lightcoral: 'f08080',
    lightcyan: 'e0ffff',
    lightgoldenrodyellow: 'fafad2',
    lightgrey: 'd3d3d3',
    lightgreen: '90ee90',
    lightpink: 'ffb6c1',
    lightsalmon: 'ffa07a',
    lightseagreen: '20b2aa',
    lightskyblue: '87cefa',
    lightslateblue: '8470ff',
    lightslategray: '778899',
    lightsteelblue: 'b0c4de',
    lightyellow: 'ffffe0',
    lime: '00ff00',
    limegreen: '32cd32',
    linen: 'faf0e6',
    magenta: 'ff00ff',
    maroon: '800000',
    mediumaquamarine: '66cdaa',
    mediumblue: '0000cd',
    mediumorchid: 'ba55d3',
    mediumpurple: '9370d8',
    mediumseagreen: '3cb371',
    mediumslateblue: '7b68ee',
    mediumspringgreen: '00fa9a',
    mediumturquoise: '48d1cc',
    mediumvioletred: 'c71585',
    midnightblue: '191970',
    mintcream: 'f5fffa',
    mistyrose: 'ffe4e1',
    moccasin: 'ffe4b5',
    navajowhite: 'ffdead',
    navy: '000080',
    oldlace: 'fdf5e6',
    olive: '808000',
    olivedrab: '6b8e23',
    orange: 'ffa500',
    orangered: 'ff4500',
    orchid: 'da70d6',
    palegoldenrod: 'eee8aa',
    palegreen: '98fb98',
    paleturquoise: 'afeeee',
    palevioletred: 'd87093',
    papayawhip: 'ffefd5',
    peachpuff: 'ffdab9',
    peru: 'cd853f',
    pink: 'ffc0cb',
    plum: 'dda0dd',
    powderblue: 'b0e0e6',
    purple: '800080',
    red: 'ff0000',
    rosybrown: 'bc8f8f',
    royalblue: '4169e1',
    saddlebrown: '8b4513',
    salmon: 'fa8072',
    sandybrown: 'f4a460',
    seagreen: '2e8b57',
    seashell: 'fff5ee',
    sienna: 'a0522d',
    silver: 'c0c0c0',
    skyblue: '87ceeb',
    slateblue: '6a5acd',
    slategray: '708090',
    snow: 'fffafa',
    springgreen: '00ff7f',
    steelblue: '4682b4',
    tan: 'd2b48c',
    teal: '008080',
    thistle: 'd8bfd8',
    tomato: 'ff6347',
    turquoise: '40e0d0',
    violet: 'ee82ee',
    violetred: 'd02090',
    wheat: 'f5deb3',
    white: 'ffffff',
    whitesmoke: 'f5f5f5',
    yellow: 'ffff00',
    yellowgreen: '9acd32'
};

/**
 * @scope enchant.color.HsvSurface.prototype
 */
enchant.color.HsvSurface = enchant.Class.create(enchant.Surface, {
    /**
     * @name enchant.color.HsvSurface
     * @class
     [lang:ja]
     * カラーパレットのSurface.
     * @param {Number} width 横幅.
     * @param {Number} height 縦幅.
     [/lang]
     * @Constructs
     * @extend enchant.Surface
     */
    initialize: function(width, height) {
        enchant.Surface.call(this, width, height);
        this._imageData = this.context.createImageData(width, height);
        this.V = 1.0;
    },
    /**
     [lang:ja]
     * Surface全体のbrightness.
     [/lang]
     * @type {Number}
     */
    V: {
        get: function() {
            return this._v;
        },
        set: function(v) {
            this._v = v;
            this._redraw();
        }
    },
    _redraw: function() {
        var ctx = this.context;
        var width = this.width;
        var height = this.height;
        var hw = width / 2;
        var hh = height / 2;
        var len = hw * hh;
        var imageData = this._imageData;
        var data = imageData.data;
        var v = this._v;
        var vy, vx, i, h, s, rgb;
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                vy = y - hh;
                vx = x - hw;
                s = (vy * vy + vx * vx) / len;
                if (s <= 1) {
                    i = (y * width + x) * 4;
                    h = Math.atan(-vy / vx);
                    if (vx < 0) {
                        h -= Math.PI;
                    }
                    h *= RAD2DEG;
                    rgb = hsv2rgb(h, Math.sqrt(s), v);
                    data[i] = rgb[0];
                    data[i + 1] = rgb[1];
                    data[i + 2] = rgb[2];
                    data[i + 3] = 255;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
});

/**
 * @scope enchant.color.HsvPalette.prototype
 */
enchant.color.HsvPalette = enchant.Class.create(enchant.Sprite, {
    /**
     * @name enchant.color.HsvPalette
     * @class
     [lang:ja]
     * カラーパレットのクラス.
     * @param {Number} width 横幅.
     * @param {Number} height 縦幅.
     [/lang]
     * @constructs
     * @extends enchant.Sprite
     */
    initialize: function(width, height) {
        enchant.Sprite.call(this, width, height);
        this.image = new enchant.color.HsvSurface(width, height);
    },
    /**
     [lang:ja]
     * 指定した座標から色を取得する.
     * @param {Number} x x座標.
     * @param {Number} y y座標.
     * @return {Array.<Number>} rgbの値.
     [/lang]
     */
    getColor: function(x, y) {
        var hw = this.width / 2;
        var hh = this.height / 2;
        var vx = x - hw;
        var vy = y - hh;
        var r = hw * hh;
        var s = (vx * vx + vy * vy) / r;
        s = Math.min(1, s);
        var h = Math.atan(-vy / vx);
        if (vx < 0) {
            h -= Math.PI;
        }
        h *= RAD2DEG;
        return hsv2rgb(h, Math.sqrt(s), this.V);
    },
    /**
     [lang:ja]
     * パレット全体のbrightness.
     [/lang]
     * @type {Number}
     */
    V: {
        get: function() {
            return this._image._v;
        },
        set: function(v) {
            this._image._v = v;
            this._image._redraw();
        }
    }
});

/**
 * Surfaceの色を指定した2色の間の色に変換する.
 * @param {Number.<Array>|enchant.color.Color} color1 指定の色1.
 * @param {Number.<Array>|enchant.color.Color} color2 指定の色2.
 * @return {enchant.block.InputSelectBox} メソッドを呼び出したインスタンス.
 */
enchant.Surface.prototype.clampColor = function(color1, color2) {
    var args = Array.prototype.slice.call(arguments).map(function(color) {
        if (!(color instanceof enchant.color.Color)) {
            if (color instanceof Array) {
                return new enchant.color.Color(color);
            } else if (typeof color === 'string') {
                return enchant.color.Color.createFromCSSString(color);
            } else {
                throw new Error('invalid argument');
            }
        }
    });
    color1 = args[0];
    color2 = args[1];
    var r = color2.r / 255 - color1.r / 255;
    var g = color2.g / 255 - color1.g / 255;
    var b = color2.b / 255 - color1.b / 255;
    var a1 = color1.r;
    var a2 = color1.g;
    var a3 = color1.b;
    var w = this.width;
    var h = this.height;
    var imageData = this.context.getImageData(0, 0, w, h);
    var data = imageData.data;
    var y, rgb;
    for (var i = 0, l = w * h * 4; i < l; i += 4) {
        data[i] = r * data[i] + a1;
        data[i + 1] = g * data[i + 1] + a2;
        data[i + 2] = b * data[i + 2] + a3;
    }
    this.context.putImageData(imageData, 0, 0);
    return this;
};

/**
 * Surfaceの色を指定したu, vをもとに変換する.
 * @param {Number} u u. 範囲は[-1, 1].
 * @param {Number} v v. 範囲は[-1, 1].
 * @return {enchant.block.InputSelectBox} メソッドを呼び出したインスタンス.
 */
enchant.Surface.prototype.yuvFilter = function(u, v) {
    u *= 255;
    v *= 255;
    var w = this.width;
    var h = this.height;
    var imageData = this.context.getImageData(0, 0, w, h);
    var data = imageData.data;
    var y, rgb;
    for (var i = 0, l = w * h * 4; i < l; i += 4) {
        y = rgb2yuv(data[i], data[i + 1], data[i + 2])[0];
        rgb = yuv2rgb(y, u, v);
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
    }
    this.context.putImageData(imageData, 0, 0);
    return this;
};

/**
 [lang:ja]
 * hsvの値をrgbの値に変換する.
 [/lang]
 * @param {Number} h hue value.
 * @param {Number} s saturation value.
 * @param {Number} v brightness value.
 * @return {Array.<Number>} rgb array.
 * @static
 */
enchant.color.Color.hsv2rgb = hsv2rgb;
/**
 [lang:ja]
 * hslの値をrgbの値に変換する.
 [/lang]
 * @param {Number} h hue value.
 * @param {Number} s saturation value.
 * @param {Number} v luminance value.
 * @return {Array.<Number>} rgb array.
 * @static
 */
enchant.color.Color.hsl2rgb = hsl2rgb;
/**
 [lang:ja]
 * yuvの値をrgbの値に変換する.
 [/lang]
 * @param {Number} y y value.
 * @param {Number} u u value.
 * @param {Number} v v value.
 * @return {Array.<Number>} rgb array.
 * @static
 */
enchant.color.Color.yuv2rgb = yuv2rgb;
/**
 [lang:ja]
 * rgbの値をyuvの値に変換する.
 [/lang]
 * @param {Number} r red value.
 * @param {Number} g green value.
 * @param {Number} b blue value.
 * @return {Array.<Number>} yuv array.
 * @static
 */
enchant.color.Color.rgb2yuv = rgb2yuv;

}());
