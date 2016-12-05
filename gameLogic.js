/*global console, setInterval, module*/

(function () {
    'use strict';

    var clients;
    var playerMap = {};
    var gunMap = {};
    var canvasWidth = 1920;
    var canvasHeight = 1080;

    var getCenterAndRadius = function (s) {
        if (s) {
            var r = {};
            r.x = s.x;
            r.y = s.y;
            r.r = s.r;
            return r;
        }
    };

    var collisionCheck = function (s1, s2) {
        try {
            if (s1 && s2 && s1.shape !== 'line' && s2.shape !== 'line') {
                var crS1 = getCenterAndRadius(s1);
                var crS2 = getCenterAndRadius(s2);
                if (crS1 && crS2) {
                    var dx = crS1.x > crS2.x ? crS1.x - crS2.x : crS2.x - crS1.x;
                    var dy = crS1.y > crS2.y ? crS1.y - crS2.y : crS2.y - crS1.y;
                    var distance = Math.sqrt((dx * dx) + (dy * dy));

                    if (distance <= (crS1.r + crS2.r)) {
                        return true;
                    }
                }
            }
        } catch (e) {
            console.log(e.message);
        }
        return false;
    };

    var uuidV4 = require('uuid/v4');
    var Circle = function (x, y, r, options) {
        var circle = {
            id: uuidV4(),
            shape: "circle",
            x: x,
            y: y,
            r: r,
            color: 'black'
        };

        var key;
        for (key in options) {
            if (options[key] !== undefined) {
                circle[key] = options[key];
            }
        }

        return circle;
    };

    // var Rectangle = function(x, y, w, h, options) {
    //     var rectangle = {
    //         id: uuidV4(),
    //         shape: "rectangle",
    //         x: x,
    //         w: w,
    //         h: h,
    //         color: 'black'
    //     };

    //     var key;
    //     for (key in options) {
    //         if (options[key] !== undefined) {
    //             rectangle[key] = options[key];
    //         }
    //     }

    //     return rectangle;
    // };

    var Line = function (x1, y1, x2, y2, options) {
        var line = {
            id: uuidV4(),
            shape: "line",
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            color: 'black'
        };

        var key;
        for (key in options) {
            if (options[key] !== undefined) {
                line[key] = options[key];
            }
        }

        return line;
    };

    var rand = function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    };

    var entities = {};

    var createAndAddThing = function () {
        var negativeX = [1, -1][Math.round(Math.random())];
        var negativeY = [1, -1][Math.round(Math.random())];
        var newX = Math.random(0, 20);
        var newY = Math.random(0, 20);
        var vx = negativeX * newX;
        var vy = negativeY * newY;
        var x = rand(0, 800);
        var y = rand(0, 600);
        var r = rand(10, 40);
        var width = r * 2;
        var height = r * 2;
        var thing = new Circle(x, y, r, {
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
                if (collidedObj.type === 'bullet' && collidedObj.playerId !== this.id) {
                    this.isDead = true;
                    delete entities[this.id];
                }
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
        //var player = new Circle(rand(0, canvasWidth), rand(0, canvasHeight), 10, {
        var player = new Circle(rand(0, 300), rand(0, 300), 10, {
            type: 'player',
            color: {
                r: rand(100, 200),
                g: rand(100, 200),
                b: rand(100, 200),
                a: 1
            },
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
            onCollision: function (collidedObj) {

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
            reload: function () {
                if (!this.isDead && this.reloading === false && this.ammo < 5) {
                    this.reloading = true;
                }
            },
            mouse: {
                x: canvasWidth / 2,
                y: canvasHeight / 2
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
                    this.x = rand(0, canvasWidth);
                    this.y = rand(0, canvasHeight);
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
                    var speed = 10;
                    var dist = Math.sqrt(Math.pow((x - player.x), 2) + Math.pow((y - player.y), 2));
                    var vx = ((x - player.x) / dist) * speed;
                    var vy = ((y - player.y) / dist) * speed;

                    var bullet = new Circle(player.x, player.y, 2, {
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

                    var gun = new Line(player.x, player.y, gunX, gunY, {
                        type: 'gun',
                        color: 'black'
                    });
                    entities[gun.id] = gun;
                    gunMap[ws.playerId] = gun;
                }
            },
            kills: 0,
            deaths: 0,
            pps: 4,
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

                var e1, tempCircle;
                for (e1 in entities) {
                    if (entities[e1] !== undefined) {
                        if (entities[e1] !== this && entities[e1].playerId !== this.id && (entities[e1].type === 'thing' || entities[e1].type === 'player')) {
                            tempCircle = new Circle(tempX, tempY, 10);
                            while (collisionCheck(entities[e1], tempCircle) === true) {
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
                                    if (entities[e1].x > tempX) {
                                        tempX -= 1;
                                    } else {
                                        tempX += 1;
                                    }
                                    this.x = tempX;
                                    if (entities[e1].y > tempY) {
                                        tempY -= 1;
                                    } else {
                                        tempY += 1;
                                    }
                                    this.y = tempY;
                                }
                                tempCircle = new Circle(tempX, tempY, 10);
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
                            if (collisionCheck(entities[e1], entities[e2]) === true) {
                                entities[e1].onCollision(entities[e2]);
                                entities[e2].onCollision(entities[e1]);
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
