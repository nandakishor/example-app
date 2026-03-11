<?php
/**
 * save_dispute.php
 * -------------------------------------------------------
 * Saves a boundary dispute report.
 *
 * POST fields:
 *   parcel_id        integer            – fid of disputed parcel
 *   claimant_name    text               – name of person raising dispute
 *   claimant_contact text               – phone / email
 *   dispute_desc     text               – free-text description
 *   evidence_json    JSON string        – [{id, label, checked}, …]
 *   submitted_by     text               – username / officer ID (optional)
 *   files[]          multipart files    – supporting evidence files (optional)
 * -------------------------------------------------------
 */
header('Content-Type: application/json; charset=utf-8');

include_once 'db.php';

$parcelId        = intval($_POST['parcel_id']        ?? 0);
$claimantName    = trim($_POST['claimant_name']      ?? '');
$claimantContact = trim($_POST['claimant_contact']   ?? '');
$disputeDesc     = trim($_POST['dispute_desc']       ?? '');
$evidenceJson    = trim($_POST['evidence_json']      ?? '[]');
$submittedBy     = trim($_POST['submitted_by']       ?? 'system');

if ($parcelId <= 0 || $claimantName === '') {
    echo json_encode(['statusCode' => 400, 'message' => 'parcel_id and claimant_name are required']);
    exit;
}

json_decode($evidenceJson);
if (json_last_error() !== JSON_ERROR_NONE) {
    $evidenceJson = '[]';
}

$uploadDir     = __DIR__ . '/uploads/dispute/';
$uploadedFiles = [];

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (!empty($_FILES['files']['name'][0])) {
    $allowedExt = ['pdf','jpg','jpeg','png','tif','tiff','doc','docx'];
    foreach ($_FILES['files']['tmp_name'] as $i => $tmpName) {
        if ($_FILES['files']['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }
        $origName = basename($_FILES['files']['name'][$i]);
        $ext      = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt)) {
            continue;
        }
        if ($_FILES['files']['size'][$i] > 10 * 1024 * 1024) {
            continue;
        }
        $newName  = 'dispute_' . $parcelId . '_' . time() . '_' . $i . '.' . $ext;
        $destPath = $uploadDir . $newName;
        if (move_uploaded_file($tmpName, $destPath)) {
            $uploadedFiles[] = 'uploads/dispute/' . $newName;
        }
    }
}

$filesJson = json_encode($uploadedFiles);

$sql = "INSERT INTO public.boundary_disputes
            (parcel_id, claimant_name, claimant_contact, dispute_description,
             evidence_checklist, uploaded_files, submitted_by, status, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, 'open', NOW())
        RETURNING id";

$res = pg_query_params($dbconn, $sql, [
    $parcelId, $claimantName, $claimantContact, $disputeDesc,
    $evidenceJson, $filesJson, $submittedBy
]);

if ($res && pg_num_rows($res) > 0) {
    $row = pg_fetch_assoc($res);
    echo json_encode([
        'statusCode' => 200,
        'message'    => 'Dispute report saved successfully.',
        'dispute_id' => intval($row['id']),
        'files'      => $uploadedFiles
    ]);
} else {
    echo json_encode(['statusCode' => 500, 'message' => 'DB error: ' . pg_last_error($dbconn)]);
}
