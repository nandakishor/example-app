// ================================================================
//  cadastral.js  –  Cadastral & Land Registry Module
//  Hooks into the global `map`, `wfsSource`, `wfsLayer` objects
//  exposed by main.js. Loaded AFTER main.js.
//  Does NOT modify or remove any existing functionality.
// ================================================================

/* ---------------------------------------------------------------
   Wait for main.js to finish initialising the map
--------------------------------------------------------------- */
(function waitForMap() {
    if (typeof map === 'undefined' || !map) {
        return setTimeout(waitForMap, 100);
    }
    cadastralInit();
})();

function cadastralInit() {

    // ============================================================
    //  §1  SIDEBAR TOGGLE
    // ============================================================
    var sidebar      = document.getElementById('cadastralSidebar');
    var toggleBtn    = document.getElementById('sidebarToggleBtn');
    var sidebarOpen  = true;   // open by default on desktop

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function () {
            sidebarOpen = !sidebarOpen;
            if (sidebarOpen) {
                sidebar.classList.remove('sidebar-hidden');
                toggleBtn.setAttribute('title', 'Hide sidebar');
            } else {
                sidebar.classList.add('sidebar-hidden');
                toggleBtn.setAttribute('title', 'Show sidebar');
            }
            // Force OL to recalculate map size after CSS transition (310ms)
            setTimeout(function () { map.updateSize(); }, 320);
        });
    }

    // Collapse individual sidebar sections
    document.querySelectorAll('.sidebar-section-header[data-target]').forEach(function (hdr) {
        hdr.addEventListener('click', function () {
            var target = document.getElementById(hdr.dataset.target);
            if (!target) return;
            var isCollapsed = target.style.display === 'none';
            target.style.display = isCollapsed ? '' : 'none';
            hdr.classList.toggle('collapsed', !isCollapsed);
        });
    });

    // ============================================================
    //  §2  SEARCH & FILTER
    // ============================================================
    var highlightSource = new ol.source.Vector();
    var highlightLayer  = new ol.layer.Vector({
        source: highlightSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#f57f17', width: 3 }),
            fill:   new ol.style.Fill({ color: 'rgba(245,127,23,0.18)' }),
            image:  new ol.style.Circle({
                radius: 8,
                stroke: new ol.style.Stroke({ color: '#f57f17', width: 2 }),
                fill:   new ol.style.Fill({ color: 'rgba(245,127,23,0.3)' })
            })
        }),
        zIndex: 999
    });
    map.addLayer(highlightLayer);

    window.searchParcels = function () {
        var surveyQ  = ($('#searchSurveyNo').val()  || '').trim().toLowerCase();
        var stateQ   = ($('#searchState').val()     || '').trim().toLowerCase();
        var districtQ= ($('#searchDistrict').val()  || '').trim().toLowerCase();
        var pincodeQ = ($('#searchPincode').val()   || '').trim().toLowerCase();
        var zoneQ    = ($('#searchLandZone').val()  || '').trim().toLowerCase();
        var statusQ  = ($('#searchStatus').val()    || '').trim().toLowerCase();

        var features = wfsSource.getFeatures();
        var matches  = features.filter(function (f) {
            var p = f.getProperties();
            if (surveyQ   && !(p.survey_number || '').toLowerCase().includes(surveyQ))  return false;
            if (stateQ    && stateQ !== 'all'    && !(p.state    || '').toLowerCase().includes(stateQ))    return false;
            if (districtQ && districtQ !== 'all' && !(p.district || '').toLowerCase().includes(districtQ)) return false;
            if (pincodeQ  && pincodeQ !== 'all'  && !(p.pincode  || '').toLowerCase().includes(pincodeQ))  return false;
            if (zoneQ     && zoneQ !== 'all'     && !(p.type     || '').toLowerCase().includes(zoneQ))     return false;
            if (statusQ   && statusQ !== 'all'   && (p.parcel_status || 'active') !== statusQ)             return false;
            return true;
        });

        highlightSource.clear();

        var badge = document.getElementById('searchResultsBadge');
        if (matches.length === 0) {
            if (badge) { badge.style.display = 'block'; badge.innerHTML = '<span class="badge badge-warning">No parcels found</span>'; }
            showToast('🔍 No matching parcels found.', 3000);
            return;
        }

        matches.forEach(function (f) { highlightSource.addFeature(f.clone()); });

        if (badge) {
            badge.style.display = 'block';
            badge.innerHTML = '<span class="badge badge-success">' + matches.length + ' parcel(s) found</span>';
        }

        var extent = highlightSource.getExtent();
        if (extent && !ol.extent.isEmpty(extent)) {
            map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 19, duration: 600 });
        }

        populateParcelCard(matches[0]);
        showToast('🔍 Found ' + matches.length + ' parcel(s). Showing highlights.', 3000);
    };

    window.clearSearch = function () {
        $('#searchSurveyNo').val('');
        $('#searchState').val('all');
        $('#searchDistrict').val('all').prop('disabled', true);
        $('#searchPincode').val('all').prop('disabled', true);
        $('#searchLandZone').val('all');
        $('#searchStatus').val('all');
        highlightSource.clear();
        var badge = document.getElementById('searchResultsBadge');
        if (badge) { badge.style.display = 'none'; }
        hideParcelCard();
        showToast('Search cleared.', 2000);
    };

    // ============================================================
    //  §3  SELECTED PARCEL CARD
    // ============================================================
    function populateParcelCard(feature) {
        if (!feature) return;
        var p      = feature.getProperties();
        var status = p.parcel_status || 'active';

        var statusClass = status === 'active' ? 'status-active'
                        : status === 'merged' ? 'status-merged'
                        : 'status-split';

        var rows = [
            ['ID',         feature.getId() || p.fid || 'N/A'],
            ['Type',       p.type          || 'N/A'],
            ['Name',       p.name          || 'N/A'],
            ['Survey No.', p.survey_number || 'N/A'],
            ['Owner',      p.owner_name    || 'N/A'],
            ['Area',       p.area ? p.area + ' m²' : 'N/A'],
            ['District',   p.district      || 'N/A'],
            ['Status',     status]
        ];
        if (p.parent_id)      rows.push(['Parent ID',    '#' + p.parent_id]);
        if (p.operation_note) rows.push(['History',      p.operation_note]);

        var tableHtml = rows.map(function (r) {
            return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>';
        }).join('');

        document.getElementById('parcelCardStatusBadge').className = 'parcel-status-badge ' + statusClass;
        document.getElementById('parcelCardStatusBadge').textContent = status.toUpperCase();
        document.getElementById('parcelCardTableBody').innerHTML = tableHtml;

        // Store feature for action buttons
        window._selectedCardFeature = feature;

        var card = document.getElementById('parcelSummaryCard');
        if (card) card.classList.add('visible');
    }

    window.populateParcelCard = populateParcelCard;

    function hideParcelCard() {
        var card = document.getElementById('parcelSummaryCard');
        if (card) card.classList.remove('visible');
        window._selectedCardFeature = null;
    }

    // Secondary singleclick listener — populates parcel card when user clicks map
    // (OL supports multiple listeners on the same event)
    map.on('singleclick', function (evt) {
        if (typeof isDrawOn  !== 'undefined' && isDrawOn)  return;
        if (typeof isEditOn  !== 'undefined' && isEditOn)  return;
        if (typeof isMergeOn !== 'undefined' && isMergeOn) return;
        if (typeof isSplitOn !== 'undefined' && isSplitOn) return;

        var feature = map.forEachFeatureAtPixel(evt.pixel, function (f) { return f; });
        if (feature) {
            populateParcelCard(feature);
        } else {
            hideParcelCard();
        }
    });

    // Action buttons inside parcel card
    window.parcelCardEdit = function () {
        if (window._selectedCardFeature) {
            // Mirror popup selection then call main.js startEditMode
            currentPopupFeature = window._selectedCardFeature;
            startEditMode();
        }
    };
    window.parcelCardSplit = function () {
        if (window._selectedCardFeature) {
            currentPopupFeature = window._selectedCardFeature;
            startSplitMode();
        }
    };
    window.parcelCardMerge = function () {
        if (window._selectedCardFeature) {
            currentPopupFeature = window._selectedCardFeature;
            startMergeModeFromPopup();
        }
    };
    window.parcelCardDispute = function () {
        openDisputeModal(window._selectedCardFeature);
    };

    // ============================================================
    //  §4  CADASTRAL NAV – wire nav links to existing functions
    // ============================================================
    // These are handled via onclick="" in the HTML for simplicity.
    // See §9 for Boundary Dispute which has its own modal.

    // Survey Plan: open print preview
    window.cadastralSurveyPlan = function () {
        showToast('📄 Opening print preview for Survey Plan…', 2000);
        setTimeout(function () { window.print(); }, 500);
    };

    // Boundary Adjustment → open real modal and pre-populate parcel
    window.cadastralBoundaryAdj = function () {
        var f = window._selectedCardFeature || null;
        if (f) {
            var p  = f.getProperties();
            var fid = f.getId() || p.fid || '';
            document.getElementById('adjParcelId').value      = fid;
            document.getElementById('adjParcelDisplay').value =
                (p.survey_number || fid || '–') + (p.name ? ' – ' + p.name : '');
        } else {
            document.getElementById('adjParcelId').value      = '';
            document.getElementById('adjParcelDisplay').value = '';
        }
        document.getElementById('adjReason').value      = '';
        document.getElementById('adjSurveyorRef').value = '';
        document.getElementById('adjSurveyorDate').value= '';
        document.getElementById('adjNotes').value       = '';
        var msg = document.getElementById('adjSubmitMsg');
        if (msg) { msg.style.display = 'none'; msg.innerHTML = ''; }
        $('#boundaryAdjModal').modal('show');
    };

    // Coordinates Update → open real modal
    window.cadastralCoordsUpdate = function () {
        var f = window._selectedCardFeature || null;
        if (f) {
            var p   = f.getProperties();
            var fid = f.getId() || p.fid || '';
            document.getElementById('coordsParcelId').value      = fid;
            document.getElementById('coordsParcelDisplay').value =
                (p.survey_number || fid || '–') + (p.name ? ' – ' + p.name : '');
        } else {
            document.getElementById('coordsParcelId').value      = '';
            document.getElementById('coordsParcelDisplay').value = '';
        }
        document.getElementById('coordsGpsSource').value  = '';
        document.getElementById('coordsSurveyDate').value = '';
        document.getElementById('coordsAccuracy').value   = '';
        document.getElementById('coordsGeoJSON').value    = '';
        document.getElementById('coordsNotes').value      = '';
        var msg = document.getElementById('coordsSubmitMsg');
        if (msg) { msg.style.display = 'none'; msg.innerHTML = ''; }
        $('#coordsUpdateModal').modal('show');
    };

    // ============================================================
    //  §5  SATELLITE BASEMAP TOGGLE
    // ============================================================
    var satelliteLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: 'Tiles © Esri'
        }),
        visible: false,
        zIndex: 0
    });
    map.getLayers().insertAt(0, satelliteLayer);

    var isSatOn = false;
    window.toggleSatellite = function () {
        isSatOn = !isSatOn;
        satelliteLayer.setVisible(isSatOn);
        // Hide/show the OSM base layer (index 1 after satellite was inserted at 0)
        map.getLayers().forEach(function (lyr) {
            if (lyr instanceof ol.layer.Tile && lyr.getSource() instanceof ol.source.OSM) {
                lyr.setVisible(!isSatOn);
            }
        });
        var btn = document.getElementById('sateliteToggleBtn');
        if (btn) btn.classList.toggle('sat-active', isSatOn);
        showToast(isSatOn ? '🛰️ Satellite View ON' : '🗺️ Map View ON', 2000);
    };

    // ============================================================
    //  §6  MEASURE TOOL
    // ============================================================
    var measureDraw       = null;
    var measureTooltipEl  = null;
    var measureTooltipOL  = null;
    var isMeasureOn       = false;
    var activeMeasureType = null;  // 'area' | 'dist'
    var measureGeom       = null;

    function createMeasureTooltip() {
        if (measureTooltipEl) {
            measureTooltipEl.parentNode && measureTooltipEl.parentNode.removeChild(measureTooltipEl);
        }
        measureTooltipEl = document.createElement('div');
        measureTooltipEl.className = 'measure-tooltip';
        measureTooltipEl.textContent = '';
        measureTooltipOL = new ol.Overlay({
            element:    measureTooltipEl,
            offset:     [0, -15],
            positioning:'bottom-center',
            stopEvent:  false
        });
        map.addOverlay(measureTooltipOL);
    }

    function removeMeasureTooltip() {
        if (measureTooltipOL) {
            map.removeOverlay(measureTooltipOL);
            measureTooltipOL = null;
        }
        measureTooltipEl = null;
    }

    function startMeasure(type) {
        if (isMeasureOn) cancelMeasure();
        // Don't start if other modes are active
        if (typeof isDrawOn !== 'undefined' && isDrawOn) {
            showToast('⚠️ Stop Draw mode before measuring.', 3000); return;
        }

        isMeasureOn       = true;
        activeMeasureType = type;
        var geomType = (type === 'area') ? 'Polygon' : 'LineString';

        measureDraw = new ol.interaction.Draw({ source: new ol.source.Vector(), type: geomType });
        map.addInteraction(measureDraw);
        createMeasureTooltip();

        document.getElementById('cancelMeasureBtn').style.display = 'block';
        document.getElementById('measureAreaBtn').classList.toggle('measure-active', type === 'area');
        document.getElementById('measureDistBtn').classList.toggle('measure-active', type === 'dist');

        showToast((type === 'area' ? '📐 Area Measure: Click to draw a polygon. Double-click to finish.'
                                   : '📏 Distance Measure: Click to draw a line. Double-click to finish.'), 5000);

        // Live tooltip on pointermove during sketch
        var pointerHandler = map.on('pointermove', function (evt) {
            if (!measureGeom) return;
            var val = '';
            var coord = evt.coordinate;
            if (activeMeasureType === 'area') {
                var area = ol.Sphere.getArea(measureGeom);
                val = area >= 10000
                    ? (area / 10000).toFixed(2) + ' ha'
                    : area.toFixed(1) + ' m²';
                coord = measureGeom.getInteriorPoint().getCoordinates();
            } else {
                var length = ol.Sphere.getLength(measureGeom);
                val = length >= 1000
                    ? (length / 1000).toFixed(2) + ' km'
                    : length.toFixed(1) + ' m';
                var coords = measureGeom.getCoordinates();
                coord = coords[coords.length - 1];
            }
            measureTooltipEl.textContent = val;
            measureTooltipOL.setPosition(coord);
        });

        measureDraw.on('drawstart', function (evt) {
            measureGeom = evt.feature.getGeometry();
        });

        measureDraw.on('drawend', function () {
            var val = '';
            if (activeMeasureType === 'area') {
                var area = ol.Sphere.getArea(measureGeom);
                val = area >= 10000
                    ? (area / 10000).toFixed(3) + ' ha'
                    : area.toFixed(2) + ' m²';
            } else {
                var length = ol.Sphere.getLength(measureGeom);
                val = length >= 1000
                    ? (length / 1000).toFixed(3) + ' km'
                    : length.toFixed(2) + ' m';
            }
            measureTooltipEl.textContent = '✅ ' + val;
            ol.Observable.unByKey(pointerHandler);
            // Clean up draw interaction but keep tooltip visible briefly
            map.removeInteraction(measureDraw);
            measureDraw = null;
            isMeasureOn = false;
            measureGeom = null;
            document.getElementById('cancelMeasureBtn').style.display = 'none';
            document.getElementById('measureAreaBtn').classList.remove('measure-active');
            document.getElementById('measureDistBtn').classList.remove('measure-active');
            showToast('Measurement complete: ' + val, 4000);
            // Auto-remove tooltip after 8 s
            setTimeout(function () { removeMeasureTooltip(); }, 8000);
        });
    }

    window.startMeasureArea = function () { startMeasure('area'); };
    window.startMeasureDist = function () { startMeasure('dist'); };

    window.cancelMeasure = function () {
        if (measureDraw) { map.removeInteraction(measureDraw); measureDraw = null; }
        removeMeasureTooltip();
        isMeasureOn       = false;
        activeMeasureType = null;
        measureGeom       = null;
        document.getElementById('cancelMeasureBtn').style.display = 'none';
        document.getElementById('measureAreaBtn').classList.remove('measure-active');
        document.getElementById('measureDistBtn').classList.remove('measure-active');
    };

    // ============================================================
    //  §7  COORDINATE / SCALE HUD
    // ============================================================
    var lonEl  = document.getElementById('hudLon');
    var latEl  = document.getElementById('hudLat');
    var zoomEl = document.getElementById('hudZoom');

    // Initial zoom
    if (zoomEl) zoomEl.textContent = map.getView().getZoom().toFixed(1);

    map.on('pointermove', function (evt) {
        if (evt.dragging) return;
        var lonLat = ol.proj.toLonLat(evt.coordinate);
        if (lonEl) lonEl.textContent = lonLat[0].toFixed(6);
        if (latEl) latEl.textContent = lonLat[1].toFixed(6);
    });

    map.getView().on('change:resolution', function () {
        if (zoomEl) zoomEl.textContent = map.getView().getZoom().toFixed(1);
    });

    // ============================================================
    //  §8  MAP LEGEND TOGGLE
    // ============================================================
    var legendToggleBtn = document.getElementById('legendToggleBtn');
    var legendBody      = document.getElementById('legendBody');
    if (legendToggleBtn && legendBody) {
        legendToggleBtn.addEventListener('click', function () {
            var collapsed = legendBody.style.display === 'none';
            legendBody.style.display = collapsed ? '' : 'none';
            legendToggleBtn.classList.toggle('collapsed', !collapsed);
        });
    }

    // ============================================================
    //  §9  BOUNDARY DISPUTE COMPONENT
    // ============================================================
    window.openDisputeModal = function (feature) {
        $('#boundaryDisputeModal').modal('show');
        // Render after modal transition
        setTimeout(function () {
            renderDisputeDiagram(feature || null);
        }, 350);
    };

    function renderDisputeDiagram(feature) {
        var canvas = document.getElementById('disputeCanvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');

        // Fit canvas to its CSS display size
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        var W = canvas.width, H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = '#f9fbe7';
        ctx.fillRect(0, 0, W, H);

        // Grid lines (subtle)
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth   = 0.5;
        for (var gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
        for (var gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

        // ── Parcel A (Legal Boundary) ──────────────────────────────
        var parcelA = [
            [W * 0.08, H * 0.15],
            [W * 0.55, H * 0.15],
            [W * 0.55, H * 0.82],
            [W * 0.08, H * 0.82]
        ];
        drawPolygon(ctx, parcelA, 'rgba(25,118,210,0.12)', '#1976d2', 2, null);

        // ── Parcel B (Claimed Boundary) ────────────────────────────
        var parcelB = [
            [W * 0.42, H * 0.15],
            [W * 0.90, H * 0.15],
            [W * 0.90, H * 0.82],
            [W * 0.42, H * 0.82]
        ];
        drawPolygon(ctx, parcelB, 'rgba(198,40,40,0.07)', '#c62828', 2, [8, 6]);

        // ── Encroached Overlap ─────────────────────────────────────
        var overlap = [
            [W * 0.42, H * 0.15],
            [W * 0.55, H * 0.15],
            [W * 0.55, H * 0.82],
            [W * 0.42, H * 0.82]
        ];
        drawPolygon(ctx, overlap, 'rgba(198,40,40,0.35)', '#c62828', 1.5, null);

        // ── Overlap label ──────────────────────────────────────────
        ctx.save();
        ctx.fillStyle    = '#b71c1c';
        ctx.font         = 'bold 10px Inter, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        var ovX = (W * 0.42 + W * 0.55) / 2;
        ctx.translate(ovX, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('ENCROACHED', 0, 0);
        ctx.restore();

        // ── North Arrow ────────────────────────────────────────────
        drawNorthArrow(ctx, W - 30, 30, 18);

        // ── Labels ────────────────────────────────────────────────
        ctx.fillStyle    = '#1565c0';
        ctx.font         = 'bold 11px Inter, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('PARCEL A', W * 0.26, H * 0.12);

        ctx.fillStyle    = '#c62828';
        ctx.fillText('PARCEL B', W * 0.73, H * 0.12);

        // ── Survey dimension labels ────────────────────────────────
        drawDimLine(ctx, W * 0.08, H * 0.88, W * 0.42, H * 0.88, '42 m', '#546e7a');
        drawDimLine(ctx, W * 0.42, H * 0.88, W * 0.55, H * 0.88, '13 m', '#b71c1c');
        drawDimLine(ctx, W * 0.55, H * 0.88, W * 0.90, H * 0.88, '35 m', '#546e7a');

        // ── If a real feature is selected, overlay its ID ──────────
        if (feature) {
            var pid = feature.getId() || (feature.getProperties().fid || '');
            ctx.fillStyle    = 'rgba(0,0,0,0.5)';
            ctx.font         = '9px Inter, sans-serif';
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('Selected feature: ' + pid, 6, 6);
        }
    }

    function drawPolygon(ctx, pts, fill, stroke, lineWidth, dash) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.setLineDash(dash || []);
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = lineWidth;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawNorthArrow(ctx, x, y, r) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r * 0.4, r * 0.6); ctx.lineTo(0, r * 0.3); ctx.closePath();
        ctx.fillStyle = '#37474f'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(-r * 0.4, r * 0.6); ctx.lineTo(0, r * 0.3); ctx.closePath();
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#37474f'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = '#37474f'; ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('N', 0, r * 0.7);
        ctx.restore();
    }

    function drawDimLine(ctx, x1, y, x2, _y2, label, color) {
        var mid = (x1 + x2) / 2;
        var tickH = 5;
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1, y - tickH); ctx.lineTo(x1, y + tickH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y - tickH); ctx.lineTo(x2, y + tickH); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1, y);
        // Arrow left
        ctx.lineTo(x1 + 6, y - 3); ctx.moveTo(x1, y); ctx.lineTo(x1 + 6, y + 3);
        ctx.moveTo(x1, y); ctx.lineTo(x2, y);
        ctx.moveTo(x2, y); ctx.lineTo(x2 - 6, y - 3); ctx.moveTo(x2, y); ctx.lineTo(x2 - 6, y + 3);
        ctx.stroke();
        ctx.fillStyle = color; ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(label, mid, y - 2);
    }

    // Evidence checklist interactive
    document.querySelectorAll('.evidence-check').forEach(function (chk) {
        chk.addEventListener('change', function () {
            var lbl = this.closest('li').querySelector('.evidence-label');
            if (lbl) lbl.classList.toggle('checked-item', this.checked);
        });
    });

    // File upload list
    var evidenceFileInput = document.getElementById('evidenceFileInput');
    if (evidenceFileInput) {
        evidenceFileInput.addEventListener('change', function () {
            var list = document.getElementById('uploadFileList');
            if (!list) return;
            list.innerHTML = '';
            Array.from(this.files).forEach(function (f) {
                var li = document.createElement('li');
                li.innerHTML = '<i class="fas fa-file-alt"></i> ' + f.name + ' <small class="text-muted">(' + (f.size / 1024).toFixed(1) + ' KB)</small>';
                list.appendChild(li);
            });
        });
    }

    // Drop zone click → file input
    var dropZone = document.getElementById('evidenceDropZone');
    if (dropZone && evidenceFileInput) {
        dropZone.addEventListener('click', function () { evidenceFileInput.click(); });
        dropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropZone.style.borderColor = '#1976d2';
            dropZone.style.background  = '#e3f2fd';
        });
        dropZone.addEventListener('dragleave', function () {
            dropZone.style.borderColor = '';
            dropZone.style.background  = '';
        });
        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            dropZone.style.borderColor = '';
            dropZone.style.background  = '';
            evidenceFileInput.files    = e.dataTransfer.files;
            evidenceFileInput.dispatchEvent(new Event('change'));
        });
    }

}  // end cadastralInit

