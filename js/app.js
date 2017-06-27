var app = angular.module('stravalysis', ['ngRoute', 'ngCookies', 'ngAnimate']);

app.factory('chartBuilder', function($rootScope) {
	var service = {};

	service.myChart = undefined;

	service.build = function(activities, daysAgo, metric) {

		var ctx = document.getElementById("myChart").getContext("2d");
	
		function newDate(days) {
				return moment().add(days, 'd').toDate();
		}

		function formatDate(date) {
		  var monthNames = [
			"Jan", "Feb", "Mar",
			"Apr", "May", "Jun", "Jul",
			"Aug", "Sep", "Oct",
			"Nov", "Dec"
		  ];

		  var day = date.getDate();
		  var monthIndex = date.getMonth();
		  var year = date.getFullYear();

		  return monthNames[monthIndex] + ' ' + day;
		}

		function formatDateDMY(date) {
			var day = date.getDate();
		  	var monthIndex = date.getMonth();
		  	var year = date.getFullYear();
			return day+'.'+monthIndex+'.'+year;
		}

		var activityList = activities;
		var days = [];
		var distanceData = [];
		var hoursData = [];
		var elevationData = [];
		var speedData = [];
		var activitiesPerDay = [];

		var index = daysAgo;
		console.log('DEBUG ce plm days ago: ' + daysAgo);
		for(; index >= 0; index--) {
			var curDate = newDate(-index);
			var visited = false;
			var i, n = activityList.length;
			var totalDistance = 0;
			var totalHours = 0;
			var totalElevation = 0;
			var daysActivities = [];
			for(i = 0; i < n; i++) {
				var activity = activityList[i];
				var activityDate = new Date(activity.start_date);
				if(formatDateDMY(activityDate) == formatDateDMY(curDate)) {
					if(visited == false)
						days.push(activityDate);
					totalDistance += activity.distance / 1000;
					totalHours += activity.moving_time;
					totalElevation += activity.total_elevation_gain;
					visited = true;
					daysActivities.push(activity);
				}
			}
			if(visited == false) {
				days.push(curDate);
			}
			activitiesPerDay.push(daysActivities);
			distanceData.push(totalDistance);
			hoursData.push(totalHours);
			elevationData.push(totalElevation);
			if(totalDistance > 0)
				speedData.push(totalDistance / (totalHours / 3600));
			else
				speedData.push(0);
		}
		
		var minYValue = 0;
		var stepSize = 0;
		console.log('DEBUG metrica aleasa: ' + metric);
		if(metric == 'distance') {
			var callbackYLabel = function(value, index, values) {
				if(value == 0)
					return '';
				return Math.round(value) + ' km';
			};
			var barChartData = distanceData;
		}
		if(metric == 'time') {
			var callbackYLabel = function(value, index, values) {
				if(value == 0)
					return '';
				var h = Math.floor(value / 60 / 60);
				var m = Math.round(value / 60 % 60);
				if(m < 10)
					m = '0'+m;
				return h + ':' + m + ' hours';
			};
			// set to 30 minutes
			stepSize = 1800;
			var barChartData = hoursData;
		}
		if(metric == 'elevation') {
			var callbackYLabel = function(value, index, values) {
				if(value == 0)
					return 'rest day';
				return Math.round(value) + ' meters';
			};
			var barChartData = elevationData;
		}
		if(metric == 'pace') {
			var callbackYLabel = function(value, index, values) {
				if(value == 0)
					return 'rest day';
				var mins = Math.floor(3600 / value / 60);
				var secs = Math.round(3600 / value % 60);
				if(secs < 10)
					secs = '0'+secs;
				return mins + ':' + secs + ' min/km'; 
			};
			var barChartData = speedData;
			var minSpeed = 1000000;
			for(var i = 0; i < speedData.length; i++)
				if(speedData[i] != 0 && speedData[i] < minSpeed)
					minSpeed = speedData[i];
			minYValue = minSpeed - 1;
		}
		console.log(activities);
		console.log(barChartData);

		var dates = days;

		if(service.myChart != undefined) {
			service.myChart.destroy();
		}
		service.myChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: dates,
				datasets: [{
					data: barChartData,
					backgroundColor: 
						'rgba(255, 99, 132, 0.2)'
					,
					borderColor: 
						'rgba(255,99,132,1)'
					,
					borderWidth: 1
				}] 
			},
			options: {
				title : {
					display: true,
					text: "smc cacat",
				},
				hover: {
					onHover: function(e, elements) { 
						$(e.currentTarget).css("cursor", elements[0] ? "pointer" : "default");
						
						if(elements[0]) {
							$rootScope.showChartGlance = true;
							$rootScope.showChartGlanceActivities = activitiesPerDay[elements[0]['_index']];
							$rootScope.$apply();
						} else {
							$rootScope.showChartGlance = false;
							$rootScope.$apply();
						}

					}
				},
				legend: {
					display: false,
					boxWidth: 100,
					displayColors: false,
				},
				scales: {
					xAxes: [{
						stacked: true,
						type: "category",
						ticks: {
							autoSkip: true,
							maxTicksLimit: 30,
							callback: function(value, index, values) {
								d = new Date(value);
								return formatDate(d);
							}
						},
						gridLines: {
							display: false,
							color: 'black',
							offsetGridLines: true,
						},
					}],
					yAxes: [{
						//stacked: true,
						ticks: {
							beginAtZero: true,
							min: minYValue,
							callback: callbackYLabel,
							stepSize: stepSize,
						},
					}],
				},
				tooltips : {
						displayColors: false,
						callbacks : { // HERE YOU CUSTOMIZE THE LABELS
							title : function(tooltipItem, data) {
								return data.labels[tooltipItem[0].index];
							},
							beforeLabel : function(tooltipItem, data) {
								return '';
							},
							label : function(tooltipItem, data) {
								return data.datasets[tooltipItem.datasetIndex].label + ': ' + tooltipItem.yLabel + 'km';
							},
							afterLabel : function(tooltipItem, data) {
								// return array of string for multiple lines
								return [''];
							},
						}

				}, 

			}
		});
		document.getElementById("myChart").onclick = function(evt) {
			var activePoints = service.myChart.getElementsAtEvent(evt);
			console.log(activePoints);
			var chartData = activePoints[0]['_chart'].config.data;
			var idx = activePoints[0]['_index'];

			var label = chartData.labels[idx];
			var value = chartData.datasets[0].data[idx];

			var url = "http://example.com/?label=" + label + "&value=" + value;
			//window.open(url,'_blank');
			$rootScope.$apply();
			$("#myModal").modal(); 
		};
	}

	return service;
});

