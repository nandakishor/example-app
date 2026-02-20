// ============================================================
//  main.js  –  GIS Parcel Manager
//  Features: Draw · Edit · Merge (union) · Split (line-cut)
//  with Parent-Child parcel relationship tracking
// ============================================================

// ---- Global State ----------------------------------------------------------
var isDrawOn   = false;
var isEditOn   = false;
var isMergeOn  = false;
var isSplitOn  = false;

var draw, snap, modify, select;
var selectedFeature        = null;  // feature being edited
var currentPopupFeature    = null;  // feature shown in popup

var mergeSelectedFeatures  = [];    // array of OL features chosen for merge
var mergeSelectInteraction = null;
var mergeSnapInteraction   = null;  // snaps cursor to polygon edges in merge mode

var splitParentFeature     = null;  // parent polygon for split
var splitDrawInteraction   = null;
var splitSnapInteraction   = null;  // snaps split line to polygon edges

var PointType   = ['ATM', 'Tree', 'Telephone Poles', 'Electricity Poles', 'Shops'];
var LineType    = ['National Highway', 'State Highway', 'River', 'Telephone Lines'];
var PolygonType = ['Water Body', 'Commercial Land', 'Residential Land', 'Building', 'Government Building'];
var selectedGeomType;

// ============================================================
//  Custom OL Control  –  DrawingApp toolbar
// ============================================================
window.app = {};
var app = window.app;

app.DrawingApp = function (opt_options) {
    var options = opt_options || {};

    // --- Draw Button ---
    var drawBtn = document.createElement('button');
    drawBtn.id = 'drawbtn';
    drawBtn.innerHTML = '<i class="fas fa-pencil-ruler"></i>';
    drawBtn.title = 'Draw Feature';

    // --- Stop Edit Button (hidden by default) ---
    var stopEditBtn = document.createElement('button');
    stopEditBtn.id = 'stopEditBtn';
    stopEditBtn.innerHTML = '<i class="far fa-stop-circle"></i>';
    stopEditBtn.style.marginTop = '6px';
    stopEditBtn.style.display = 'none';
    stopEditBtn.title = 'Stop Editing';

    // --- Save Edit Button (hidden by default) ---
    var editAttrBtn = document.createElement('button');
    editAttrBtn.id = 'editAttrBtn';
    editAttrBtn.innerHTML = '<i class="fas fa-save"></i>';
    editAttrBtn.style.marginTop = '6px';
    editAttrBtn.style.display = 'none';
    editAttrBtn.title = 'Save Attributes';

    // --- Merge Button ---
    var mergeBtn = document.createElement('button');
    mergeBtn.id = 'mergeBtn';
    mergeBtn.innerHTML = '<i class="fas fa-object-group"></i>';
    mergeBtn.style.marginTop = '6px';
    mergeBtn.title = 'Merge Polygons';

    // --- Execute Merge Button (hidden until ≥2 selected) ---
    var execMergeBtn = document.createElement('button');
    execMergeBtn.id = 'execMergeBtn';
    execMergeBtn.innerHTML = '<i class="fas fa-check-double"></i>';
    execMergeBtn.style.marginTop = '6px';
    execMergeBtn.style.display = 'none';
    execMergeBtn.title = 'Execute Merge';
    execMergeBtn.className = 'btn-exec-merge';

    // --- Cancel Merge Button ---
    var cancelMergeBtn = document.createElement('button');
    cancelMergeBtn.id = 'cancelMergeBtn';
    cancelMergeBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelMergeBtn.style.marginTop = '6px';
    cancelMergeBtn.style.display = 'none';
    cancelMergeBtn.title = 'Cancel Merge';

    // --- Split Cancel Button (visible during split mode) ---
    var cancelSplitBtn = document.createElement('button');
    cancelSplitBtn.id = 'cancelSplitBtn';
    cancelSplitBtn.innerHTML = '<i class="fas fa-ban"></i>';
    cancelSplitBtn.style.marginTop = '6px';
    cancelSplitBtn.style.display = 'none';
    cancelSplitBtn.title = 'Cancel Split';

    // ---- Toggle Draw ----
    var startStopApp = function () {
        if (isEditOn)  stopEditMode();
        if (isMergeOn) cancelMergeMode();
        if (isSplitOn) cancelSplitMode();

        if (!isDrawOn) {
            $('#startDrawModal').modal('show');
        } else {
            map.removeInteraction(draw);
            map.removeInteraction(snap);
            isDrawOn = false;
            drawBtn.innerHTML = '<i class="fas fa-pencil-ruler"></i>';
        }
    };

    drawBtn.addEventListener('click',      startStopApp, false);
    drawBtn.addEventListener('touchstart', startStopApp, false);

    stopEditBtn.addEventListener('click', function () { stopEditMode(); }, false);
    editAttrBtn.addEventListener('click', function () {
        if (selectedFeature) openUpdateModal(selectedFeature);
        else alert('No feature selected!');
    }, false);

    mergeBtn.addEventListener('click', function () {
        if (isMergeOn) { cancelMergeMode(); return; }
        startMergeMode();
    }, false);

    execMergeBtn.addEventListener('click', function () {
        openMergeModal();
    }, false);

    cancelMergeBtn.addEventListener('click', function () { cancelMergeMode(); }, false);
    cancelSplitBtn.addEventListener('click', function () { cancelSplitMode(); }, false);

    var element = document.createElement('div');
    element.className = 'draw-app ol-unselectable ol-control';
    element.appendChild(drawBtn);
    element.appendChild(stopEditBtn);
    element.appendChild(editAttrBtn);
    element.appendChild(mergeBtn);
    element.appendChild(execMergeBtn);
    element.appendChild(cancelMergeBtn);
    element.appendChild(cancelSplitBtn);

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });
};

