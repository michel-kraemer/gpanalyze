angular.module("graph", ["selection"])

.controller("GraphCtrl", function($scope, MainService, SelectionService) {
	var refresh = function() {
		var tracks = MainService.getTracks();
		var track = tracks[0];
		
		var graph = $("#graph");
		
		var margin = {top: 50, right: 25, bottom: 150, left: 50};
		var margin2 = {top: 34, right: 25, bottom: 50, left: 50};
		var width = graph.width() - margin.left - margin.right;
		var height = graph.height() - margin.top - margin.bottom;
		var height2 = margin.bottom - margin2.top - margin2.bottom;
		
		graph = d3.select("#graph")
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
		var xScale = d3.time.scale.utc()
			.range([0, width])
			.nice();
		
		var xScale2 = d3.time.scale.utc()
			.range([0, width])
			.nice();
		
		var yScale = d3.scale.linear()
			.range([height, 0])
			.nice();
		
		var yScale2 = d3.scale.linear()
			.range([height2, 0])
			.nice();
		
		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient("bottom");
		
		var xAxis2 = d3.svg.axis()
			.scale(xScale2)
			.orient("bottom");
		
		var yAxis = d3.svg.axis()
			.scale(yScale)
			.orient("left");
		
		var brush = d3.svg.brush()
			.x(xScale2)
			.on("brush", brushed);
		
		var timex = function(d) { return xScale(d.time + track.timeZoneOffset * 1000); };
		var carfilter = function(d) { return d.motionType == "car" ? d.averageSpeed : 0; };
		var pedfilter = function(d) { return d.motionType == "pedestrian" ? d.averageSpeed : 0; };
		var cary = function(d) { return yScale(carfilter(d)); };
		var pedy = function(d) { return yScale(pedfilter(d)); };
		var cary2 = function(d) { return yScale2(carfilter(d)); };
		var pedy2 = function(d) { return yScale2(pedfilter(d)); };
		
		var area = d3.svg.area()
			.interpolate("linear")
			.x(timex)
			.y0(height)
			.y1(cary);
		
		var areaped = d3.svg.area()
			.interpolate("linear")
			.x(timex)
			.y0(height)
			.y1(pedy);
		
		var area2 = d3.svg.area()
			.interpolate("monotone")
			.x(timex)
			.y0(height2)
			.y1(cary2);
		
		var area2ped = d3.svg.area()
			.interpolate("monotone")
			.x(timex)
			.y0(height2)
			.y1(pedy2);
		
		graph.append("defs").append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("width", width)
			.attr("height", height);
		
		var focus = graph.append("g")
			.attr("class", "focus");
		
		var context = graph.append("g")
			.attr("class", "context")
			.attr("transform", "translate(0," + (height + margin2.top) + ")");
		
		xScale.domain(d3.extent(track.points, function(d) {
			return d.time + track.timeZoneOffset * 1000;
		}));
		
		yScale.domain([0, 150]);
		
		xScale2.domain(xScale.domain());
		yScale2.domain(yScale.domain());
		
		focus.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
		
		context.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height2 + ")")
			.call(xAxis2);
		
		graph.append("g")
			.attr("class", "y axis")
			.call(yAxis);
		
		//scale to 10,000 points maximum
		var skipArea = Math.ceil(Math.max(1, track.points.length / 10000));
		var skipAreaFilteredPoints = track.points.filter(function(d, i) { return i % skipArea == 0; });
		
		focus.append("path")
			.datum(skipAreaFilteredPoints)
			.attr("class", "area")
			.attr("d", area);
		
		focus.append("path")
			.datum(skipAreaFilteredPoints)
			.attr("class", "areaped")
			.attr("d", areaped);
		
		//scale to width
		var skipArea2 = Math.ceil(track.points.length / width);
		var skipArea2filteredPoints = track.points.filter(function(d, i) { return i % skipArea2 == 0; });
		
		context.append("path")
			.datum(skipArea2filteredPoints)
			.attr("class", "area")
			.attr("d", area2);
		
		context.append("path")
			.datum(skipArea2filteredPoints)
			.attr("class", "areaped")
			.attr("d", area2ped);
		
		context.append("g")
			.attr("class", "x brush")
			.call(brush)
			.selectAll("rect")
			.attr("y", -6)
			.attr("height", height2 + 7);
		
		focus.append("rect")
			.attr("class", "overlay")
			.attr("width", width)
			.attr("height", height)
			.on("mouseout", mouseout)
			.on("mousemove", mousemove);
		
		function brushed() {
			var extent = brush.empty() ? xScale2.domain() : brush.extent();
			xScale.domain(extent);
			focus.select(".area").attr("d", area);
			focus.select(".areaped").attr("d", areaped);
			focus.select(".x.axis").call(xAxis);
			SelectionService.setSelection("time", extent);
		}
		
		function mousemove() {
			var x0 = xScale.invert(d3.mouse(this)[0]);
			SelectionService.setSelection("hover", x0);
		}
		
		function mouseout() {
			SelectionService.setSelection("hover", null);
		}
	};
	
	var listener = {
		onAddTrack: function(track) {
			refresh();
		}
	};
	
	MainService.addListener(listener);
	$scope.$on("$destroy", function() {
		MainService.removeListener(listener);
	});
});