// ============================================================
//  §10  DYNAMIC DROPDOWN LOADER  (pincode_master → State / District / Pincode)
// ============================================================
(function loadFilterOptions() {
    // Helper: populate a <select> from an array of string values
    function populateSelect(sel, values, allLabel, placeholder) {
        sel.innerHTML = '';
        var allOpt = document.createElement('option');
        allOpt.value       = 'all';
        allOpt.textContent = allLabel;
        sel.appendChild(allOpt);
        values.forEach(function (v) {
            var opt = document.createElement('option');
            opt.value       = v;
            opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.disabled = false;
    }

    var stateEl    = document.getElementById('searchState');
    var districtEl = document.getElementById('searchDistrict');
    var pincodeEl  = document.getElementById('searchPincode');

    if (!stateEl) return;

    // ── Load states on page ready ────────────────────────────────────────────
    fetch('get_filter_options.php?type=states')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.status === 'ok') {
                populateSelect(stateEl, data.data, 'All States');
            } else {
                stateEl.innerHTML = '<option value="all">All States</option>';
                stateEl.disabled  = false;
            }
        })
        .catch(function () {
            stateEl.innerHTML = '<option value="all">All States</option>';
            stateEl.disabled  = false;
        });

    // ── State → District cascade ─────────────────────────────────────────────
    stateEl.addEventListener('change', function () {
        var state = stateEl.value;
        districtEl.innerHTML = '<option value="all">Loading…</option>';
        districtEl.disabled  = true;
        pincodeEl.innerHTML  = '<option value="all">Select a district first</option>';
        pincodeEl.disabled   = true;

        if (!state || state === 'all') {
            districtEl.innerHTML = '<option value="all">All Districts</option>';
            districtEl.disabled  = false;
            return;
        }

        fetch('get_filter_options.php?type=districts&state=' + encodeURIComponent(state))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.status === 'ok') {
                    populateSelect(districtEl, data.data, 'All Districts');
                } else {
                    districtEl.innerHTML = '<option value="all">All Districts</option>';
                    districtEl.disabled  = false;
                }
            })
            .catch(function () {
                districtEl.innerHTML = '<option value="all">All Districts</option>';
                districtEl.disabled  = false;
            });
    });

    // ── District → Pincode cascade ───────────────────────────────────────────
    districtEl.addEventListener('change', function () {
        var state    = stateEl.value;
        var district = districtEl.value;
        pincodeEl.innerHTML = '<option value="all">Loading…</option>';
        pincodeEl.disabled  = true;

        if (!district || district === 'all') {
            pincodeEl.innerHTML = '<option value="all">All Pincodes</option>';
            pincodeEl.disabled  = false;
            return;
        }

        fetch('get_filter_options.php?type=pincodes&state=' + encodeURIComponent(state)
              + '&district=' + encodeURIComponent(district))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.status === 'ok') {
                    populateSelect(pincodeEl, data.data, 'All Pincodes');
                } else {
                    pincodeEl.innerHTML = '<option value="all">All Pincodes</option>';
                    pincodeEl.disabled  = false;
                }
            })
            .catch(function () {
                pincodeEl.innerHTML = '<option value="all">All Pincodes</option>';
                pincodeEl.disabled  = false;
            });
    });
})();