ol.inherits(app.DrawingApp, ol.control.Control);

// ============================================================
//  EDIT MODE
// ============================================================
function startEditMode() {
    if (!currentPopupFeature) return;

    overlay.setPosition(undefined);

    if (isDrawOn)  { map.removeInteraction(draw); map.removeInteraction(snap); isDrawOn = false; document.getElementById('drawbtn').innerHTML = '<i class="fas fa-pencil-ruler"></i>'; }
    if (isMergeOn) cancelMergeMode();
    if (isSplitOn) cancelSplitMode();

    isEditOn = true;
    selectedFeature = currentPopupFeature;

    document.getElementById('stopEditBtn').style.display = 'block';
    document.getElementById('editAttrBtn').style.display = 'block';

    select = new ol.interaction.Select({
        layers: [wfsLayer],
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: 'blue', width: 3 }),
            fill:   new ol.style.Fill({ color: 'rgba(0,0,255,0.1)' }),
            image:  new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: 'blue' }) })
        })
    });
    map.addInteraction(select);

    modify = new ol.interaction.Modify({ features: select.getFeatures() });
    map.addInteraction(modify);

    select.getFeatures().push(selectedFeature);

    select.on('select', function (e) {
        selectedFeature = (e.selected.length > 0) ? e.selected[0] : null;
    });
}

function stopEditMode() {
    isEditOn = false;
    selectedFeature = null;
    currentPopupFeature = null;

    document.getElementById('stopEditBtn').style.display = 'none';
    document.getElementById('editAttrBtn').style.display = 'none';

    map.removeInteraction(modify);
    map.removeInteraction(select);
}

// ============================================================
//  OPEN UPDATE MODAL
// ============================================================
function openUpdateModal(feature) {
    var props = feature.getProperties();
    $('#typeofFeatures').val(props.type || props.Type);

    var geom = feature.getGeometry();
    var type = geom.getType();
    if      (type === 'Point'      || type === 'MultiPoint')      selectedGeomType = 'Point';
    else if (type === 'LineString' || type === 'MultiLineString') selectedGeomType = 'LineString';
    else selectedGeomType = 'Polygon';

    typeofFeature();
    setTimeout(function () { $('#typeofFeatures').val(props.type); }, 50);

    $('#nameofFeatures').val(props.name);
    $('#surveyNumber').val(props.survey_number);
    $('#ownerName').val(props.owner_name);
    $('#calcArea').val(props.area);

    $('#savebtn').hide();
    $('#updatebtn').show();
    $('#enterInformationModal').modal('show');
}

// ============================================================
//  MERGE MODE
// ============================================================
function startMergeMode() {
    if (isEditOn)  stopEditMode();
    if (isSplitOn) cancelSplitMode();

    isMergeOn = true;
    mergeSelectedFeatures = [];

    document.getElementById('mergeBtn').style.backgroundColor = '#ffc107';
    document.getElementById('cancelMergeBtn').style.display   = 'block';
    document.getElementById('execMergeBtn').style.display     = 'none';

    // Show hint toast
    showToast('🔗 Merge Mode: Click polygons to select them for merging. Select ≥ 2, then click ✔ to merge.', 5000);

    // Use a Select interaction that supports multi-select
    mergeSelectInteraction = new ol.interaction.Select({
        layers: [wfsLayer],
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#ff6600', width: 3, lineDash: [8, 4] }),
            fill:   new ol.style.Fill({ color: 'rgba(255,102,0,0.2)' })
        }),
        multi: false  // We handle multi manually via map click
    });
    map.addInteraction(mergeSelectInteraction);

    // Snap to WFS polygon edges/vertices so selection snaps precisely to boundaries
    mergeSnapInteraction = new ol.interaction.Snap({ source: wfsSource });
    map.addInteraction(mergeSnapInteraction);

    mergeSelectInteraction.on('select', function (e) {
        e.selected.forEach(function (f) {
            // Only allow polygons
            var gType = f.getGeometry().getType();
            if (gType !== 'Polygon' && gType !== 'MultiPolygon') {
                mergeSelectInteraction.getFeatures().remove(f);
                showToast('⚠️ Only polygon features can be merged.', 3000);
                return;
            }
            // Toggle: if already selected, remove; else add
            var idx = mergeSelectedFeatures.indexOf(f);
            if (idx > -1) {
                mergeSelectedFeatures.splice(idx, 1);
                mergeSelectInteraction.getFeatures().remove(f);
            } else {
                mergeSelectedFeatures.push(f);
            }
        });

        // Show exec button when ≥ 2 selected
        document.getElementById('execMergeBtn').style.display =
            mergeSelectedFeatures.length >= 2 ? 'block' : 'none';

        showToast('Selected ' + mergeSelectedFeatures.length + ' polygon(s) for merge.', 2000);
    });
}

