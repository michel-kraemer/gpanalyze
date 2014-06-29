angular.module("map", ["selection"])

.controller("MapCtrl", function($scope, $timeout, MainService, SelectionService) {
	var map = L.map('map').fitWorld();
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);
	
	var n = 0;
	var colors = [ "red", "blue", "green", "yellow" ];
	var selectionChangedTimeTimeout = null;
	var selectionChangedHoverTimeout = null;
	var hoveredCircle = null;
	var trackBounds = null;
	
	var trackListener = {
		onAddTrack: function(track) {
			var latlons = $.map(track.points, function(e) {
				return L.latLng(e.lat, e.lon);
			});
			var polyline = L.polyline(latlons, { color: colors[n] }).addTo(map);
			/*$.each(latlons, function(i, e) {
				L.circle(e, 2).addTo(map);
			});*/
			n = (n + 1) % colors.length;
			trackBounds = polyline.getBounds();
			map.fitBounds(trackBounds);
		}
	};
	
	var onSelectionChangedTime = function(obj) {
		if (selectionChangedTimeTimeout != null) {
			$timeout.cancel(selectionChangedTimeTimeout);
		}
		selectionChangedTimeTimeout = $timeout(function() {
			var points = MainService.getPoints(obj[0], obj[1]);
			for (var i = 0; i < points.length; ++i) {
				var p = points[i];
				points[i] = L.latLng(p.lat, p.lon)
			}
			
			if (points.length > 0) {
				map.fitBounds(points);
			} else if (trackBounds != null) {
				map.fitBounds(trackBounds);
			} else {
				map.fitWorld();
			}
		}, 1000);
	};
	
	var onSelectionChangedHover = function(obj) {
		if (hoveredCircle != null) {
			map.removeLayer(hoveredCircle);
		}
		if (obj != null) {
			var p = MainService.getPoint(obj);
			hoveredCircle = L.circleMarker(L.latLng(p.lat, p.lon)).addTo(map);
		}
	};
	
	var selectionListener = {
		onSelectionChanged: function(type, obj) {
			if (type == "time") {
				onSelectionChangedTime(obj);
			} else if (type == "hover") {
				onSelectionChangedHover(obj);
			}
		}
	};
	
	MainService.addListener(trackListener);
	SelectionService.addListener(selectionListener);
	$scope.$on("$destroy", function() {
		MainService.removeListener(trackListener);
		SelectionService.removeListener(selectionListener);
	});
});
