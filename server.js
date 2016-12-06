/*global console*/

(function() {
    'use strict';

    // var util = require('util');
    var fs = require('fs');
    var WebSocketServer = require('ws').Server;
    var domain = require('domain');
    var http = require('http');
    var Router = require('node-simple-router');
    // var file = require('file');
    var router = new Router();
    var Game = require('./server_files/gameLogic');

    var d = domain.create();
    d.on('error', function(err) {
        console.error(err);
    });

    var wss = new WebSocketServer({
        port: 1337
    });

    Game.startGame(wss.clients);

    wss.on('connection', function connection(ws) {
        Game.onPlayerConnect(ws);

        ws.on('message', function incoming(message) {
            Game.handleMessage(message, ws);
        });

        ws.on('close', function() {
            Game.onPlayerDisconnect(ws);
            var i = wss.clients.indexOf(ws);
            if (wss.clients.indexOf(ws) > -1) {
                delete wss.clients[i];
            }
        });

        ws.on('error', function(err) {
            console.log(err);
        });
    });


    router.get("/", function(request, response) {
        fs.readFile('./public/index.html', function(err, html) {
            if (err) {
                throw err;
            }
            response.writeHeader(200, {
                "Content-Type": "text/html",
                'Content-Length': html.length,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache'
            });
            response.write(html);
            response.end();
        });
    });


    router.get("/myjs.js", function(request, response) {
        fs.readFile('./public/myjs.js', function(err, js) {
            if (err) {
                throw err;
            }
            response.writeHeader(200, {
                "Content-Type": "text/javascript",
                'Content-Length': js.length,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache'
            });
            response.write(js);
            response.end();
        });
    });

    var server = http.createServer(router);
    // Listen on port 8080 on localhost
    server.listen(8080);

    console.log('server running on 8080');
}());
