/*global console, setInterval, module*/

var SAT = require('sat');
var V = SAT.Vector;
var C = SAT.Circle;
var P = SAT.Polygon;
var B = SAT.Box;

(function () {
    'use strict';

    var Helpers = require('./helpers');


    var check = function (s1, s2) {
        try {
            if (s1 && s2) {
                var dx, dy;
                if (s1.shape === 'circle' && s2.shape === 'circle') {
                    var circle1 = new C(new V(s1.x,s1.y), s1.r);
                    var circle2 = new C(new V(s2.x,s2.y), s2.r);
                    var response = new SAT.Response();
                    return SAT.testCircleCircle(circle1, circle2, response);
                } else if (s1.shape === 'circle' && s2.shape === 'rectangle') {
                    var circle = new C(new V(s1.x,s1.y), s1.r);
                    var rectangle = new SAT.Box(new SAT.Vector(s2.x,s2.y), s2.w, s2.h).toPolygon();
                    var response = new SAT.Response();
                    return SAT.testCirclePolygon(circle, rectangle, response);
                } else if (s1.shape === 'rectangle' && s2.shape === 'circle') {
                    var rectangle = new SAT.Box(new SAT.Vector(s1.x,s1.y), s1.w, s1.h).toPolygon();
                    var circle = new C(new V(s2.x,s2.y), s2.r);
                    var response = new SAT.Response();
                    return SAT.testCirclePolygon(circle, rectangle, response);
                } else if (s1.shape === 'rectangle' && s2.shape === 'rectangle') {
                    var rectangle1 = new SAT.Box(new SAT.Vector(s1.x,s1.y), s1.w, s1.h).toPolygon();
                    var rectangle2 = new SAT.Box(new SAT.Vector(s2.x,s2.y), s2.w, s2.h).toPolygon();
                    var response = new SAT.Response();
                    return SAT.testPolygonPolygon(rectangle1, rectangle2, response);
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
