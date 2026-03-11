<?php
/**
 * get_filter_options.php
 * -------------------------------------------------------
 * Returns distinct values from the pincode_master table
 * for populating cascading State → District → Pincode
 * dropdowns in the Search Parcels sidebar form.
 *
 * GET parameters
 *   type      = states | districts | pincodes
 *   state     = (required for districts & pincodes)
 *   district  = (required for pincodes)
 * -------------------------------------------------------
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');

include_once 'db.php';

$type     = $_GET['type']     ?? '';
$state    = $_GET['state']    ?? '';
$district = $_GET['district'] ?? '';

$state    = preg_replace('/[^a-zA-Z0-9 \-]/', '', $state);
$district = preg_replace('/[^a-zA-Z0-9 \-]/', '', $district);

switch ($type) {

    case 'states':
        $sql  = "SELECT DISTINCT state
                 FROM   public.pincode_master
                 WHERE  state IS NOT NULL AND state <> ''
                 ORDER  BY state";
        $res  = pg_query($dbconn, $sql);
        $rows = [];
        while ($row = pg_fetch_assoc($res)) {
            $rows[] = $row['state'];
        }
        echo json_encode(['status' => 'ok', 'data' => $rows]);
        break;

    case 'districts':
        if ($state === '') {
            echo json_encode(['status' => 'error', 'message' => 'state parameter required']);
            break;
        }
        $sql  = "SELECT DISTINCT district
                 FROM   public.pincode_master
                 WHERE  state = $1
                   AND  district IS NOT NULL AND district <> ''
                 ORDER  BY district";
        $res  = pg_query_params($dbconn, $sql, [$state]);
        $rows = [];
        while ($row = pg_fetch_assoc($res)) {
            $rows[] = $row['district'];
        }
        echo json_encode(['status' => 'ok', 'data' => $rows]);
        break;

    case 'pincodes':
        if ($state === '' || $district === '') {
            echo json_encode(['status' => 'error', 'message' => 'state and district parameters required']);
            break;
        }
        $sql  = "SELECT DISTINCT pincode
                 FROM   public.pincode_master
                 WHERE  state    = $1
                   AND  district = $2
                   AND  pincode IS NOT NULL AND pincode <> ''
                 ORDER  BY pincode";
        $res  = pg_query_params($dbconn, $sql, [$state, $district]);
        $rows = [];
        while ($row = pg_fetch_assoc($res)) {
            $rows[] = $row['pincode'];
        }
        echo json_encode(['status' => 'ok', 'data' => $rows]);
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid type. Use states | districts | pincodes']);
        break;
}
