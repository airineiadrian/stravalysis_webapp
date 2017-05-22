var app = angular.module('stravalysis', ['ngRoute', 'ngCookies']);

app.factory('userService', function($cookies) {
	
	var service = {};
	
	service.isLoggedIn = function() {
		if($cookies.get('accessToken')) {
			return true;
		} else {
			return false;
		}
	} 
	return service;
});

app.factory('stravaApiService', function($rootScope, $http) {
	var service = {}

	service.getActivites = function() {
		
	}
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
 				loginWithCode:  function($route, $rootScope, $location, $http, $cookies) {
					var authCode = $route.current.params.code;
					$rootScope.loading = true;
					return $http
						.post('login.php',
								{ client_id: $rootScope.clientId, 
								client_secret: $rootScope.clientSecret,
								code: authCode})
						.then(function (response) {
							var accessToken = response.data.access_token;
							$cookies.put('accessToken', accessToken);
							$rootScope.accessToken = accessToken;
							$location.path('/home');
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
		});
	
});

app.run(function($rootScope) {
	$rootScope.loading = false;
	$rootScope.clientId = '17879';
	$rootScope.clientSecret = '45845c77e4cd25aeee107083f5da7a40573d42e6';
});

app.controller('mainCtrl', function($rootScope, $scope, $http, $cookies) {
	$scope.test = 'test';
	$rootScope.accessToken = $cookies.get('accessToken');
	$scope.timeframes = [ {duration: 'Last Week', days: 7}, {duration: 'Last 2 Weeks', days: 14}, 
			{duration: 'Last Month', days: 30}, {duration: 'Last 3 Months', days: 90}, 
			{duration: 'Last 6 Months', days: 180} ]
	$scope.selectedTimeframe = $scope.timeframes[0];

	$scope.changeTimeframe = function(value) {
		alert('you changed to: ' + value.duration);
	}

});

