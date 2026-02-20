<?php
include 'db.php';

/*
 * merge.php
 * Accepts: ids[] (array of featuresDrawn IDs), type, name, surveyNumber, ownerName
 * 1. Computes ST_Union of all selected geometries
 * 2. Inserts merged polygon as new active parcel
 * 3. Marks source parcels as parcel_status = 'merged'
 * Returns: { statusCode, newId, area }
 */

$ids         = $_POST['ids'] ?? [];      // e.g. ["featuresdrawn.1","featuresdrawn.2"] or ["1","2"]
$type        = $_POST['typeofFeature']  ?? '';
$name        = $_POST['nameofFeature']  ?? '';
$surveyNum   = $_POST['surveyNumber']   ?? '';
$ownerName   = $_POST['ownerName']      ?? '';

// ----- sanitise IDs ----------------------------------------------------------
$cleanIds = [];
foreach ($ids as $raw) {
    // WFS IDs come as "featuresdrawn.5" – extract the numeric part
    $parts = explode('.', (string)$raw);
    $numeric = (int) end($parts);
    if ($numeric > 0) {
        $cleanIds[] = $numeric;
    }
}

if (count($cleanIds) < 2) {
    echo json_encode(['statusCode' => 400, 'message' => 'At least 2 features required for merge']);
    exit;
}

$idList = implode(',', $cleanIds);

// ----- compute union geometry + area -----------------------------------------
$unionQuery = pg_query($dbconn,
    "SELECT ST_AsGeoJSON(ST_Union(geom)) AS geom,
            ST_Area(ST_Union(geom)) AS area
     FROM public.featuresdrawn
     WHERE fid IN ($idList)"
);

if (!$unionQuery) {
    echo json_encode(['statusCode' => 500, 'message' => 'Union query failed: ' . pg_last_error($dbconn)]);
    exit;
}

$row = pg_fetch_assoc($unionQuery);
$mergedGeom = $row['geom'];
$area       = round((float)$row['area'], 2);

// ----- escape text fields ----------------------------------------------------
$type      = pg_escape_string($dbconn, $type);
$name      = pg_escape_string($dbconn, $name);
$surveyNum = pg_escape_string($dbconn, $surveyNum);
$ownerName = pg_escape_string($dbconn, $ownerName);

// ----- insert merged parcel --------------------------------------------------
$insertQuery = pg_query($dbconn,
    "INSERT INTO public.featuresdrawn
        (type, name, geom, survey_number, owner_name, area, parcel_status, operation_note)
     VALUES
        ('$type', '$name', ST_GeomFromGeoJSON('$mergedGeom'),
         '$surveyNum', '$ownerName', $area,
         'active', 'Created by merging parcels: $idList')
     RETURNING fid"
);

if (!$insertQuery) {
    echo json_encode(['statusCode' => 500, 'message' => 'Insert merged parcel failed: ' . pg_last_error($dbconn)]);
    exit;
}

$newRow  = pg_fetch_assoc($insertQuery);
$newId   = (int)$newRow['fid'];

// ----- mark source parcels as merged -----------------------------------------
$updateQuery = pg_query($dbconn,
    "UPDATE public.featuresdrawn
     SET parcel_status = 'merged',
         operation_note = 'Merged into parcel #$newId'
     WHERE fid IN ($idList)"
);

if (!$updateQuery) {
    echo json_encode(['statusCode' => 500, 'message' => 'Could not archive source parcels: ' . pg_last_error($dbconn)]);
    exit;
}

echo json_encode(['statusCode' => 200, 'newId' => $newId, 'area' => $area]);
?>
