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

        var width = 960;
        var height = 540;
        var maxWidth = container.width() - 10;
        var maxHeight = container.height() - 10;

        var ratio = maxWidth / width;
        if (height * ratio > maxHeight) {
            ratio = maxHeight / height;
        }

        var canvas = createHiDPICanvas(width, height, 2);
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
        var serverFps;
        var offset;
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

            var adjustPlayerForCenteredPlayer = function () {
                if (!player.adjusted) {
                    var rect = ctx.canvas.getBoundingClientRect();
                    offset = {
                        x: (rect.width / 2) - player.x,
                        y: (rect.height / 2) - player.y
                    };

                    player.oX = player.x;
                    player.oY = player.y;

                    player.x = (rect.width / 2);
                    player.y = (rect.height / 2);

                    player.adjusted = true;
                }
            };

            var adjustEntityForCenteredPlayer = function (entity) {
                if (!entity.adjusted) {
                    if (entity.x) {
                        entity.x = entity.x + offset.x;
                        entity.y = entity.y + offset.y;
                    } else if (entity.x1) {
                        entity.x1 = entity.x1 + offset.x;
                        entity.y1 = entity.y1 + offset.y;
                        entity.x2 = entity.x2 + offset.x;
                        entity.y2 = entity.y2 + offset.y;
                    }
                    entity.adjusted = true;
                }
            };

            var obj;
            websocket.onmessage = function (m) {
                obj = JSON.parse(m.data);
                entities = obj.entities;
                player = obj.player;
                serverFps = obj.fps;
                // console.log('recieved: ', m);

                adjustPlayerForCenteredPlayer();
                var e;
                for (e in entities) {
                    if (entities[e] !== null) {
                        adjustEntityForCenteredPlayer(entities[e]);
                    }
                }
            };

            var send = function (obj) {
                // console.log('sending: ', obj);
                if (websocket.readyState === 1) {
                    websocket.send(JSON.stringify(obj));
                }
            };

            canvas.mousedown(function (e) {
                if (player && player.oX && player.oY) {
                    var rect = ctx.canvas.getBoundingClientRect();
                    mouseX = e.clientX - rect.left;
                    mouseY = e.clientY - rect.top;

                    send({
                        type: 'event',
                        event: 'click',
                        x: (mouseX - (rect.width / 2)) + player.oX,
                        y: (mouseY - (rect.height / 2)) + player.oY
                    });
                }
            }).mouseup(function (e) {});

            body.mousemove(function (e) {
                if (player && player.oX && player.oY) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    var rect = ctx.canvas.getBoundingClientRect();
                    mouseX = e.clientX - rect.left;
                    mouseY = e.clientY - rect.top;
                    send({
                        type: 'event',
                        event: 'mousemove',
                        x: (mouseX - (rect.width / 2)) + player.oX,
                        y: (mouseY - (rect.height / 2)) + player.oY
                    });

                    if (mouseX < rect.left || mouseX > rect.width || mouseY < rect.top || mouseY > rect.height) {
                        send({
                            type: 'action',
                            action: 'stopPlayer'
                        });
                    }
                }

            });

            canvas.contextmenu(function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                //right click....maybe do sumthin here?
            });

            window.addEventListener('keydown', function (e) {
                if (player && player.oX && player.oY) {
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
                            if ((code === a || code === b)) { //} && !(mouseX < rect.left || mouseX > rect.width || mouseY < rect.top || mouseY > rect.height)) {
                                send({
                                    type: 'event',
                                    event: 'keydown',
                                    direction: direction,
                                    x: (mouseX - (rect.width / 2)) + player.oX,
                                    y: (mouseY - (rect.height / 2)) + player.oY
                                });
                            }
                        };
                        checkCode(37, 65, 'left');
                        checkCode(38, 87, 'up');
                        checkCode(39, 68, 'right');
                        checkCode(40, 83, 'down');
                    }
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
                if (player) {
                    var e;
                    for (e in entities) {
                        if (entities[e] !== undefined) {
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
                                    ctx.lineWidth = 5;
                                    ctx.strokeStyle = 'black';
                                    ctx.stroke();
                                }

                                // add stroke to current player
                                if (player.id === entities[e].id && !player.isDead) {
                                    ctx.beginPath();
                                    ctx.lineWidth = 3;
                                    ctx.strokeStyle = 'black';
                                    ctx.arc(entities[e].x, entities[e].y, entities[e].r, 0, 2 * Math.PI, false);
                                    ctx.stroke();
                                }
                            }
                        }
                    }
                }
            };

            var lastTime;
            var fps;
            var lastFpsDraw = Date.now();
            //game loop
            var draw = function () {
                var currentTime = Date.now();
                if (lastTime && currentTime - lastFpsDraw > 1000) {
                    lastFpsDraw = currentTime;
                    fps = Math.floor(1000 / (currentTime - lastTime));
                }
                lastTime = currentTime;

                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                drawType('bullet');
                drawType('gun');
                drawType('player');
                drawType('wall');


                if (player) {
                    ctx.font = "bold 14px sans-serif";
                    ctx.textAlign = "left";
                    ctx.strokeStyle = 'white';
                    ctx.fillStyle = 'black';
                    ctx.strokeText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10, 20);
                    ctx.fillText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10, 20);
                    if (player.reloadPercentage) {
                        ctx.strokeText('Ammo: ' + player.reloadPercentage + '% reloaded...', 110, 20);
                        ctx.fillText('Ammo: ' + player.reloadPercentage + '% reloaded...', 110, 20);
                    } else if (player.ammo === 0) {
                        ctx.strokeText('Ammo: Press R to reload!', 110, 20);
                        ctx.fillText('Ammo: Press R to reload!', 110, 20);
                    }

                    ctx.strokeText('Kills: ' + player.kills, 10, 40);
                    ctx.fillText('Kills: ' + player.kills, 10, 40);
                    ctx.strokeText('Deaths: ' + player.deaths, 10, 60);
                    ctx.fillText('Deaths: ' + player.deaths, 10, 60);
                    ctx.strokeText('Health: ' + player.healthPercentage + '%', 10, 80);
                    ctx.fillText('Health: ' + player.healthPercentage + '%', 10, 80);

                    if (player.isDead) {
                        ctx.strokeText('Press Spacebar to respawn!', 10, 100);
                        ctx.fillText('Press Spacebar to respawn!', 10, 100);
                    }

                    if (fps) {
                        ctx.textAlign = "right";
                        ctx.strokeText(fps + ' fps (browser)', canvas.width() - 10, 20);
                        ctx.fillText(fps + ' fps (browser)', canvas.width() - 10, 20);
                    }

                    if (serverFps) {
                        ctx.textAlign = "right";
                        ctx.strokeText(serverFps + ' fps (server)', canvas.width() - 10, 40);
                        ctx.fillText(serverFps + ' fps (server)', canvas.width() - 10, 40);
                    }
                }

                window.requestAnimationFrame(draw);
            };
            draw();
        };
        start('ws://' + window.location.hostname + ":1337");
    };
}());
