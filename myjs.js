/*global console, $, window, WebSocket, setInterval, document*/
(function () {
    'use strict';
    window.onload = function () {
        var text = $('#text');
        var options = $('#options');
        var run = $('#run');
        var clear = $('#clear');
        var p = $('#result');
        var canvas = document.getElementById('canvas');
        var ctx = canvas.getContext('2d');

        run.click(function () {
            var obj = {
                text: text.val(),
                options: options.val().replace(' ', '').split(',')
            };
            console.log('sent:', obj);
            window.ws.send(JSON.stringify(obj));
        });

        clear.click(function () {
            p.empty();
            text.val('');
            options.val('');
        });

        var start = function (websocketServerLocation) {
            if (window.ws) {
                window.ws.close();
                delete window.ws;
            }
            window.ws = new WebSocket(websocketServerLocation);
            window.ws.onopen = function () {
                if (window.timerID) {
                    window.clearInterval(window.timerID);
                    window.timerID = 0;
                }
                console.log('websocket opened');
            };
            window.ws.onclose = function () {
                console.log('websocket closed');
                if (!window.timerID) {
                    window.timerID = setInterval(function () {
                        start(websocketServerLocation);
                    }, 2000);
                }
            };
            window.ws.onmessage = function (m) {
                console.log('recieved: ', m);

                //TODO: render everytime message is recieved, maybe more often
            };



            canvas.onclick = function (e) {
                var rect = canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                // createAndFireBullet(x, y);

                //TODO: send fire bullet message
            };

            window.addEventListener('keydown', function (e) {
                var code = e.keyCode;
                // var checkCode = function (a, b, direction) {
                //     if (code === a || code === b) {
                //         dObj[direction] = true;
                //     }
                // };
                // checkCode(37, 65, 'left');
                // checkCode(38, 87, 'up');
                // checkCode(39, 68, 'right');
                // checkCode(40, 83, 'down');

                // TODO: send keydown codes message
            });
            window.addEventListener('keyup', function (e) {
                var code = e.keyCode;
                // var checkCode = function (a, b, direction) {
                //     if (code === a || code === b) {
                //         dObj[direction] = false;
                //     }
                // };
                // checkCode(37, 65, 'left');
                // checkCode(38, 87, 'up');
                // checkCode(39, 68, 'right');
                // checkCode(40, 83, 'down');

                // TODO: send keyup codes message
            });
        };
        start('ws://' + window.location.hostname + ":8081");
    };
}());
