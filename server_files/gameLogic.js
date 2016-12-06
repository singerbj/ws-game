/*global console, setInterval, module*/

(function () {
    'use strict';

    var Shapes = require('./shapes');
    var Helpers = require('./helpers');
    var Collison = require('./collision');

    var clients;
    var playerMap = {};
    var gunMap = {};
    var canvasWidth = 960;
    var canvasHeight = 540;

    var entities = {};

    var createAndAddThing = function () {
        var negativeX = [1, -1][Math.round(Math.random())];
        var negativeY = [1, -1][Math.round(Math.random())];
        var newX = Math.random(0, 20);
        var newY = Math.random(0, 20);
        var vx = negativeX * newX;
        var vy = negativeY * newY;
        var x = Helpers.rand(-400, 400);
        var y = Helpers.rand(-300, 300);
        var r = Helpers.rand(10, 40);
        var width = r * 2;
        var height = r * 2;
        // var width = Helpers.rand(10, 100);
        // var height = Helpers.rand(10, 100);

        var thing = new Shapes.Circle(x, y, r, {
            // var thing = new Shapes.Rectangle(x, y, width, height, {
            color: 'blue',
            type: 'thing',
            beforeUpdate: function () {
                this.color = 'blue';
                this.x += vx;
                this.y += vy;
                if (this.x < -width || this.y < -height || this.x > (canvasWidth + width) || this.y > (canvasHeight + height)) {
                    delete entities[this.id];
                }
            },
            onCollision: function (collidedObj) {
                this.color = 'purple';
            },
            isDead: false
        });
        entities[thing.id] = thing;
    };

    //create some shapes to shoot every 2 seconds
    var i;
    for (i = 0; i < 15; i += 1) {
        createAndAddThing();
    }
    setInterval(function () {
        createAndAddThing();
    }, 1000);


    var addNewPlayer = function (ws) {
        var player = new Shapes.Circle(Helpers.rand(0, 300), Helpers.rand(0, 300), 10, {
            // var player = new Shapes.Rectangle(Helpers.rand(0, 300), Helpers.rand(0, 300), 10, 10, {
            type: 'player',
            color: {
                r: Helpers.rand(100, 200),
                g: Helpers.rand(100, 200),
                b: Helpers.rand(100, 200),
                a: 1
            },
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
            maxAmmo: 5,
            ammo: 5,
            reloadTime: 1250,
            reloading: false,
            isDead: false,
            mouse: {
                x: canvasWidth / 2,
                y: canvasHeight / 2
            },
            kills: 0,
            deaths: 0,
            pps: 4,
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
                if (!this.isDead && this.reloading === false && this.ammo < 5) {
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
                    this.x = Helpers.rand(0, canvasWidth);
                    this.y = Helpers.rand(0, canvasHeight);
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
                    var speed = 12;
                    var dist = Math.sqrt(Math.pow((x - player.x), 2) + Math.pow((y - player.y), 2));
                    var vx = ((x - player.x) / dist) * speed;
                    var vy = ((y - player.y) / dist) * speed;

                    var bullet = new Shapes.Circle(player.x, player.y, 1.5, {
                        type: 'bullet',
                        playerId: player.id,
                        color: 'black',
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
                            if (collidedObj && collidedObj.id !== this.playerId && collidedObj.shape !== 'line') {
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

                                } else if (collidedObj && collidedObj.type === 'thing' && !collidedObj.isDead) {
                                    collidedObj.isDead = true;
                                    delete entities[collidedObj.id];
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

                    var gun = new Shapes.Line(player.x, player.y, gunX, gunY, {
                        type: 'gun',
                        color: 'black',
                        playerId: player.id
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
                this.adjustAcc('left', this.pps);
                this.adjustAcc('up', this.pps);
                this.adjustAcc('right', this.pps);
                this.adjustAcc('down', this.pps);

                var tempX = Math.floor(this.x - (this.pps * (this.acc.left - this.acc.right) * dt));
                var tempY = Math.floor(this.y - (this.pps * (this.acc.up - this.acc.down) * dt));

                var e1, tempCircle, e1x, e1y;
                for (e1 in entities) {
                    if (entities[e1] !== undefined) {
                        if (entities[e1] !== this && entities[e1].playerId !== this.id && (entities[e1].type === 'thing' || (entities[e1].type === 'player' && !entities[e1].isDead))) {
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
        });
        entities[player.id] = player;
        playerMap[player.id] = player;
        ws.playerId = player.id;
        return player;
    };

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
        //checkCollisions for non players
        var e1, e2;
        for (e1 in entities) {
            if (entities[e1] !== undefined) {
                for (e2 in entities) {
                    if (entities[e2] !== undefined) {
                        if (e1 !== e2 && e1.type !== 'player' && e2.type !== 'player') {
                            if (Collison.check(entities[e1], entities[e2]) === true) {
                                if (entities[e1] && entities[e2]) {
                                    entities[e1].onCollision(entities[e2]);
                                }
                                if (entities[e1] && entities[e2]) {
                                    entities[e2].onCollision(entities[e1]);
                                }
                            }
                        }
                    }
                }
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
                        entities: entities
                    }));
                    // console.log(Object.keys(entities).length);
                }
            });
        }
    };

    //game loop
    var raf = require('raf');
    var lastTime;
    var draw = function () {
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
            if (msgObj.type === 'event') {
                if (msgObj.event === 'click' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].fireGun(msgObj.x, msgObj.y);
                } else if (msgObj.event === 'keyup' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].dObj[msgObj.direction] = false;
                    if (msgObj.x && msgObj.y) {
                        playerMap[ws.playerId].mouse = {
                            x: msgObj.x,
                            y: msgObj.y
                        };
                    }
                } else if (msgObj.event === 'keydown' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].dObj[msgObj.direction] = true;
                    if (msgObj.x && msgObj.y) {
                        playerMap[ws.playerId].mouse = {
                            x: msgObj.x,
                            y: msgObj.y
                        };
                    }
                } else if (msgObj.event === 'mousemove' && playerMap[ws.playerId] !== undefined) {
                    if (msgObj.x && msgObj.y) {
                        playerMap[ws.playerId].mouse = {
                            x: msgObj.x,
                            y: msgObj.y
                        };
                    }
                    playerMap[ws.playerId].manageGun();
                }
            } else if (msgObj.type === 'action') {
                if (msgObj.action === 'reload' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].reload();
                } else if (msgObj.action === 'stopPlayer' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].stopMoving();
                } else if (msgObj.action === 'respawn' && playerMap[ws.playerId] !== undefined) {
                    playerMap[ws.playerId].respawn();
                }
            }
        },
        onPlayerConnect: function (ws) {
            addNewPlayer(ws);
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
