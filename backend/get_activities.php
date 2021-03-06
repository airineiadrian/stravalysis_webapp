<?php
header('Content-type: application/json');
require_once('StravaApi.php');
$api = new Iamstuartwilson\StravaApi(
		17879,
		'45845c77e4cd25aeee107083f5da7a40573d42e6');
$accessToken = $_GET['access_token'];

// TODO: remove this, this is for testing dev beta only
$hardcoded = 'ca7d56502a9708d5146b21f9192775952d9ecfe5';
$api->setAccessToken($accessToken);
$substract_days = $_GET['substract_days'];
$take_all = false;
if($substract_days == -1)
	$take_all = true;
$date = new DateTime($substract_days . ' days ago');
$date->setTime(0, 0);

$pageIndex = 1;
$activityList = array();

while(true) {
	if($take_all) {
		$activities = $api->get('athlete/activities', ['per_page' => 200, 'page' => $pageIndex]);
	} else {
		$activities = $api->get('athlete/activities', ['per_page' => 200, 'after' => $date->getTimestamp(), 'page' => $pageIndex]);
	}
	
	if(!$activities)
		break;
	
	foreach ($activities as $activity) {
		$activity->strava_link = 'https://www.strava.com/activities/' . $activity->id;
		
		$poly = $activity->map->summary_polyline;
		$poly = str_replace('\\\\', '\\', $poly);
		$summary_img_link = 'https://maps.googleapis.com/maps/api/staticmap?size=170x170&path=weight:4|color:red|enc:';
		$summary_img_link .= $poly;
		$summary_img_link .= '&sensor=true&key=AIzaSyDg-GJdb6dPDanay9u_SjENXx8gA8gSNPk';

		$summary_img_link_large = 'https://maps.googleapis.com/maps/api/staticmap?size=420x180&path=weight:4|color:red|enc:';
		$summary_img_link_large .= $poly;
		$summary_img_link_large .= '&sensor=true&key=AIzaSyDg-GJdb6dPDanay9u_SjENXx8gA8gSNPk';
		
		$h = $activity->moving_time / 60 / 60;
		$h = intval($h);
		$m = ($activity->moving_time / 60) % 60;
		$activity->moving_time_hm = ($h == 0 ? '' : $h.'h:') . ($m < 10 && $h != 0 ? '0' : '') . $m . 'mins';
		$activity->summary_img_link = $summary_img_link;
		$activity->summary_img_link_large = $summary_img_link_large;

		$obj = (object)$activity;
		array_push($activityList, $obj);
	}
	$pageIndex++;
}

$response = json_encode($activityList);
echo $response;
?>
