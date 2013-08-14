importJS(["lib/MOON.js"], function() {
 
function ready(uploader, callback) {
    var uri = "http://enchantmoonstrokes.appspot.com/info.json";
    uploader(uri, callback);
}

function upload(uri, callback) {
    var http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        if (this.readyState == 4) {
            if(this.status == 200) {
                callback(this.responseText);
            } else {
                callback(false);
            }
        }
    };

    var infoJSON = JSON.stringify(MOON.getPaperJSON(MOON.getCurrentPage().backing));
    http.open("PUT", uri, true);
    http.setRequestHeader("Content-Type", "application/json");
    http.send(infoJSON);
}

function tweet(resp) {
    if(!resp) {
        _uploading = false;
        fail();
        return;
    }

    var data = null;
    try {
        data = JSON.parse(resp);
    } catch(e) {
        _uploading = false;
        fail();
        return;
    }

    if(data && data.appId) {
        _uploading = false;
        MOON.openUrl("https://twitter.com/intent/tweet?source=webclient&text=" + encodeURIComponent(" " + data.appId + " #enchantMOON"));
        MOON.finish();
    } else {
        _uploading = false;
        fail();
    }
}

function fail(){
    MOON.alert("Failed to upload", function(){
        MOON.finish();
    });    
}

function handleTap() {
    ready(upload, tweet);
}

var _uploading = false;

var sticker = Sticker.create();
sticker.ontap = function() {
    if(_uploading) {
        return;
    }
    _uploading = true;
    handleTap();
};

sticker.onattach = function() {
    MOON.finish();
};

sticker.ondetach = function() {
    MOON.finish();
};
sticker.register();


});