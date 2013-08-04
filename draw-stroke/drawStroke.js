function RGBOf(color) {
    var rgb = [];
    for(var c = 2; c >= 0; --c)
        rgb.push((color >> (c * 8)) & 0xFF);
    return rgb;
};

function RGBAOf(rgb, alpha) {
    var rgba = rgb.slice();
    rgba.push(parseInt(alpha, 10));
    return rgba;
};

function styleOf(color) {
    return (color.length == 4 ? 'rgba' : 'rgb') + '(' + color.join(',') + ')';
}

var running = null;
var tasks = [];
var taskCount = 0;

function drawStroke(stroke, ctx) {
    var lineWidth = stroke.width;
    var strokeData = stroke.data;
    var strokeColor = RGBOf(stroke.color);
    
    for(var j = 0, px =0, py = 0; j < strokeData.length; j+=3) {
        var x = strokeData[j];
        var y = strokeData[j+1];
        var p = strokeData[j+2];

        if(j == 0) {
            px = x;
            py = y;
            continue;
        }

        tasks.push((function(ctx, strokeColor, lineWidth, px, py, x, y, p){
            return function(){
                ctx.strokeStyle = styleOf(RGBAOf(strokeColor, 0xFF * p));
                ctx.lineWidth = parseInt(lineWidth * p, 10);

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(x, y);
                ctx.stroke();
            };
        })(ctx, strokeColor, lineWidth, px, py, x, y, p));

        px = x;
        py = y;
    }
}

function drawStrokes(info, canvas) {
    var strokes = info.strokes;
    canvas.width = info.width;
    canvas.height = info.height;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = styleOf(RGBOf(info.color));
    ctx.fillRect(0, 0, info.width, info.height);
    strokes.forEach(function(e){drawStroke(e, ctx)});
    taskCount = tasks.length;

    running = setInterval(function(){
        for(var i = 0; i <= 10; ++i){
            if(tasks.length == 0) {
                clearInterval(running);
                running = null;
                return;
            }
            tasks.shift().call();
        }
    }, 0);
}

