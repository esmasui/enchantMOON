/**
 * puppet.enchant.js
 * 0.5.3
 * @requires enchant.js v0.6.0 or later
 * @requires ui.enchant.js v2
 *
 * @description
 * Puppet classes for enchant.js
 */

/**
 * @type {Object}
 */
enchant.puppet = {
    assets: [
        'space3.png', 'icon0.png', 'chara0.png', 'chara1.png',
        'chara2.png', 'chara3.png', 'chara3.png', 'chara4.png',
        'chara5.png', 'chara6.png', 'chara7.png', 'starship.png',
        'enemy01.png', 'effect0.gif', 'eclipse.png', 'hollywood.png',
        'desert.png', 'beach.png', 'sky.png', 'spacebg.png'
    ]
};

/**
 * パペットが他のパペットと衝突した際に発生するイベント.
 * 発行するオブジェクト: {@link enchant.puppet.Puppet}
 * @type {String}
 */
enchant.Event.ACTOR_HIT = 'actorhit';

/**
 * パペットが画面から消える際に発生するイベント.
 * 発行するオブジェクト: {@link enchant.puppet.Puppet}
 * @type {String}
 */
enchant.Event.ACTOR_DIE = 'actordie';

/**
 * パペットが画面からすべて消えた際に発生するイベント.
 * 発行するオブジェクト: {@link enchant.puppet.Puppet}
 * @type {String}
 */
enchant.Event.ACTOR_DIE_ALL = 'actordieall';

/**
 * パペットに信号を与えるイベント.
 * 発行するオブジェクト: {@link enchant.puppet.SignalDispatcher}
 * @type {String}
 */
enchant.Event.SIGNAL = 'signal';

