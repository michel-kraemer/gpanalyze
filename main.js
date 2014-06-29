angular.module("main", ["ui.bootstrap", "dialogs.main", "graph", "map", "overview"])

.factory("MainService", function($rootScope, $timeout, dialogs) {
	var GOOGLE_APIS_KEY = "AIzaSyAOfdRSrvf098ec-_vcXwXgj-rLR58T9vw";
	var PROJ4_4326 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
	var PROJ4_3857 = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs";
	
	var tracks = [];
	var listeners = [];
	
	var fireAddTrack = function(track) {
		for (var i in listeners) {
			var l = listeners[i];
			if (l.onAddTrack) {
				l.onAddTrack(track);
			}
		}
	};
	
	var fireAddAllTracks = function() {
		for (var i in listeners) {
			var l = listeners[i];
			if (l.onAddTrack) {
				for (var j in tracks) {
					var track = tracks[j];
					l.onAddTrack(track);
				}
			}
		}
	};
	
	var addTrack = function(track) {
		tracks.push(track);
		fireAddTrack(track);
	};
	
	var getTimeZoneOffset = function(doc, callback) {
		var time = doc.find("time");
		if (time.length > 0) {
			time = time.first();
			var xdate = new XDate(time.text());
			var trkpt = time.parent();
			var lat = trkpt.attr("lat");
			var lon = trkpt.attr("lon");
			$.get("https://maps.googleapis.com/maps/api/timezone/json?location=" +
					lat + "," + lon + "&timestamp=" + (xdate.getTime() / 1000) +
					"&key=" + GOOGLE_APIS_KEY, function(data) {
				if (callback) {
					callback(data.timeZoneId, data.dstOffset + data.rawOffset);
				}
			});
		} else {
			if (callback) {
				callback(0);
			}
		}
	};
	
	var loadRawTracksFromDoc = function(doc, tzid, tzoffset) {
		var result = [];
		
		doc.children().first().children("trk").each(function(i, trk) {
			$(trk).children("trkseg").each(function(j, trkseg) {
				var track = {};
				var points = [];
				
				$(trkseg).children("trkpt").each(function(k, trkpt) {
					trkpt = $(trkpt);
					var p = {};
					p.lat = parseFloat(trkpt.attr("lat"));
					p.lon = parseFloat(trkpt.attr("lon"));
					//p.speed = parseFloat(trkpt.attr("speed")) * 1.609344;
					
					var ele = trkpt.find("ele");
					if (ele.length > 0) {
						ele = ele.first();
						ele = ele.text();
						if (ele.length > 0) {
							p.ele = parseFloat(ele);
						}
					}
					
					var time = trkpt.find("time");
					if (time.length > 0) {
						time = time.first();
						time = time.text();
						if (time.length > 0) {
							p.time = time;
						}
					}
					
					/*var speed = trkpt.find("speed");
					if (speed.length > 0) {
						speed = speed.first();
						speed = speed.text();
						if (speed.length > 0) {
							p.speed = parseFloat(speed) * 3.6;
						}
					}*/
					
					points.push(p);
				});
				
				track.timeZoneOffset = tzoffset;
				track.timeZoneId = tzid;
				track.points = points;
				result.push(track);
			});
		});
		
		return result;
	}
	
	var loadRawTracksFromFile = function(file, callback) {
		$.get(file, function(data) {
			var doc = $($.parseXML(data));
			getTimeZoneOffset(doc, function(tzid, tzoffset) {
				var tracks = loadRawTracksFromDoc(doc, tzid, tzoffset);
				if (callback) {
					callback(tracks);
				}
			});
		});
	};
	
	var loadFile = function(file, callback) {
		var dlg = dialogs.wait("Importing track", "Loading track ...", 0);
		
		loadRawTracksFromFile(file, function(tracks) {
			var w = new Worker("trackanalyzer.js");
			w.onmessage = function(e) {
				var d = e.data;
				$timeout(function() {
					if (d.type == "START") {
						$rootScope.$broadcast("dialogs.wait.message", {
							msg: "Analyzing track ..."}
						);
					} else if (d.type == "END") {
						if (callback) {
							callback(d.result);
						}
						$rootScope.$broadcast("dialogs.wait.complete");
					} else if (d.type == "WAIT_PROGRESS") {
						$rootScope.$broadcast("dialogs.wait.progress", {
							progress: d.progress}
						);
					} else if (d.type == "WAIT_MESSAGE") {
						$rootScope.$broadcast("dialogs.wait.message", {
							msg: d.message}
						);
					}
				}, 0);
			};
			for (var i = 0; i < tracks.length; ++i) {
				var track = tracks[i];
				w.postMessage({track: track});
			}
		});
	};
	
	var addFile = function(file) {
		loadFile(file, function(track) {
			addTrack(track);
		});
	};
	
	//addFile("2014-06-07_13-58-43_filtered.gpx");
	//addFile("2014-06-07_13-58-43.gpx"); //Hinfahrt Ost-England
	//addFile("2014-06-09_10-38-20 - Kopie.gpx"); //New Road (kurz)
	//addFile("2014-06-09_10-38-20.gpx"); //Rueckfahrt Ost-England
	//addFile("2014-06-15_10-12-47.gpx"); //London letzter Tag
	
	//addFile("2014/England/2014-06-07_13-58-43/2014-06-07_13-58-43.gpx");
	addFile("2014/England/2014-06-08_07-59-22/2014-06-08_07-59-22.gpx");
	//addFile("2014/England/2014-06-09_10-38-20/2014-06-09_10-38-20.gpx");
	//addFile("2014/England/2014-06-10_08-57-34/2014-06-10_08-57-34.gpx");
	
	return {
		getTracks: function() {
			return tracks;
		},
		
		getPoint: function(time) {
			time = new XDate(time, true).getTime();
			
			for (var i = 0; i < tracks.length; ++i) {
				var track = tracks[i];
				for (var j = 0; j < track.points.length; ++j) {
					var p = track.points[j];
					var ptime = p.time + track.timeZoneOffset * 1000;
					if (ptime >= time) {
						if (j == 0) {
							return p;
						} else {
							var np = track.points[j - 1];
							var nptime = np.time + track.timeZoneOffset * 1000;
							if (ptime - time > time - nptime) {
								return track.points[j - 1];
							} else {
								return p;
							}
						}
					}
				}
			}
			
			var lastTrack = tracks[tracks.length - 1];
			return lastTrack.points[lastTrack.points.length - 1];
		},
		
		getPoints: function(minTime, maxTime) {
			minTime = new XDate(minTime, true).getTime();
			maxTime = new XDate(maxTime, true).getTime();
			var points = [];
			
			for (var i = 0; i < tracks.length; ++i) {
				var track = tracks[i];
				for (var j = 0; j < track.points.length; ++j) {
					var p = track.points[j];
					var time = p.time + track.timeZoneOffset * 1000;
					if (time >= minTime && time <= maxTime) {
						points.push(p);
					} else if (time > maxTime) {
						break;
					}
				}
			}
			
			return points;
		},
		
		addListener: function(listener) {
			listeners.push(listener);
			fireAddAllTracks();
		},
		
		removeListener: function(listener) {
			var i = listeners.indexOf(listener);
			if (i >= 0) {
				listeners.splice(i, 1);
			}
		}
	};
});
