function parseColor(color) {
    var rgba = [];
    for(var c = 2; c >= 0; --c)
        rgba.push((color >> (c * 8)) & 0xFF);
    rgba.push((color >> 24) & 0xFF);
    return rgba;
};

function setAlpha(rgba, alpha) {
    var c = rgba.slice();
    c[3] = parseInt(c[3] * alpha, 10) & 0xFF;
    return c;
};

function styleOf(color) {
    return 'rgba(' + color.join(',') + ')';
}

var running = null;
var tasks = [];
var taskCount = 0;

function drawStroke(info, stroke, ctx) {
    var lineWidth = stroke.width;
    var strokeData = stroke.data;
    var strokeColor = parseColor(stroke.color);
    
    for(var j = 0, px =0, py = 0; j < strokeData.length; j+=3) {
        var x = strokeData[j] + info.x;
        var y = strokeData[j+1] + info.y;
        var p = strokeData[j+2];

        if(j == 0) {
            px = x;
            py = y;
            continue;
        }

        tasks.push((function(ctx, strokeColor, lineWidth, px, py, x, y, p){
            return function(){
                ctx.strokeStyle = styleOf(setAlpha(strokeColor, p));
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
    // canvas.width = info.width;
    // canvas.height = info.height;
    var ctx = canvas.getContext('2d');
    if(info['transparent']) {
        ctx.fillStyle = styleOf([0x80,0x80,0x80,0x80]);
    } else {
        ctx.fillStyle = styleOf(parseColor(info.color));    
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(function(e){drawStroke(info, e, ctx)});
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