(function() {

function rand(n) {
    return Math.floor(Math.random() * n);
}

window.rand = rand;

function cloneObject(obj, deep, _seen) {
    deep = !!deep;
    _seen = _seen || [];
    var ret = {};
    var elem;
    for (var prop in obj) {
        elem = obj[prop];
        if (obj.hasOwnProperty(prop)) {
            if (deep) {
                if (elem instanceof Array) {
                    ret[prop] = elem.slice();
                } else if (typeof elem === 'object') {
                    if (_seen.indexOf(elem) !== -1) {
                        throw new Error('cyclic object');
                    }
                    _seen.push(elem);
                    ret[prop] = cloneObject(elem, deep, _seen);
                    _seen.splice(_seen.indexOf(elem), 1);
                } else {
                    ret[prop] = elem;
                }
            } else {
                ret[prop] = elem;
            }
        }
    }
    return ret;
}

window.cloneObject = cloneObject;

function mixObject(properties, dest) {
    for (var prop in properties) {
        if (properties.hasOwnProperty(prop)) {
            dest[prop] = properties[prop];
        }
    }
    return dest;
}

window.mixObject = mixObject;

/**
 * @name enchant.puppet.Actor
 [lang:ja]
 * Behaviorシステムに対応したコンストラクタを生成する.
 * @param {Function} [superclass] 親クラス.
 * @param {*} definition クラスの定義.
 [/lang]
 */
enchant.puppet.Actor = function(superclass, definition) {
    return enchant.puppet.Actor.create(superclass, definition);
};
Object.defineProperty(enchant.puppet.Actor, 'collection', {
    get: function() {
        var ret = [];
        for (var prop in this.constructors) {
            Array.prototype.push.apply(ret, this.constructors[prop].collection);
        }
        return ret;
    }
});

/**
 [lang:ja]
 * Actor.createで生成したコンストラクタが保持される連想配列.
 [/lang]
 * @type {Object}
 */
enchant.puppet.Actor.constructors = {};

/**
 [lang:ja]
 * Behaviorシステムに対応したクラスを生成する.
 * @param {Function} [superclass] 親クラス.
 * @param {*} definition クラスの定義.
 [/lang]
 * @static
 */
enchant.puppet.Actor.create = function(superclass, definition) {
    var Constructor = enchant.Class.create(superclass, mixObject(this.definition, definition));
    var $initialize = Constructor.prototype.initialize;
    Constructor.prototype.initialize = function() {
        $initialize.apply(this, arguments);
        this.behaviors = cloneObject(this.getConstructor().behaviors, true);
        enchant.puppet.Actor.initialize.apply(this, arguments);
    };
    Constructor.constructors = {};
    Constructor.create = function(name, option) {
        var behaviors = {};
        var definition = mixObject({
            puppetName: name,
            speed: 10,
            interval: 30,
            appearInterval: 30,
            initialNumber: 10
        }, cloneObject(option));
        var C = enchant.Class.create(Constructor, cloneObject(definition));
        C.definition = definition;
        if (option.behavior) {
            behaviors = enchant.puppet.Actor.parseBehaviors(option.behavior);
            C.behaviors = behaviors;
        } else {
            C.behaviors = { self: {}, scene: {} };
        }
        enchant.puppet.Actor.constructors[name] = C;
        Constructor.constructors[name] = C;
        window[name] = C;
        return C;
    };
    return Constructor;
};

/**
 * @private
 */
enchant.puppet.Actor.initialize = function(x, y) {
    this.HP = 100;
    this.isHit = false;
    this.collision = [];

    this.addEventListener(enchant.Event.ENTER_FRAME, this._consumeOnce);
    this.addEventListener(enchant.Event.ENTER_FRAME, this._displayCheck);
    enchant.puppet.Actor.INVOKE_BEHAVIOR_EVENT_TYPES.forEach(function(type) {
        this.addEventListener(type, this._invokeBehavior);
    }, this);

    if (typeof x === 'number' &&
        typeof y === 'number') {
        this.appear(x, y);
    }
};

enchant.puppet.Actor.INVOKE_BEHAVIOR_EVENT_TYPES = [
    enchant.Event.ENTER_FRAME,
    enchant.Event.TOUCH_START,
    enchant.Event.TOUCH_MOVE,
    enchant.Event.TOUCH_END,
    enchant.Event.ACTOR_HIT,
    enchant.Event.ACTOR_DIE,
    enchant.Event.ACTOR_DIE_ALL,
    enchant.Event.SIGNAL,
    // for behavior
    'init'
];

enchant.puppet.Actor.BEHAVIOR_TYPE_ALIAS = {
    hit: 'actorhit'
};

enchant.puppet.Actor.parseBehaviors = function(behaviors) {
    if (!(behaviors instanceof Array)) {
        behaviors = Array.prototype.slice.call(arguments);
    }

    var ret = { self: {}, scene: {} };
    var identifier, behavior, obj;

    function add(target, type, func, identifier) {
        type = enchant.puppet.Actor.BEHAVIOR_TYPE_ALIAS[type] || type;
        if (!ret[target]) {
            ret[target] = {};
        }
        if (!ret[target][type]) {
            ret[target][type] = [];
        }
        ret[target][type].push({
            func: func,
            identifier: identifier
        });
    }

    for (var i = 0, l = behaviors.length; i < l; i++) {
        identifier = behavior = behaviors[i];
        if (typeof behavior === 'string') {
            behavior = enchant.puppet.Actor.behaviors[behavior];
        }
        for (var target in behavior) {
            obj = behavior[target];
            // version compatibility
            if (/^scene[A-Z]/.test(target)) {
                add('scene', target.slice(5).toLowerCase(), obj, identifier);
            } else if (target !== 'scene' && target !== 'self') {
                add('self', target, obj, identifier);
            } else {
                for (var type in obj) {
                    add(target, type, obj[type], identifier);
                }
            }
        }
    }
    return ret;
};

/**
 * @scope enchant.puppet.Actor.prototype
 */
enchant.puppet.Actor.definition = {
    /**
     [lang:ja]
     * パペットにビヘイビアを追加する.
     * @param {String[]|Objecti[]} beheviors 追加したいビヘイビア.
     [/lang]
     */
    addBehavior: function() {
        var behaviors = enchant.puppet.Actor.parseBehaviors.apply(null, arguments);
        var target, type;
        for (target in behaviors) {
            if (!this.behaviors[target]) {
                this.behaviors[target] = {};
            }
            for (type in behaviors.self) {
                if (!this.behaviors[target][type]) {
                    this.behaviors[target][type] = [];
                }
                Array.prototype.push.apply(this.behaviors[target][type], behaviors[target][type]);
            }
        }
        if (behaviors.self.init) {
            for (var i = 0, l = behaviors.self.init.length; i < l; i++) {
                behaviors.self.init[i].func.call(this);
            }
        }
    },
    /**
     [lang:ja]
     * Actorからビヘイビアを削除する.
     * @param {String|Object...} beheviors 削除したいビヘイビア.
     [/lang]
     * @deprecated
     */
    removeBehavior: function() {
        var behaviors = enchant.puppet.Actor.parseBehaviors.apply(null, arguments);
    },
    _invokeBehavior: function(event) {
        var type = event.type;
        if (event instanceof enchant.puppet.Signal) {
            type = event.signalName;
        }
        var listeners = this.behaviors.self[type];
        if (listeners) {
            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].func.call(this, event);
            }
        }
        // TODO old -> this[type]
        if (this['on' + type]) {
            this['on' + type].call(this);
        }
    },
    _displayCheck: function() {
        var theatre = enchant.puppet.Theatre.instance;
        if (this.x < -theatre.width || this.x > theatre.width * 2 ||
            this.y < -theatre.height || this.y > theatre.height * 2 ||
            this.HP <= 0) {
            this.die();
        }
    },
    _consumeOnce: function() {
        var once = this.behaviors.self.once || [];
        for (var i = 0, l = once.length; i < l; i++) {
            once[i].func.call(this);
        }
        this.behaviors.self.once = [];
    },
    /**
     [lang:ja]
     * Actorを表示する.
     * @param {Number} x x座標.
     * @param {Number} y y座標.
     [/lang]
     */
    appear: function(x, y) {
        this.moveTo(x, y);
        if (!this.parentNodescene) {
            enchant.puppet.Theatre.instance.stage.addChild(this);
            // for invoke behavior
            this.dispatchEvent(new enchant.Event('init'));
        }
    },
    /**
     [lang:ja]
     * Actorを削除する.
     [/lang]
     */
    die: function() {
        this.dispatchEvent(new enchant.Event(enchant.Event.ACTOR_DIE));
        this.remove();
        if (this.getConstructor().collection.length <= 0) {
            this.dispatchEvent(new enchant.Event(enchant.Event.ACTOR_DIE_ALL));
        }
    }
};

