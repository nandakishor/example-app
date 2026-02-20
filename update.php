<?php
include 'db.php';

$id = $_POST['id'];
$type = $_POST['typeofFeature'];
$name = $_POST['nameofFeature'];
$geomstring = $_POST['geom'];
$surveyNumber = $_POST['surveyNumber'] ?? '';
$ownerName = $_POST['ownerName'] ?? '';
$area = $_POST['area'] ?? 0;

// Clean ID to ensure it's just the numeric part if it comes as 'featuresdrawn.1'
// Note: Postgres usually sends 'table.id' in WFS, but we might just get the number or handle it.
// Let's assume frontend strips it or we handle it here.
if (strpos($id, '.') !== false) {
    $parts = explode('.', $id);
    $id = end($parts);
}

$update_query = "UPDATE public.featuresdrawn SET 
    type='$type', 
    name='$name', 
    geom=ST_GeomFromGeoJSON('$geomstring'), 
    survey_number='$surveyNumber', 
    owner_name='$ownerName', 
    area=$area 
    WHERE fid=$id";

$query = pg_query($dbconn, $update_query);

if($query){
    echo json_encode(array('statusCode' => 200, 'message' => 'Data updated successfully'));
} else {
    echo json_encode(array('statusCode' => 500, 'message' => 'Error updating data'));
}
?>