// ============================================================
//  §11  FORM SUBMIT HANDLERS
// ============================================================

// ── Dispute Report submit ────────────────────────────────────────────────────
window.submitDisputeReport = function () {
    var claimantName = ($('#disputeClaimantName').val() || '').trim();
    if (!claimantName) {
        showToast('⚠️ Please enter the claimant name.', 3000);
        return;
    }

    var featureId = '';
    if (window._selectedCardFeature) {
        var p = window._selectedCardFeature.getProperties();
        featureId = window._selectedCardFeature.getId() || p.fid || '';
    }

    // Build evidence checklist JSON
    var evidenceList = [];
    document.querySelectorAll('.evidence-check').forEach(function (chk) {
        var lbl = chk.closest('li') && chk.closest('li').querySelector('.evidence-label');
        evidenceList.push({ id: chk.id, label: lbl ? lbl.textContent : '', checked: chk.checked });
    });

    var formData = new FormData();
    formData.append('parcel_id',        featureId);
    formData.append('claimant_name',    claimantName);
    formData.append('claimant_contact', $('#disputeClaimantContact').val() || '');
    formData.append('dispute_desc',     $('#disputeDesc').val() || '');
    formData.append('evidence_json',    JSON.stringify(evidenceList));

    var fileInput = document.getElementById('evidenceFileInput');
    if (fileInput && fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(function (f) { formData.append('files[]', f); });
    }

    var msgEl = document.getElementById('disputeSubmitMsg');
    if (msgEl) { msgEl.style.display = 'block'; msgEl.innerHTML = '<div class="alert alert-info py-1">Submitting…</div>'; }

    fetch('save_dispute.php', { method: 'POST', body: formData })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.statusCode === 200) {
                if (msgEl) { msgEl.innerHTML = '<div class="alert alert-success py-1">✅ Dispute #' + data.dispute_id + ' submitted successfully.</div>'; }
                showToast('✅ Dispute report saved (ID: ' + data.dispute_id + ')', 5000);
            } else {
                if (msgEl) { msgEl.innerHTML = '<div class="alert alert-danger py-1">❌ ' + (data.message || 'Submission failed.') + '</div>'; }
            }
        })
        .catch(function (err) {
            if (msgEl) { msgEl.innerHTML = '<div class="alert alert-danger py-1">❌ Network error. Please try again.</div>'; }
            console.error('submitDisputeReport error:', err);
        });
};

