angular.module('myApp', ['ngRoute', 'ngSanitize'])

.provider('Weather', function() {
	var apiKey = "";
	this.getUrl = function(type, ext) {
		return 'http://api.wunderground.com/api/' + 
			this.apiKey + '/' + type + '/q/' +
			ext + '.json';
	};

	this.setApiKey = function(key) {
		if (key) this.apiKey = key;
	};
	
	this.$get = function($q, $http) {
		var self = this;
		return {
			getWeatherForecast: function(city) {
				var d = $q.defer();
				$http({
					method: 'GET',
					url: self.getUrl('forecast10day', city),
					cache: true
				}).success(function(data) {
					d.resolve(data.forecast);
				}).error(function(err) {
					d.reject(err);
				});
				return d.promise;
			},
			getHourlyForecast: function(city) {
				var d = $q.defer();
				$http({
					method: 'GET',
					url: self.getUrl('hourly', city),
					cache: true
				}).success(function(data) {
					d.resolve(data.hourly_forecast);
				}).error(function(err) {
					d.reject(err);
				});
				return d.promise;
			},
			getCityDetails: function(query) {
			  var d = $q.defer();
			  $http({
			    method: 'GET',
			    url: "http://autocomplete.wunderground.com/aq?query=" + query
			  }).success(function(data) {
			    d.resolve(data.RESULTS);
			  }).error(function(err) {
			    d.reject(err);
			  });
			  return d.promise;
			}
		};
	};
})

.config(function(WeatherProvider) {
	WeatherProvider.setApiKey('daea4dbf8e2953aa');
})

.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/', {
		templateUrl: 'templates/home.html',
		controller: 'MainCtrl'
	})
	.when('/settings', {
		templateUrl: 'templates/settings.html',
		controller: 'SettingsCtrl'
	})
	.when('/hourly', {
		templateUrl: 'templates/hourly.html',
		controller: 'HourlyCtrl'
	})
	.otherwise({redirectTo: '/'});
}])

.controller('MainCtrl', function($rootScope, $scope, $timeout, $location, Weather, UserService) {
	$rootScope.message='Please enter a location.';
	$scope.weather = {};
	$scope.success = false;
	$scope.user = UserService.user;
	if(!$scope.user.location) {
		$scope.user.location = 'autoip';
	}

	Weather.getWeatherForecast($scope.user.location)
	.then(function(data) {
		$scope.success = true;
		$scope.weather.forecast = data;
		try {
			$scope.timezone = $scope.weather.forecast.simpleforecast.forecastday[0].date.tz_long;
		}
		catch (e) {
			$location.path('/settings');
		}
	});

	$scope.date = {};
	var updateTime = function() {
		$scope.date.tz = new Date(new Date().toLocaleString(
          "en-US", {timeZone: $scope.timezone}
        ));
		$scope.date.raw = new Date();
		$timeout(updateTime, 1000);
	};
	updateTime();

	$scope.prettyLocation = function() {
		var location = $scope.user.location;
		var capitalize = function(str) {
    	var pieces = str.split(" ");
    	for (var i = 0; i < pieces.length; i++) {
        var j = pieces[i].charAt(0).toUpperCase();
        pieces[i] = j + pieces[i].substr(1);
    	}
    	return pieces.join(" ");
		};
		if (location !== 'autoip') {
			prettifiedLocation = capitalize(location);
			return prettifiedLocation;
		} else {
			return '';
		}
	};
	
	function whatsTheWeather(index) {
		try {
			$rootScope.locationError = false;
			$rootScope.message = 'Please enter a location.'
			$scope.gotWeather = $scope.success;
			$scope.dayLabel = $scope.weather.forecast.txt_forecast.forecastday[index*2].title;
			$scope.nightLabel = $scope.weather.forecast.txt_forecast.forecastday[index*2 + 1].title;
			$scope.dayTime =  $scope.weather.forecast.txt_forecast.forecastday[index*2].fcttext;
			$scope.nightTime = $scope.weather.forecast.txt_forecast.forecastday[index*2 +1].fcttext;
			$scope.timezone = $scope.weather.forecast.simpleforecast.forecastday[0].date.tz_long;
		}
		catch (e) {
			$location.path('/settings');
			$rootScope.locationError = true;
			$rootScope.message = 'Please try another location.';
		}
	};
	
	$scope.$watch('success', function(newValue, oldValue) {
	  if (newValue === true) {
	  	$scope.activeClass = 'active';
	  	$scope.transitionClass = '';
	  	whatsTheWeather(0);
	  }
	});

	$scope.mouseEnterForecast = function(index) {
		if (index > 0 ) {	
			$scope.activeClass = '';
			$scope.transitionClass = 'transition'
			$timeout(function() {
				$scope.transitionClass = ''
				$scope.activeClass = 'active';
				whatsTheWeather(index);
			}, 1000);
		} else {
			whatsTheWeather(index);
		}	
	};	

	$scope.mouseOutForecast = function(index) {
		if (index > 0 ) {
			$scope.activeClass = '';
			$scope.transitionClass = 'transition';
			$timeout(function() {
				$scope.transitionClass = '';
				$scope.activeClass = 'active';
				whatsTheWeather(0);
			}, 1000);
		} else {
			whatsTheWeather(0);
		}
	};	
})

.factory('UserService', function() {
	var defaults = {
		location: 'autoip'
	};
	var service = {
		user: {},
		save: function() {
			localStorage.presently = angular.toJson(service.user);
		},
		restore: function() {
			//Pull from localStorage
			service.user = angular.fromJson(localStorage.presently) || defaults;
			return service.user;
		}
	};
	service.restore();
	return service;
})

.controller('SettingsCtrl', 
  function($scope, $rootScope, $location, $timeout, Weather, UserService) {  	
    $scope.user = UserService.user;
    $scope.save = function() {
      UserService.save();
      $location.path('/');
    };
    $scope.searchCities = function() {
	    $timeout(function() {
		    $scope.fetchCities = Weather.getCityDetails($scope.user.location)
		    	.then(function(data) {
		    		$scope.success = true;
		    		$scope.results = data;    		
		    	});
	    }, 500);	
	  };
    $scope.choose = function(index) {
			$scope.user.location = $scope.results[index].name;
		}	
})

.controller('HourlyCtrl',
	function($scope, Weather, UserService) {
		$scope.weather = {};
		$scope.success = false;
		$scope.user = UserService.user;
		if(!$scope.user.location) {
			$scope.user.location = 'autoip';
		}
		Weather.getHourlyForecast($scope.user.location)
		.then(function(data) {
			$scope.success = true;
			$scope.weather.hourly = data;
			for(var i = 0; i < data.length; i++) {
				if($scope.weather.hourly[i].snow.english > 0 ) {
					$scope.weather.hourly[i].snowString = $scope.weather.hourly[i].snow.english + ' in. snow, ';
				} else {
					$scope.weather.hourly[i].snowString = '';
				}
			}
		});
});