/**
 [lang:ja]
 * Actor.createで生成されたコンストラクタとそのインスタンスを削除する.
 * @param {String} name コンストラクタ名.
 [/lang]
 */
enchant.puppet.Actor.remove = function(name) {
    var Constructor = enchant.puppet.Actor.constructors[name];
    var instances;
    if (Constructor) {
        instances = Constructor.collection.slice();
        for (var i = 0, l = instances.length; i < l; i++) {
            instances[i].remove();
        }
        delete this[name];
        delete window[name];
        delete Object.getPrototypeOf(Constructor.prototype).constructor.constructors[name];
    }
};
/**
 [lang:ja]
 * Actor.createで生成されたすべてのコンストラクタとそのインスタンスを削除する.
 [/lang]
 */
enchant.puppet.Actor.clear = function() {
    for (var name in this.constructors) {
        this.remove(name);
    }
};

enchant.puppet.Actor.getHPBehavior = function(n) {
    n |= 0;
    var pre = (n < 0) ? 'INC' : 'DEC';
    var name = pre + '_HP_' + Math.abs(n);
    if (!enchant.puppet.Actor.behaviors[name]) {
        enchant.puppet.Actor.behaviors[name] = {
            self: {
                once: function() {
                    this.HP += n;
                }
            }
        };
    }
    return enchant.puppet.Actor.behaviors[name];
};

