/*global console, setInterval*/

(function() {
    'use strict';

    var clients;
    var playerMap = {};

    var getCenterAndRadius = function(s) {
        var r = {};
        r.x = s.x;
        r.y = s.y;
        r.r = s.r;
        return r;
    };

    var collisionCheck = function(s1, s2) {
        try {
            var crS1 = getCenterAndRadius(s1);
            var crS2 = getCenterAndRadius(s2);

            var dx = crS1.x > crS2.x ? crS1.x - crS2.x : crS2.x - crS1.x;
            var dy = crS1.y > crS2.y ? crS1.y - crS2.y : crS2.y - crS1.y;
            var distance = Math.sqrt((dx * dx) + (dy * dy));

            if (distance <= (crS1.r + crS2.r)) {
                s1.onCollision(s2);
                s2.onCollision(s1);
            }
        } catch (e) {
            console.log(e.message);
        }
    };

    var objIdCounter = 1;

    var Circle = function(x, y, r, options) {
        objIdCounter += 1;
        var circle = {
            id: objIdCounter,
            type: "Circle",
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

    var rand = function(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    };

    var entities = {};

    var createAndAddThing = function() {
        var negativeX = [1, -1][Math.round(Math.random())];
        var negativeY = [1, -1][Math.round(Math.random())];
        var newX = Math.random(0, 20);
        var newY = Math.random(0, 20);
        var vx = negativeX * newX;
        var vy = negativeY * newY;
        var thing = new Circle(rand(0, 800), rand(0, 600), rand(10, 40), {
            color: 'blue',
            beforeUpdate: function() {
                this.color = 'blue';
                this.x += vx;
                this.y += vy;
            },
            onCollision: function(collidedType) {
                this.color = 'purple';
            }
        });
        entities[thing.id] = thing;
    };

    //create some shapes to shoot every 2 seconds
    var i;
    for (i = 0; i < 5; i += 1) {
        createAndAddThing();
    }
    setInterval(function() {
        createAndAddThing();
    }, 2000);

    var addNewPlayer = function(ws) {
        var player = new Circle(400, 300, 10, {
            color: 'red',
            beforeUpdate: function() {
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
            },
            onCollision: function(collidedObj) {
                if (collidedObj.type === 'bullet' && collidedObj.playerId !== this.id) {
                    this.isDead = true;
                    delete entities[this.id];
                    delete playerMap[this.id];
                }
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
            ammo: 5,
            maxAmmo: 5,
            reloadTime: 1250,
            reloading: false,
            isDead: false,
            reload: function() {
                if (this.reloading === false && this.ammo < 5) {
                    this.reloading = true;
                }
            }
        });
        entities[player.id] = player;
        playerMap[player.id] = player;
        ws.playerId = player.id;
    };

    var createAndFireBullet = function(x, y, ws) {
        var player = playerMap[ws.playerId];
        if (player.ammo > 0 && player.reloading === false && !player.isDead) {
            player.ammo -= 1;
            var speed = 7;
            var dist = Math.sqrt(Math.pow((x - player.x), 2) + Math.pow((y - player.y), 2));
            var vx = ((x - player.x) / dist) * speed;
            var vy = ((y - player.y) / dist) * speed;

            var bullet = new Circle(player.x, player.y, 3, {
                type: 'bullet',
                playerId: player.id,
                color: 'black',
                beforeUpdate: function() {
                    if (!this.timeAlive) {
                        this.timeAlive = 0;
                    }
                    if (this.timeAlive >= 150) {
                        delete entities[this.id];
                    } else {
                        this.timeAlive = this.timeAlive + 1;
                        this.x = this.x + vx;
                        this.y = this.y + vy;
                    }
                },
                onCollision: function(collidedObj) {
                    if (collidedObj.id !== this.playerId) {
                        this.color = 'orange';
                        delete entities[this.id];
                    }
                }
            });
            entities[bullet.id] = bullet;
        }
    };

    var updateEntities = function(dt) {
        var adjustAcc = function(key, val, player) {
            if (player.dObj[key]) {
                if (player.acc[key] <= 30) {
                    player.acc[key] += val;
                }
            } else {
                if (player.acc[key] > 0) {
                    if (player.acc[key] >= val) {
                        player.acc[key] -= val;
                    } else {
                        player.acc[key] = 0;
                    }
                }
            }
        };

        var playerId, player;
        for (playerId in playerMap) {
            if (playerMap[playerId] !== undefined) {
                player = playerMap[playerId];
                adjustAcc('left', 3, player);
                adjustAcc('up', 3, player); //this method of jumping doesnt work
                adjustAcc('right', 3, player);
                adjustAcc('down', 3, player);

                var pps = 5;
                player.x -= (pps * (player.acc.left - player.acc.right) * dt);
                player.y -= (pps * (player.acc.up - player.acc.down) * dt);
            }
        }
    };

    var update = function(dt) {
        //checkCollisions
        var entityCount = 0;
        var e;
        for (e in entities) {
            if (entities[e] !== undefined) {
                entityCount += 1;
                if (entities[e].beforeUpdate) {
                    entities[e].beforeUpdate();
                }
            }
        }
        updateEntities(dt);
        //checkCollisions
        var e1, e2;
        for (e1 in entities) {
            if (entities[e1] !== undefined) {
                for (e2 in entities) {
                    if (entities[e2] !== undefined) {
                        if (e1 !== e2) {
                            collisionCheck(entities[e1], entities[e2]);
                        }
                    }
                }
            }
        }
        for (e in entities) {
            if (entities[e] !== undefined) {
                if (entities[e].afterUpdate) {
                    entities[e].afterUpdate();
                }
            }
        }
    };

    var render = function() {
        if (clients && clients.length > 0) {
            clients.forEach(function(ws) {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        player: playerMap[ws.playerId],
                        entities: entities
                    }));
                }
            });
        }
    };

    //game loop
    var raf = require('raf');
    var lastTime;
    var draw = function() {
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
        startGame: function(wssClients) {
            clients = wssClients;
            this.started = true;
            draw();
        },
        handleMessage: function(message, ws) {
            var msgObj = JSON.parse(message);
            if (msgObj.type === 'event') {
                if (msgObj.event === 'click') {
                    createAndFireBullet(msgObj.x, msgObj.y, ws);
                } else if (msgObj.event === 'keyup') {
                    playerMap[ws.playerId].dObj[msgObj.direction] = false;
                } else if (msgObj.event === 'keydown') {
                    playerMap[ws.playerId].dObj[msgObj.direction] = true;
                }
            } else if (msgObj.type === 'action') {
                if (msgObj.action === 'reload') {
                    playerMap[ws.playerId].reload();
                }
            }
        },
        onPlayerConnect: function(ws) {
            addNewPlayer(ws);
        },
        onPlayerDisconnect: function(ws) {
            delete entities[ws.playerId];
            delete playerMap[ws.playerId];
        }
    };

}());
