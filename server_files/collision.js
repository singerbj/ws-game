/*global console, setInterval, module*/

(function () {
    'use strict';

    var Helpers = require('./helpers');

    var check = function (s1, s2) {
        var maxSize = 200; //object widths will never be bigger than this / 2
        try {
            if (s1 && s2 && (Math.sqrt((s1.x - s2.x) * (s1.x - s2.x) + (s1.y - s2.y) * (s1.y - s2.y))) < maxSize) {
                var dx, dy;
                if (s1.shape === 'circle' && s2.shape === 'circle') {
                    if (s1 && s2 && s1.shape !== 'line' && s2.shape !== 'line') {
                        var crS1 = Helpers.getCenterAndRadius(s1);
                        var crS2 = Helpers.getCenterAndRadius(s2);
                        if (crS1 && crS2) {
                            dx = crS1.x > crS2.x ? crS1.x - crS2.x : crS2.x - crS1.x;
                            dy = crS1.y > crS2.y ? crS1.y - crS2.y : crS2.y - crS1.y;
                            var distance = Math.sqrt((dx * dx) + (dy * dy));

                            if (distance <= (crS1.r + crS2.r)) {
                                return true;
                            }
                        }
                    }
                } else if ((s1.shape === 'circle' && s2.shape === 'rectangle') || (s1.shape === 'rectangle' && s2.shape === 'circle')) {
                    var circle, rectangle;
                    if (s1.type === 'circle') {
                        circle = s1;
                        rectangle = s2;
                    } else {
                        circle = s2;
                        rectangle = s1;
                    }

                    var distX = Math.abs(circle.x - rectangle.x - rectangle.w / 2);
                    var distY = Math.abs(circle.y - rectangle.y - rectangle.h / 2);

                    if (distX > (rectangle.w / 2 + circle.r)) {
                        return false;
                    }
                    if (distY > (rectangle.h / 2 + circle.r)) {
                        return false;
                    }


                    if (distX <= (rectangle.w / 2)) {
                        return true;
                    }
                    if (distY <= (rectangle.h / 2)) {
                        return true;
                    }

                    dx = distX - rectangle.w / 2;
                    dy = distY - rectangle.h / 2;
                    return (dx * dx + dy * dy <= (circle.r * circle.r));
                } else if (s1.shape === 'rectangle' && s2.shape === 'rectangle') {
                    if (s1.x < (s2.x + s2.w) &&
                        (s1.x + s1.w) > s2.x &&
                        s1.y < (s2.y + s2.h) &&
                        (s1.h + s1.y) > s2.y) {
                        return true;
                    }
                }
            }
        } catch (e) {
            console.log(e.message);
        }
        return false;
    };

    module.exports = {
        check: check
    };

}());
