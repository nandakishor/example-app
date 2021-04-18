<?php
include 'db.php';

$type = $_POST['typeofFeature'];
$name = $_POST['nameofFeature'];
$geomstring = $_POST['geom'];

$insert_query = "Insert into public.\"featuresDrawn\" (type,name,geom) Values ('$type','$name',ST_GeomFromGeoJSON('$geomstring'))";

$query = pg_query($dbconn,$insert_query);
if($query){
    echo json_encode(array('statusCode' => 200));
} else {
    echo json_encode(array('statusCode' => 201));
}

?>