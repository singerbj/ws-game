/*global console, setInterval, module*/

(function () {
    'use strict';

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

    var Rectangle = function (x, y, w, h, options) {
        var rectangle = {
            id: uuidV4(),
            shape: "rectangle",
            x: x,
            y: y,
            w: w,
            h: h,
            color: 'black'
        };

        var key;
        for (key in options) {
            if (options[key] !== undefined) {
                rectangle[key] = options[key];
            }
        }

        return rectangle;
    };

    var Line = function (x1, y1, x2, y2, options) {
        var line = {
            id: uuidV4(),
            shape: "line",
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            color: 'black',
            lineWidth: 1
        };

        var key;
        for (key in options) {
            if (options[key] !== undefined) {
                line[key] = options[key];
            }
        }

        return line;
    };

    module.exports = {
        Circle: Circle,
        Rectangle: Rectangle,
        Line: Line
    };

}());