function cancelMergeMode() {
    isMergeOn = false;
    mergeSelectedFeatures = [];

    if (mergeSnapInteraction) {
        map.removeInteraction(mergeSnapInteraction);
        mergeSnapInteraction = null;
    }

    if (mergeSelectInteraction) {
        mergeSelectInteraction.getFeatures().clear();
        map.removeInteraction(mergeSelectInteraction);
        mergeSelectInteraction = null;
    }

    document.getElementById('mergeBtn').style.backgroundColor   = '';
    document.getElementById('cancelMergeBtn').style.display     = 'none';
    document.getElementById('execMergeBtn').style.display       = 'none';
}

function openMergeModal() {
    if (mergeSelectedFeatures.length < 2) {
        showToast('⚠️ Select at least 2 polygons first.', 3000);
        return;
    }

    // Pre-compute union area using turf
    var parser = new ol.format.GeoJSON();
    var geoFeatures = mergeSelectedFeatures.map(function (f) {
        return parser.writeFeatureObject(f);
    });

    var merged = geoFeatures[0];
    for (var i = 1; i < geoFeatures.length; i++) {
        try {
            merged = turf.union(merged, geoFeatures[i]);
        } catch (e) {
            console.error('Turf union error:', e);
            showToast('❌ Could not compute union – are the polygons adjacent/overlapping?', 4000);
            return;
        }
    }

    // turf.area() assumes WGS84 degrees — use ol.Sphere.getArea() which
    // correctly handles the EPSG:3857 (metre) coordinates used by this map.
    var _mergeCoords = merged.geometry.type === 'MultiPolygon'
        ? merged.geometry.coordinates[0]
        : merged.geometry.coordinates;
    var areaSqM = ol.Sphere.getArea(new ol.geom.Polygon(_mergeCoords)).toFixed(2);
    $('#mergeCalcArea').val(areaSqM);

    // Inherit type/owner from first selected feature
    var firstProps = mergeSelectedFeatures[0].getProperties();
    selectedGeomType = 'Polygon';
    typeofFeatureInModal('mergeTypeofFeatures');
    setTimeout(function () { $('#mergeTypeofFeatures').val(firstProps.type); }, 50);
    $('#mergeOwnerName').val(firstProps.owner_name || '');
    $('#mergeSurveyNumber').val('');
    $('#mergeNameofFeature').val('');

    $('#mergeModal').modal('show');
}

function executeMerge() {
    var type       = $('#mergeTypeofFeatures').val();
    var name       = $('#mergeNameofFeature').val();
    var surveyNum  = $('#mergeSurveyNumber').val();
    var ownerName  = $('#mergeOwnerName').val();

    var ids = mergeSelectedFeatures.map(function (f) { return f.getId(); });

    $.ajax({
        url: 'merge.php',
        type: 'POST',
        data: {
            ids:           ids,
            typeofFeature: type,
            nameofFeature: name,
            surveyNumber:  surveyNum,
            ownerName:     ownerName
        },
        success: function (data) {
            var res = JSON.parse(data);
            if (res.statusCode === 200) {
                showToast('✅ Merged into new parcel #' + res.newId + ' (Area: ' + res.area + ' m²)', 5000);
                $('#mergeModal').modal('hide');
                cancelMergeMode();
                wfsSource.clear();
                wfsSource.refresh();
            } else {
                alert('Merge failed: ' + (res.message || 'Unknown error'));
            }
        },
        error: function () {
            alert('Network error during merge.');
        }
    });
}

