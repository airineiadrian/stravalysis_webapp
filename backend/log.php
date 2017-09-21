<?php

$postdata = file_get_contents("php://input");
$data = json_decode($postdata);
$type = $data->type;
$athlete = $data->athlete;

$url = 'https://logs-01.loggly.com/inputs/dc86e38d-5e5f-4f39-a1d3-56a4dbc4f032/tag/http/';
$data = array('type' => $type, 'athlete' => $athlete);

// use key 'http' even if you send the request to https://...
$options = array(
    'http' => array(
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data)
    )
);
$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);

echo $result;

?>
