var app = angular.module('stravalysis', ['ngRoute', 'ngCookies', 'ngAnimate']);

app.factory('chartBuilder', function($rootScope) {
	var service = {};

	service.myChart = undefined;

	service.build = function(activities, daysAgo, metric) {

		Chart.defaults.global.defaultFontFamily = "Nunito Sans";

		if(service.myChart != undefined) {
			service.myChart.destroy();
		}
		var helper = buildChartHelper(activities, daysAgo, metric);
		service.myChart = helper.chart;

		
		document.getElementById("myChart").onclick = function(evt) {
			var activePoints = service.myChart.getElementsAtEvent(evt);
			console.log('DEBUG activePoints: ');
			console.log(service.myChart);
			var chartData = activePoints[0]['_chart'].config.data;
			var idx = activePoints[0]['_index'];

			var label = chartData.labels[idx];
			var value = chartData.datasets[0].data[idx];

			var url = "http://example.com/?label=" + label + "&value=" + value;
			//window.open(url,'_blank');
			$rootScope.$apply();
			$("#myModal").modal(); 
		};

		service.myChart.options.hover.onHover = function(e, elements) {
			$(e.currentTarget).css("cursor", elements[0] ? "pointer" : "default");			
			if(elements[0]) {
				$rootScope.showChartGlance = true;
				$rootScope.showChartGlanceActivities = helper.activitiesPerDay[elements[0]['_index']];
				$rootScope.$apply();
			} else {
				$rootScope.showChartGlance = false;
				$rootScope.$apply();
			}
		}

		console.log(service.myChart.options);

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
		$cookies.remove('athlete');
	}

	service.getAthlete = function() {
		return $cookies.getObject('athlete');
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
							console.log('sica login response:');
							console.log(response);
							if(accessToken) {
								var expireDate = new Date();
								expireDate.setDate(expireDate.getDate()+30);
								console.log('sica expire date ' + expireDate);
								$cookies.put('accessToken', accessToken, {'expires': expireDate});
								$rootScope.accessToken = accessToken;
								$cookies.putObject('athlete', response.data.athlete, {'expires': expireDate});
								$rootScope.athlete = response.data.athlete;
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
	$rootScope.athlete = userService.getAthlete();

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

				$rootScope.athlete = userService.getAthlete();
				console.log("getAthlete: ");
				console.log($rootScope.athlete);
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

