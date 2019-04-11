import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const TestButton = props => {

  return(
    <TouchableOpacity title="TestButton" onPress={props.dosomething}>
      <View style={styles.button}>
        <Text style={styles.buttonText}>TestButton</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 30,
    alignItems: 'center'
  },
  button: {
    marginBottom: 40,
    width: 260,
    alignItems: 'center',
    backgroundColor: '#2196F3'
  },
  buttonText: {
    padding: 20,
    color: 'white'
  }
});

export default TestButton;
