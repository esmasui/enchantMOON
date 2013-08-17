/**
 * MOON.js
 * v0.1.6
 * @requires enchantMOON API v1
 *
 * @description
 * MOON API bind
 */
(function(global) {

    function html5CanvasToSerializableObject(canvas) {
        var ctx = canvas.getContext('2d'),
            w = canvas.width, h = canvas.height,
            imgData = ctx.getImageData(0, 0, w, h),
            data = imgData.data,
            str = '';

        for (var i = 0, l = data.length; i < l; i++) {
            str += String.fromCharCode(data[i]);
        }

        return {
            width: w,
            height: h,
            data: str
        };
    }

    function serializableObjectToHtml5Canvas(object) {
        var w = object.width;
        var h = object.height;
        var rawString = object.data;
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, w, h);
        var data = imgData.data;
        var i = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                data[i] = rawString.charCodeAt(i);
                data[i + 1] = rawString.charCodeAt(i + 1);
                data[i + 2] = rawString.charCodeAt(i + 2);
                data[i + 3] = rawString.charCodeAt(i + 3);
                i += 4;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    function loadData(src, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', src, true);
        xhr.onload = function() {
            callback(xhr.responseText);
        };
        xhr.send(null);
    }

    var inAlert = false;
    var _alertCallback;
    function alert(message, callback) {
        if (inAlert) {
            return;
        }
        inAlert = true;
        _alertCallback = callback || function() {};
        __moon__.invoke('alert', '1', JSON.stringify([ message ]));
    }
    function _resumeFromAlert() {
        inAlert = false;
        _alertCallback();
    }

    var inPenPrompt = false;
    var _penPromptCallback;
    function penPrompt(message, callback) {
        if (inPenPrompt) {
            return;
        }
        inPenPrompt = true;
        _penPromptCallback = callback || function() {};
        __moon__.invoke('penPrompt', '1', JSON.stringify([ message ]));
    }
    function _resumeFromPenPrompt(result) {
        inPenPrompt = false;
        _penPromptCallback(result);
    }

    var inStickerPage = false;
    var _stickerPageCallback;

    /**
     * シール台帳を開く.
     * 選択されたシールの画像は編集中のディレクトリに保存され,
     * コールバックにそのパスが返る.
     * @param {Function} [callback] 閉じたときのコールバック.
     */
    function openStickerPage(callback) {
        if (inStickerPage) {
            return;
        }
        inStickerPage = true;
        _stickerPageCallback = callback || function() {};
        __moon__.invoke('openStickerPage', '1', '[]');
    }
    function _resumeFromStickerPage(imgPath) {
        inStickerPage = false;
        _stickerPageCallback(imgPath);
    }


    var inNotebook = false;
    var _notebookCallback;

    /**
     * ページ一覧を開く.
     * コールバックに選択されたページのidが返る.
     * @param {Function} [callback] 閉じたときのコールバック.
     */
    function openNotebook(callback) {
        if (inNotebook) {
            return;
        }
        inNotebook = true;
        _notebookCallback = callback || function() {};
        __moon__.invoke('openNotebook', '1', '[]');
    }
    function _resumeFromNotebook(pageId) {
        inNotebook = false;
        _notebookCallback(pageId);
    }

    var evernoteProgress = false, _evernoteSuccessCallback, _evernoteFailureCallback;
    function uploadCurrentPageToEvernote(onsuccess, onfailure) {
        if (evernoteProgress) {
            return;
        }
        evernoteProgress = true;
        _evernoteSuccessCallback = onsuccess || function() {};
        _evernoteFailureCallback = onfailure || function() {};
        __moon__.invoke('uploadCurrentPageToEvernote', '1', '[]');
    }
    function _uploadCurrentPageToEvernoteCallback(result) {
        evernoteProgress = false;
        if (result) {
            _evernoteSuccessCallback();
        } else {
            _evernoteFailureCallback();
        }
    }


    function getPageThumbnail(pageId) {
        var arg = JSON.stringify([ pageId ]);
        var result = __moon__.invoke('getPageThumbnail', '1', arg);
        var obj;
        try {
            obj = JSON.parse(result);
        } catch (e) {
            var err = new Error('returned invalid JSON from moon API: ' + result);
            throw err;
        }
        var error = obj.error;
        var ret = obj.result;
        if (error === '') {
            return serializableObjectToHtml5Canvas(ret);
        } else {
            throw new Error(error);
        }
    }

    function getEditPaperThumbnail() {
        var result = __moon__.invoke('getEditPaperThumbnail', '1', '[]');
        var obj;
        try {
            obj = JSON.parse(result);
        } catch (e) {
            var err = new Error('returned invalid JSON from moon API: ' + result);
            throw err;
        }
        var error = obj.error;
        var ret = obj.result;
        if (error === '') {
            return serializableObjectToHtml5Canvas(ret);
        } else {
            throw new Error(error);
        }
    }

    function createAPIBind(name, version) {
        return function() {
            var arg = JSON.stringify(Array.prototype.slice.call(arguments));
            var result = __moon__.invoke(name, version, arg);
            var obj;
            try {
                obj = JSON.parse(result);
            } catch (e) {
                var err = new Error('returned invalid JSON from moon API: ' + result);
                throw err;
            }
            var error = obj.error;
            var ret = obj.result;
            if (error === '') {
                return ret;
            } else {
                throw new Error(error);
            }
        };
    }

    var VERSION = '1';
    var apiNames = [
        'peel',
        'finish',
        'openUrl',
        'openPage',
        'setPenColor',
        'setPenWidth',
        'getCurrentPage',
        'setCurrentPage',
        'getPaperJSON',
        'setPaperJSON',
        'getImagePath',
        'searchWeb',
        'searchPage',
        'searchStorage',
        'showParticle',
        'showParticles',
        'recognizeStrokes'
    ];
    var apiBinds = {};
    apiNames.forEach(function(name) {
        apiBinds[name] = createAPIBind(name, VERSION);
    });

    global.MOON = {
        alert: alert,
        _resumeFromAlert: _resumeFromAlert,
        penPrompt: penPrompt,
        _resumeFromPenPrompt: _resumeFromPenPrompt,
        openStickerPage: openStickerPage,
        _resumeFromStickerPage: _resumeFromStickerPage,
        openNotebook: openNotebook,
        _resumeFromNotebook: _resumeFromNotebook,
        uploadCurrentPageToEvernote: uploadCurrentPageToEvernote,
        _uploadCurrentPageToEvernoteCallback: _uploadCurrentPageToEvernoteCallback,
        getPageThumbnail: getPageThumbnail,
        getEditPaperThumbnail: getEditPaperThumbnail,
        html5CanvasToSerializableObject: html5CanvasToSerializableObject,
        serializableObjectToHtml5Canvas: serializableObjectToHtml5Canvas,
        loadData: loadData
    };
    for (var name in apiBinds) {
        global.MOON[name] = apiBinds[name];
    }

}(this));
