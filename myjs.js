/*global console, $, window, WebSocket, setInterval, document*/
(function () {
    'use strict';

    var PIXEL_RATIO = (function () {
        var ctx = document.createElement("canvas").getContext("2d"),
            dpr = window.devicePixelRatio || 1,
            bsr = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;

        return dpr / bsr;
    }());


    var createHiDPICanvas = function (w, h, ratio) {
        if (!ratio) {
            ratio = PIXEL_RATIO;
        }
        var can = document.createElement("canvas");
        can.width = w * ratio;
        can.height = h * ratio;
        can.style.width = w + "px";
        can.style.height = h + "px";
        can.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        return can;
    };

    var createCanvas = function (container) {
        //TODO: fix this

        var width = 1920;
        var height = 1080;
        var maxWidth = container.width() - 10;
        var maxHeight = container.height() - 10;

        var ratio = maxWidth / width;
        if (height * ratio > maxHeight) {
            ratio = maxHeight / height;
        }

        var canvas = createHiDPICanvas(width, height, 1.5);
        container.append(canvas);
        return canvas;
    };

    window.onload = function () {
        var body = $('body');
        // var canvas = $('#canvas');
        // var ctx = canvas[0].getContext('2d');

        var canvas = $(createCanvas(body));
        canvas.css('border', '1px solid black');
        var ctx = canvas[0].getContext('2d');

        // $(window).resize(function() {
        //     setCanvasSize(ctx);
        // });
        var entities = {};
        var player;
        var mouseX;
        var mouseY;
        var websocket;

        var start = function (websocketServerLocation) {
            if (websocket) {
                websocket.close();
                // delete websocket;
            }
            websocket = new WebSocket(websocketServerLocation);
            websocket.onopen = function () {
                if (window.timerID) {
                    window.clearInterval(window.timerID);
                    window.timerID = 0;
                }
                console.log('websocket opened');
            };
            websocket.onclose = function () {
                console.log('websocket closed');
                if (!window.timerID) {
                    window.timerID = setInterval(function () {
                        start(websocketServerLocation);
                    }, 2000);
                }
            };

            var obj;
            websocket.onmessage = function (m) {
                obj = JSON.parse(m.data);
                entities = obj.entities;
                player = obj.player;
                // console.log('recieved: ', m);
            };

            var send = function (obj) {
                // console.log('sending: ', obj);
                if (websocket.readyState === 1) {
                    websocket.send(JSON.stringify(obj));
                }
            };

            canvas.click(function (e) {
                var rect = ctx.canvas.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;

                send({
                    type: 'event',
                    event: 'click',
                    x: mouseX,
                    y: mouseY
                });
            });

            body.mousemove(function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                var rect = ctx.canvas.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
                send({
                    type: 'event',
                    event: 'mousemove',
                    x: mouseX,
                    y: mouseY
                });

                if (mouseX < rect.left || mouseX > rect.width || mouseY < rect.top || mouseY > rect.height) {
                    send({
                        type: 'action',
                        action: 'stopPlayer'
                    });
                }
            });

            canvas.contextmenu(function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                //right click....maybe do sumthin here?
            });

            window.addEventListener('keydown', function (e) {
                var rect = ctx.canvas.getBoundingClientRect();
                var code = e.keyCode;
                if (code === 82) {
                    send({
                        type: 'action',
                        action: 'reload'
                    });
                } else if (code === 32) {
                    send({
                        type: 'action',
                        action: 'respawn'
                    });
                } else {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    var checkCode = function (a, b, direction) {
                        if ((code === a || code === b) && !(mouseX < rect.left || mouseX > rect.width || mouseY < rect.top || mouseY > rect.height)) {
                            send({
                                type: 'event',
                                event: 'keydown',
                                direction: direction,
                                x: mouseX,
                                y: mouseY
                            });
                        }
                    };
                    checkCode(37, 65, 'left');
                    checkCode(38, 87, 'up');
                    checkCode(39, 68, 'right');
                    checkCode(40, 83, 'down');
                }
            });

            window.addEventListener('keyup', function (e) {
                var code = e.keyCode;
                var checkCode = function (a, b, direction) {
                    if (code === a || code === b) {
                        send({
                            type: 'event',
                            event: 'keyup',
                            direction: direction
                        });
                    }
                };
                checkCode(37, 65, 'left');
                checkCode(38, 87, 'up');
                checkCode(39, 68, 'right');
                checkCode(40, 83, 'down');
            });

            var getEntityColor = function (e) {
                var color;
                if (typeof e.color === 'string') {
                    color = e.color;
                } else if (typeof e.color === 'object') {
                    color = "rgba(" + e.color.r + ", " + e.color.g + ", " + e.color.b + ", " + e.color.a || 1 + ")";
                } else {
                    color = 'black';
                }
                return color;
            };

            var drawType = function (type) {
                var e;
                for (e in entities) {
                    if (entities[e] !== null) {
                        if (entities[e].type === type) {
                            if (entities[e].shape === 'circle' && !entities[e].isDead) {
                                ctx.beginPath();
                                ctx.fillStyle = getEntityColor(entities[e]);
                                ctx.arc(entities[e].x, entities[e].y, entities[e].r, 0, 2 * Math.PI, false);
                                ctx.fill();
                            } else if (entities[e].shape === 'rectangle') {
                                ctx.beginPath();
                                ctx.fillStyle = getEntityColor(entities[e]);
                                ctx.rect(entities[e].x, entities[e].y, entities[e].w, entities[e].h);
                                ctx.fill();
                            } else if (entities[e].shape === 'line') {
                                ctx.beginPath();
                                ctx.moveTo(entities[e].x1, entities[e].y1);
                                ctx.lineTo(entities[e].x2, entities[e].y2);
                                ctx.lineWidth = 3;
                                ctx.strokeStyle = 'black';
                                ctx.stroke();
                            }

                            // add stroke to current player
                            if (player && player.id === entities[e].id) {
                                ctx.beginPath();
                                ctx.lineWidth = 3;
                                ctx.strokeStyle = 'black';
                                ctx.stroke();
                            }
                        }
                    }
                }
            };

            //game loop
            var draw = function () {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                drawType('thing');
                drawType('bullet');
                drawType('gun');
                drawType('player');

                if (player) {
                    ctx.font = "18px serif";
                    ctx.strokeStyle = 'white';
                    ctx.fillStyle = 'black';
                    ctx.strokeText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10.5, 30.5);
                    ctx.fillText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10.5, 30.5);
                    if (player.reloadPercentage) {
                        ctx.strokeText(player.reloadPercentage + '% reloaded...', 120.5, 30.5);
                        ctx.fillText(player.reloadPercentage + '% reloaded...', 120.5, 30.5);
                    } else if (player.ammo === 0) {
                        ctx.strokeText('Press R to reload!', 120.5, 30.5);
                        ctx.fillText('Press R to reload!', 120.5, 30.5);
                    }

                    ctx.strokeText('Kills: ' + player.kills, 10.5, 60.5);
                    ctx.fillText('Kills: ' + player.kills, 10.5, 60.5);
                    ctx.strokeText('Deaths: ' + player.deaths, 10.5, 90.5);
                    ctx.fillText('Deaths: ' + player.deaths, 10.5, 90.5);
                    ctx.strokeText('Health: ' + player.healthPercentage + '%', 10.5, 120.5);
                    ctx.fillText('Health: ' + player.healthPercentage + '%', 10.5, 120.5);

                    if (player.isDead) {
                        ctx.strokeText('Press Spacebar to respawn!', 10.5, 150.5);
                        ctx.fillText('Press Spacebar to respawn!', 10.5, 150.5);
                    } else {
                        //show health
                    }
                }

                window.requestAnimationFrame(draw);
            };
            draw();
        };
        start('ws://' + window.location.hostname + ":1337");
    };
}());
