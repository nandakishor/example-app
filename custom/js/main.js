var isDrawOn = false
var draw
var PointType = ['ATM', 'Tree', 'Telephone Poles', 'Electricity Poles', 'Shops'];
var LineType = ['National Highway', 'State Highway', 'River', 'Telephone Lines'];
var PolygonType = ['Water Body', 'Commercial Land', 'Residential Land', 'Building', 'Government Building'];
var selectedGeomType

/**
 * Custom control
 */

window.app = {};
var app = window.app

app.DrawingApp = function (opt_options) {
    var options = opt_options || {};

    var button = document.createElement('button');
    button.id = 'drawbtn'
    button.innerHTML = '<i class="fas fa-pencil-ruler"</i>';

    var this_ = this
    var startStopApp = function () {
        if (isDrawOn == false) {
            $('#startDrawModal').modal('show')
        } else {
            map.removeInteraction(draw)
            isDrawOn = false
            document.getElementById('drawbtn').innerHTML = '<i class="fas fa-pencil-ruler"></i>';
            // With new workflow, we don't usually stop manually, but if we do:
            // typeofFeature();
            // $('#enterInformationModal').modal('show')
        }
    }

    button.addEventListener('click', startStopApp, false);
    button.addEventListener('touchstart', startStopApp, false)

    var element = document.createElement('div')
    element.className = 'draw-app ol-unselectable ol-control'
    element.appendChild(button)

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    })
}

ol.inherits(app.DrawingApp, ol.control.Control);

/**
 * View
 */
var mapView = new ol.View({
    center: [8633240.92947555, 1460858.9432369084],
    zoom: 17
})
/**
 * Basemap
 */
var baseMap = new ol.layer.Tile({
    source: new ol.source.OSM({
        attributions: 'Example Application'
    })
})

/**
 * GeoServer
 */
var featureLayerSource = new ol.source.TileWMS({
    url: "http://localhost:8080/geoserver/example_app/wms",
    params: { 'LAYERS': 'example_app:featuresdrawn', 'tiled': true },
    serverType: 'geoserver'
})

var featureLayer = new ol.layer.Tile({
    source: featureLayerSource
})

var drawSource = new ol.source.Vector()

var drawLayer = new ol.layer.Vector({
    source: drawSource
})

/**
 * Layers
 */

let layerArray = [baseMap, featureLayer, drawLayer]

/**
 * Popup
 */
let container = document.getElementById('popup');
let content = document.getElementById('popup-content');
let closer = document.getElementById('popup-closer');

let overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

/**
 * Map
 */
var map = new ol.Map({
    controls: ol.control.defaults({
        attributionOptions: {
            collapsible: false
        }
    }).extend([
        new app.DrawingApp()
    ]),
    target: 'map',
    view: mapView,
    layers: layerArray,
    overlays: [overlay]
})

/**
 * Click handler for Popup
 */
map.on('singleclick', function (evt) {
    if (isDrawOn) return; // Don't show popup while drawing

    var viewResolution = /** @type {number} */ (mapView.getResolution());
    var url = featureLayerSource.getGetFeatureInfoUrl(
        evt.coordinate, viewResolution, 'EPSG:3857',
        { 'INFO_FORMAT': 'application/json' }
    );
    if (url) {
        $.ajax({
            url: url,
            success: function (data) {
                // Assuming data is GeoJSON
                if (data.features && data.features.length > 0) {
                    var feature = data.features[0];
                    var props = feature.properties;
                    var html = '<h5>Feature Info</h5>';
                    html += '<p><strong>Type:</strong> ' + (props.type || 'N/A') + '</p>';
                    html += '<p><strong>Name:</strong> ' + (props.name || 'N/A') + '</p>';
                    html += '<p><strong>Survey No:</strong> ' + (props.survey_number || 'N/A') + '</p>';
                    html += '<p><strong>Owner:</strong> ' + (props.owner_name || 'N/A') + '</p>';
                    html += '<p><strong>Area:</strong> ' + (props.area || 'N/A') + '</p>';
                    content.innerHTML = html;
                    overlay.setPosition(evt.coordinate);
                } else {
                    // No features found, hide popup
                    overlay.setPosition(undefined);
                }
            }
        });
    }
});

