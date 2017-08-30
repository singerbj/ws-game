/*global console, setInterval, module*/

(function () {
    'use strict';

    var Shapes = require('./shapes');
    var Helpers = require('./helpers');
    var Collison = require('./collision');

    var clients;
    var playerMap = {};
    var gunMap = {};
    var canvasWidth = 1920;
    var canvasHeight = 1080;
    var start = 1;
    var end = 1080;
    var fps;

    var entities = {};

    var createAndAddFloor = function () {
        var floorOptions = {
            color: '#ADC6FF',
            type: 'floor',
            beforeUpdate: function () {},
            onCollision: function (collidedObj) {}
        };
        var floor = new Shapes.Rectangle(start, start, end - start, end - start, floorOptions);
        entities[floor.id] = floor;
    };

    var createAndAddBoundries = function () {
        var wallOptions = {
            color: '#002C91',
            type: 'wall',
            beforeUpdate: function () {},
            onCollision: function (collidedObj) {}
        };
        var wall1 = new Shapes.Rectangle(start, start, end - start, 20, wallOptions);
        var wall2 = new Shapes.Rectangle(start, end, end - start + 20, 20, wallOptions);
        var wall3 = new Shapes.Rectangle(start, start, 20, end - start, wallOptions);
        var wall4 = new Shapes.Rectangle(end, start, 20, end - start + 20, wallOptions);
        entities[wall1.id] = wall1;
        entities[wall2.id] = wall2;
        entities[wall3.id] = wall3;
        entities[wall4.id] = wall4;
    };

    var createAndAddGrid = function () {
        var gridLineOptions = {
            type: 'gridLine',
            color: '#1A5FFF',
            lineWidth: 0.2
        };

        var x, y, line;
        for (x = start; x <= end; x += 100) {
            line = new Shapes.Polygon(x, start, [{x: x, y: start},{x: x, y: end}], gridLineOptions);
            entities[line.id] = line;
        }
        for (y = start; y <= end; y += 100) {
            line = new Shapes.Polygon(start, y, [{x: start, y: y},{x: end, y: y}], gridLineOptions);
            entities[line.id] = line;
        }
    };

    var createAndAddWall = function () {
        var x = Helpers.rand(start, end);
        var y = Helpers.rand(start, end);
        // var r = Helpers.rand(10, 200);

        var wall;
        var wallOptions = {
            color: '#002C91',
            type: 'wall',
            beforeUpdate: function () {},
            onCollision: function (collidedObj) {}
        };
        // if (Helpers.rand(0, 2) === 0) {
            // wall = new Shapes.Circle(x, y, Helpers.rand(10, 75), wallOptions);
        // } else {
            wall = new Shapes.Rectangle(x, y, Helpers.rand(10, 75), Helpers.rand(10, 75), wallOptions);
        // }
        entities[wall.id] = wall;
    };

    //add the boundaries
    createAndAddFloor();

    //add the boundaries
    createAndAddBoundries();

    //create the grid
    createAndAddGrid();

    //create some walls
    var i;
    for (i = 0; i < 40; i += 1) {
        createAndAddWall();
    }

    var addNewPlayer = function (ws) {
        var player = new Shapes.Circle(Helpers.rand(start, end), Helpers.rand(start, end), 10, {
        // var player = new Shapes.Circle(1000, 1000, 10, {
            type: 'player',
            // color: {
            //     r: Helpers.rand(100, 200),
            //     g: Helpers.rand(100, 200),
            //     b: Helpers.rand(100, 200),
            //     a: 1
            // },
            color: '#FFF',
            acc: {
                left: 0,
                up: 0,
                right: 0,
                down: 0
            },
            dObj: {
                up: false,
                down: false,
                left: false,
                right: false
            },
            maxHealth: 1000,
            health: 1000,
            maxAmmo: 10,
            ammo: 10,
            reloadTime: 1250,
            reloading: false,
            isDead: false,
            mouse: {
                x: canvasWidth / 2,
                y: canvasHeight / 2
            },
            kills: 0,
            deaths: 0,
            pps: 4.5,
            username: "Loading...",
            beforeUpdate: function () {
                this.healthPercentage = Math.floor((this.health / this.maxHealth) * 100);
                if (this.timeToReload && Date.now() >= this.timeToReload) {
                    this.reloading = false;
                    delete this.timeToReload;
                    delete this.reloadPercentage;
                    this.ammo = this.maxAmmo;
                } else {
                    this.reloadPercentage = 100 - (Math.floor(((player.timeToReload - Date.now()) / this.reloadTime) * 100) - 1);
                }
                if (this.reloading === true && !this.timeToReload) {
                    this.timeToReload = Date.now() + this.reloadTime;
                }
                this.manageGun();
            },
            onCollision: function (collidedObj) {},
            reload: function () {
                if (!this.isDead && this.reloading === false && this.ammo < this.maxAmmo) {
                    this.reloading = true;
                }
            },
            stopMoving: function () {
                this.dObj = {
                    up: false,
                    down: false,
                    left: false,
                    right: false
                };
            },
            respawn: function () {
                if (this.isDead) {
                    this.x = Helpers.rand(start, end);
                    this.y = Helpers.rand(start, end);
                    entities[this.id] = this;
                    delete this.timeToReload;
                    delete this.reloadPercentage;
                    this.health = this.maxHealth;
                    this.ammo = this.maxAmmo;
                    this.isDead = false;
                }
            },
            fireGun: function (x, y, ws) {
                var player = this;
                if (player.ammo > 0 && player.reloading === false && !player.isDead) {
                    player.ammo -= 1;
                    var speed = 30;
                    var dist = Math.sqrt(Math.pow((x - player.x), 2) + Math.pow((y - player.y), 2));
                    var vx = ((x - player.x) / dist) * speed;
                    var vy = ((y - player.y) / dist) * speed;

                    var bullet = new Shapes.Circle(player.x, player.y, 1.25, {
                        type: 'bullet',
                        playerId: player.id,
                        color: '#002C91',
                        damage: 400,
                        beforeUpdate: function () {
                            if (!this.timeAlive) {
                                this.timeAlive = 0;
                            }
                            if (this.timeAlive >= 100) {
                                delete entities[this.id];
                            } else {
                                this.timeAlive = this.timeAlive + 1;
                                this.x = this.x + vx;
                                this.y = this.y + vy;
                            }
                        },
                        onCollision: function (collidedObj) {
                            if (collidedObj && collidedObj.id !== this.playerId && collidedObj.shape !== 'polygon') {
                                if (collidedObj && collidedObj.type === 'player' && !collidedObj.isDead) {
                                    if (collidedObj.health > 0 && (collidedObj.health - this.damage) > 0) {
                                        collidedObj.health = collidedObj.health - this.damage;
                                    } else {
                                        collidedObj.health = 0;
                                        collidedObj.isDead = true;
                                        collidedObj.deaths += 1;
                                        if (gunMap[collidedObj.id]) {
                                            delete entities[gunMap[collidedObj.id].id];
                                        }
                                        delete gunMap[collidedObj.id];
                                        player.kills += 1;
                                    }
                                    delete entities[this.id];
                                } else if (collidedObj && collidedObj.type === 'wall' && !collidedObj.isDead) {
                                    delete entities[this.id];
                                }
                            }
                        }
                    });
                    entities[bullet.id] = bullet;
                }
            },
            manageGun: function () {
                var player = playerMap[ws.playerId];
                if (gunMap[ws.playerId]) {
                    var lastGunId = gunMap[ws.playerId].id;
                    delete gunMap[ws.playerId];
                    delete entities[lastGunId];
                }
                if (player && !player.isDead) {
                    var gunLength = 20;
                    var slope = (player.mouse.y - player.y) / (player.mouse.x - player.x);
                    var k = gunLength / (Math.sqrt(1 + Math.pow(slope, 2)));
                    var gunX;
                    var gunY;
                    if (player.mouse.x < player.x) {
                        gunX = player.x - k;
                        gunY = (player.y - (k * slope));
                    } else {
                        gunX = player.x + k;
                        gunY = player.y + (k * slope);
                    }

                    if (slope === -Infinity) {
                        gunY = player.y - gunLength;
                    } else if (slope === Infinity) {
                        gunY = player.y + gunLength;
                    }

                    var gun = new Shapes.Polygon(player.x, player.y, [{x: player.x, y: player.y}, {x: gunX, y: gunY}], {
                        type: 'gun',
                        color: '#002C91',
                        playerId: player.id,
                        lineWidth: 5
                    });
                    entities[gun.id] = gun;
                    gunMap[ws.playerId] = gun;
                }
            },
            adjustAcc: function (key, val) {
                if (this.dObj[key]) {
                    if (this.acc[key] <= 30) {
                        this.acc[key] += val;
                    }
                } else {
                    if (this.acc[key] > 0) {
                        if (this.acc[key] >= val) {
                            this.acc[key] -= val;
                        } else {
                            this.acc[key] = 0;
                        }
                    }
                }
            },
            updatePosition: function (dt) {
                if (!this.isDead) {
                    this.adjustAcc('left', this.pps);
                    this.adjustAcc('up', this.pps);
                    this.adjustAcc('right', this.pps);
                    this.adjustAcc('down', this.pps);

                    var tempX = Math.floor(this.x - (this.pps * (this.acc.left - this.acc.right) * dt));
                    var tempY = Math.floor(this.y - (this.pps * (this.acc.up - this.acc.down) * dt));

                    var e1, tempCircle, e1x, e1y;
                    for (e1 in entities) {
                        if (entities[e1] !== undefined) {
                            if (entities[e1] !== this && entities[e1].playerId !== this.id && (entities[e1].type === 'wall' || (entities[e1].type === 'player' && !entities[e1].isDead))) {
                                tempCircle = new Shapes.Circle(tempX, tempY, 10);
                                while (Collison.check(entities[e1], tempCircle) === true) {
                                    if (tempX !== Math.floor(this.x)) {
                                        if (tempX > Math.floor(this.x)) {
                                            tempX -= 1;
                                        } else {
                                            tempX += 1;
                                        }
                                        this.acc.left = 0;
                                        this.acc.right = 0;
                                    }
                                    if (tempY !== Math.floor(this.y)) {
                                        if (tempY > Math.floor(this.y)) {
                                            tempY -= 1;
                                        } else {
                                            tempY += 1;
                                        }
                                        this.acc.up = 0;
                                        this.acc.down = 0;
                                    }
                                    if (tempX === Math.floor(this.x) && tempY === Math.floor(this.y)) {
                                        e1x = Math.floor(entities[e1].x);
                                        e1y = Math.floor(entities[e1].y);

                                        //if player is colliding with a rectangle, get the center of the rectangle rather than the top left corner
                                        if (entities[e1].shape === 'rectangle') {
                                            e1x = Math.floor(e1x + (entities[e1].w / 2));
                                            e1y = Math.floor(e1y + (entities[e1].h / 2));
                                        }

                                        if (e1x > tempX) {
                                            tempX -= 1;
                                        } else {
                                            tempX += 1;
                                        }
                                        this.x = tempX;
                                        if (e1y > tempY) {
                                            tempY -= 1;
                                        } else {
                                            tempY += 1;
                                        }
                                        this.y = tempY;
                                    }
                                    tempCircle = new Shapes.Circle(tempX, tempY, 10);
                                }
                            }
                        }
                    }
                    this.x = tempX;
                    this.y = tempY;
                }
            }
        });
        entities[player.id] = player;
        playerMap[player.id] = player;
        ws.playerId = player.id;
        return player;
    };

    var QuadTree = require('simple-quadtree');
    var qt = QuadTree(start, start, end, end, { maxchildren: 5 });

    var update = function (dt) {
        //runPreUpdateStuff
        var e;
        for (e in entities) {
            if (entities[e] !== undefined) {
                if (entities[e].beforeUpdate) {
                    entities[e].beforeUpdate();
                }
            }
        }
        //update the player's position
        var playerId, player;
        for (playerId in playerMap) {
            if (playerMap[playerId] !== undefined) {
                player = playerMap[playerId];
                player.updatePosition(dt);
            }
        }


        //set up quadTree //TODO: update entities in quadtree instead of clearing it
        qt.clear();
        for (e in entities) {
            if (entities[e] !== undefined) {
                if(entities[e].shape === 'circle'){
                    qt.put({x: entities[e].x - entities[e].r, y: entities[e].y - entities[e].r, w: entities[e].r * 2, h: entities[e].r * 2, id: e });
                } else if (entities[e].shape === 'rectangle'){
                    qt.put({x: entities[e].x, y: entities[e].y, w: entities[e].w, h: entities[e].h, id: e});
                } else if (entities[e].shape === 'polygon'){
                    var x, y, x2, y2;
                    entities[e].points.forEach(function(point){
                        if(!x || point.x < x){
                            x = point.x;
                        }
                        if(!x2 || point.x > x2){
                            x2 = point.x;
                        }
                        if(!y || point.y < y){
                            y = point.y;
                        }
                        if(!y2 || point.y > y2){
                            y2 = point.y;
                        }
                    });
                    qt.put({x: x, y: y, w: x2 - x, h: y2 - y, id: e});
                }
            }
        }

        //checkCollisions for non players
        var x, y;
        var sectionSize = Math.floor(end / 10);
        for(x = start; x <= end; x += sectionSize){
            for(y = start; y <= end; y += sectionSize){
                var entitiesFound = qt.get({x: x, y: y, w: sectionSize, h: sectionSize});
                entitiesFound.forEach(function(e1){
                    entitiesFound.forEach(function(e2){
                        if (e1.id !== e2.id && entities[e1.id] && entities[e2.id]){// && entities[e1.id].type !== 'player' && entities[e2.id].type !== 'player') {
                            if (Collison.check(entities[e1.id], entities[e2.id]) === true) {
                                if (entities[e1.id] && entities[e2.id] && entities[e1.id].onCollision) {
                                    entities[e1.id].onCollision(entities[e2.id]);
                                }
                                if (entities[e1.id] && entities[e2.id] && entities[e2.id].onCollision) {
                                    entities[e2.id].onCollision(entities[e1.id]);
                                }
                            }
                        }
                    });
                });
            }
        }

        //run post update stuff
        for (e in entities) {
            if (entities[e] !== undefined) {
                if (entities[e].afterUpdate) {
                    entities[e].afterUpdate();
                }
            }
        }
    };

    var render = function () {
        if (clients && clients.length > 0) {
            clients.forEach(function (ws) {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        player: playerMap[ws.playerId],
                        entities: entities,
                        fps: fps
                    }));
                    // console.log(Object.keys(entities).length);
                }
            });
        }
    };

    //game loop
    var raf = require('raf');
    var lastTime;
    var lastTimeFps;
    var lastFpsDraw = Date.now();
    var draw = function () {
        //check fps
        var currentTime = Date.now();
        if (lastTimeFps && currentTime - lastFpsDraw > 1000) {
            lastFpsDraw = currentTime;
            fps = Math.floor(1000 / (currentTime - lastTimeFps));
        }
        lastTimeFps = currentTime;


        //update time
        var now = Date.now();
        if (lastTime) {
            var dt = (now - lastTime) / 1000.0;
            update(dt);
            render();
        }
        lastTime = now;
        raf(draw);
    };

    module.exports = {
        started: false,
        startGame: function (wssClients) {
            clients = wssClients;
            this.started = true;
            draw();
        },
        handleMessage: function (message, ws) {
            var msgObj = JSON.parse(message);
            if (playerMap[ws.playerId] && msgObj.x && msgObj.y) {
                playerMap[ws.playerId].mouse = {
                    x: msgObj.x,
                    y: msgObj.y
                };
            }

            if(playerMap[ws.playerId] && msgObj.username){
                playerMap[ws.playerId].username = msgObj.username;
            }

            if (msgObj.type === 'event') {
                if (msgObj.event === 'click' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].fireGun(msgObj.x, msgObj.y);
                } else if (msgObj.event === 'keyup' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].dObj[msgObj.direction] = false;
                } else if (msgObj.event === 'keydown' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].dObj[msgObj.direction] = true;
                } else if (msgObj.event === 'mousemove' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].manageGun();
                }
            } else if (msgObj.type === 'action') {
                if (msgObj.action === 'reload' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].reload();
                // } else if (msgObj.action === 'stopPlayer' && playerMap[ws.playerId] !== undefined) {
                //     playerMap[ws.playerId].stopMoving();
                } else if (msgObj.action === 'respawn' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].respawn();
                }else if(msgObj.action === 'join'){
                    addNewPlayer(ws);
                }
            }
        },
        onPlayerConnect: function (ws) {
            // addNewPlayer(ws);
            console.log('player connected: ' + ws.playerId);

        },
        onPlayerDisconnect: function (ws) {
            console.log('player disconnected: ' + ws.playerId);
            if (gunMap[ws.playerId]) {
                delete entities[gunMap[ws.playerId].id];
            }
            delete entities[ws.playerId];
            delete gunMap[ws.playerId];
            delete playerMap[ws.playerId];
        }
    };

}());
