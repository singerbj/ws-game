/*global console, $, window, WebSocket, setInterval, document*/
(function () {
    'use strict';
    var setCanvasSize = function (ctx) {
        //TODO: fix this
        var container = $("body");

        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var maxWidth = container.width();
        var maxHeight = container.height();


        var ratio = maxWidth / width;
        if (height * ratio > maxHeight) {
            ratio = maxHeight / height;
        }

        ctx.canvas.width = (width * ratio);
        ctx.canvas.height = (height * ratio);

        // console.log(ctx.canvas.width, ctx.canvas.height);
    };

    window.onload = function () {
        var canvas = $('#canvas');
        var ctx = canvas[0].getContext('2d');

        setCanvasSize(ctx);
        $(window).resize(function () {
            setCanvasSize(ctx);
        });
        var entities = {};
        var player;
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
                e.preventDefault();
                e.stopImmediatePropagation();
                var rect = ctx.canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;

                send({
                    type: 'event',
                    event: 'click',
                    x: x,
                    y: y
                });
            });

            canvas.contextmenu(function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                //right click....maybe do sumthin here?
            });

            window.addEventListener('keydown', function (e) {
                var code = e.keyCode;
                if (code === 82) {
                    send({
                        type: 'action',
                        action: 'reload'
                    });
                } else {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    var checkCode = function (a, b, direction) {
                        if (code === a || code === b) {
                            send({
                                type: 'event',
                                event: 'keydown',
                                direction: direction
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
                e.preventDefault();
                e.stopImmediatePropagation();
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

            //game loop
            var draw = function () {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                var e;
                for (e in entities) {
                    if (entities[e] !== null) {
                        ctx.beginPath();
                        ctx.arc(entities[e].x, entities[e].y, entities[e].r, 0, 2 * Math.PI, false);
                        if (typeof entities[e].color === 'string') {
                            ctx.fillStyle = entities[e].color;
                        } else if (typeof entities[e].color === 'object') {
                            ctx.fillStyle = "rgba(" + entities[e].color.r + ", " + entities[e].color.g + ", " + entities[e].color.b + ", " + entities[e].color.a || 1 + ")";
                        } else {
                            ctx.fillStyle = 'black';
                        }
                        ctx.fill();

                        if (player && player.id === entities[e].id) {
                            ctx.lineWidth = 3;
                            ctx.strokeStyle = 'black';
                            ctx.stroke();
                        }
                    }
                }

                if (player) {
                    ctx.font = "18px serif";
                    ctx.fillStyle = 'black';
                    ctx.fillText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10.5, 30.5);
                    if (player.reloadPercentage) {
                        ctx.fillText(player.reloadPercentage + '% reloaded...', 120.5, 30.5);
                    } else if (player.ammo === 0) {
                        ctx.fillText('Out of ammo...Press R to reload!', 120.5, 30.5);
                    }
                }

                window.requestAnimationFrame(draw);
            };
            draw();
        };
        start('ws://' + window.location.hostname + ":1337");
    };
}());
