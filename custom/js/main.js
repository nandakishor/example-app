var isDrawOn = false
var draw
var PointType = ['ATM','Tree','Telephone Poles', 'Electricity Poles'];
var LineType = ['National Highway','State Highway','River','Telephone Lines'];
var PolygonType = ['Water Body','Commercial Land', 'Residential Land','Building'];
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
        console.log('in button click')
        if (isDrawOn == false) {
            $('#startDrawModal').modal('show')
        } else {
            map.removeInteraction(draw)
            isDrawOn = false
            document.getElementById('drawbtn').innerHTML = '<i class="fas fa-pencil-ruler"</i>';
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
    center: [8637237.501504004, 1457228.7329525042],
    zoom: 11
})
/**
 * Basemap
 */
var baseMap = new ol.layer.Tile({
    source: new ol.source.OSM({
        attributions: 'Example Application'
    })
})

var drawSource = new ol.source.Vector()
var drawLayer = new ol.layer.Vector({
    source: drawSource
})

/**
 * Layers
 */

var layerArray = [baseMap, drawLayer]

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

function startDraw(geomType){
    selectedGeomType = geomType
    draw = new ol.interaction.Draw({
        type: geomType,
        source: drawSource
    })
    $('#startdrawModal').modal('hide')
    map.addInteraction(draw)
    isDrawOn = true
    document.getElementById('drawbtn').innerHTML = '<i class="far fa-stop-circle"></i>'
}