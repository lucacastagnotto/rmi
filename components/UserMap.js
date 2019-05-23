import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const UserMap = props => {

	const set_markers = props.poi.map(poi_loc => (
		<MapView.Marker 
			coordinate={poi_loc} 
			key={poi_loc.key} 
		/>
	));

	setfollow = (val) => {
		props.changefollow(val);
	}

	getfollow = () => {
		console.log("getfollow: "+ props.follow);
		return(props.follow);
	}

	getloc = () => {
		return(props.myLocation);
	}

	return (
		<MapView
			ref={component => {
              this.mymap = component;
            }}
			provider={ PROVIDER_GOOGLE }
			initialRegion={props.myLocation}
			showsUserLocation={true}
			//initialRegion={{latitude: 44.494623, longitude: 11.346900, latitudeDelta: 0.002, longitudeDelta: 0.005}}
			followUserLocation={props.follow}
			//EVENTI
			onMoveShouldSetResponder={(e) => setfollow(false)}
			onUserLocationChange={(event) => {
				console.log("animatetoregion: "+ event.nativeEvent.coordinate.latitude + " "+ event.nativeEvent.coordinate.longitude);
				if(props.follow){
					const newRegion = event.nativeEvent.coordinate;
					this.mymap.animateToRegion({
						latitude: newRegion.latitude, longitude: newRegion.longitude, 
						latitudeDelta: 0.002, longitudeDelta: 0.005}, 1000);
				}
			}}
		    //region={props.myLocation} 
		    style={styles.map} 
		>
			{set_markers}
			<MapViewDirections
				origin={props.myLocation}
				waypoints={props.poi}
				destination={props.poi[props.poi.length-1]} //coincide con l'ultimo waypoint
			    apikey="AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0"
			    strokeWidth={3}
        		strokeColor="hotpink"
        		mode="walking"
        		optimizeWaypoints="true"
        		onStart={(params) => {
	            }}
			/>
		</MapView>
	);
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%'
  }
});

export default UserMap;
