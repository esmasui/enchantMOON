/**
 * @fileOverview
 * stylus.enchant.js
 * @version 0.0.1 (2013/05/15)
 * @requires enchant.js v0.6.3 or later
 *
 * @description
 * enchant.js extension for enchantMOON
 *
 */

(function() {
    enchant.Event.PEN_DOWN = 'pendown';
    enchant.Event.PEN_MOVE = 'penmove';
    enchant.Event.PEN_UP = 'penup';
    enchant.Event.ERASER_DOWN = 'eraserdown';
    enchant.Event.ERASER_MOVE = 'erasermove';
    enchant.Event.ERASER_UP = 'eraserup';

    function addStylusEventListener(stage, type){
        var core = enchant.Core.instance;
        core["_" + type + "downID"] = 0;
        var down = type + 'down';
        var move = type + 'move';
        var up = type + 'up';
        stage.addEventListener(down, function(e) {
            var tagName = (e.target.tagName).toLowerCase();
            if (enchant.ENV.USE_DEFAULT_EVENT_TAGS.indexOf(tagName) === -1) {
                e.preventDefault();
                core["_" + type + "downID"]++;
                if (!core.running) {
                    e.stopPropagation();
                }
            }
        }, true);
        stage.addEventListener(move, function(e) {
            var tagName = (e.target.tagName).toLowerCase();
            if (enchant.ENV.USE_DEFAULT_EVENT_TAGS.indexOf(tagName) === -1) {
                e.preventDefault();
                if (!core.running) {
                    e.stopPropagation();
                }
            }
        }, true);
        stage.addEventListener(up, function(e) {
            var tagName = (e.target.tagName).toLowerCase();
            if (enchant.ENV.USE_DEFAULT_EVENT_TAGS.indexOf(tagName) === -1) {
                e.preventDefault();
                if (!core.running) {
                    e.stopPropagation();
                }
            }
        }, true);
        stage.addEventListener(down, function(e) {
            var core = enchant.Core.instance;
            var evt = new enchant.Event(down);
            evt._initPosition(e.clientX, e.clientY);
            evt.pressure = e.pressure;
            var target = core.currentScene._determineEventTarget(evt);
            core._touchEventTarget[core["_" + type + "downID"]] = target;
            target.dispatchEvent(evt);
        }, false);
        stage.addEventListener(move, function(e) {
            var core = enchant.Core.instance;
            var evt = new enchant.Event(move);
            evt._initPosition(e.clientX, e.clientY);
            evt.pressure = e.pressure;
            var target = core._touchEventTarget[core["_" + type + "downID"]];
            if (target) {
                target.dispatchEvent(evt);
            }
        }, false);
        stage.addEventListener(up, function(e) {
            var core = enchant.Core.instance;
            var evt = new enchant.Event(up);
            evt._initPosition(e.clientX, e.clientY);
            evt.pressure = e.pressure;
            var target = core._touchEventTarget[core["_" + type + "downID"]];
            if (target) {
                target.dispatchEvent(evt);
            }
            delete core._touchEventTarget[core["_" + type + "downID"]];
        }, false);
    }

    var defaultInitialize = enchant.Core.prototype.initialize;
    enchant.Core.prototype.initialize = function(width, height){
            defaultInitialize.call(this, width, height);
            var stage = enchant.Core.instance._element;
            addStylusEventListener(stage, "pen");
            addStylusEventListener(stage, "eraser");
    };
})();
