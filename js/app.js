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

		var activityList = activities.data;
		var days = [];
		var distanceData = [];

		var index = daysAgo;
		for(; index >= 0; index--) {
			var curDate = newDate(-index);
			var visited = false;
			var i, n = activityList.length;
			for(i = 0; i < n; i++) {
				var activity = activityList[i];
				var activityDate = new Date(activity.start_date);
				if(formatDateDMY(activityDate) == formatDateDMY(curDate)) {
					days.push(activityDate);
					distanceData.push(activity.distance / 1000);
					visited = true;
				}
			}
			if(visited == false) {
				days.push(curDate);
				distanceData.push(0);
			}
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
								return value + ' km';
							}
						},
					}],
				},
				tooltips : {
						displayColors: false,

						callbacks : { // HERE YOU CUSTOMIZE THE LABELS
							title : function(tooltipItem, data) {
								return '***** My custom label title *****' + JSON.stringify(tooltipItem);
							},
							beforeLabel : function(tooltipItem, data) {
								return 'Month ' + ': ' + tooltipItem.xLabel + JSON.stringify(tooltipItem);
							},
							label : function(tooltipItem, data) {
								return data.datasets[tooltipItem.datasetIndex].label + ': ' + tooltipItem.yLabel;
							},
							afterLabel : function(tooltipItem, data) {
								// return array of string for multiple lines
								return ['***** Test *****', 'asdas'];
							},
						}

				}, 

			}
		});
		document.getElementById("myChart").onclick = function(evt){
			var activePoints = service.myChart.getElementsAtEvent(evt);
			var chartData = activePoints[0]['_chart'].config.data;
			var idx = activePoints[0]['_index'];

			var label = chartData.labels[idx];
			var value = chartData.datasets[0].data[idx];

			var url = "http://example.com/?label=" + label + "&value=" + value;
			window.open(url,'_blank');
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
								$cookies.put('accessToken', accessToken);
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
});

app.controller('mainCtrl', function($rootScope, $scope, $cookies, stravaApiService, userService, chartBuilder) {
	$scope.test = 'test';
	$scope.sica = "marele cacat";
	$scope.activePopularRides = false;
	$scope.activeDailyChart = true;
	$scope.activeSearch = false;
	$scope.showCycling = true;
	$scope.showRunning = false;
	$rootScope.accessToken = $cookies.get('accessToken');
	$scope.timeframes = [ {duration: 'Last Week', days: 7}, {duration: 'Last 2 Weeks', days: 14}, 
			{duration: 'Last Month', days: 30}, {duration: 'Last 3 Months', days: 90}, 
			{duration: 'Last 6 Months', days: 180} ];
	
	// TODO: this is a hack, use resolve in $routeProvider instead
	$scope.selectedTimeframe = $scope.timeframes[0];
	
	$rootScope.$watch('accessToken', function() {
			console.log('sica accestoken');
			stravaApiService.getActivites('7').then(function(activities) {
			$scope.activities = activities;
			chartBuilder.build(activities, 7);
			});
	});

	console.log("sica aici");
	$scope.changeTimeframe = function(value) {
		stravaApiService.getActivites(value.days).then(function(activities) {
			$scope.activities = activities;
			chartBuilder.build(activities, value.days);
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