// ── Boundary Adjustment submit ───────────────────────────────────────────────
window.submitBoundaryAdj = function () {
    var reason = ($('#adjReason').val() || '').trim();
    if (!reason) {
        showToast('⚠️ Please enter the reason for adjustment.', 3000);
        return;
    }

    var formData = new FormData();
    formData.append('parcel_id',        document.getElementById('adjParcelId').value);
    formData.append('reason',           reason);
    formData.append('surveyor_ref',     $('#adjSurveyorRef').val()  || '');
    formData.append('surveyor_date',    $('#adjSurveyorDate').val() || '');
    formData.append('adjustment_notes', $('#adjNotes').val()        || '');

    var msgEl = document.getElementById('adjSubmitMsg');
    if (msgEl) { msgEl.style.display = 'block'; msgEl.innerHTML = '<div class="alert alert-info py-1">Submitting…</div>'; }

    fetch('save_boundary_adj.php', { method: 'POST', body: formData })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.statusCode === 200) {
                if (msgEl) { msgEl.innerHTML = '<div class="alert alert-success py-1">✅ Request #' + data.adjustment_id + ' submitted successfully.</div>'; }
                showToast('✅ Boundary adjustment submitted (ID: ' + data.adjustment_id + ')', 5000);
            } else {
                if (msgEl) { msgEl.innerHTML = '<div class="alert alert-danger py-1">❌ ' + (data.message || 'Submission failed.') + '</div>'; }
            }
        })
        .catch(function (err) {
            if (msgEl) { msgEl.innerHTML = '<div class="alert alert-danger py-1">❌ Network error. Please try again.</div>'; }
            console.error('submitBoundaryAdj error:', err);
        });
};

