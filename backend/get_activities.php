<?php
header('Content-type: application/json');
require_once('StravaApi.php');
$api = new Iamstuartwilson\StravaApi(
		17879,
		'45845c77e4cd25aeee107083f5da7a40573d42e6');
$postdata = file_get_contents("php://input");
$data = json_decode($postdata);
$accessToken = $data->access_token;
$api->setAccessToken($accessToken);
$substract_days = $data->substract_days;
$date = new DateTime($substract_days . ' days ago');

$activities = $api->get('athlete/activities', ['per_page' => 200, 'after' => $date->getTimestamp()]);
$activityList = array();

foreach ($activities as $activity) {
	/*$obj = (object) array('kudos' => $activity->kudos_count, 'name' => $activity->name, 
			'location' => $activity->location_city.','.$activity->location_state.','.$activity->location_country, 
			'link' => 'https://www.strava.com/activities/' . $activity->id, 
			'start_date' => $activity->start_date, 'distance' => $activity->distance,
			'type' => $activity->type, 'average_speed' => $activity->average_speed);
	*/
	$obj = (object)$activity;
	array_push($activityList, $obj);
}

$response = json_encode(array('data' => $activityList));
echo $response;
?>
