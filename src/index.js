import mapboxgl from 'mapbox-gl';
import syncMaps from '@mapbox/mapbox-gl-sync-move';
require('select2')
let $ = require("jquery");
import {Spinner} from 'spin.js';
let colormap = require('colormap')

import "./style.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import "select2/dist/css/select2.min.css";
import "spin.js/spin.css";

var oldAtlas = require('./grid_w_sp.geojson');
oldAtlas.features = oldAtlas.features.map( x => {
    x.properties.hide = x.properties.sp_nb==0 ? 1 : 0
    x.properties.popup = '<b>grid:</b> ' + x.properties.SqN + x.properties.SqL + '<br>' + '<b>Number of species:</b> ' + x.properties.sp_nb    
    return x
})
const speciesList = require('./2019_checklist_of_the_birds_of_kenya_short.json');
const table_data = require('./table_export.json');
const status = ['','Presence','Probable breeding','Confirmed breeding'];

var table_adu=table_data

var opts = {
    lines: 11, // The number of lines to draw
    length: 78, // The length of each line
    width: 20, // The line thickness
    radius: 48, // The radius of the inner circle
    scale: 1, // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    speed: 1.2, // Rounds per second
    rotate: 0, // The rotation offset
    animation: 'spinner-line-shrink', // The CSS animation name for the lines
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#000000', // CSS color or array of colors
    fadeColor: '', // CSS color or array of colors
    top: '50%', // Top position relative to parent
    left: '50%', // Left position relative to parent
    shadow: '0 0 1px transparent', // Box-shadow for the lines
    zIndex: 2000000000, // The z-index (defaults to 2e9)
    className: 'spinner', // The CSS class to assign to the spinner
    position: 'absolute', // Element positioning
  };

//oldAtlas.features.map()

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
mapOLD.fitBounds([
    [32.958984, -5.353521],
    [43.50585, 5.615985]
])

mapOLD.on('load', function () {
    mapOLD.addSource('grid_w_sp', {
        type: 'geojson',
        data: oldAtlas
    });

    var max = oldAtlas.features.reduce((acc, x) => Math.max(acc, x.properties["sp_nb"]), 0);
    var min = oldAtlas.features.reduce((acc, x) => Math.min(acc, x.properties["sp_nb"]), 10000);
    

    mapOLD.addLayer({
        'id': 'grid_w_sp_l',
        'type': 'fill',
        'source': 'grid_w_sp',
        'layout': {},
        'paint': {
            'fill-color': getFillColor(colormap_name, min, max, 'sp_nb'),
            'fill-opacity': 0.8
        },
        "filter": ["!=", "hide", 1]
    });
});

mapNEW.on('load', function () {
    new Spinner(opts).spin(document.getElementById('mapNEW'));
    $.getJSON('http://api.adu.org.za/sabap2/v2/coverage/project/kenya?period=&format=geoJSON', function(coverageKBM){
        mapNEW.addSource('grid_KBM', {
            type: 'geojson',
            data: coverageKBM
        });

        var max = coverageKBM.features.reduce((acc, x) => Math.max(acc, x.properties["full protocol"]), 0);
        var min = coverageKBM.features.reduce((acc, x) => Math.min(acc, x.properties["full protocol"]), 10000);
    
    
        mapNEW.addLayer({
            'id': 'grid_KBM_l',
            'type': 'fill',
            'source': 'grid_KBM',
            'layout': {},
            'paint': {
                'fill-color': getFillColor(colormap_name,min,max,"full protocol"),
                'fill-opacity': 0.8
            }
        });

        $(".spinner").remove();
    })

});



// Create a popup, but don't add it to the map yet.
var popupOLD = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});
mapOLD.on('mousemove', 'grid_w_sp_l', function (e) {
    mapOLD.getCanvas().style.cursor = 'pointer';
    popupOLD.setLngLat(e.lngLat).setHTML(e.features[0].properties.popup).addTo(mapOLD);
}).on('mouseleave', 'grid_w_sp_l', function () {
    mapOLD.getCanvas().style.cursor = '';
    popupOLD.remove();
});