enchant.puppet.Actor.behaviors = {
    moveLeft: {
        self: {
            enterframe: function() {
                this.x -= this.speed * 0.1;
            }
        }
    },
    die: {
        self: {
            enterframe: function() {
                this.die();
            }
        }
    },
    bigger: {
        self: {
            enterframe: function() {
                this.scaleX *= 1.05;
                this.scaleY *= 1.05;
            }
        }
    },
    biggerX: {
        self: {
            enterframe: function() {
                this.scaleX *= 1.05;
            }
        }
    },
    biggerY: {
        self: {
            enterframe: function() {
                this.scaleY *= 1.05;
            }
        }
    },
    smaller: {
        self: {
            enterframe: function() {
                this.scaleX *= 0.95;
                this.scaleY *= 0.95;
            }
        }
    },
    smallerX: {
        self: {
            enterframe: function() {
                this.scaleX *= 0.95;
            }
        }
    },
    smallerY: {
        self: {
            enterframe: function() {
                this.scaleY *= 0.95;
            }
        }
    },
    moveRight: {
        self: {
            enterframe: function() {
                this.x += this.speed * 0.1;
            }
        }
    },
    moveUp: {
        self: {
            enterframe: function() {
                this.y -= this.speed * 0.1;
            }
        }
    },
    moveDown: {
        self: {
            enterframe: function() {
                this.y += this.speed * 0.1;
            }
        }
    },
    moveRandomDir: {
        self: {
            init: function() {
                this.vx = rand(this.speed) - this.speed / 2;
                this.vy = rand(this.speed) - this.speed / 2;
            },
            enterframe: function() {
                this.x += this.vx;
                this.y += this.vy;
            }
        }
    },
    randomAppearLeft: {
        self: {
            enterframe: function() {
                this.x += this.speed * 0.1;
            }
        },
        scene: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                var w = theatre.width, h = theatre.height;
                if (theatre.frame % this.interval === 0) {
                    var item = new window[this.puppetName]();
                    item.appear(-item.width - rand(w / 2), rand(h - item.height));
                }
            }
        }
    },
    randomAppearRight: {
        self: {
            enterframe: function() {
                this.x -= this.speed * 0.1;
            }
        },
        scene: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                var w = theatre.width, h = theatre.height;
                if (theatre.frame % this.interval === 0) {
                    var item = new window[this.puppetName]();
                    item.appear(w + rand(w / 2), rand(h - item.height));
                }
            }
        }
    },
    randomAppearTop: {
        self: {
            enterframe: function() {
                this.y += this.speed * 0.1;
            }
        },
        scene: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                var w = theatre.width, h = theatre.height;
                if (theatre.frame % this.interval === 0) {
                    var item = new window[this.puppetName]();
                    item.appear(rand(w - item.width), -item.height - rand(h / 2));
                }
            }
        }
    },
    randomAppearBottom: {
        self: {
            enterframe: function() {
                this.y -= this.speed * 0.1;
            }
        },
        scene: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                var w = theatre.width, h = theatre.height;
                if (theatre.frame % this.interval === 0) {
                    var item = new window[this.puppetName]();
                    item.appear(rand(w - item.width), h + (rand(h / 2)));
                }
            }
        }
    },
    randomSetup: {
        scene: {
            start: function() {
                setTimeout((function(self) {
                    return function() {
                        var theatre = enchant.puppet.Theatre.instance;
                        var w = theatre.width, h = theatre.height;
                        for (var i = 0, l = self.initialNumber; i < l; i++) {
                            var item = new window[self.puppetName]();
                            item.appear(rand(w - item.width), rand(h - item.height));
                        }
                    };
                }(this)), 0);
            }
        }
    },
    standAlone: {
        scene: {
            start: function() {
                setTimeout((function(self) {
                    return function() {
                        var theatre = enchant.puppet.Theatre.instance;
                        var w = theatre.width, h = theatre.height;

                        var startPins = [];
                        var i, l, item, startPin, startX, startY;
                        if (self.startPin) {
                            if (self.startPin[0] instanceof Array) {
                                startPins = self.startPin;
                            } else {
                                startPins = [ self.startPin ];
                            }
                            for (i = 0, l = startPins.length; i < l; i++) {
                                startPin = startPins[i];
                                startX = startPin ? startPin[0] : w / 2;
                                startY = startPin ? startPin[1] : h / 2;
                                item = new window[self.puppetName](startX, startY);
                            }
                        } else {
                            item = new window[self.puppetName]();
                            item.appear((theatre.width - item.width) / 2, (theatre.height - item.height) / 2);
                        }
                    };
                }(this)), 0);
            }
        }
    },
    zigzagX: {
        self: {
            enterframe: function() {
                this.x += Math.cos(this.age * 0.1) * 0.1 * this.speed;
            }
        }
    },
    zigzagY: {
        self: {
            enterframe: function() {
                this.y += Math.sin(this.age * 0.1) * 0.1 * this.speed;
            }
        }
    },
    tapRC: {
        self: {
            init: function() {
                this.a = 0;
                this.dir = -Math.PI / 2;
            },
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.x += Math.cos(this.dir) * this.speed * 0.1;
                this.y += Math.sin(this.dir) * this.speed * 0.1;
                if (theatre.touchX > 180) {
                    this.dir += 0.1;
                }
                if (theatre.touchX < 140) {
                    this.dir -= 0.1;
                }
                this.rotation = this.dir * 180 / Math.PI + 90;
            }
        }
    },
    tapMove: {
        self: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.x = theatre.touchX - this.width / 2;
                this.y = theatre.touchY - this.height / 2;
            }
        }
    },
    tapMoveX: {
        self: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.x = theatre.touchX - this.width / 2;
            }
        }
    },
    tapMoveY: {
        self: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.y = theatre.touchY - this.height / 2;
            }
        }
    },
    tapChase: {
        self: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.x += ((theatre.touchX - this.width / 2) - this.x) * 0.01 * this.speed;
                this.y += ((theatre.touchY - this.height / 2) - this.y) * 0.01 * this.speed;
            }
        }
    },
    tapChaseX: {
        self: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.x += ((theatre.touchX - this.width / 2) - this.x) * 0.01 * this.speed;
            }
        }
    },
    tapChaseY: {
        self: {
            enterframe: function() {
                var theatre = enchant.puppet.Theatre.instance;
                this.y += ((theatre.touchY - this.height / 2) - this.y) * 0.01 * this.speed;
            }
        }
    },
    hitAndDie: {
        self: {
            actorhit: function() {
                this.die();
            }
        }
    },
    hitAndScore: {
        self: {
            actorhit: function() {
                var theatre = enchant.puppet.Theatre.instance;
                theatre.score++;
            }
        }
    },
    hitOnce: {
        self: {
            actorhit: function() {
                this.isHit = true;
            }
        }
    },
    randomAge: {
        self: {
            init: function() {
                this.age = rand(this.speed + 10);
            }
        }
    }
};