function startDraw(geomType) {
    selectedGeomType = geomType
    draw = new ol.interaction.Draw({
        type: geomType,
        source: drawSource
    })
    $('#startDrawModal').modal('hide')
    map.addInteraction(draw)
    isDrawOn = true
    document.getElementById('drawbtn').innerHTML = '<i class="far fa-stop-circle"></i>'

    draw.on('drawend', function (evt) {
        var feature = evt.feature;
        var geometry = feature.getGeometry();
        
        // Calculate Area
        var area = 0;
        if (geomType === 'Polygon') {
            // Fix for OpenLayers 4.6.5: ol.Sphere.getArea is a static method
            area = ol.Sphere.getArea(geometry); 
        }

        // Stop drawing interaction immediately after one feature
        map.removeInteraction(draw);
        isDrawOn = false;
        document.getElementById('drawbtn').innerHTML = '<i class="fas fa-pencil-ruler"></i>';

        // Prepare and show modal
        typeofFeature();
        $('#calcArea').val(area.toFixed(2));
        $('#enterInformationModal').modal('show');
    });
}

function typeofFeature() {
    var dropdowntype = document.getElementById('typeofFeatures')
    dropdowntype.innerHTML = ''
    if (selectedGeomType == 'Point') {
        for (i = 0; i < PointType.length; i++) {
            var op = document.createElement('option')
            op.value = PointType[i]
            op.innerHTML = PointType[i]
            dropdowntype.appendChild(op)
        }
    } else if (selectedGeomType == 'LineString') {
        for (i = 0; i < LineType.length; i++) {
            var op = document.createElement('option')
            op.value = LineType[i]
            op.innerHTML = LineType[i]
            dropdowntype.appendChild(op)
        }
    } else {
        for (i = 0; i < PolygonType.length; i++) {
            var op = document.createElement('option')
            op.value = PolygonType[i]
            op.innerHTML = PolygonType[i]
            dropdowntype.appendChild(op)
        }
    }
}

/**
 * Save features to DB
 */
function savetodb() {
    var features = drawSource.getFeatures()
    var geoJSONformat = new ol.format.GeoJSON()
    var geoJSONfeatures = geoJSONformat.writeFeaturesObject(features)

    geoJSONfeatures.features.forEach(element => {
        console.log(element.geometry);
        var type = document.getElementById('typeofFeatures').value
        var name = document.getElementById('nameofFeatures').value
        var surveyNumber = document.getElementById('surveyNumber').value
        var ownerName = document.getElementById('ownerName').value
        var area = document.getElementById('calcArea').value
        
        var geomstring = JSON.stringify(element.geometry)
        if (type != '') {
            $.ajax({
                url: 'save.php',
                type: 'POST',
                data: {
                    typeofFeature: type,
                    nameofFeature: name,
                    geom: geomstring,
                    surveyNumber: surveyNumber,
                    ownerName: ownerName,
                    area: area
                },
                success: function (dataResult) {
                    var res = JSON.parse(dataResult)
                    if (res.statusCode == 200) {
                        console.log('Data added successfully')
                        alert('Data added successfully'); // Feedback to user
                    } else {
                        console.log('Data not added')
                        alert('Error adding data');
                    }
                }
            })
        } else {
            alert('please select type')
        }
    });

    var params = featureLayer.getSource().getParams();
    params.t = new Date().getMilliseconds();
    featureLayer.getSource().updateParams(params);

    // close modal
    $("#enterInformationModal").modal('hide')
    clearDrawSource()
}

/**
 * Clear DataSource
 */
function clearDrawSource() {
    drawSource.clear();
}