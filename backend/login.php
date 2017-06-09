<?php
header('Content-type: application/json');
require_once('StravaApi.php');
$api = new Iamstuartwilson\StravaApi(
		17879,
		'45845c77e4cd25aeee107083f5da7a40573d42e6');
$postdata = file_get_contents("php://input");
$data = json_decode($postdata);
$code = $data->code;
$oauthResponse = $api->tokenExchange($code);
$api->setAccessToken($oauthResponse->access_token);
$response = array('access_token' => $oauthResponse->access_token);
echo json_encode($response);
?>