/**
 * @scope enchant.puppet.Puppet.prototype
 */
enchant.puppet.Puppet = enchant.puppet.Actor.create(enchant.Sprite, {
    /**
     * @name enchant.puppet.Puppet
     * @class
     [lang:ja]
     * Behavior(振る舞い)を追加することでゲームのための動作を設定することができるSprite.
     * @param {Number} _x 初期位置のx座標.
     * @param {Number} _y 初期位置のy座標.
     [/lang]
     * @constructs
     * @extends enchant.Sprite
     * @extends enchant.puppet.Actor
     */
    initialize: function() {
        var w = (typeof this.w === 'number') ? this.w : 32;
        var h = (typeof this.h === 'number') ? this.h : 32;
        enchant.Sprite.call(this, w, h);
        var path = this.filename ? this.filename : 'chara1.png';
        this.image = enchant.puppet.Theatre.instance.assets[path];
        this.frame = this.f ? this.f : 0;
    }
});

/**
 * @scope enchant.puppet.SignBoard.prototype
 */
enchant.puppet.SignBoard = enchant.puppet.Actor.create(enchant.Label, {
    /**
     * @name enchant.puppet.SignBoard
     * @class
     [lang:ja]
     * Behavior(振る舞い)を追加することでゲームのための動作を設定することができるLabel.
     * @param {Number} _x 初期位置のx座標.
     * @param {Number} _y 初期位置のy座標.
     [/lang]
     * @constructs
     * @extends enchant.Label
     * @extends enchant.puppet.Actor
     */
    initialize: function() {
        var text = (typeof this.t === 'string') ? this.t : 'text';
        enchant.Label.call(this, text);
        if (this.f) {
            this.font = this.f;
        }
        if (this.c) {
            this.color = this.c;
        }
    },
    updateBoundArea: function() {
        enchant.Label.prototype.updateBoundArea.apply(this, arguments);
        this._width = this._boundWidth;
        this._height = this._boundHeight;
    }
});

/**
 * @scope enchant.puppet.MutableSignBoard.prototype
 */
enchant.puppet.MutableSignBoard = enchant.puppet.Actor.create(enchant.ui.MutableText, {
    /**
     * @name enchant.puppet.MutableSignBoard
     * @class
     [lang:ja]
     * Behavior(振る舞い)を追加することでゲームのための動作を設定することができるMutableText.
     * @param {Number} _x 初期位置のx座標.
     * @param {Number} _y 初期位置のy座標.
     [/lang]
     * @constructs
     * @extends enchant.ui.MutableText
     * @extends enchant.puppet.Actor
     */
    initialize: function() {
        var text = (typeof this.t === 'string') ? this.t : 'text';
        enchant.ui.MutableText.call(this, 0, 0);
        this.setText(text);
    }
});

/**
 * @scope enchant.puppet.Signal.prototype
 */
enchant.puppet.Signal = enchant.Class.create(enchant.Event, {
    /**
     * @name enchant.puppet.Signal
     [lang:ja]
     * SignalDispatcherで発行するためのイベントオブジェクト.
     * @param {String} signalName シグナルの名前.
     [/lang]
     * @class
     * @constructs
     * @extends enchant.Event
     */
    initialize: function(signalName) {
        enchant.Event.call(this, 'signal');
        this.signalName = signalName;
    }
});

/**
 * @scope enchant.puppet.SignalDispatcher.prototype
 */
