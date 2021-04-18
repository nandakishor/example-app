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
            typeofFeature();
            $('#enterInformationModal').modal('show')
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
    params: { 'LAYERS': 'example_app:featuresDrawn', 'tiled': true },
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

var layerArray = [baseMap, featureLayer, drawLayer]

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
    layers: layerArray
})

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
        var geomstring = JSON.stringify(element.geometry)
        if (type != '') {
            $.ajax({
                url: 'save.php',
                type: 'POST',
                data: {
                    typeofFeature: type,
                    nameofFeature: name,
                    geom: geomstring
                },
                success: function (dataResult) {
                    var res = JSON.parse(dataResult)
                    if (res.statusCode == 200) {
                        console.log('Data added successfully')
                    } else {
                        console.log('Data not added')
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