// ============================================================
//  SPLIT MODE
// ============================================================
function startSplitMode(feature) {
    if (!feature) feature = currentPopupFeature;
    if (!feature) { showToast('⚠️ No feature selected for split.', 3000); return; }

    var gType = feature.getGeometry().getType();
    if (gType !== 'Polygon' && gType !== 'MultiPolygon') {
        showToast('⚠️ Only polygon features can be split.', 3000);
        return;
    }

    if (isEditOn)  stopEditMode();
    if (isMergeOn) cancelMergeMode();

    overlay.setPosition(undefined);

    isSplitOn = true;
    splitParentFeature = feature;

    document.getElementById('cancelSplitBtn').style.display = 'block';

    showToast('✂️ Split Mode: Draw a line across the polygon to split it. Snapping is active on edges & vertices.', 6000);

    // Build a dedicated snap source from the parent polygon's ring so the
    // split line snaps precisely to the parent boundary vertices/edges.
    var parentSnapSource = new ol.source.Vector();
    var parentClone = splitParentFeature.clone();
    parentSnapSource.addFeature(parentClone);

    // Activate line drawing on the drawSource
    splitDrawInteraction = new ol.interaction.Draw({
        source: drawSource,
        type: 'LineString'
    });
    map.addInteraction(splitDrawInteraction);

    // Add snap interactions:
    // 1. Snap to the parent polygon ring (highest priority — added last = checked first)
    // 2. Snap to all WFS features (catches shared boundaries with neighbours)
    splitSnapInteraction = new ol.interaction.Snap({ source: wfsSource });
    map.addInteraction(splitSnapInteraction);
    var parentSnapInteraction = new ol.interaction.Snap({ source: parentSnapSource });
    map.addInteraction(parentSnapInteraction);
    // Store parent snap so we can remove it with the rest
    splitSnapInteraction._parentSnap = parentSnapInteraction;

    splitDrawInteraction.on('drawend', function (evt) {
        // Remove snap before processing to avoid flicker
        if (splitSnapInteraction) {
            if (splitSnapInteraction._parentSnap) {
                map.removeInteraction(splitSnapInteraction._parentSnap);
            }
            map.removeInteraction(splitSnapInteraction);
            splitSnapInteraction = null;
        }
        map.removeInteraction(splitDrawInteraction);
        splitDrawInteraction = null;
        executeSplit(evt.feature);
    });
}

