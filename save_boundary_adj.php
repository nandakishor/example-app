<?php
/**
 * save_boundary_adj.php
 * -------------------------------------------------------
 * Saves a boundary adjustment request.
 *
 * POST fields:
 *   parcel_id          integer   – fid of parcel to adjust
 *   reason             text      – reason for adjustment
 *   surveyor_ref       text      – licensed surveyor reference / licence no.
 *   surveyor_date      date      – date of survey (YYYY-MM-DD)
 *   adjustment_notes   text      – additional notes (optional)
 *   submitted_by       text      – officer / user ID (optional)
 * -------------------------------------------------------
 */
header('Content-Type: application/json; charset=utf-8');

include_once 'db.php';

$parcelId     = intval($_POST['parcel_id']        ?? 0);
$reason       = trim($_POST['reason']             ?? '');
$surveyorRef  = trim($_POST['surveyor_ref']       ?? '');
$surveyorDate = trim($_POST['surveyor_date']      ?? '');
$adjNotes     = trim($_POST['adjustment_notes']   ?? '');
$submittedBy  = trim($_POST['submitted_by']       ?? 'system');

if ($parcelId <= 0 || $reason === '') {
    echo json_encode(['statusCode' => 400, 'message' => 'parcel_id and reason are required']);
    exit;
}

if ($surveyorDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $surveyorDate)) {
    echo json_encode(['statusCode' => 400, 'message' => 'surveyor_date must be YYYY-MM-DD']);
    exit;
}

$surveyorDateParam = ($surveyorDate !== '') ? $surveyorDate : null;

$sql = "INSERT INTO public.boundary_adjustments
            (parcel_id, reason, surveyor_ref, surveyor_date,
             adjustment_notes, submitted_by, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
        RETURNING id";

$res = pg_query_params($dbconn, $sql, [
    $parcelId, $reason, $surveyorRef, $surveyorDateParam,
    $adjNotes, $submittedBy
]);

if ($res && pg_num_rows($res) > 0) {
    $row = pg_fetch_assoc($res);
    echo json_encode([
        'statusCode'    => 200,
        'message'       => 'Boundary adjustment request submitted successfully.',
        'adjustment_id' => intval($row['id'])
    ]);
} else {
    echo json_encode(['statusCode' => 500, 'message' => 'DB error: ' . pg_last_error($dbconn)]);
}
