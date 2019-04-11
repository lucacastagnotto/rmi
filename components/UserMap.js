import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const UserMap = props => {

	const set_markers = props.poi.map(poi_loc => (
		<MapView.Marker 
			coordinate={poi_loc} 
			key={poi_loc.key} 
		/>
	));

	return (
		<View style={styles.mapContainer}>
			<MapView
				provider={ PROVIDER_GOOGLE }
			    region={props.myLocation} 
			    showsUserLocation={true}
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
	        		//optimizeWaypoints="true"
				/>
			</MapView>
		</View>
	);
};

const styles = StyleSheet.create({
	mapContainer: {
    width: '100%',
    height: 200,
    marginTop: 20
  },
  map: {
    width: '100%',
    height: '100%'
  } 
});

export default UserMap;
