import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const Speech = props => {

  return(
    <TouchableOpacity title="Parlami" onPress={props.speaktome}>
      <View style={styles.button}>
        <Text style={styles.buttonText}>Parlami</Text>
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
    marginBottom: 60,
    width: 260,
    alignItems: 'center',
    backgroundColor: '#2196F3'
  },
  buttonText: {
    padding: 20,
    color: 'white'
  }
});

export default Speech;

/*

0: {id: "es-us-x-sfb#male_3-local", name: "es-us-x-sfb#male_3-local", language: "es-US"}
1: {id: "fi-FI-language", name: "fi-FI-language", language: "fi-FI"}
2: {id: "it-it-x-kda#male_2-local", name: "it-it-x-kda#male_2-local", language: "it-IT"}
3: {id: "zh-CN-language", name: "zh-CN-language", language: "zh-CN"}
4: {id: "ja-jp-x-htm#female_2-local", name: "ja-jp-x-htm#female_2-local", language: "ja-JP"}
5: {id: "it-it-x-kda#female_2-local", name: "it-it-x-kda#female_2-local", language: "it-IT"}
6: {id: "cs-CZ-language", name: "cs-CZ-language", language: "cs-CZ"}
7: {id: "en-us-x-sfg#male_1-local", name: "en-us-x-sfg#male_1-local", language: "en-US"}
8: {id: "da-DK-language", name: "da-DK-language", language: "da-DK"}
9: {id: "tr-TR-language", name: "tr-TR-language", language: "tr-TR"}
10: {id: "es-us-x-sfb#female_2-local", name: "es-us-x-sfb#female_2-local", language: "es-US"}
11: {id: "fr-fr-x-vlf#male_1-local", name: "fr-fr-x-vlf#male_1-local", language: "fr-FR"}
12: {id: "ja-jp-x-htm#male_2-local", name: "ja-jp-x-htm#male_2-local", language: "ja-JP"}
13: {id: "en-us-x-sfg#female_1-local", name: "en-us-x-sfg#female_1-local", language: "en-US"}
14: {id: "es-es-x-ana#female_1-local", name: "es-es-x-ana#female_1-local", language: "es-ES"}
15: {id: "th-th-x-mol#female_2-local", name: "th-th-x-mol#female_2-local", language: "th-TH"}
16: {id: "th-th-x-mol#male_1-local", name: "th-th-x-mol#male_1-local", language: "th-TH"}
17: {id: "de-DE-language", name: "de-DE-language", language: "de-DE"}
18: {id: "yue-HK-language", name: "yue-HK-language", language: "yue-HK"}
19: {id: "en-us-x-sfg-local", name: "en-us-x-sfg-local", language: "en-US"}
20: {id: "en-us-x-sfg#male_3-local", name: "en-us-x-sfg#male_3-local", language: "en-US"}
21: {id: "fr-fr-x-vlf#female_2-local", name: "fr-fr-x-vlf#female_2-local", language: "fr-FR"}
22: {id: "zh-TW-language", name: "zh-TW-language", language: "zh-TW"}
23: {id: "es-es-x-ana#female_2-local", name: "es-es-x-ana#female_2-local", language: "es-ES"}
24: {id: "es-es-x-ana#male_1-local", name: "es-es-x-ana#male_1-local", language: "es-ES"}
25: {id: "es-us-x-sfb-local", name: "es-us-x-sfb-local", language: "es-US"}
26: {id: "es-us-x-sfb#female_1-local", name: "es-us-x-sfb#female_1-local", language: "es-US"}
27: {id: "uk-UA-language", name: "uk-UA-language", language: "uk-UA"}
28: {id: "pt-BR-language", name: "pt-BR-language", language: "pt-BR"}
29: {id: "es-us-x-sfb#male_2-local", name: "es-us-x-sfb#male_2-local", language: "es-US"}
30: {id: "fr-fr-x-vlf#male_3-local", name: "fr-fr-x-vlf#male_3-local", language: "fr-FR"}
31: {id: "it-it-x-kda#male_1-local", name: "it-it-x-kda#male_1-local", language: "it-IT"}
32: {id: "nl-NL-language", name: "nl-NL-language", language: "nl-NL"}
33: {id: "es-US-language", name: "es-US-language", language: "es-US"}
34: {id: "sv-SE-language", name: "sv-SE-language", language: "sv-SE"}
35: {id: "ko-KR-language", name: "ko-KR-language", language: "ko-KR"}
36: {id: "en-us-x-sfg#female_2-local", name: "en-us-x-sfg#female_2-local", language: "en-US"}
37: {id: "hi-IN-language", name: "hi-IN-language", language: "hi-IN"}
38: {id: "hu-HU-language", name: "hu-HU-language", language: "hu-HU"}
39: {id: "fr-FR-language", name: "fr-FR-language", language: "fr-FR"}
40: {id: "fr-fr-x-vlf#male_2-local", name: "fr-fr-x-vlf#male_2-local", language: "fr-FR"}
41: {id: "es-us-x-sfb#female_3-local", name: "es-us-x-sfb#female_3-local", language: "es-US"}
42: {id: "fr-fr-x-vlf-local", name: "fr-fr-x-vlf-local", language: "fr-FR"}
43: {id: "bn-IN-language", name: "bn-IN-language", language: "bn-IN"}
44: {id: "es-es-x-ana#female_3-local", name: "es-es-x-ana#female_3-local", language: "es-ES"}
45: {id: "es-es-x-ana#male_3-local", name: "es-es-x-ana#male_3-local", language: "es-ES"}
46: {id: "ja-jp-x-htm#male_3-local", name: "ja-jp-x-htm#male_3-local", language: "ja-JP"}
47: {id: "nb-NO-language", name: "nb-NO-language", language: "nb-NO"}
48: {id: "ja-jp-x-htm#female_1-local", name: "ja-jp-x-htm#female_1-local", language: "ja-JP"}
49: {id: "vi-VN-language", name: "vi-VN-language", language: "vi-VN"}
50: {id: "th-th-x-mol#male_2-local", name: "th-th-x-mol#male_2-local", language: "th-TH"}
51: {id: "th-th-x-mol#female_3-local", name: "th-th-x-mol#female_3-local", language: "th-TH"}
52: {id: "km-KH-language", name: "km-KH-language", language: "km-KH"}
53: {id: "th-TH-language", name: "th-TH-language", language: "th-TH"}
54: {id: "ru-RU-language", name: "ru-RU-language", language: "ru-RU"}
55: {id: "ja-JP-language", name: "ja-JP-language", language: "ja-JP"}
56: {id: "it-IT-language", name: "it-IT-language", language: "it-IT"}
57: {id: "es-es-x-ana-local", name: "es-es-x-ana-local", language: "es-ES"}
58: {id: "it-it-x-kda#male_3-local", name: "it-it-x-kda#male_3-local", language: "it-IT"}
59: {id: "fr-fr-x-vlf#female_3-local", name: "fr-fr-x-vlf#female_3-local", language: "fr-FR"}
60: {id: "en-IN-language", name: "en-IN-language", language: "en-IN"}
61: {id: "es-ES-language", name: "es-ES-language", language: "es-ES"}
62: {id: "it-it-x-kda#female_3-local", name: "it-it-x-kda#female_3-local", language: "it-IT"}
63: {id: "en-us-x-sfg#male_2-local", name: "en-us-x-sfg#male_2-local", language: "en-US"}
64: {id: "es-us-x-sfb#male_1-local", name: "es-us-x-sfb#male_1-local", language: "es-US"}
65: {id: "en-AU-language", name: "en-AU-language", language: "en-AU"}
66: {id: "ne-NP-language", name: "ne-NP-language", language: "ne-NP"}
67: {id: "en-GB-language", name: "en-GB-language", language: "en-GB"}
68: {id: "ja-jp-x-htm#male_1-local", name: "ja-jp-x-htm#male_1-local", language: "ja-JP"}
69: {id: "bn-BD-language", name: "bn-BD-language", language: "bn-BD"}
70: {id: "en-US-language", name: "en-US-language", language: "en-US"}
71: {id: "pl-PL-language", name: "pl-PL-language", language: "pl-PL"}
72: {id: "th-th-x-mol#female_1-local", name: "th-th-x-mol#female_1-local", language: "th-TH"}
73: {id: "en-us-x-sfg#female_3-local", name: "en-us-x-sfg#female_3-local", language: "en-US"}
74: {id: "th-th-x-mol-local", name: "th-th-x-mol-local", language: "th-TH"}
75: {id: "id-ID-language", name: "id-ID-language", language: "id-ID"}
76: {id: "ja-jp-x-htm#female_3-local", name: "ja-jp-x-htm#female_3-local", language: "ja-JP"}
77: {id: "es-es-x-ana#male_2-local", name: "es-es-x-ana#male_2-local", language: "es-ES"}
78: {id: "it-it-x-kda#female_1-local", name: "it-it-x-kda#female_1-local", language: "it-IT"}
79: {id: "ja-jp-x-htm-local", name: "ja-jp-x-htm-local", language: "ja-JP"}
80: {id: "th-th-x-mol#male_3-local", name: "th-th-x-mol#male_3-local", language: "th-TH"}
81: {id: "fr-fr-x-vlf#female_1-local", name: "fr-fr-x-vlf#female_1-local", language: "fr-FR"}
82: {id: "it-it-x-kda-local", name: "it-it-x-kda-local", language: "it-IT"}
83: {id: "si-LK-language", name: "si-LK-language", language: "si-LK"}

*/