enchant.puppet.SignalDispatcher = enchant.Class.create({
    /**
     [lang:ja]
     * SignalEventを特定のクラスのアクティブなインスタンスに発行する.
     [/lang]
     * @param {Function} targetConstructor シグナルを送信したいクラス.
     * @param {enchant.puppet.Signal} signal Signalオブジェクト.
     */
    dispatchSignal: function(targetConstructor, signal) {
        targetConstructor.collection.forEach(function(instance) {
            instance.dispatchEvent(signal);
        });
    }
});

// for nineleap plugins
var parentModule = null;
(function() {
    if (enchant.nineleap !== undefined) {
        if (enchant.nineleap.memory !== undefined &&
            Object.getPrototypeOf(enchant.nineleap.memory) === Object.prototype) {
            parentModule = enchant.nineleap.memory;
        } else if (enchant.nineleap !== undefined &&
            Object.getPrototypeOf(enchant.nineleap) === Object.prototype) {
            parentModule = enchant.nineleap;
        }
    } else {
        parentModule = enchant;
    }
}());

/**
 * @scope enchant.puppet.Theatre.prototype
 */
enchant.puppet.Theatre = enchant.Class.create(parentModule.Core, {
    /**
     * @name enchant.puppet.Theatre
     [lang:ja]
     * {@link enchant.Core}を拡張したクラス.
     * @param {Number} width 画面の横幅.
     * @param {Number} height 画面の縦幅.
     [/lang]
     * @class
     * @constructs
     */
    initialize: function(w, h) {
        parentModule.Core.call(this, w, h);
        var theatre = enchant.puppet.Theatre.instance = this;
        var topGrad = 'rgb(30, 150, 255)';
        var bottomGrad = 'rgb(255, 255, 255)';
        this.touchX = this.width / 2;
        this.touchY = this.height / 2;
        this.score = 0;
        /**
         [lang:ja]
         * 背景のレイヤ.
         [/lang]
         * @type {enchant.Group}
         */
        this.backdrop = new enchant.Group();
        this.rootScene.addChild(this.backdrop);
        /**
         [lang:ja]
         * 前景のレイヤ.
         * パペットが追加される.
         [/lang]
         * @type {enchant.Group}
         */
        this.stage = new enchant.Group();
        this.rootScene.addChild(this.stage);
        /**
         [lang:ja]
         * パペットが追加される.
         [/lang]
         * @type {enchant.puppet.ColorScreen}
         */
        this.screen = new enchant.puppet.ColorScreen(topGrad, bottomGrad);
        /**
         [lang:ja]
         * .
         [/lang]
         * @type {enchant.puppet.ColorScreen}
         */
        this.signalDispatcher = new enchant.puppet.SignalDispatcher();

        this.addEventListener(enchant.Event.ENTER_FRAME, function() {
            var e = new enchant.Event(enchant.Event.ACTOR_HIT);
            var hit = this.collisionAll();
            var pair;
            for (var i = 0, l = hit.length; i < l; i++) {
                pair = hit[i];
                e.other = pair[1];
                pair[0].dispatchEvent(e);
            }
        });
        this.rootScene.addEventListener(enchant.Event.TOUCH_END, enchant.puppet.Theatre._invokeSceneBehaviorForInstance);
        this.rootScene.addEventListener(enchant.Event.ENTER_FRAME, enchant.puppet.Theatre._invokeSceneBehaviorForClass);
        [
            enchant.Event.TOUCH_START,
            enchant.Event.TOUCH_MOVE,
            enchant.Event.TOUCH_END
        ].forEach(function(type) {
            this.rootScene.addEventListener(type, function(e) {
                theatre.touchX = e.x;
                theatre.touchY = e.y;
            });
        }, this);
    },
    collisionAll: function() {
        var constructors = enchant.puppet.Actor.constructors;
        var hit = [];
        var Constructor, instances, instance, collision, collisionName, memo, result, other;
        for (var ConstructorName in constructors) {
            Constructor = constructors[ConstructorName];
            instances = Constructor.collection;
            for (var i = 0, l = instances.length; i < l; i++) {
                instance = instances[i];
                memo = {};
                for (var j = 0, ll = instance.collision.length; j < ll; j++) {
                    collisionName = instance.collision[j];
                    if (!memo[collisionName]) {
                        /*jshint loopfunc:true */
                        result = instance.intersect(enchant.puppet.Actor.constructors[collisionName]);
                        for (var k = 0, lll = result.length; k < lll; k++) {
                            other = result[k];
                            if (instance !== other) {
                                hit.push([ instance, other ]);
                            }
                        }
                        memo[collisionName] = true;
                    }
                }
            }
        }
        return hit;
    },
    /**
     [lang:ja]
     * パペットにシグナルを送信する.
     * シグナルに対応する関数はビヘイビアと同じように追加する.
     [/lang]
     * @param {Function} targetConstructor シグナルを送信したいクラス.
     * @param {String} signalName シグナルの名前.
     */
    dispatchSignal: function(targetConstructor, signalName) {
        this.signalDispatcher.dispatchSignal(targetConstructor, new enchant.puppet.Signal(signalName));
    }
});
/**
 [lang:ja]
 * Theatreの背景を変更する.
 * 引数はそのまま{@link enchant.puppet.ColorScreen#change}に渡される.
 [/lang]
 * @static
 */
