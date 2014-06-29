importScripts("bower_components/xdate/src/xdate.js");
importScripts("bower_components/geolib/dist/geolib.min.js");

/*function calcSpeed(p1, p1xy, p2, p2xy) {
	if (!p1 || !p2 || !p1xy || !p2xy) {
		return 0;
	}
	
	var dist = 0;
	var dx = p1xy[0] - p2xy[0];
	var dy = p1xy[1] - p2xy[1];
	dist = Math.sqrt(dx * dx + dy * dy);
	
	if (!p1.time || !p2.time) {
		return 0;
	}
	
	var diff = p2.time.diffSeconds(p1.time);
	if (diff <= 0) {
		return 0;
	}
	
	return dist / diff;
}*/

function analyzeTrack(track, progress) {
	var points = track.points;
	
	//convert times
	progress.message("Converting times ...");
	progress.progress(0);
	for (var i = 0; i < points.length; ++i) {
		points[i].time = new XDate(points[i].time, true);
		progress.progress(i * 100 / points.length);
	}
	
	//interpolate
	var interi = 1;
	while (interi < points.length) {
		var diff = points[interi - 1].time.diffSeconds(points[interi].time);
		if (diff > 1) {
			var time1 = points[interi - 1].time;
			var lat1 = points[interi - 1].lat;
			var lon1 = points[interi - 1].lon;
			var lat2 = points[interi].lat;
			var lon2 = points[interi].lon;
			var ele1 = points[interi - 1].ele;
			var ele2 = points[interi].ele;
			var dlat = lat2 - lat1;
			var dlon = lon2 - lon1;
			var dele = ele2 - ele1;
			var newpoints = [];
			for (var npi = 1; npi < diff; ++npi) {
				var np = {};
				np.lat = lat1 + (npi * dlat / diff);
				np.lon = lon1 + (npi * dlon / diff);
				np.ele = ele1 + (npi * dele / diff);
				np.time = time1.clone().addSeconds(npi);
				newpoints.push(np);
			}
			Array.prototype.splice.apply(points, [interi, 0].concat(newpoints));
			interi += diff - 1;
		}
		++interi;
	}
	
	//points = points.filter(function(e, i) { return i % 5 == 0; });
	
	//calculate speed per point
	/*var lastPoint = null;
	var lastXY = null;
	var xy = proj.forward([p.lat, p.lon]);
	p.speed = calcSpeed(p, xy, lastPoint, lastXY);
	lastPoint = p;
	lastXY = xy;
	
	if (points.length > 1) {
		points[0].speed = points[1].speed;
	}
	*/
	
	//calculate average speed (method 1)
	/*for (var pi = 0; pi < points.length; ++pi) {
		var s = 0;
		var k = 0;
		
		//look for last 30 seconds
		var mi = pi;
		while (mi > 0 && points[mi - 1].time.diffSeconds(points[pi].time) <= 30) --mi;
		//if (mi > 0) --mi;
		
		//look for next 30 seconds
		var mj = pi;
		while (mj < points.length - 1 && points[pi].time.diffSeconds(points[mj + 1].time) <= 30) ++mj;
		//if (mj < points.length - 1) ++mj;
		
		for (var pj = mi; pj <= mj; ++pj) {
			s += points[pj].speed;
			++k;
		}
		points[pi].averageSpeed = s / k;
		
		/*
		for (var pj = 0; pj < 1001; ++pj) {
			var si = pi - 5 + pj;
			if (si >= 0 && si < points.length) {
				s += points[si].speed;
				++k;
			}
		}
		points[pi].averageSpeed = s / k;*/
	//}
	
	//calculate mercator positions
	/*for (var pi = 0; pi < points.length; ++pi) {
		var p = points[pi];
		var xy = proj.forward([p.lat, p.lon]);
		p.x = xy[0];
		p.y = xy[1];
	}*/
	
	//calculate full distances
	progress.message("Calculating full distance ...");
	progress.progress(0);
	var fullDistance = 0;
	points[0].fullDistance = 0;
	for (var pi = 1; pi < points.length; ++pi) {
		//var dx = points[pi].x - points[pi - 1].x;
		//var dy = points[pi].y - points[pi - 1].y;
		//var dist = Math.sqrt(dx * dx + dy * dy);
		var dist2 = geolib.getDistance({latitude: points[pi].lat, longitude: points[pi].lon},
				{latitude: points[pi - 1].lat, longitude: points[pi - 1].lon});
		fullDistance += dist2;
		points[pi].fullDistance = fullDistance;
		progress.progress(pi * 100 / points.length);
	}
	
	//calculate average speed (method 2)
	progress.message("Calculating average speed ...");
	progress.progress(0);
	for (var pi = 0; pi < points.length; ++pi) {
		//look for last 10 seconds
		var mi = pi;
		while (mi > 0 && points[mi - 1].time.diffSeconds(points[pi].time) <= 10) --mi;
		
		//look for next 10 seconds
		var mj = pi;
		while (mj < points.length - 1 && points[pi].time.diffSeconds(points[mj + 1].time) <= 10) ++mj;
		
		var dist = points[mj].fullDistance - points[mi].fullDistance;
		var timeDiff = points[mi].time.diffSeconds(points[mj].time);
		points[pi].averageSpeed = dist / timeDiff * 3.6;
		progress.progress(pi * 100 / points.length);
	}
	
	//classify points
	progress.message("Classifying points ...");
	progress.progress(0);
	var minCarSpeed = 2;
	var minCarDist = 150;
	var avgPedestrianSpeed = 5;
	var maxPedestrianSpeed = 15;
	var minPedestrianDist = 50;
	var maxCarDist = 100;
	var TYPE_CAR = "car";
	var TYPE_PEDESTRIAN = "pedestrian";
	for (var pi = 0; pi < points.length; ++pi) {
		if (points[pi].averageSpeed < minCarSpeed) {
			if (pi > 0) {
				//person left car, look for point where car stops
				while (pi < points.length - 1 && points[pi].averageSpeed > points[pi + 1].averageSpeed) {
					points[pi].motionType = TYPE_CAR;
					++pi;
				}
			} else {
				//person never entered the car in the first place
			}
			
			//look for point where car is entered again
			points[pi].motionType = TYPE_PEDESTRIAN;
			var distPed = 0;
			var pj;
			for (pj = pi + 1; pj < points.length; ++pj) {
				points[pj].motionType = TYPE_PEDESTRIAN;
				if (points[pj].averageSpeed >= maxPedestrianSpeed) {
					//has person really entered the car?
					var distCar = 0;
					for (var pk = pj + 1; pk < points.length; ++pk) {
						if (points[pk].averageSpeed >= avgPedestrianSpeed) {
							distCar += (points[pk].fullDistance - points[pk - 1].fullDistance);
						} else {
							//too slow
							break;
						}
						if (distCar >= minCarDist) {
							//enough data
							break;
						}
					}
					if (distCar >= minCarDist) {
						//yes, person has entered the car again
						break;
					}
					//no. person has not entered the car. it was just a peak.
				}
				distPed += (points[pj].fullDistance - points[pj - 1].fullDistance);
			}
			
			if (pj < points.length) {
				if (distPed < minPedestrianDist || (pi > 0 && geolib.getDistance(
						{latitude: points[pi].lat, longitude: points[pi].lon},
						{latitude: points[pj].lat, longitude: points[pj].lon}) >= maxCarDist)) {
					//person actually never left car. it just slowed down
					//fix this now.
					for (var pk = pi; pk <= pj; ++pk) {
						points[pk].motionType = TYPE_CAR;
					}
				} else {
					//go back in time to the point where person really entered the car
					while (pj > pi && points[pj].averageSpeed > points[pj - 1].averageSpeed) {
						points[pj].motionType = TYPE_CAR;
						--pj;
					}
				}
			}
			
			pi = pj;
		} else {
			points[pi].motionType = TYPE_CAR;
		}
		
		progress.progress(pi * 100 / points.length);
	}
	
	//convert times
	for (var i = 0; i < points.length; ++i) {
		points[i].time = points[i].time.getTime();
	}
}

onmessage = function(e) {
	var lastProgress = 0;
	
	postMessage({ type: "START" });
	analyzeTrack(e.data.track, {
		message: function(msg) {
			postMessage({ type: "WAIT_MESSAGE", message: msg });
		},
		
		progress: function(p) {
			p = Math.round(p);
			if (p != lastProgress && p % 5 == 0) {
				postMessage({ type: "WAIT_PROGRESS", progress: p });
				lastProgress = p;
			}
		}
	});
	postMessage({ type: "END", result: e.data.track });
};
