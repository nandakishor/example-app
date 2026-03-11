<?php
/**
 * save_coords_update.php
 * -------------------------------------------------------
 * Saves a GPS coordinate update request for a parcel.
 *
 * POST fields:
 *   parcel_id        integer     – fid of parcel whose coords need updating
 *   gps_source       text        – GPS receiver model / survey instrument
 *   survey_date      date        – survey date (YYYY-MM-DD)
 *   accuracy_m       numeric     – accuracy in metres (e.g. 0.05)
 *   coords_geojson   JSON string – GeoJSON Point or Polygon of new coordinates
 *   notes            text        – additional notes (optional)
 *   submitted_by     text        – officer / user ID (optional)
 * -------------------------------------------------------
 */
header('Content-Type: application/json; charset=utf-8');

include_once 'db.php';

$parcelId      = intval($_POST['parcel_id']      ?? 0);
$gpsSource     = trim($_POST['gps_source']       ?? '');
$surveyDate    = trim($_POST['survey_date']      ?? '');
$accuracyM     = floatval($_POST['accuracy_m']   ?? 0);
$coordsGeoJSON = trim($_POST['coords_geojson']   ?? '');
$notes         = trim($_POST['notes']            ?? '');
$submittedBy   = trim($_POST['submitted_by']     ?? 'system');

if ($parcelId <= 0 || $coordsGeoJSON === '') {
    echo json_encode(['statusCode' => 400, 'message' => 'parcel_id and coords_geojson are required']);
    exit;
}

if ($surveyDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $surveyDate)) {
    echo json_encode(['statusCode' => 400, 'message' => 'survey_date must be YYYY-MM-DD']);
    exit;
}

json_decode($coordsGeoJSON);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['statusCode' => 400, 'message' => 'coords_geojson must be valid JSON']);
    exit;
}

$surveyDateParam = ($surveyDate !== '') ? $surveyDate : null;

$sql = "INSERT INTO public.coords_updates
            (parcel_id, gps_source, survey_date, accuracy_m,
             coords_geojson, notes, submitted_by, status, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'pending', NOW())
        RETURNING id";

$res = pg_query_params($dbconn, $sql, [
    $parcelId, $gpsSource, $surveyDateParam, $accuracyM,
    $coordsGeoJSON, $notes, $submittedBy
]);

if ($res && pg_num_rows($res) > 0) {
    $row = pg_fetch_assoc($res);
    echo json_encode([
        'statusCode' => 200,
        'message'    => 'Coordinates update request submitted successfully.',
        'update_id'  => intval($row['id'])
    ]);
} else {
    echo json_encode(['statusCode' => 500, 'message' => 'DB error: ' . pg_last_error($dbconn)]);
}
