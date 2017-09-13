function initializeMaps(activities) {

    console.log('sica activities');
    console.log(activities);

    $('#myModal').one('shown.bs.modal', function() {
        for(var n = 0; n < activities.length; n++) {
            initializeMap(activities[n], n);
        }
    });
}

function hack(activity) {
    $('#myModal').on('shown.bs.modal', function(){
            initializeMap(activity, 1);
    });
}    

function initializeMap(activity, index) {
    console.log("sica generez map");
    console.log(activity);
    console.log(index);
    var myLatlng = new google.maps.LatLng(activity.start_latitude, activity.start_longitude);
    
    var myOptions = {
        zoom: 1,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    
    var divMapId = 'maps-' + index;//'maps-' + activity.id;
    var map = new google.maps.Map(document.getElementById(divMapId), myOptions);
        
    var decodedPath = google.maps.geometry.encoding.decodePath(activity.map.summary_polyline);

    var decodedLevels = decodeLevels("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");

    var setRegion = new google.maps.Polyline({
        path: decodedPath,
        levels: decodedLevels,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });

    map.fitBounds(zoomToObject(setRegion));
    var startMarker = new google.maps.Marker({
    	position:setRegion.getPath().getAt(0), 
    	map:map,
      	icon: {
      		path: google.maps.SymbolPath.CIRCLE,
      		scale: 7,
      		strokeOpacity: 0.7,
      		strokeWeight: 3,
      		fillOpacity: 1.0,
      		fillColor: 'white',
      	},
        title: "Start",
    });
    var endMarker =  new google.maps.Marker({
      position:setRegion.getPath().getAt(setRegion.getPath().getLength()-1), 
      map:map,
      title: "Finish",
    });

}

function zoomToObject(obj) {
    var bounds = new google.maps.LatLngBounds();
    var points = obj.getPath().getArray();
    for (var n = 0; n < points.length ; n++){
        bounds.extend(points[n]);
    }
    return bounds;
}

function decodeLevels(encodedLevelsString) {
    var decodedLevels = [];

    for (var i = 0; i < encodedLevelsString.length; ++i) {
        var level = encodedLevelsString.charCodeAt(i) - 63;
        decodedLevels.push(level);
    }
    return decodedLevels;
}