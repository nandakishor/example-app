<?php
include 'db.php';

$type = $_POST['typeofFeature'];
$name = $_POST['nameofFeature'];
$geomstring = $_POST['geom'];
$surveyNumber = $_POST['surveyNumber'] ?? '';
$ownerName = $_POST['ownerName'] ?? '';
$area = $_POST['area'] ?? 0;

$insert_query = "Insert into public.featuresdrawn (type,name,geom,survey_number,owner_name,area) Values ('$type','$name',ST_GeomFromGeoJSON('$geomstring'),'$surveyNumber','$ownerName',$area)";

$query = pg_query($dbconn,$insert_query);
if($query){
    echo json_encode(array('statusCode' => 200));
} else {
    echo json_encode(array('statusCode' => 201));
}

?>