function executeSplit(lineFeature) {
    var parser = new ol.format.GeoJSON();
    var parentGeoJSON = parser.writeFeatureObject(splitParentFeature);
    var lineGeoJSON   = parser.writeFeatureObject(lineFeature);

    // ── Get the polygon's outer boundary ring ─────────────────────────────────
    var parentBoundary = turf.polygonToLine(parentGeoJSON);
    // polygonToLine returns MultiLineString for polygons with holes — use outer ring only
    if (parentBoundary.geometry.type === 'MultiLineString') {
        parentBoundary = turf.lineString(parentBoundary.geometry.coordinates[0]);
    }

    // ── Extend the split line beyond the boundary (projection-safe) ───────────
    // turf.transformScale() uses turf.destination() internally, which is a
    // geographic function that assumes WGS84 lon/lat. This map uses EPSG:3857
    // (coordinates in meters), so transformScale produces garbage output.
    // We extend the line manually using pure vector arithmetic, which works in
    // any coordinate system without geographic assumptions.
    var extendedLine = (function () {
        var coords = lineGeoJSON.geometry.coordinates;
        var n = coords.length;

        // Compute total line length in map units (metres for EPSG:3857)
        var totalLen = 0;
        for (var li = 0; li < n - 1; li++) {
            var ddx = coords[li + 1][0] - coords[li][0];
            var ddy = coords[li + 1][1] - coords[li][1];
            totalLen += Math.hypot(ddx, ddy);
        }
        // Extend each endpoint by 100% of the total length (safe margin)
        var ext = totalLen;

        // Direction at start (pointing away from line)
        var dxS = coords[0][0] - coords[1][0];
        var dyS = coords[0][1] - coords[1][1];
        var lenS = Math.hypot(dxS, dyS) || 1;

        // Direction at end (pointing away from line)
        var dxE = coords[n - 1][0] - coords[n - 2][0];
        var dyE = coords[n - 1][1] - coords[n - 2][1];
        var lenE = Math.hypot(dxE, dyE) || 1;

        var newStart = [coords[0][0] + (dxS / lenS) * ext,
                        coords[0][1] + (dyS / lenS) * ext];
        var newEnd   = [coords[n - 1][0] + (dxE / lenE) * ext,
                        coords[n - 1][1] + (dyE / lenE) * ext];

        return turf.lineString([newStart].concat(coords.slice(1, -1)).concat([newEnd]));
    }());

    // ── Find where the (extended) split line crosses the boundary ─────────────
    var intersections = turf.lineIntersect(parentBoundary, extendedLine);

    if (!intersections || intersections.features.length < 2) {
        showToast('❌ Split line must cross the polygon boundary on both sides.', 4000);
        drawSource.clear();
        cancelSplitMode();
        return;
    }

    // Use first + last intersection as the two chord endpoints
    // (handles > 2 points from a curved or re-entering line)
    var iCoords = intersections.features.map(function (f) { return f.geometry.coordinates; });
    var ipt1 = iCoords[0];
    var ipt2 = iCoords[iCoords.length - 1];

    // ── Manual arc-assembly (replaces turf.polygonize) ────────────────────────
    // turf.polygonize fails whenever a split-line endpoint coincides with an
    // existing ring vertex (T-intersection vs. clean crossing). We avoid it
    // entirely by directly splitting the ring coordinate array into two arcs
    // and closing each arc into its own polygon — robust for any endpoint position.

    // Ring without the closing duplicate coordinate
    var ringCoords = parentBoundary.geometry.coordinates.slice(0, -1);
    var rn = ringCoords.length;

    // Returns the index of the ring segment [i, i+1 mod n] nearest to point pt
    function findSegIdx(coords, pt) {
        var minD = Infinity, best = 0;
        for (var si = 0; si < coords.length; si++) {
            var a = coords[si], b = coords[(si + 1) % coords.length];
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var lenSq = dx * dx + dy * dy;
            var t = lenSq > 0
                ? Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / lenSq))
                : 0;
            var d = Math.hypot(a[0] + t * dx - pt[0], a[1] + t * dy - pt[1]);
            if (d < minD) { minD = d; best = si; }
        }
        return best;
    }

    var idx1 = findSegIdx(ringCoords, ipt1);
    var idx2 = findSegIdx(ringCoords, ipt2);

    // Canonical order so the "forward" arc always runs idx1 → idx2
    if (idx1 > idx2) {
        var _t = idx1; idx1 = idx2; idx2 = _t;
        var _p = ipt1; ipt1 = ipt2; ipt2 = _p;
    }

    // Forward arc:  ipt1 → ring[idx1+1 .. idx2] → ipt2
    var fwdArc = [ipt1];
    for (var fi = idx1 + 1; fi <= idx2; fi++) { fwdArc.push(ringCoords[fi]); }
    fwdArc.push(ipt2);

    // Backward arc: ipt2 → ring[idx2+1 .. idx1 (wrapping)] → ipt1
    var bwdArc = [ipt2];
    for (var bi = idx2 + 1; bi <= idx1 + rn; bi++) { bwdArc.push(ringCoords[bi % rn]); }
    bwdArc.push(ipt1);

    // Close each arc into a polygon coordinate ring
    var ring1 = fwdArc.concat([ipt1]);   // ipt1 → … → ipt2 → ipt1
    var ring2 = bwdArc.concat([ipt2]);   // ipt2 → … → ipt1 → ipt2

    var childPolygons = [];
    try { childPolygons.push(turf.polygon([ring1])); } catch (e) { console.error('ring1 err:', e); }
    try { childPolygons.push(turf.polygon([ring2])); } catch (e) { console.error('ring2 err:', e); }

    // Keep only polygons whose centroid lies inside the parent
    childPolygons = childPolygons.filter(function (f) {
        try { return turf.booleanPointInPolygon(turf.centroid(f), parentGeoJSON); }
        catch (e) { return false; }
    });

    if (childPolygons.length < 2) {
        showToast('❌ Split produced fewer than 2 polygons. Try a different cut line.', 4000);
        drawSource.clear();
        cancelSplitMode();
        return;
    }

    drawSource.clear();

    // Populate split modal
    var parentProps = splitParentFeature.getProperties();
    var $container  = $('#splitChildrenContainer');
    $container.empty();

    childPolygons.forEach(function (poly, idx) {
        // turf.area() assumes WGS84 degrees — use ol.Sphere.getArea() for EPSG:3857
        var area = ol.Sphere.getArea(new ol.geom.Polygon(poly.geometry.coordinates)).toFixed(2);
        $container.append(
            '<div class="card mb-2 split-child-card" data-idx="' + idx + '">' +
            '  <div class="card-body py-2">' +
            '    <h6 class="card-title mb-1">Child Parcel ' + (idx + 1) + ' <span class="badge badge-info">' + area + ' m²</span></h6>' +
            '    <input type="hidden" class="sc-geom" value=\'' + JSON.stringify(poly.geometry) + '\'>' +
            '    <input type="hidden" class="sc-area" value="' + area + '">' +
            '    <div class="form-group mb-1">' +
            '      <input type="text" class="form-control form-control-sm sc-name" placeholder="Name" value="' + (parentProps.name || '') + ' Part ' + (idx + 1) + '">' +
            '    </div>' +
            '    <div class="form-group mb-1">' +
            '      <input type="text" class="form-control form-control-sm sc-survey" placeholder="Survey Number" value="' + (parentProps.survey_number || '') + '">' +
            '    </div>' +
            '    <div class="form-group mb-0">' +
            '      <input type="text" class="form-control form-control-sm sc-owner" placeholder="Owner Name" value="' + (parentProps.owner_name || '') + '">' +
            '    </div>' +
            '  </div>' +
            '</div>'
        );
    });

    $('#splitModal').modal('show');
}

