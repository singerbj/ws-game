/*global console, setInterval, module*/

var SAT = require('sat');
var V = SAT.Vector;
var C = SAT.Circle;
var P = SAT.Polygon;
var B = SAT.Box;
var R = SAT.Response;

(function () {
    'use strict';

    var Helpers = require('./helpers');


    var check = function (s1, s2) {
        // try {
            if (s1 && s2) {
                var dx, dy, r = false, d = Date.now();
                if (s1.shape === 'circle' && s2.shape === 'circle') {
                    var circle1 = new C(new V(s1.x,s1.y), s1.r);
                    var circle2 = new C(new V(s2.x,s2.y), s2.r);
                    var response = new R();
                    r = SAT.testCircleCircle(circle1, circle2, response);
                } else if (s1.shape === 'circle' && s2.shape === 'rectangle') {
                    var circle = new C(new V(s1.x,s1.y), s1.r);
                    var rectangle = new SAT.Box(new V(s2.x,s2.y), s2.w, s2.h).toPolygon();
                    var response = new R();
                    r = SAT.testCirclePolygon(circle, rectangle, response);
                } else if (s1.shape === 'rectangle' && s2.shape === 'circle') {
                    var rectangle = new SAT.Box(new V(s1.x,s1.y), s1.w, s1.h).toPolygon();
                    var circle = new C(new V(s2.x,s2.y), s2.r);
                    var response = new R();
                    r = SAT.testCirclePolygon(circle, rectangle, response);
                } else if (s1.shape === 'rectangle' && s2.shape === 'rectangle') {
                    var rectangle1 = new SAT.Box(new V(s1.x,s1.y), s1.w, s1.h).toPolygon();
                    var rectangle2 = new SAT.Box(new V(s2.x,s2.y), s2.w, s2.h).toPolygon();
                    var response = new R();
                    r = SAT.testPolygonPolygon(rectangle1, rectangle2, response);
                } else if (s1.shape === 'circle' && s2.shape === 'polygon') {
                    var circle = new C(new V(s1.x,s1.y), s1.r);
                    var polygon = new P(new V(s2.points[0].x, s2.points[0].y), s2.points.map(function(point){
                        r = new V(point.x, point.y);
                    }));
                    var response = new R();
                    r = SAT.testPolygonCircle(polygon, circle, response);
                } else if (s1.shape === 'polygon' && s2.shape === 'circle') {
                    var polygon = new P(new V(s1.points[0].x, s1.points[0].y), s1.points.map(function(point){
                        r = new V(point.x, point.y);
                    }));
                    var circle = new C(new V(s2.x,s2.y), s2.r);
                    var response = new R();
                    r = SAT.testPolygonCircle(polygon, circle, response);
                } else if (s1.shape === 'polygon' && s2.shape === 'rectangle') {
                    var polygon = new P(new V(s1.points[0].x, s1.points[0].y), s1.points.map(function(point){
                        r = new V(point.x, point.y);
                    }));
                    var rectangle = new SAT.Box(new V(s1.x,s1.y), s1.w, s1.h).toPolygon();
                    var response = new R();
                    r = SAT.testPolygonPolygon(polygon, rectangle, response);
                } else if (s1.shape === 'rectangle' && s2.shape === 'polygon') {
                    var rectangle = new SAT.Box(new V(s2.x,s2.y), s2.w, s2.h).toPolygon();
                    var polygon = new P(new V(s2.points[0].x, s2.points[0].y), s2.points.map(function(point){
                        r = new V(point.x, point.y);
                    }));
                    var response = new R();
                    r = SAT.testPolygonPolygon(rectangle, polygon, response);
                } else if (s1.shape === 'polygon' && s2.shape === 'polygon') {
                    var polygon1 = new P(new V(s1.points[0].x, s1.points[0].y), s1.points.map(function(point){
                        r = new V(point.x, point.y);
                    }));
                    var polygon2 = new P(new V(s2.points[0].x, s2.points[0].y), s2.points.map(function(point){
                        r = new V(point.x, point.y);
                    }));
                    var response = new R();
                    r = SAT.testPolygonPolygon(polygon1, polygon2, response);
                }
                console.log(Date.now() - d);
            }
        // } catch (e) {
        //     console.log(e.message);
        //     console.error();
        // }
        r = false;
    };

    module.exports = {
        check: check
    };

}());
