var app = angular.module('stravalysis', ['ngRoute', 'ngCookies', 'ngAnimate']);

app.factory('chartBuilder', function($rootScope) {
	var service = {};

	service.myChart = undefined;

	service.build = function(activities, daysAgo) {

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
		var activitiesPerDay = [];

		var index = daysAgo;
		for(; index >= 0; index--) {
			var curDate = newDate(-index);
			var visited = false;
			var i, n = activityList.length;
			var totalDistance = 0;
			var daysActivities = [];
			for(i = 0; i < n; i++) {
				var activity = activityList[i];
				var activityDate = new Date(activity.start_date);
				if(formatDateDMY(activityDate) == formatDateDMY(curDate)) {
					if(visited == false)
						days.push(activityDate);
					totalDistance += activity.distance / 1000;
					visited = true;
					daysActivities.push(activity);
				}
			}
			if(visited == false) {
				days.push(curDate);
			}
			activitiesPerDay.push(daysActivities);
			distanceData.push(totalDistance);
		}

		
		var barChartData = distanceData;
		var dates = days;

		if(service.myChart != undefined) {
			service.myChart.destroy();
		}
		service.myChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: dates,
				datasets: [{
					label: 'distance ridden',
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
						stacked: true,
						ticks: {
							beginAtZero: true,
							callback: function(value, index, values) {
								return Math.round(value) + ' km';
							}
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
			$rootScope.sicaVar = [1,2,3];
			console.log($rootScope);
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
			resolve: {
				logout: function($location, userService) {
					userService.logoutUser();
					$location.path("/");
				}
			}
		})
		.when("/login", {
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
		.otherwise({redirectTo:'/'});
	
});

app.run(function($rootScope) {
	$rootScope.loading = false;
	$rootScope.clientId = '17879';
	$rootScope.clientSecret = '45845c77e4cd25aeee107083f5da7a40573d42e6';
	$rootScope.sicaVar = 'SMB';
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
	
	// TODO: this is a hack, use resolve in $routeProvider instead
	$scope.selectedTimeframe = $scope.timeframes[0];
	
	$rootScope.$watch('accessToken', function() {
			console.log('sica accestoken');
			stravaApiService.getActivites('7').then(function(activities) {
			$scope.activities = $scope.filterActivities(activities, $scope.showCycling);
			chartBuilder.build($scope.activities, 7);
			});

			stravaApiService.getActivites(-1).then(function(activities) {
				$scope.allActivities = activities;
				$rootScope.loadingPopular = false;
				console.log('got all activities');
			});
	});

	$scope.changeShowCycling = function(value) {
		$scope.showCycling = value;
	}

	$scope.changeTimeframe = function(value) {
		stravaApiService.getActivites(value.days).then(function(activities) {
			$scope.activities = $scope.filterActivities(activities, $scope.showCycling);
			chartBuilder.build($scope.activities, value.days);
		}); 
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

