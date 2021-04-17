
var mapView = new ol.View({
    center: [8637237.501504004, 1457228.7329525042],
    zoom: 11
})

var baseMap = new ol.layer.Tile({
    source: new ol.source.OSM({
        attributions: 'Example Application'
    })
})

var layerArray = [baseMap]

var map = new ol.Map({
    target: 'map',
    view: mapView,
    layers: layerArray
})