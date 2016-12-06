/*global console, setInterval, module*/

(function(){
    'use strict';


    var getCenterAndRadius = function (s) {
        if (s) {
            var r = {};
            r.x = s.x;
            r.y = s.y;
            r.r = s.r;
            return r;
        }
    };

    var rand = function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    };

    module.exports = {
        canvasWidth: 1920,
        canvasHeight: 1080,
        getCenterAndRadius: getCenterAndRadius,
        rand: rand
    };
}());