app.factory('userService', function($cookies) {
	
	var service = {};
	
	service.isLoggedIn = function() {
		if($cookies.get('accessToken')) {
			return true;
		} else {
			return false;
		}
	}
	service.logoutUser = function() {
		$cookies.remove('accessToken');
	}

	return service;
});

app.factory('stravaApiService', function($rootScope, $http) {
	var service = {}

	service.getActivites = function(days) {
 		$rootScope.loading = true;
		return $http
 					.post('backend/get_activities.php',
					 			{ substract_days: days,
 								access_token: $rootScope.accessToken})
					.then(function (response) {
 						$rootScope.loading = false;
						return response.data;
					});	
	}
	return service;
});

app.config(function($routeProvider) {
	$routeProvider
		.when("/", {
			controller: 'mainCtrl',
			templateUrl: 'login.html',
			resolve: {
				redirect: function($location, userService) {
					if(userService.isLoggedIn()) {
						$location.path('/home');
					}
				}
			}
		})
		.when("/logout", {
			controller: 'mainCtrl',
			resolve: {
				logout: function($location, userService) {
					userService.logoutUser();
					$location.path("/");
				}
			}
		})
		.when("/login", {
			controller: 'mainCtrl',
			templateUrl: 'login.html',
			resolve: {
				redirect: function($location, userService) {
					if(userService.isLoggedIn()) {
						$location.path("/home");
					}
					var authCode = $location.search()['code'];
					if(authCode) {
						$location.path('/login/'+authCode);
					} else {
						$location.path('/');
					}
 				}
			}
		})
		.when("/login/:code", {
			controller: 'mainCtrl',
			resolve: {
 				loginWithCode: function($route, $rootScope, $location, $http, $cookies) {
					var authCode = $route.current.params.code;
					$rootScope.loading = true;
					return $http
						.post('backend/login.php',
								{ client_id: $rootScope.clientId, 
								client_secret: $rootScope.clientSecret,
								code: authCode})
						.then(function (response) {
							var accessToken = response.data.access_token;
							if(accessToken) {
								var expireDate = new Date();
								expireDate.setDate(expireDate.getDate()+30);
								console.log('sica expire date ' + expireDate);
								$cookies.put('accessToken', accessToken, {'expires': expireDate});
								$rootScope.accessToken = accessToken;
								$location.path('/home');
							} else {
								$location.path('/');
							}
							$rootScope.loading = false;
						});
				}
			}
		})
		.when("/home", {
			controller: 'mainCtrl',
			templateUrl: 'home.html',
			resolve: {
				redirect: function($location, userService) {
					if(userService.isLoggedIn()) {
						$location.search('code', null);
						$location.search('state', null);
					} else {
						$location.path('/')
					}
				}
			}
		})
		.otherwise({controller: 'mainCtrl', redirectTo:'/'});
	
});

