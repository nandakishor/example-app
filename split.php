<?php
include 'db.php';

/*
 * split.php
 * Accepts: parentId, children[] (JSON string array of GeoJSON geometries + attributes)
 * 1. Marks the parent parcel as parcel_status = 'split'
 * 2. Inserts each child polygon linked to parent via parent_id
 * Returns: { statusCode, childIds[] }
 */

$parentId = $_POST['parentId'] ?? null;
$children = $_POST['children'] ?? [];  // JSON-encoded array

if (!$parentId || empty($children)) {
    echo json_encode(['statusCode' => 400, 'message' => 'parentId and children are required']);
    exit;
}

// Clean parent ID (handle "featuresdrawn.5" format)
$parts    = explode('.', (string)$parentId);
$parentId = (int) end($parts);

if ($parentId <= 0) {
    echo json_encode(['statusCode' => 400, 'message' => 'Invalid parentId']);
    exit;
}

// Decode the children array
if (is_string($children)) {
    $children = json_decode($children, true);
}

if (!is_array($children) || count($children) < 2) {
    echo json_encode(['statusCode' => 400, 'message' => 'At least 2 child polygons required']);
    exit;
}

// ----- mark parent as split --------------------------------------------------
$parentUpdate = pg_query($dbconn,
    "UPDATE public.featuresdrawn
     SET parcel_status = 'split',
         operation_note = 'Split into " . count($children) . " child parcels'
     WHERE fid = $parentId"
);

if (!$parentUpdate) {
    echo json_encode(['statusCode' => 500, 'message' => 'Could not update parent: ' . pg_last_error($dbconn)]);
    exit;
}

// ----- insert each child parcel ----------------------------------------------
$childIds = [];
$i = 1;
foreach ($children as $child) {
    $geomstring = pg_escape_string($dbconn, $child['geom']);
    $type       = pg_escape_string($dbconn, $child['type']       ?? '');
    $name       = pg_escape_string($dbconn, ($child['name']      ?? '') ?: "Part $i");
    $surveyNum  = pg_escape_string($dbconn, $child['surveyNumber'] ?? '');
    $ownerName  = pg_escape_string($dbconn, $child['ownerName']  ?? '');
    $area       = (float)($child['area'] ?? 0);

    $insertChild = pg_query($dbconn,
        "INSERT INTO public.featuresdrawn
            (type, name, geom, survey_number, owner_name, area,
             parent_id, parcel_status, operation_note)
         VALUES
            ('$type', '$name', ST_GeomFromGeoJSON('$geomstring'),
             '$surveyNum', '$ownerName', $area,
             $parentId, 'active', 'Child parcel split from #$parentId')
         RETURNING fid"
    );

    if (!$insertChild) {
        echo json_encode(['statusCode' => 500, 'message' => "Failed to insert child $i: " . pg_last_error($dbconn)]);
        exit;
    }

    $row = pg_fetch_assoc($insertChild);
    $childIds[] = (int)$row['fid'];
    $i++;
}

echo json_encode(['statusCode' => 200, 'childIds' => $childIds]);
?>
