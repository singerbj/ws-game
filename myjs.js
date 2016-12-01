/*global console, $, window, WebSocket, setInterval*/
(function () {
    'use strict';
    window.onload = function () {
        var text = $('#text');
        var options = $('#options');
        var run = $('#run');
        var clear = $('#clear');
        var p = $('#result');

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
            };
        };
        start('ws://' + window.location.hostname + ":8081");
    };
}());
