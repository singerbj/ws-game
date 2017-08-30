/*global console, $, window, WebSocket, setInterval, document*/
(function () {
    'use strict';

    var getCanvasDimensions = function(){
        // var width = 1920;
        // var height = 1920;
        var maxWidth = $(window).width();
        var maxHeight = $(window).height();
        var r;

        if(maxWidth < maxHeight){
            r = maxWidth;
        } else {
            r = maxHeight;
        }
        console.log(r);
        return r;
    };

    window.onload = function () {
        var body = $('body');

        var size = getCanvasDimensions();

        var renderer = new THREE.WebGLRenderer();
        renderer.shadowMapEnabled = true;
        document.body.appendChild(renderer.domElement);
        renderer.setSize(size, size);

        var canvas = $('canvas');
        var ctx = canvas[0].getContext('webgl');
        var rect = ctx.canvas.getBoundingClientRect();

        var resizeTimeout;
        $(window).resize(function(){
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function(){
                size = getCanvasDimensions();
                renderer.setSize(size, size);
            }, 100);
        });

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100000);
        camera.position.set(0, 0, 1000);

        var light = new THREE.DirectionalLight( 0xffffff );
        light.position.set(0, 0, -100);
        light.target.position.set( 0, 0, 0 );
        scene.add(light);

        var objHeight = 100;
        var objectMap = {};
        var gunMap = {};
        var entities = {};
        var player;
        var serverFps;
        var offset;
        var mouseX;
        var mouseY;
        var websocket;
        var joinGame;
        var joined;
        var username;
        var showScores;

        // var floor = new THREE.Mesh(new THREE.BoxBufferGeometry(19200, 10800, objHeight), new THREE.MeshBasicMaterial({color: '#d3d3d3'}));
        // floor.position.set(0, 0, -objHeight);
        // scene.add(floor);

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
                if(!joined){
                    joinGame();
                    joined = true;
                }
                obj = JSON.parse(m.data);
                if(obj.player){
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
                }
            };

            var send = function (obj) {
                // console.log('sending: ', obj);
                obj.username = username;
                if (websocket.readyState === 1) {
                    websocket.send(JSON.stringify(obj));
                }
            };

            joinGame = function(){
                canvas.mousedown(function (e) {
                    if (joined && player && player.oX && player.oY) {
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

                canvas.mousemove(function (e) {
                    if (joined && player && player.oX && player.oY) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        mouseX = e.clientX - rect.left;
                        mouseY = e.clientY - rect.top;
                        send({
                            type: 'event',
                            event: 'mousemove',
                            x: (mouseX - (rect.width / 2)) + player.oX,
                            y: (mouseY - (rect.height / 2)) + player.oY
                        });

                        // if (mouseX < rect.left || mouseX > rect.width || mouseY < rect.top || mouseY > rect.height) {
                        //     send({
                        //         type: 'action',
                        //         action: 'stopPlayer',
                        //         x: (mouseX - (rect.width / 2)) + player.oX,
                        //         y: (mouseY - (rect.height / 2)) + player.oY
                        //     });
                        // }
                    }

                });

                canvas.contextmenu(function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    //right click....maybe do sumthin here?
                });

                window.addEventListener('keydown', function (e) {
                    if (joined && player && player.oX && player.oY) {

                        var code = e.keyCode;
                        if (code === 82) {
                            send({
                                type: 'action',
                                action: 'reload',
                                x: (mouseX - (rect.width / 2)) + player.oX,
                                y: (mouseY - (rect.height / 2)) + player.oY
                            });
                        } else if (code === 32) {
                            send({
                                type: 'action',
                                action: 'respawn',
                                x: (mouseX - (rect.width / 2)) + player.oX,
                                y: (mouseY - (rect.height / 2)) + player.oY
                            });
                        } else if(code === 9){
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            showScores = true;
                        } else {
                            // e.preventDefault();
                            // e.stopImmediatePropagation();
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
                    if(joined && player && player.oX && player.oY){
                        var code = e.keyCode;
                        var checkCode = function (a, b, direction) {
                            if (code === a || code === b) {
                                send({
                                    type: 'event',
                                    event: 'keyup',
                                    direction: direction,
                                    x: (mouseX - (rect.width / 2)) + player.oX,
                                    y: (mouseY - (rect.height / 2)) + player.oY
                                });
                            }
                        };

                        if(code === 9){
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            showScores = false;
                        }else{
                            checkCode(37, 65, 'left');
                            checkCode(38, 87, 'up');
                            checkCode(39, 68, 'right');
                            checkCode(40, 83, 'down');
                        }
                    }
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
                        var players = [];
                        var e;
                        for (e in entities) {
                            if (entities[e] !== undefined) {
                                if (entities[e].type === type) {
                                    if(!entities[e].isDead){
                                        if (entities[e].shape === 'circle') {
                                            // ctx.beginPath();
                                            // ctx.fillStyle = getEntityColor(entities[e]);
                                            // ctx.arc(entities[e].x, entities[e].y, entities[e].r, 0, 2 * Math.PI, false);
                                            // ctx.fill();
                                            if(!objectMap[entities[e].id]){
                                                // objectMap[entities[e].id] = new THREE.Mesh(new THREE.CylinderGeometry( entities[e].r, entities[e].r, objHeight, 1000), new THREE.MeshBasicMaterial({color: getEntityColor(entities[e])}))
                                                objectMap[entities[e].id] = new THREE.Mesh(new THREE.SphereGeometry(entities[e].r, 32, 32 ), new THREE.MeshBasicMaterial({color: getEntityColor(entities[e])}));
                                                scene.add(objectMap[entities[e].id]);
                                                // objectMap[entities[e].id].rotation.x = 90;
                                            }

                                            objectMap[entities[e].id].position.set(entities[e].x, -entities[e].y, objHeight / 2);
                                        } else if (entities[e].shape === 'rectangle') {
                                            // ctx.beginPath();
                                            // ctx.fillStyle = getEntityColor(entities[e]);
                                            // ctx.rect(entities[e].x, entities[e].y, entities[e].w, entities[e].h);
                                            // ctx.fill();
                                            if(!objectMap[entities[e].id]){
                                                objectMap[entities[e].id] = new THREE.Mesh(new THREE.BoxBufferGeometry( entities[e].w, entities[e].h, objHeight), new THREE.MeshBasicMaterial({color: getEntityColor(entities[e])}));
                                                scene.add(objectMap[entities[e].id]);
                                            }
                                            objectMap[entities[e].id].position.set(entities[e].x + (entities[e].w / 2), -(entities[e].y + (entities[e].h / 2)), 0);
                                        } else if (entities[e].shape === 'line') {
                                            // ctx.beginPath();
                                            // ctx.moveTo(entities[e].x1, entities[e].y1);
                                            // ctx.lineTo(entities[e].x2, entities[e].y2);
                                            // ctx.lineWidth = entities[e].lineWidth;
                                            // if (entities[e].type === 'gun' && entities[e].playerId !== player.id) {
                                            //     // ctx.strokeStyle = '#FF7400';
                                            // } else {
                                            //     // ctx.strokeStyle = getEntityColor(entities[e]);
                                            // }
                                            // ctx.stroke();

                                            if(entities[e].type !== 'gun'){

                                                if(!objectMap[entities[e].id]){
                                                    var geometry = new THREE.Geometry();
                                                    geometry.vertices.push(new THREE.Vector3(entities[e].x1, -entities[e].y1, 0));
                                                    geometry.vertices.push(new THREE.Vector3(entities[e].x2, -entities[e].y2, 0));
                                                    objectMap[entities[e].id] = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
                                                    scene.add(objectMap[entities[e].id]);
                                                }
                                                objectMap[entities[e].id].geometry.vertices[0].x = entities[e].x1;
                                                objectMap[entities[e].id].geometry.vertices[0].y = -entities[e].y1;
                                                objectMap[entities[e].id].geometry.vertices[1].x = entities[e].x2;
                                                objectMap[entities[e].id].geometry.vertices[1].y = -entities[e].y2;
                                                objectMap[entities[e].id].geometry.verticesNeedUpdate = true;

                                                if(entities[e].type === 'bullet'){
                                                    scene.remove(objectMap[entities[e].id]);
                                                }
                                            }

                                        }
                                    }else{console.log(entities[e]);
                                        scene.remove(objectMap[entities[e].id]);
                                        delete objectMap[entities[e].id];
                                    }

                                    // add stroke to current player
                                    if (entities[e].type === 'player' && player.id === entities[e].id && !player.isDead) {
                                        // ctx.beginPath();
                                        // ctx.lineWidth = 3;
                                        // ctx.strokeStyle = '#002C91';
                                        // ctx.arc(entities[e].x, entities[e].y, entities[e].r, 0, 2 * Math.PI, false);
                                        // ctx.stroke();
                                    }

                                    // add stroke and username to enemies
                                    if (entities[e].type === 'player' && player.id !== entities[e].id && !entities[e].isDead) {
                                        // ctx.beginPath();
                                        // ctx.lineWidth = 3;
                                        // ctx.strokeStyle = '#FF7400';
                                        // ctx.arc(entities[e].x, entities[e].y, entities[e].r, 0, 2 * Math.PI, false);
                                        // ctx.stroke();
                                        //
                                        // ctx.font = "10px sans-serif";
                                        // ctx.textAlign = "center";
                                        // ctx.strokeStyle = 'white';
                                        // ctx.fillStyle = 'black';
                                        // ctx.strokeText(entities[e].username, entities[e].x, entities[e].y - 30);
                                        // ctx.fillText(entities[e].username, entities[e].x, entities[e].y - 30);
                                    }

                                    if(entities[e].type === 'player'){
                                        players.push(entities[e]);
                                    }
                                }
                            }
                        }

                        // ctx.font = "10px sans-serif";
                        // ctx.textAlign = "center";
                        // ctx.strokeStyle = 'white';
                        // ctx.fillStyle = 'black';
                        if(showScores){
                            if(players.length > 0){
                                players = players.sort(function(player1, player2){
                                    if(player1.kills < player2.kills) {
                                        return 1;
                                    }
                                    if(player1.kills > player2.kills) {
                                        return -1;
                                    }
                                    return 0;
                                });
                                // .slice(0,10);

                                var currentHeight = 20;
                                players.forEach(function(player){
                                    // ctx.strokeText(player.username + ': ' + player.kills, canvas.width() / 2, currentHeight);
                                    // ctx.fillText(player.username + ': ' + player.kills, canvas.width() / 2, currentHeight);
                                    currentHeight += 20;
                                });
                            }else{
                                // ctx.strokeText('Loading...', canvas.width() / 2, 20);
                                // ctx.fillText('Loading...', canvas.width() / 2, 20);
                            }
                        }else{
                            // ctx.strokeText('Hold Tab to see scores...', canvas.width() / 2, 20);
                            // ctx.fillText('Hold Tab to see scores...', canvas.width() / 2, 20);
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

                    // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                    // drawType('floor');

                    drawType('gridLine');
                    drawType('bullet');
                    drawType('gun');
                    drawType('wall');
                    drawType('player');

                    if (player) {
                        camera.position.x = player.x;
                        camera.position.y = -player.y;
                        light.position.x = player.x;
                        light.position.y = -player.y;

                        // ctx.font = "bold 14px sans-serif";
                        // ctx.textAlign = "left";
                        // ctx.strokeStyle = 'white';
                        // ctx.fillStyle = 'black';
                        // ctx.strokeText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10, 20);
                        // ctx.fillText('Ammo: ' + player.ammo + '/' + player.maxAmmo, 10, 20);
                        if (player.reloadPercentage) {
                            // ctx.strokeText('Ammo: ' + player.reloadPercentage + '% reloaded...', 110, 20);
                            // ctx.fillText('Ammo: ' + player.reloadPercentage + '% reloaded...', 110, 20);
                        } else if (player.ammo === 0) {
                            // ctx.strokeText('Ammo: Press R to reload!', 110, 20);
                            // ctx.fillText('Ammo: Press R to reload!', 110, 20);
                        }

                        // ctx.strokeText('Kills: ' + player.kills, 10, 40);
                        // ctx.fillText('Kills: ' + player.kills, 10, 40);
                        // ctx.strokeText('Deaths: ' + player.deaths, 10, 60);
                        // ctx.fillText('Deaths: ' + player.deaths, 10, 60);
                        // ctx.strokeText('Health: ' + player.healthPercentage + '%', 10, 80);
                        // ctx.fillText('Health: ' + player.healthPercentage + '%', 10, 80);

                        if (player.isDead) {
                            // ctx.strokeText('Press Spacebar to respawn!', 10, 100);
                            // ctx.fillText('Press Spacebar to respawn!', 10, 100);
                        }

                        // ctx.textAlign = "right";
                        // ctx.strokeText(player.username, canvas.width() - 10, canvas.height() - 10);
                        // ctx.fillText(player.username, canvas.width() - 10, canvas.height() - 10);

                        if (fps) {
                            // ctx.textAlign = "right";
                            // ctx.strokeText(fps + ' fps (browser)', canvas.width() - 10, 20);
                            // ctx.fillText(fps + ' fps (browser)', canvas.width() - 10, 20);
                        }

                        if (serverFps) {
                            // ctx.textAlign = "right";
                            // ctx.strokeText(serverFps + ' fps (server)', canvas.width() - 10, 40);
                            // ctx.fillText(serverFps + ' fps (server)', canvas.width() - 10, 40);
                        }

                        // ctx.textAlign = "left";
                        // ctx.strokeText(player.oX + ', ' + player.oY, 10, canvas.height() - 10);
                        // ctx.fillText(player.oX + ', ' + player.oY, 10, canvas.height() - 10);


                    }

                    renderer.render(scene, camera);
                    window.requestAnimationFrame(draw);
                };
                draw();
            };


            var usernameFromStorage = window.localStorage.getItem('username');
            if(usernameFromStorage){
                $('.nickname').val(usernameFromStorage);
            }

            $('.join').click(function(){
                username = $.trim($('.nickname').val());
                if(username.length > 0 && username.length < 15){
                    window.localStorage.setItem('username', username);
                    $('.form').hide();
                    send({type: 'action', action: 'join' });
                }
            });

        };
        start('ws://' + window.location.hostname + ":1337");
    };
}());
