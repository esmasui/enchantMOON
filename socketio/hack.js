importJS(["lib/MOON.js", "lib/socket.io.js"], function() {

function connect() {
    var socket = io.connect('http://10.0.1.3:3000', {'transports': ["xhr-polling"]});
    socket.on('message', function(message){
//    MOON.alert(message);
    });
    var interval = setInterval(function() {
        socket.send('This is a message from enchantMOON ' + new Date().getTime());
    },3000);
};

var sticker = Sticker.create();
sticker.ontap = function() {
    connect();
};

sticker.onattach = function() {
    __moon__.invoke('finish', '1', '[]');
};

sticker.ondetach = function() {
    __moon__.invoke('finish', '1', '[]');
};
sticker.register();

});

