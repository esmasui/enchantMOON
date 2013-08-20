(function(global) {
    (function(getMetrics) {
        var ctx = enchant.Surface._staticCanvas2DContext;
        enchant.Label.prototype.getMetrics = function(text) {
            var ret = getMetrics.call(this, text);
            ctx.save();
            ctx.font = this.font;
            ret.width = ctx.measureText((text || this._text) + ' ').width;
            ctx.restore();
            return ret;
        };
    }(enchant.Label.prototype.getMetrics));

    function makeAssetTuples(path) {
        var ret;
        if (path instanceof Array) {
            return path.map(function(src) {
                return [ src, src ];
            });
        } else {
            ret = [];
            for (var name in path) {
                ret.push([ path[name], name ]);
            }
            return ret;
        }
    }

    function loadAssets(path, isTuple) {
        var t;
        if (isTuple) {
            t = path;
        } else {
            t = makeAssetTuples(path);
        }
        return enchant.Deferred.parallel(t.map(function(pair) {
            return enchant.Core.instance.load(pair[0], pair[1]);
        }));
    }

    var userAssets = [];

    function prepareTheatre(opt) {
        if (opt && opt.assets) {
            Array.prototype.push.apply(userAssets, opt.assets.slice());
        }
        enchant.puppet.assets = [];
        enchant.ui.assets = [];
        return enchant.puppet.Theatre.create({
            w: 384,
            h: 512,
            backdrop: {
                top: 'rgba(0, 0, 0, 0.0)',
                bottom: 'rgba(0, 0, 0, 0.0)'
            },
            autoStart: false,
            showScore: false
        });
    }

    function startTheatre() {
        if (enchant.Event.ERASER_UP) {
            attachPenEventBinds();
        }
        enchant.puppet.Theatre._execSceneStartEvent();
        enchant.puppet.Theatre.instance.resume();
    }

    function stopTheatre() {
        var Constructor;
        for (var name in enchant.puppet.Actor.constructors) {
            Constructor = enchant.puppet.Actor.constructors[name];
            /*jshint loopfunc:true */
            Constructor.collection.slice().forEach(function(instance) {
                instance.remove();
            });
        }
        enchant.puppet.Theatre.instance._scenes.forEach(function(scene) {
            scene._dispatchExitframe();
        });
        enchant.puppet.Theatre.instance.pause();
        MOON.finish();
    }

    function attachPenEventBinds() {
        [
            enchant.Event.ERASER_UP,
            enchant.Event.ERASER_MOVE,
            enchant.Event.ERASER_DOWN,
            enchant.Event.ERASER_UP,
            enchant.Event.ERASER_MOVE,
            enchant.Event.ERASER_DOWN
        ].forEach(function(type) {
             enchant.puppet.Theatre.instance.rootScene.addEventListener(type, enchant.puppet.Theatre._invokeSceneBehaviorForInstance);
        });
    }

    if (!enchant.nineleap) {

        var SplashScene = enchant.Class.create(enchant.Scene, {
            initialize: function() {
                enchant.Scene.call(this);
            },
            image: {
                get: function() {
                    return this._image;
                },
                set: function(image) {
                    this._image = image;
                    while (this.firstChild) {
                        this.removeChild(this.firstChild);
                    }
                    var sprite = new enchant.Sprite(image.width, image.height);
                    sprite.image = image;
                    sprite.x = (this.width - image.width) / 2;
                    sprite.y = (this.height - image.height) / 2;
                    this.addChild(sprite);
                }
            }
        });

        enchant.puppet.Theatre.prototype.end = function(score, result, img) {
            var endScene = new SplashScene();
            if (!(img instanceof enchant.Surface)) {
                img = this.assets['end.png'];
            }
            endScene.image = img;
            setTimeout(function() {
                endScene.ontouchend = function() {
                    MOON.finish();
                };
            }, 1000);
            this.pushScene(endScene);
            this.end = function() {};
        };
    }

    var spConstructors = {};
    var StickerPuppet = function() {
    };
    StickerPuppet.create = function(puppetName, option) {
        var Puppet = enchant.puppet.Puppet.create(puppetName, option);
        var sticker = Sticker.create();
        var id = sticker.id;
        spConstructors[id] = Puppet;
        sticker.ontap = function() {
            entry(this, 'stickertap');
        };
        sticker.onattach = function() {
            entry(this, 'stickerattach');
        };
        sticker.ondetach = function() {
            entry(this, 'stickerdetach');
        };
        sticker.register();
        function entry(sticker, type) {
            setPos(sticker, Puppet);
            preload()
                .next(function() {
                    invokeStickerBehavior(id, type);
                    enchant.puppet.Theatre.instance.dispatchEvent(new enchant.Event('load'));
                    enchant.puppet.startTheatre();
                })
                .error(handleError);
        }
        return id;
    };
    StickerPuppet.get = function(id) {
        return spConstructors[id] || null;
    };

    function invokeStickerBehavior(id, name) {
        var Constructor = spConstructors[id];
        var behavior;
        if (Constructor) {
            behavior = enchant.puppet.Actor.parseBehaviors(Constructor.definition.behavior).self[name];
            if (behavior) {
                for (var i = 0, l = behavior.length; i < l; i++) {
                    behavior[i].func.call(Constructor);
                }
            } else {
                enchant.puppet.stopTheatre();
            }
            return 0;
        } else {
            return 1;
        }
    }

    function setPos(sticker, puppet) {
        [ 'x', 'y', 'width', 'height' ].forEach(function(prop) {
            puppet[prop] = sticker[prop] / 2;
        });
    }

    function preload() {
        return loadAssets(userAssets.map(function(fileName) {
            return [ 'images/' + fileName, fileName ];
        }), true);
    }

    function handleError(e) {
        window.console.log(e.message);
        window.console.log(e.stack);
        MOON.alert('シールの実行に失敗しました\n' + e.message, function() {
            MOON.finish();
        });
    }

    var exports = {
        loadAssets: loadAssets,
        prepareTheatre: prepareTheatre,
        startTheatre: startTheatre,
        stopTheatre: stopTheatre,
        StickerPuppet: StickerPuppet
    };
    for (var prop in exports) {
        global.enchant.puppet[prop] = exports[prop];
    }


}(this));