// ── Coordinates Update submit ────────────────────────────────────────────────
window.submitCoordsUpdate = function () {
    var coordsGeoJSON = ($('#coordsGeoJSON').val() || '').trim();
    var gpsSource     = ($('#coordsGpsSource').val() || '').trim();

    if (!coordsGeoJSON) {
        showToast('⚠️ Please enter the GeoJSON coordinates.', 3000);
        return;
    }
    try { JSON.parse(coordsGeoJSON); } catch (e) {
        showToast('⚠️ GeoJSON is not valid JSON. Please check the format.', 4000);
        return;
    }

    var formData = new FormData();
    formData.append('parcel_id',      document.getElementById('coordsParcelId').value);
    formData.append('gps_source',     gpsSource);
    formData.append('survey_date',    $('#coordsSurveyDate').val() || '');
    formData.append('accuracy_m',     $('#coordsAccuracy').val()   || 0);
    formData.append('coords_geojson', coordsGeoJSON);
    formData.append('notes',          $('#coordsNotes').val()      || '');

    var msgEl = document.getElementById('coordsSubmitMsg');
    if (msgEl) { msgEl.style.display = 'block'; msgEl.innerHTML = '<div class="alert alert-info py-1">Submitting…</div>'; }

    fetch('save_coords_update.php', { method: 'POST', body: formData })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.statusCode === 200) {
                if (msgEl) { msgEl.innerHTML = '<div class="alert alert-success py-1">✅ Update #' + data.update_id + ' queued for review.</div>'; }
                showToast('✅ Coordinates update submitted (ID: ' + data.update_id + ')', 5000);
            } else {
                if (msgEl) { msgEl.innerHTML = '<div class="alert alert-danger py-1">❌ ' + (data.message || 'Submission failed.') + '</div>'; }
            }
        })
        .catch(function (err) {
            if (msgEl) { msgEl.innerHTML = '<div class="alert alert-danger py-1">❌ Network error. Please try again.</div>'; }
            console.error('submitCoordsUpdate error:', err);
        });
};