function confirmSplit() {
    var parentProps = splitParentFeature.getProperties();
    var children = [];

    $('.split-child-card').each(function () {
        children.push({
            geom:         $(this).find('.sc-geom').val(),
            type:         parentProps.type || 'Residential Land',
            name:         $(this).find('.sc-name').val(),
            surveyNumber: $(this).find('.sc-survey').val(),
            ownerName:    $(this).find('.sc-owner').val(),
            area:         $(this).find('.sc-area').val()
        });
    });

    $.ajax({
        url: 'split.php',
        type: 'POST',
        data: {
            parentId: splitParentFeature.getId(),
            children: JSON.stringify(children)
        },
        success: function (data) {
            var res = JSON.parse(data);
            if (res.statusCode === 200) {
                showToast('✅ Parcel split into ' + res.childIds.length + ' child parcels: #' + res.childIds.join(', #'), 5000);
                $('#splitModal').modal('hide');
                cancelSplitMode();
                wfsSource.clear();
                wfsSource.refresh();
            } else {
                alert('Split failed: ' + (res.message || 'Unknown error'));
            }
        },
        error: function () {
            alert('Network error during split.');
        }
    });
}

function cancelSplitMode() {
    isSplitOn = false;
    splitParentFeature = null;

    if (splitSnapInteraction) {
        if (splitSnapInteraction._parentSnap) {
            map.removeInteraction(splitSnapInteraction._parentSnap);
        }
        map.removeInteraction(splitSnapInteraction);
        splitSnapInteraction = null;
    }

    if (splitDrawInteraction) {
        map.removeInteraction(splitDrawInteraction);
        splitDrawInteraction = null;
    }

    drawSource.clear();
    document.getElementById('cancelSplitBtn').style.display = 'none';
}

// ============================================================
//  TOAST NOTIFICATION  (lightweight, no extra dependency)
// ============================================================
function showToast(msg, duration) {
    var toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'app-toast app-toast-show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
        toast.className = 'app-toast';
    }, duration || 3000);
}

// ============================================================
//  HELPER: populate type dropdown in any select element
// ============================================================
function typeofFeatureInModal(selectId) {
    var dropdowntype = document.getElementById(selectId);
    dropdowntype.innerHTML = '';
    var list = PolygonType; // merge/split always polygon
    for (const item of list) {
        var op = document.createElement('option');
        op.value = item;
        op.innerHTML = item;
        dropdowntype.appendChild(op);
    }
}

// ============================================================
//  MAP VIEW & LAYERS
// ============================================================
var mapView = new ol.View({
    center: [8633240.92947555, 1460858.9432369084],
    zoom: 17
});

var baseMap = new ol.layer.Tile({
    source: new ol.source.OSM({ attributions: 'Example Application' })
});

var wfsSource = new ol.source.Vector({
    format: new ol.format.GeoJSON(),
    url: function (extent) {
        return 'http://localhost:8080/geoserver/example_app/wfs?service=WFS&' +
            'version=1.1.0&request=GetFeature&typename=example_app:featuresdrawn&' +
            'outputFormat=application/json&srsname=EPSG:3857&' +
            'bbox=' + extent.join(',') + ',EPSG:3857';
    },
    strategy: ol.loadingstrategy.bbox
});

// ============================================================
//  WFS STYLE  – colour-coded by parcel_status
// ============================================================
var wfsStyle = function (feature) {
    var type   = feature.getGeometry().getType();
    var status = feature.get('parcel_status') || 'active';

    if (type === 'Point' || type === 'MultiPoint') {
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 5,
                fill:   new ol.style.Fill({ color: 'red' }),
                stroke: new ol.style.Stroke({ color: 'white', width: 2 })
            })
        });
    }

    if (type === 'LineString' || type === 'MultiLineString') {
        return new ol.style.Style({
            stroke: new ol.style.Stroke({ color: 'green', width: 3 })
        });
    }

    // ---------- Polygon styling by status ----------
    var fillColor, strokeColor, lineDash;

    if (status === 'merged') {
        // Archived (was merged into another): grey hatched
        fillColor   = 'rgba(150,150,150,0.35)';
        strokeColor = '#888888';
        lineDash    = [10, 6];
    } else if (status === 'split') {
        // Archived (was split into children): orange hatched
        fillColor   = 'rgba(255,140,0,0.25)';
        strokeColor = '#ff8c00';
        lineDash    = [10, 6];
    } else {
        // Active parcel: blue
        fillColor   = 'rgba(0,0,255,0.15)';
        strokeColor = '#0000cc';
        lineDash    = null;
    }

    return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: strokeColor, width: 2, lineDash: lineDash }),
        fill:   new ol.style.Fill({ color: fillColor })
    });
};

var wfsLayer = new ol.layer.Vector({ source: wfsSource, style: wfsStyle });

var drawSource = new ol.source.Vector();
var drawLayer  = new ol.layer.Vector({ source: drawSource });

var layerArray = [baseMap, wfsLayer, drawLayer];

// ============================================================
//  POPUP
// ============================================================
var container = document.getElementById('popup');
var content   = document.getElementById('popup-content');
var closer    = document.getElementById('popup-closer');

var overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: { duration: 250 }
});

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

// ============================================================
//  MAP
// ============================================================
var map = new ol.Map({
    controls: ol.control.defaults({ attributionOptions: { collapsible: false } })
               .extend([new app.DrawingApp()]),
    target: 'map',
    view:   mapView,
    layers: layerArray,
    overlays: [overlay]
});

// ============================================================
//  CLICK HANDLER – Popup
// ============================================================
map.on('singleclick', function (evt) {
    if (isDrawOn || isEditOn || isSplitOn) return;

    // In merge mode: clicks are handled by the Select interaction; don't show popup
    if (isMergeOn) return;

    var feature = map.forEachFeatureAtPixel(evt.pixel, function (f) { return f; });

    if (feature) {
        currentPopupFeature = feature;
        var props  = feature.getProperties();
        var status = props.parcel_status || 'active';

        // Status badge
        var badgeClass = status === 'active' ? 'badge-success' : (status === 'merged' ? 'badge-secondary' : 'badge-warning');
        var html = '<h6 class="mb-1">Parcel Info ' +
                   '<span class="badge ' + badgeClass + '">' + status.toUpperCase() + '</span></h6>';

        html += '<table class="table table-sm table-borderless mb-1">';
        html += '<tr><th>Type</th><td>'        + (props.type          || 'N/A') + '</td></tr>';
        html += '<tr><th>Name</th><td>'        + (props.name          || 'N/A') + '</td></tr>';
        html += '<tr><th>Survey No.</th><td>'  + (props.survey_number || 'N/A') + '</td></tr>';
        html += '<tr><th>Owner</th><td>'       + (props.owner_name    || 'N/A') + '</td></tr>';
        html += '<tr><th>Area</th><td>'        + (props.area          || 'N/A') + ' m²</td></tr>';

        // Lineage info
        if (props.parent_id) {
            html += '<tr><th>Parent</th><td><em>#' + props.parent_id + '</em></td></tr>';
        }
        if (props.operation_note) {
            html += '<tr><th>History</th><td><small>' + props.operation_note + '</small></td></tr>';
        }
        html += '</table>';

        // Action buttons (only for active parcels allow edit/split; merged/split parcels are read-only)
        html += '<div class="btn-group btn-group-sm mt-1 flex-wrap" role="group">';
        html += '<button class="btn btn-primary btn-sm mr-1 mb-1" onclick="startEditMode()"><i class="fas fa-edit"></i> Edit</button>';
        if (status === 'active') {
            html += '<button class="btn btn-warning btn-sm mr-1 mb-1" onclick="startMergeModeFromPopup()"><i class="fas fa-object-group"></i> Merge</button>';
            var gType = feature.getGeometry().getType();
            if (gType === 'Polygon' || gType === 'MultiPolygon') {
                html += '<button class="btn btn-danger btn-sm mb-1" onclick="startSplitMode()"><i class="fas fa-cut"></i> Split</button>';
            }
        }
        html += '</div>';

        content.innerHTML = html;
        overlay.setPosition(evt.coordinate);
    } else {
        currentPopupFeature = null;
        overlay.setPosition(undefined);
    }
});

// Starts merge mode and pre-selects the popup feature
function startMergeModeFromPopup() {
    var feature = currentPopupFeature;
    overlay.setPosition(undefined);
    startMergeMode();
    // After a tick, add the clicked feature to merge selection
    setTimeout(function () {
        if (feature && mergeSelectInteraction) {
            mergeSelectedFeatures.push(feature);
            mergeSelectInteraction.getFeatures().push(feature);
            showToast('1 polygon pre-selected. Click more to add.', 3000);
        }
    }, 100);
}