enchant.puppet.Theatre.changeScreen = function() {
    var theatre = this.instance;
    enchant.puppet.ColorScreen.prototype.change.apply(theatre.screen, arguments);
    theatre.backdrop.removeChild(theatre.screen);
    theatre.backdrop.addChild(theatre.screen);
};
/**
 [lang:ja]
 * Theatreのインスタンス.
 [/lang]
 * @type {enchant.puppet.Theatre}
 * @static
 */
enchant.puppet.Theatre.instance = null;
// version compatibility
enchant.puppet.Puppet.Theatre = enchant.puppet.Theatre;

/**
 [lang:ja]
 * Theatreのインスタンスを作成する.
 * @param {Object} option オプション.
 * @param {Number} option.w 画面の横幅.
 * @param {Number} option.h 画面の縦幅.
 * @param {Object} option.bg 背景の指定.
 * @param {String|enchant.Surface} definition.bg.top 背景の引数1.
 * @param {String} option.bg.bottom 背景の引数2.
 * @param {String[]} option.assets プリロードする画像.
 * @param {boolean} option.showScore スコア表示の設定.
 * @return {enchant.puppet.Theatre|null} 作成したインスタンス.document.bodyがない場合はnull.
 [/lang]
 * @static
 */
enchant.puppet.Theatre.create = function(option) {
    var autoStart = true;
    var showScore = true;
    var w, h, bg, debug, assets;
    w = h = 320;
    if (option) {
        w = option.w ? parseInt(option.w, 10) : 320;
        h = option.h ? parseInt(option.h, 10) : 320;

        // TODO
        bg = option.backdrop;
        assets = option.assets ? option.assets : [];

        autoStart = (option.autoStart !== undefined) ? option.autoStart : true;
        showScore = (option.showScore !== undefined) ? option.showScore : true;
        debug = option.debug;
    }
    var func = function() {
        var theatre = new enchant.puppet.Theatre(w, h);
        theatre.preload(assets);
        theatre.onload = function() {
            if (autoStart) {
                enchant.puppet.Theatre._execSceneStartEvent();
            }
            if (bg) {
                enchant.puppet.Theatre.changeScreen(bg.top, bg.bottom);
            }
            theatre.backdrop.addChild(theatre.screen);

            if (showScore) {
                theatre.scoreBoard = new enchant.puppet.ScoreBoard();
                theatre.rootScene.addChild(theatre.scoreBoard);
            }
        };
        if (autoStart) {
            if (debug) {
                theatre.debug();
            } else {
                theatre.start();
            }
        }
    };
    if (window.document.body) {
        func();
    } else {
        window.onload = func;
    }
    return enchant.puppet.Theatre.instance;
};
enchant.puppet.Theatre._invokeSceneBehaviorForClass = function(e) {
    var type = e.type;
    var constructors = enchant.puppet.Actor.constructors;
    var subclass, behaviors;
    for (var name in constructors) {
        subclass = constructors[name];
        behaviors = subclass.behaviors.scene[type] || [];
        for (var i = 0, l = behaviors.length; i < l; i++) {
            behaviors[i].func.call(subclass.definition, e);
        }
    }
};
enchant.puppet.Theatre._invokeSceneBehaviorForInstance = function(e) {
    var type = e.type;
    var constructors = enchant.puppet.Actor.constructors;
    var subclass, behaviors, instances;
    for (var name in constructors) {
        subclass = constructors[name];
        instances = subclass.collection;
        behaviors = subclass.behaviors.scene[type] || [];
        for (var i = 0, l = behaviors.length; i < l; i++) {
            for (var j = 0, ll = instances.length; j < ll; j++) {
                behaviors[i].func.call(instances[j], e);
            }
        }
    }
};
enchant.puppet.Theatre._execSceneStartEvent = function() {
    enchant.puppet.Theatre._invokeSceneBehaviorForClass(new enchant.Event('start'));
};

