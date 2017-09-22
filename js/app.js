var app = angular.module('stravalysis', ['ngRoute', 'ngCookies', 'ngAnimate']);

app.factory('chartBuilder', function($rootScope, simpleLoginService) {
	var service = {};

	service.myChart = undefined;

	service.build = function(activities, daysAgo, metric) {

		Chart.defaults.global.defaultFontFamily = "Nunito Sans";

		if(service.myChart != undefined) {
			service.myChart.destroy();
		}
		var helper = buildChartHelper(activities, daysAgo, metric, 145);
		service.myChart = helper.chart;

		$rootScope.totalDistance = helper.totalDistance;
		$rootScope.totalHours = helper.totalHours;
		$rootScope.totalElevation = helper.totalElevation;

		document.getElementById("myChart").onclick = function(evt) {
			var activePoints = service.myChart.getElementsAtEvent(evt);

			var chartData = activePoints[0]['_chart'].config.data;
			var idx = activePoints[0]['_index'];

			var label = chartData.labels[idx];
			var value = chartData.datasets[0].data[idx];

			var url = "http://example.com/?label=" + label + "&value=" + value;
			//window.open(url,'_blank');
			simpleLoginService.logAthlete($rootScope.athlete, 'click_chart');
			$rootScope.$apply();
			$("#myModal").modal(); 
			initializeMaps($rootScope.showChartGlanceActivities);
		};

		service.myChart.options.hover.onHover = function(e, elements) {

			$(e.currentTarget).css("cursor", elements[0] ? "pointer" : "default");			
			if(elements[0]) {
				$rootScope.showInfoBoxChart = false;
				$rootScope.showChartGlance = true;
				$rootScope.showChartGlanceActivities = helper.activitiesPerDay[elements[0]['_index']];
				$rootScope.$apply();
			} else {
				$rootScope.showChartGlance = false;
				$rootScope.$apply();
			}
		}
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
 		var link = 'backend/get_activities.php?access_token='+$rootScope.accessToken;
 		link = link + '&substract_days='+days;
		return $http
 					.get(link)
					.then(function (response) {
 						$rootScope.loading = false;
						return response.data;
					});	
	}
	return service;
});

app.factory('simpleLoginService', function($cookies, $http) {
	var service = {};
	service.testLog = function(message) {
		var parameter = JSON.stringify({"message": message});
		return $http
			.post('backend/log.php',
					{'message': message})
			.then(function (response) {
				console.log("SICA raspuns loggly: ");
				console.log(response);
			});
	};

	service.logAthlete = function(athlete, type) {
		return $http
			.post('backend/log.php',
					{'type': type, 'athlete': athlete})
			.then(function (response) {
				console.log(response);
			});
	};

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
				logout: function($location, userService, simpleLoginService, $rootScope) {
					simpleLoginService.logAthlete($rootScope.athlete, 'logout');
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
 				loginWithCode: function($route, $rootScope, $location, $http, $cookies, simpleLoginService) {
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
								$cookies.put('accessToken', accessToken, {'expires': expireDate});
								$rootScope.accessToken = accessToken;
								$cookies.putObject('athlete', response.data.athlete, {'expires': expireDate});
								$rootScope.athlete = response.data.athlete;
								simpleLoginService.logAthlete($rootScope.athlete, 'login');
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

app.run(function($rootScope, $location) {
	$rootScope.loading = false;
	$rootScope.clientId = '17879';
	$rootScope.clientSecret = '45845c77e4cd25aeee107083f5da7a40573d42e6';
	$rootScope.showChartGlance = false;
	$rootScope.loadingPopular = true;
	$rootScope.showInfoBoxChart = true;
});

app.controller('mainCtrl', function($location, $rootScope, $scope, $cookies, $sce, stravaApiService, userService, chartBuilder, simpleLoginService) {
	$scope.test = 'test';
	$scope.sica = "marele cacat";
	$scope.activePopularRides = false;
	$scope.activeDailyChart = true;
	$scope.activeSearch = false;
	$scope.showCycling = true;
	$scope.search_for = "";

	$scope.loginRedirectURI = 'https://www.strava.com/oauth/authorize?client_id=17879&response_type=code&redirect_uri='+$location.absUrl()+'login&state=mystate&approval_prompt=force';
	$scope.loginRedirectURI = $scope.loginRedirectURI.replace('#', '%23');

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
	$scope.selectedTimeframe = $scope.timeframes[4];
	$scope.selectedMetric = $scope.metrics[0][0];
	
	$rootScope.$watch('accessToken', function() {
			if($rootScope.accessToken) {
				stravaApiService.getActivites('180').then(function(activities) {
					$scope.activities = $scope.filterActivities(activities, $scope.showCycling);
					chartBuilder.build($scope.activities, 180, 'distance');
				});

				stravaApiService.getActivites(-1).then(function(activities) {
					$scope.allActivities = activities;
					$rootScope.loadingPopular = false;
				});

				$rootScope.athlete = userService.getAthlete();
			}
	});

	$scope.changeShowCycling = function(value) {
		$scope.showCycling = value;
	};

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
		simpleLoginService.logAthlete($rootScope.athlete, 'click_daily_chart_page');
	};

	$scope.activatePopularRides = function() {
		$scope.activePopularRides = true;
		$scope.activeSearch = false;
		$scope.activeDailyChart = false;
		simpleLoginService.logAthlete($rootScope.athlete, 'click_popular_rides_page');
	};

	$scope.activateSearch = function() {
		$scope.activePopularRides = false;
		$scope.activeSearch = true;
		$scope.activeDailyChart = false;
		simpleLoginService.logAthlete($rootScope.athlete, 'click_search_page');
	};

	$scope.formatStartDateNice = function(activity) {
		var date = new Date(activity.start_date);
		return date.toString().substring(0, 15);
	};

	$scope.highlight = function(haystack, needle) {
		var loweredHaystack = haystack.toLowerCase();
		var loweredNeedle = needle.toLowerCase();
		var position = loweredHaystack.indexOf(loweredNeedle);
		if(!needle || position == -1) {
			if(haystack.length > 35) {
				haystack = haystack.substring(0, 36) + '...';
			}
			return $sce.trustAsHtml(haystack);
		}
		var suffixEnd = false;
		var prefixStart = false;

		if(haystack.length > 35) {
			haystack = haystack.substring(position);
			if(position != 0) {
				prefixStart = true;
			}
		}

		if(haystack.length > 35) {
			haystack = haystack.substring(0, 36);
			suffixEnd = true;
		}

		var result = haystack.replace(new RegExp(needle, "gi"), function(match) {
			return '<span class="highlightedText">' + match + '</span>';
		});
		if(prefixStart) {
			result = '...' + result;
		}
		if(suffixEnd == true) {
			result = result + '...';
		}
		return $sce.trustAsHtml(result);
	};

});

