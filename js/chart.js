/*
@activities - json data with strava activities, as returned by service backend
@daysAgo - integer, how many days we show in the chart
@metric - string, either 'distance', 'time', 'pace' (only for run activities), 'elevation'

returns: a javascript object with useful chart data
{ 'chart': the chart js object,
  'activitiesPerDay': list with activities per day (a day can have multiple activities)
}
*/

var buildChartHelper = function(activities, daysAgo, metric) {

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

	return {
		'chart': new Chart(ctx, {
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
					display: false,
					text: "Data Chart",
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
						gridLines: {
							display: true,
							borderDash: [5, 6],
						}
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
		}),
	'activitiesPerDay': activitiesPerDay
	}
};