/**
 * @scope enchant.puppet.ColorScreen.prototype
 */
enchant.puppet.ColorScreen = enchant.Class.create(enchant.Sprite, {
    /**
     * @name enchant.puppet.ColorScreen
     * @class
     [lang:ja]
     * {@link enchant.puppet.Theatre}の背景のクラス.
     [/lang]
     * @constructs
     * @extends enchant.Sprite
     */
    initialize: function(start, end) {
        var theatre = enchant.puppet.Theatre.instance;
        enchant.Sprite.call(this, theatre.width, theatre.height);
        this.image = new enchant.Surface(this.width, this.height);
        this.change(start, end);
    },
    /**
     * ColorScreen見た目を変更する.
     * 引数が1つの場合は, {@link enchant.Surface}か{@link enchant.Core#assets}のパスとして,
     * 引数が2つの場合は, グラデーションの色指定として解釈される.
     * @param {String|enchant.Surface} arg1 Surface|assetのパス|グラデーションの色1.
     * @param {String} [arg1] グラデーションの色2.
     */
    change: function() {
        var sf;
        if (arguments.length === 1) {
            if (typeof arguments[0] === 'string') {
                sf = enchant.puppet.Theatre.instance.assets[arguments[0]];
            } else {
                sf = arguments[0];
            }
            if (sf instanceof enchant.Surface) {
                this._drawImage(sf);
            }
        } else if (arguments.length === 2) {
            this._drawGradient(arguments[0], arguments[1]);
        }
    },
    _drawImage: function(image) {
        var img = image.clone();
        this.image.draw(img, 0, 0, img.width, img.height, 0, 0, this.width, this.height);
    },
    _drawGradient: function(start, end) {
        var ctx = this.image.context;
        if (typeof ctx.createLinearGradient === 'function') {
            var grad = ctx.createLinearGradient(0, 0, 0, this.height);
            grad.addColorStop(0, start);
            grad.addColorStop(1, end);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = start;
        }
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.fillRect(0, 0, this.width, this.height);
    }
});

/**
 * @scope enchant.puppet.ScoreBoard.prototype
 */
enchant.puppet.ScoreBoard = enchant.Class.create(enchant.Label, {
    /**
     * @name enchant.puppet.ScoreBoard
     * @class
     [lang:ja]
     * {@link enchant.puppet.Theatre}のスコア表示のクラス.
     [/lang]
     * @constructs
     * @extends enchant.Label
     */
    initialize: function() {
        var theatre = enchant.puppet.Theatre.instance;
        enchant.Label.call(this);
        /**
         [lang:ja]
         * スコア表示の接頭辞.
         * デフォルトは"Score:".
         [/lang]
         * @type {String}
         */
        this.prefix = 'SCORE: ';
        this.addEventListener(enchant.Event.ENTER_FRAME, this._update);
        this._currentScore = null;
    },
    _update: function() {
        var theatre = enchant.puppet.Theatre.instance;
        if (this._currentScore !== theatre.score) {
            this.text = this.prefix + theatre.score;
            this._currentScore = theatre.score;
        }
    }
});

window['パペット'] = enchant.puppet.Puppet;
window['パペット作成'] = enchant.puppet.Puppet.create;

window['ジグザグX'] = 'zigzagX';
window['ジグザグY'] = 'zigzagY';
window['上から現れる'] = 'randomAppearTop';
window['下から現れる'] = 'randomAppearBottom';
window['右から現れる'] = 'randomAppearRight';
window['左から現れる'] = 'randomAppearLeft';
window['右へ動く'] = 'moveRight';
window['左へ動く'] = 'moveLeft';
window['上へ動く'] = 'moveUp';
window['下へ動く'] = 'moveDown';
window['ランダムな方向へ動く'] = 'moveRandomDir';
window['タップすると移動'] = 'tapMove';
window['タップするとX移動'] = 'tapMoveX';
window['タップするとY移動'] = 'tapMoveY';
window['タップするとスルスル移動'] = 'tapChase';
window['タップするとスルスルX移動'] = 'tapChaseX';
window['タップするとスルスルY移動'] = 'tapChaseY';
window['ランダムに配置'] = 'randomSetup';
window['一人で登場'] = 'standAlone';
window['当たると消える'] = 'hitAndDie';
window['当たると得点'] = 'hitAndScore';
window['一回だけ当たる'] = 'hitOnce';

}());
