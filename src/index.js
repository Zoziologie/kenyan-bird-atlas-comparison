import mapboxgl from 'mapbox-gl';
import syncMaps  from '@mapbox/mapbox-gl-sync-move';
var $ = require( "jquery" );
let colormap = require('colormap')


import "./style.css";
import 'mapbox-gl/dist/mapbox-gl.css';

let dold
let colormap_name = 'viridis'
let style = 'mapbox://styles/mapbox/streets-v11'

mapboxgl.accessToken = 'pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g';
var mapOLD = new mapboxgl.Map({
    container: 'mapOLD',
    style: style
});

var mapNEW = new mapboxgl.Map({
    container: 'mapNEW',
    style: style
});

syncMaps(mapOLD, mapNEW);
mapOLD.fitBounds([[32.958984, -5.353521], [43.50585, 5.615985]])

mapOLD.on('load', function () {

    $.getJSON('assets/grid_w_sp.geojson',function(data){
        dold = data

        mapOLD.addSource('grid_w_sp', {
            type: 'geojson',
            data: dold
            });
    
        mapOLD.addLayer({
            'id': 'grid_w_sp_l',
            'type': 'fill',
            'source': 'grid_w_sp',
            'layout': {},
            'paint': {
                'fill-color': getFillColor(colormap_name),
                'fill-opacity': 0.8
            }
        });
    })
});

// Create a popup, but don't add it to the map yet.
var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});
     
mapOLD.on('mousemove', 'grid_w_sp_l', function (e) {
    mapOLD.getCanvas().style.cursor = 'pointer';
    var prop = e.features[0].properties;
    var description = '<b>grid:</b> ' + prop.SqN + prop.SqL+'<br>'+ '<b>Number of species:</b> ' + prop.sp_nb
    popup.setLngLat(e.lngLat).setHTML(description).addTo(mapOLD);
});
     
mapOLD.on('mouseleave', 'grid_w_sp_l', function () {
    mapOLD.getCanvas().style.cursor = '';
    popup.remove();
});



const getFillColor = (colormap_name) => {

    let colors = colormap({
        colormap: colormap_name,
        //nshades: 10
    })

	var max = dold.features.reduce((acc,x) => Math.max(acc,x.properties.sp_nb),0);
	var min = dold.features.reduce((acc,x) => Math.min(acc,x.properties.sp_nb),10000);

	var c = ['interpolate',	['linear'],	['get', 'sp_nb']];

	var step = (max - min) / (colors.length - 1);
		for (var i = 0; i < colors.length; i++) {
			c.push(min + (step * i))
			c.push(colors[i])
		}
	return c
}


$.getJSON('assets/species.json',function(data){
    spl = data
})
