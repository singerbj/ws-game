/*global console, setInterval*/

(function () {
    'use strict';
    var getCenterAndRadius = function (s) {
        var r = {};
        r.x = s.x;
        r.y = s.y;
        r.r = s.r;
        return r;
    };

    var collisionCheck = function (s1, s2) {
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

    var Circle = function (x, y, r, options) {
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
            if (options[key] !== null) {
                circle[key] = options[key];
            }
        }

        return circle;
    };

    // var canvas = document.getElementById('canvas');
    // var ctx = canvas.getContext('2d');

    var addShape = function (s) {
        // ctx.beginPath();
        // ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI, false);
        // ctx.fillStyle = s.color;
        // ctx.fill();
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
        var thing = new Circle(rand(0, 800), rand(0, 600), rand(10, 40), {
            color: 'blue',
            beforeUpdate: function () {
                this.color = 'blue';
                this.x += vx;
                this.y += vy;
            },
            onCollision: function (collidedType) {
                this.color = 'purple';
            }
        });
        addShape(thing);
        entities[thing.id] = thing;
    };

    //create things every 2 seconds
    var i;
    for (i = 0; i < 5; i += 1) {
        createAndAddThing();
    }
    setInterval(function () {
        createAndAddThing();
    }, 2000);

    // entities.push(addShape(Circle(rand(100, 400), rand(100, 400), rand(10, 100))));

    var player = new Circle(400, 300, 10, {
        color: 'red',
        beforeUpdate: function () {
            this.color = 'red';
        },
        onCollision: function (collidedType) {
            this.color = 'pink';
        }
    });
    addShape(player);
    entities[player.id] = player;

    var dObj = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    var createAndFireBullet = function (x, y) {
        var speed = 7;
        var dist = Math.sqrt(Math.pow((x - player.x), 2) + Math.pow((y - player.y), 2));
        var vx = ((x - player.x) / dist) * speed;
        var vy = ((y - player.y) / dist) * speed;

        var bullet = new Circle(player.x, player.y, 3, {
            playerId: player.id,
            color: 'orange',
            beforeUpdate: function () {
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
            onCollision: function (collidedObj) {
                if (collidedObj.id !== this.playerId) {
                    this.color = 'teal';
                    delete entities[collidedObj.id];
                    delete entities[this.id];
                }
            }
        });
        addShape(bullet);
        entities[bullet.id] = bullet;
    };


    //TODO: change these to be used on client input messages

    // canvas.onclick = function(e){
    //     var rect = canvas.getBoundingClientRect();
    //     var x = event.clientX - rect.left;
    //     var y = event.clientY - rect.top;
    //     createAndFireBullet(x, y);
    // };

    // window.addEventListener('keydown', function(e) {
    //     var code = event.keyCode;
    //     var checkCode = function(a, b, direction) {
    //         if (code === a || code === b) {
    //             dObj[direction] = true;
    //         }
    //     }
    //     checkCode(37, 65, 'left');
    //     checkCode(38, 87, 'up');
    //     checkCode(39, 68, 'right');
    //     checkCode(40, 83, 'down');
    // });
    // window.addEventListener('keyup', function(e) {
    //     var code = event.keyCode;
    //     var checkCode = function(a, b, direction) {
    //         if (code === a || code === b) {
    //             dObj[direction] = false;
    //         }
    //     }
    //     checkCode(37, 65, 'left');
    //     checkCode(38, 87, 'up');
    //     checkCode(39, 68, 'right');
    //     checkCode(40, 83, 'down');
    // });

    var acc = {
        left: 0,
        up: 0,
        right: 0,
        down: 0
    };

    var updateEntities = function (dt) {
        var adjustAcc = function (key, val) {
            if (dObj[key]) {
                if (acc[key] <= 30) {
                    acc[key] += val;
                }
            } else {
                if (acc[key] > 0) {
                    if (acc[key] >= val) {
                        acc[key] -= val;
                    } else {
                        acc[key] = 0;
                    }
                }
            }
        };

        adjustAcc('left', 3);
        adjustAcc('up', 5); //this method of jumping doesnt work
        adjustAcc('right', 3);
        adjustAcc('down', 1);

        var pps = 5;
        player.x -= (pps * (acc.left - acc.right) * dt);
        player.y -= (pps * (acc.up - acc.down) * dt);
    };

    var update = function (dt) {
        //checkCollisions
        var entityCount = 0;
        var e;
        for (e in entities) {
            if (entities[e] !== null) {
                entityCount += 1;
                if (entities[e].beforeUpdate) {
                    entities[e].beforeUpdate();
                }
            }
        }
        console.log(entityCount);
        updateEntities(dt);
        //checkCollisions
        var e1, e2;
        for (e1 in entities) {
            if (entities[e1] !== null) {
                for (e2 in entities) {
                    if (entities[e2] !== null) {
                        if (e1 !== e2) {
                            collisionCheck(entities[e1], entities[e2]);
                        }
                    }
                }
            }
        }
        for (e in entities) {
            if (entities[e] !== null) {
                if (entities[e].afterUpdate) {
                    entities[e].afterUpdate();
                }
            }
        }
    };

    var render = function () {
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        var e;
        for (e in entities) {
            if (entities[e] !== null) {
                addShape(entities[e]);
            }
        }
        // TODO: send this to the client
    };

    //game loop
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

        //draw!
        // window.requestAnimationFrame(draw);
        draw(); //TODO: handle this correctly
    };
    draw();
}());