var popupNEW = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});
mapNEW.on('mousemove', 'grid_KBM_l', function (e) {
    mapNEW.getCanvas().style.cursor = 'pointer';
    var prop = e.features[0].properties;
    var description = '<b>pentad:</b> ' + prop.pentad + '<br>' + '<b>Number of full protocol:</b> ' + prop['full protocol'] + '<br>' + '<b>Number of adhoc protocol:</b> ' + prop['adhoc protocol']
    popupNEW.setLngLat(e.lngLat).setHTML(description).addTo(mapNEW);
}).on('mouseleave', 'grid_KBM_l', function () {
    mapNEW.getCanvas().style.cursor = '';
    popupNEW.remove();
});


const getFillColor = (colormap_name,min,max,prop) => {

    let colors = colormap({
        colormap: colormap_name,
        //nshades: 10
    })

    var c = ['interpolate', ['linear'],
        ['get', prop]
    ];

    var step = (max - min) / (colors.length - 1);
    for (var i = 0; i < colors.length; i++) {
        c.push(min + (step * i))
        c.push(colors[i])
    }
    return c
}


$("#species").select2({
    data: $.map(speciesList, function (obj) {
        obj.id = obj.sort
        obj.text = obj.common_name
        return obj
    })
})

$('#species').on('select2:select', function (e) {

    // Get species information from the selectize
    var spListData = e.params.data;

    // Update the data used for mapping the old map
    table_adu = table_data.filter( x => x.ADU == spListData.ADU);
    UpdateOldMap()
  
    // Update the new map
    new Spinner(opts).spin(document.getElementById('mapNEW'));
    $.getJSON('http://api.adu.org.za/sabap2/v2/summary/species/'+spListData.ADU+'/country/kenya?format=geoJSON',function (dataKBM){
        mapNEW.getSource('grid_KBM').setData(dataKBM);
        var max = dataKBM.features.reduce((acc, x) => Math.max(acc, x.properties["full protocol"]), 0);
        var min = dataKBM.features.reduce((acc, x) => Math.min(acc, x.properties["full protocol"]), 10000);
        mapNEW.setPaintProperty('grid_KBM_l','fill-color',getFillColor(colormap_name, min, max, 'full protocol'))
        $(".spinner").remove();
    })

    
    

    // Update the links
    $('#ebird').attr("href","https://ebird.org/species/"+spListData['Clements--code']+"/KE")
    $('#iucn').attr("href","https://apiv3.iucnredlist.org/api/v3/taxonredirect/"+spListData.IUCNtaxonID)
    $('#kbm').attr("href","http://kenyabirdmap.adu.org.za/species_info.php?spp="+spListData.ADU)
    $('#avibase').attr("href","https://avibase.bsc-eoc.org/species.jsp?avibaseid="+spListData.avibaseid)
    $('#inaturalist').attr("href","https://www.inaturalist.org/observations?place_id=7042&taxon_id="+spListData.iNaturalisttaxonID)
    $('#observado').attr("href","https://observation.org/species/"+spListData.ObservationorgID)
    $('#gbif').attr("href","https://www.gbif.org/species/"+spListData.GBIFID)
});


var UpdateOldMap = () => {
    // Make a copy of the map (geojson)
    let oldAtlasSp = oldAtlas;

    // Check which period of the old atlas are selected
    var check = $(".checkbox-oldAtlas").map(function() {
        return $(this).is(':checked')
    });

    // loop through each grid cell
    oldAtlasSp.features.map( grid =>{
        // Find the data from data (table_adu) for that square
        var adu_sq = table_adu.find( x => grid.properties.SqL == x.SqL & grid.properties.SqN == x.SqN)
        if (adu_sq){
            grid.properties.status = Math.max( (check[0] ? adu_sq.pre : 0) , (check[1] ? adu_sq.within : 0) , (check[2] ? adu_sq.post : 0) )
            grid.properties.popup = '<b>grid:</b> ' + adu_sq.SqN + adu_sq.SqL + '<br><b>Status:</b> ' + status[grid.properties.status];
            grid.properties.hide = status[grid.properties.status]=="" ? 1 : 0
        } else {
            grid.properties.hide = 1
        }
        return grid
    })

    mapOLD.getSource('grid_w_sp').setData(oldAtlasSp);
    mapOLD.setPaintProperty('grid_w_sp_l','fill-color',["interpolate",["linear"],["get","status"],0,"#440154",1,"#33638d",2,"#fde725",3,"#3bb776"])//getFillColor(colormap_name, 0, 3, 'status')
}

$(".checkbox-oldAtlas").on('change',UpdateOldMap)