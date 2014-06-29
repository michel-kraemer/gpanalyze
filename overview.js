angular.module("overview", ["selection"])

.controller("OverviewCtrl", function($scope, $timeout, MainService, SelectionService) {
	$scope.distTotal = 0;
	$scope.distCar = 0;
	$scope.distPed = 0;
	$scope.speedAvgCar = 0;
	$scope.speedAvgPed = 0;
	$scope.speedMaxCar = 0;
	$scope.speedMaxPed = 0;
	$scope.timeTotal = { hours: 0, minutes: 0, seconds: 0 };
	$scope.timeCar = { hours: 0, minutes: 0, seconds: 0 };
	$scope.timePed = { hours: 0, minutes: 0, seconds: 0 };
	
	var refresh = function(points) {
		var distCar = 0;
		var distPed = 0;
		var speedCarMax = 0;
		var speedPedMax = 0;
		var speedCarSum = 0;
		var speedPedSum = 0;
		var numCar = 0;
		var numPed = 0;
		var timeCar = 0;
		var timePed = 0;
		for (var i = 0; i < points.length; ++i) {
			var p = points[i];
			
			if (p.motionType == "car") {
				speedCarSum += p.averageSpeed;
				++numCar;
				if (p.averageSpeed > speedCarMax) {
					speedCarMax = p.averageSpeed;
				}
			} else if (p.motionType == "pedestrian") {
				speedPedSum += p.averageSpeed;
				++numPed;
				if (p.averageSpeed > speedPedMax) {
					speedPedMax = p.averageSpeed;
				}
			}
			
			if (i > 0) {
				var d = p.fullDistance - points[i - 1].fullDistance;
				var t = p.time - points[i - 1].time;
				if (p.motionType == "car") {
					distCar += d;
					timeCar += t;
				} else if (p.motionType == "pedestrian") {
					distPed += d;
					timePed += t;
				}
			}
		}
		
		$timeout(function() {
			$scope.distTotal = points[points.length - 1].fullDistance / 1000;
			$scope.distCar = distCar / 1000;
			$scope.distPed = distPed / 1000;
			if (numCar > 0) {
				$scope.speedAvgCar = speedCarSum / numCar;
			} else {
				$scope.speedAvgCar = 0;
			}
			if (numPed > 0) {
				$scope.speedAvgPed = speedPedSum / numPed;
			} else {
				$scope.speedAvgPed = 0;
			}
			$scope.speedMaxCar = speedCarMax;
			$scope.speedMaxPed = speedPedMax;
			
			var timeTotal = points[points.length - 1].time - points[0].time;
			$scope.timeTotal.hours = Math.floor(timeTotal / 1000 / 60 / 60);
			$scope.timeTotal.minutes = Math.floor(timeTotal / 1000 / 60) % 60;
			$scope.timeTotal.seconds = Math.floor(timeTotal / 1000) % 60;
			
			$scope.timeCar.hours = Math.floor(timeCar / 1000 / 60 / 60);
			$scope.timeCar.minutes = Math.floor(timeCar / 1000 / 60) % 60;
			$scope.timeCar.seconds = Math.floor(timeCar / 1000) % 60;
			
			$scope.timePed.hours = Math.floor(timePed / 1000 / 60 / 60);
			$scope.timePed.minutes = Math.floor(timePed / 1000 / 60) % 60;
			$scope.timePed.seconds = Math.floor(timePed / 1000) % 60;
		}, 0);
	};
	
	var trackListener = {
		onAddTrack: function(track) {
			refresh(track.points);
		}
	};
	
	var selectionListener = {
		onSelectionChanged: function(type, obj) {
			if (type != "time") {
				return;
			}
			var points = MainService.getPoints(obj[0], obj[1]);
			refresh(points);
		}
	};
	
	MainService.addListener(trackListener);
	SelectionService.addListener(selectionListener);
	$scope.$on("$destroy", function() {
		MainService.removeListener(trackListener);
		SelectionService.removeListener(selectionListener);
	});
})

.filter('numberFixedLen', function () {
	return function (n, len) {
		var num = parseInt(n, 10);
		len = parseInt(len, 10);
		if (isNaN(num) || isNaN(len)) {
			return n;
		}
		num = '' + num;
		while (num.length < len) {
			num = '0' + num;
		}
		return num;
	};
});
