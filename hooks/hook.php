<?php

$postdata = file_get_contents("php://input");
$json = json_decode($postdata);
if($json->ref == 'refs/heads/master')
	shell_exec('git pull origin master');
?>