// ============================================================
//  DRAW
// ============================================================
function startDraw(geomType) {
    selectedGeomType = geomType;

    draw = new ol.interaction.Draw({ type: geomType, source: drawSource });
    snap = new ol.interaction.Snap({ source: wfsSource });

    $('#startDrawModal').modal('hide');
    map.addInteraction(draw);
    map.addInteraction(snap);
    isDrawOn = true;
    document.getElementById('drawbtn').innerHTML = '<i class="far fa-stop-circle"></i>';

    draw.on('drawend', function (evt) {
        var feature  = evt.feature;
        var geometry = feature.getGeometry();

        if (geomType === 'Polygon') {
            var parser   = new ol.format.GeoJSON();
            var drawnGJ  = parser.writeFeatureObject(feature);
            var features = wfsSource.getFeatures();
            var isOverlap = false;

            for (const existing of features) {
                var gType = existing.getGeometry().getType();
                if (gType === 'Polygon' || gType === 'MultiPolygon') {
                    if ((existing.get('parcel_status') || 'active') !== 'active') continue; // skip archived
                    var existGJ = parser.writeFeatureObject(existing);
                    try {
                        var ix = turf.intersect(drawnGJ, existGJ);
                        if (ix && ix.geometry) {
                            var ixType = ix.geometry.type;
                            if (ixType === 'Polygon' || ixType === 'MultiPolygon') {
                                isOverlap = true;
                                break;
                            }
                        }
                    } catch (err) { console.error('Turf intersect error:', err); }
                }
            }

            if (isOverlap) {
                alert('Topology Error: Feature overlaps with an existing active feature!');
                setTimeout(function () { drawSource.clear(); }, 100);
                map.removeInteraction(draw);
                map.removeInteraction(snap);
                isDrawOn = false;
                document.getElementById('drawbtn').innerHTML = '<i class="fas fa-pencil-ruler"></i>';
                return;
            }
        }

        var area = 0;
        if (geomType === 'Polygon') area = ol.Sphere.getArea(geometry);

        map.removeInteraction(draw);
        map.removeInteraction(snap);
        isDrawOn = false;
        document.getElementById('drawbtn').innerHTML = '<i class="fas fa-pencil-ruler"></i>';

        selectedGeomType = geomType;
        typeofFeature();
        $('#savebtn').show();
        $('#updatebtn').hide();
        $('#calcArea').val(area.toFixed(2));
        $('#enterInformationModal').modal('show');
    });
}

// ============================================================
//  TYPE DROPDOWNS
// ============================================================
function typeofFeature() {
    var dd = document.getElementById('typeofFeatures');
    dd.innerHTML = '';
    var list = selectedGeomType === 'Point' ? PointType
             : selectedGeomType === 'LineString' ? LineType
             : PolygonType;
    for (var i = 0; i < list.length; i++) {
        var op = document.createElement('option');
        op.value = list[i];
        op.innerHTML = list[i];
        dd.appendChild(op);
    }
}

// ============================================================
//  SAVE TO DB
// ============================================================
function savetodb() {
    var features    = drawSource.getFeatures();
    var geoJSONfmt  = new ol.format.GeoJSON();
    var featuresObj = geoJSONfmt.writeFeaturesObject(features);

    featuresObj.features.forEach(function (element) {
        var type        = document.getElementById('typeofFeatures').value;
        var name        = document.getElementById('nameofFeatures').value;
        var surveyNum   = document.getElementById('surveyNumber').value;
        var ownerName   = document.getElementById('ownerName').value;
        var area        = document.getElementById('calcArea').value;
        var geomstring  = JSON.stringify(element.geometry);

        if (type !== '') {
            $.ajax({
                url: 'save.php',
                type: 'POST',
                data: { typeofFeature: type, nameofFeature: name, geom: geomstring, surveyNumber: surveyNum, ownerName: ownerName, area: area },
                success: function (dataResult) {
                    var res = JSON.parse(dataResult);
                    if (res.statusCode === 200) {
                        showToast('✅ Feature saved successfully!', 3000);
                        wfsSource.clear();
                        wfsSource.refresh();
                    } else {
                        alert('Error saving feature.');
                    }
                }
            });
        } else {
            alert('Please select a feature type.');
        }
    });

    $('#enterInformationModal').modal('hide');
    clearDrawSource();
}

// ============================================================
//  UPDATE TO DB
// ============================================================
function updatetodb() {
    if (!selectedFeature) { alert('No feature selected'); return; }

    var type       = document.getElementById('typeofFeatures').value;
    var name       = document.getElementById('nameofFeatures').value;
    var surveyNum  = document.getElementById('surveyNumber').value;
    var ownerName  = document.getElementById('ownerName').value;
    var area       = document.getElementById('calcArea').value;

    var fmt       = new ol.format.GeoJSON();
    var geomstring = fmt.writeGeometry(selectedFeature.getGeometry());

    if (type !== '') {
        $.ajax({
            url: 'update.php',
            type: 'POST',
            data: {
                id:           selectedFeature.getId(),
                typeofFeature: type,
                nameofFeature: name,
                geom:         geomstring,
                surveyNumber: surveyNum,
                ownerName:    ownerName,
                area:         area
            },
            success: function (dataResult) {
                var res = JSON.parse(dataResult);
                if (res.statusCode === 200) {
                    showToast('✅ Feature updated successfully!', 3000);
                    wfsSource.clear();
                    wfsSource.refresh();
                    select.getFeatures().clear();
                    $('#enterInformationModal').modal('hide');
                    clearDrawSource();
                } else {
                    alert('Error updating feature.');
                }
            }
        });
    } else {
        alert('Please select a feature type.');
    }
}

// ============================================================
//  CLEAR
// ============================================================
function clearDrawSource() {
    drawSource.clear();
    document.getElementById('nameofFeatures').value  = '';
    document.getElementById('surveyNumber').value    = '';
    document.getElementById('ownerName').value       = '';
    document.getElementById('calcArea').value        = '';
    $('#savebtn').show();
    $('#updatebtn').hide();
}