app.run(function($rootScope) {
	$rootScope.loading = false;
	$rootScope.clientId = '17879';
	$rootScope.clientSecret = '45845c77e4cd25aeee107083f5da7a40573d42e6';
	$rootScope.showChartGlance = false;
	$rootScope.loadingPopular = true;
});

app.controller('mainCtrl', function($rootScope, $scope, $cookies, stravaApiService, userService, chartBuilder) {
	$scope.test = 'test';
	$scope.sica = "marele cacat";
	$scope.activePopularRides = false;
	$scope.activeDailyChart = true;
	$scope.activeSearch = false;
	$scope.showCycling = true;
	$scope.search_for = "";

	$scope.filterActivities = function(activities, showCycling) {
		var result = [];
		var len = activities.length;
		for(var index = 0; index < len; index++) {
			if(showCycling == true && activities[index].type == "Ride")
				result.push(activities[index]);
			if(showCycling == false && activities[index].type == "Run")
				result.push(activities[index]);
		}
		return result;
	};

	$rootScope.accessToken = $cookies.get('accessToken');
	$scope.timeframes = [ {duration: 'Last Week', days: 7}, {duration: 'Last 2 Weeks', days: 14}, 
			{duration: 'Last Month', days: 30}, {duration: 'Last 3 Months', days: 90}, 
			{duration: 'Last 6 Months', days: 180} ];
	$scope.metrics = [ ['distance', 'time', 'elevation'], ['distance', 'time', 'elevation', 'pace'] ];
	
	// TODO: this is a hack, use resolve in $routeProvider instead
	$scope.selectedTimeframe = $scope.timeframes[0];
	$scope.selectedMetric = $scope.metrics[0][0];
	console.log('sicaaaaa');
	console.log($scope.selectedTimeframe);
	
	$rootScope.$watch('accessToken', function() {
			console.log('sica accestoken: ' + $rootScope.accessToken);
			if($rootScope.accessToken) {
				stravaApiService.getActivites('7').then(function(activities) {
					$scope.activities = $scope.filterActivities(activities, $scope.showCycling);
					chartBuilder.build($scope.activities, 7, 'distance');
				});

				stravaApiService.getActivites(-1).then(function(activities) {
					$scope.allActivities = activities;
					$rootScope.loadingPopular = false;
					console.log('got all activities');
				});
			}
	});

	console.log('sica aici');

	$scope.changeShowCycling = function(value) {
		$scope.showCycling = value;
	}

	$scope.changeTimeframe = function(value) {
		stravaApiService.getActivites(value.days).then(function(activities) {
			$scope.activities = $scope.filterActivities(activities, $scope.showCycling);
			chartBuilder.build($scope.activities, value.days, $scope.selectedMetric);
		}); 
	};

	$scope.changeMetric = function(value) {
		$scope.selectedMetric = value;
		chartBuilder.build($scope.activities, $scope.selectedTimeframe.days, $scope.selectedMetric);
	};

	$scope.activateDailyChart = function() {
		$scope.activePopularRides = false;
		$scope.activeSearch = false;
		$scope.activeDailyChart = true;
	};

	$scope.activatePopularRides = function() {
		$scope.activePopularRides = true;
		$scope.activeSearch = false;
		$scope.activeDailyChart = false;
	}

	$scope.activateSearch = function() {
		$scope.activePopularRides = false;
		$scope.activeSearch = true;
		$scope.activeDailyChart = false;
	}



});

