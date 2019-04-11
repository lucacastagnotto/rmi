import React, {Component} from 'react';
import {Platform, StyleSheet, Text, TouchableOpacity, View, AsyncStorage, PixelRatio} from 'react-native';

import UserMap from './components/UserMap';
import Tts from 'react-native-tts';
import Speech from './components/Speech';
import TestButton from './components/TestButton';
import update from 'immutability-helper';
import YouTube, { YouTubeStandaloneIOS, YouTubeStandaloneAndroid } from 'react-native-youtube';

var GOOGLE_KEY = "AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
var nextkey = 0; //valore necessario da attribuire come 'key' a ciascun <Marker> di <MapView>. Da aggiornare (++) dopo ogni assegnazione
//DBPedia Key = a87affce-e8fb-4b31-b64c-43d19e64cfcd;

type Props = {};

export default class App extends Component<Props> {

  state = {
    myLocation: null,
    watchID: null,
    markers: [], //[{latitude: 44.492974, longitude: 11.343129, id: 1, title:"San_Petronio_Basilica"}, {latitude: 44.494206, longitude: 11.346731, id: 2, title: "Torre degli Asinelli"}, {latitude: 44.494301, longitude: 11.342656, id: 3, title: "Fontana del Nettuno"}],
    text_to_read: "This is Hoormi",
    ttsStatus: "initializing",
    selectedVoice: null,
    //speechRate: 0.6,
    //speechPitch: 1.5
    user_language: null,
    in_ascolto: false,
    ready_to_listen: false,
    current_poi: 0, //intero che è indice dell'array markers (Es: if(current_poi==5) allora sto considerando markers[5] )
    isReady: false,
    status: null,
    quality: null,
    error: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    fullscreen: false,
    containerWidth: null,
    status: false
  }

  options = {
    enableHighAccuracy: true,
    timeout: 2000,
    maximumAge: 0
  }

  constructor(props){
    super(props);
    console.disableYellowBox = true;
    this.initLocationProcedure();
    this.initUserPreferences();
    Tts.addEventListener("tts-start", event =>
      this.setState({ ttsStatus: "started" })
    );
    Tts.addEventListener("tts-finish", event => {
      this.setState({ ttsStatus: "finished" });
      //this.setState({ in_ascolto: false })
    });
    Tts.addEventListener("tts-cancel", event =>
      this.setState({ ttsStatus: "cancelled" })
    );
    //Tts.setDefaultRate(this.state.speechRate);
    //Tts.setDefaultPitch(this.state.speechPitch);
    Tts.getInitStatus().then(this.initTts);
    //initSearchHooRMIStrings.then initMarkersWithAnnotations
    //this.fakeInitSearch();
  }

  printstate = () => {
    console.log(this.state);
  }

  saveData = () => {
    let preferences = {
      lang: "en"
    }
    AsyncStorage.setItem('user', JSON.stringify(preferences));
  }

  displayData = async () => {
    try {
      let user = await AsyncStorage.getItem('user');
      let parsed = JSON.parse(user);
      console.log("display Data: "+ parsed.lang);
    } 
    catch (error) {
      // Error retrieving data
      console.log(error.message);
    }
  }

  getUserKey = async () => {
    let user;
    try {
      user = await AsyncStorage.getItem('user');
    } catch (error) {
      // Error retrieving data
      console.log(error.message);
    }
    return user;
  }

  shownhide = () => {
    if(this.state.status) {
      this.setState({ status: false })
    }
    else {
      this.setState({ status: true })
    }
  }

  initTts = async () => {
    try {
      await Tts.setDefaultLanguage('en-US');
    } catch (err) {
      // My Samsung S9 has always this error: "Language is not supported"
      console.log(`setDefaultLanguage error `, err);
    }
    await Tts.setDefaultVoice('en-us-x-sfg#male_1-local');
    this.setState({
        selectedVoice: 'en-us-x-sfg#male_1-local',
        ttsStatus: "initialized"
    });
  }

  fakeInitSearch = async () => {
    this.setState({
      markers: []
    });
    var promise;
    console.log("inizio il primo");
    promise = await this.initMarkersWithAnnotations("8FPHF8VV+57:why:ita:his-art", "video", "DCBRsxLCV40", "why");
    console.log("inizio il secondo");
    promise = await this.initMarkersWithAnnotations("8FPHF8VW+MM:what:ita:*", "video", "DCBRsxLCV40", "what");
    console.log("inizio il terzo");
    promise = this.initMarkersWithAnnotations("8FPHF8VW+MM:why:ita:*", "video", "DCBRsxLCV40", "why");
    this.setState({
      ready_to_listen: true
    });
  }

  initMarkersWithAnnotations = async (rmistring, type_of_file, content, type_of_annotation) => {

    var trovato = false;
    var i = 0;
    if(this.state.markers.length != 0){
      while((i<this.state.markers.length) && (!trovato)){
        if(this.state.markers[i].id.substring(0,11) == rmistring.substring(0,11)){
          //il marker esiste già (questa specifica annotazione invece no, la dobbiamo comunque creare e aggiungerla a what[]/why[]/how[])
          console.log("aggiungo annotazione di una stringa già esistente");
          trovato = true;
          var newmark = update(this.state.markers, {
            [i]: {[type_of_annotation]: {$push: [{type_of_file: type_of_file, value: content, visited: false}]}}  
            //a: {b: {$push: [9]}}
          });
          this.setState({
            markers: newmark
          });
          this.printstate();
        }
        i++;
      }
    }
    if(!trovato){
      console.log("genero nuovo marker");
      var newmark = {
        latitude: null, 
        longitude: null,
        id: rmistring, 
        title: null,
        key: nextkey,
        what: [],
        why: [],
        how: []
      }
      nextkey++;
      //Ho stringa HooRMI, da cui trovo: Coordinate tramite searchPlusCodes, da cui trovo Titolo tramite osm_call(), da cui trovo Dbpedia tramite dbpedia()
      var coords = await this.searchPlusCodes(rmistring.substring(0,11)); //ritorna l'oggetto json
      newmark.latitude = coords.plus_code.geometry.location.lat;
      newmark.longitude = coords.plus_code.geometry.location.lng;
      newmark.title = await this.osm_call(newmark.latitude, newmark.longitude);
      console.log("check before dbpedia");
      var dbpedia_value = await this.dbpedia(newmark.title);
      console.log("db:::."+dbpedia_value);
      if(dbpedia_value != undefined) {
        newmark.why.push({type_of_file: "text", value: dbpedia_value, visited: false});
      }
      else {
        var check_title = await this.wiki(newmark.title);
        if(check_title != newmark.title) {
          let promise = await this.dbpedia(check_title);
          if(promise != undefined) {
            newmark.why.push({type_of_file: "text", value: promise, visited: false});
          }
        }
      }
      console.log("ho aggiornato newmark con annotazione dbpedia");
      newmark[type_of_annotation].push({
        type_of_file: type_of_file,
        value: content, //se video-->videoID, se testo-->testo, altro...
        visited: false
      })
      this.setState(prevState => ({
        markers: [...prevState.markers, newmark]
      }))
      console.log("ho aggiunto notazione e ora stampo");
      this.printstate();
    }
    console.log("check at the end");
    /*var newmark = update(this.state.markers, {
              [this.state.current_poi]: {$merge: {title: title}}  
            });*/
  }

  pausenresume = async () => {
    if(this.state.in_ascolto) {
      Tts.pause();
      this.setState({ in_ascolto: false });
      console.log(this.state.in_ascolto);
    }
    else {
      Tts.resume();
      this.setState({ in_ascolto: true });
      console.log(this.state.in_ascolto);
    }
  }

  readText = async () => {
    Tts.stop();
    /*if(this.state.in_ascolto){
      this.setState({ in_ascolto: false });
      return;
    }*/
    Tts.speak(this.state.text_to_read);
    this.setState({ in_ascolto: true });
  }

  setCurrentPosition = (position) => { 
    this.setState(prevState => ({
      myLocation: {
        ...prevState.myLocation,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.005
      }
    }));
  }

  watchCurrentPosition = () => { 
    this.state.watchID=navigator.geolocation.watchPosition(position => {  
      this.setState(prevState => ({
        myLocation: {
          ...prevState.myLocation,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.005
        }
      })); 
      //gestisci casi di multipli poi in spazio ristretto
      /*if(this.getDistance()<200){
        console.log("distance is ok");
        if(!this.state.in_ascolto){
            console.log("in_ascolto is false");
          if(this.state.ready_to_listen){
            console.log("ready_to_listen is true");
            this.setState({ in_ascolto: true });
            this.readText();
          }
        }
      }*/
      navigator.geolocation.clearWatch(this.state.watchID);
    }, error => console.log(err), this.options
    );
  }

  initLocationProcedure = () => {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => { 
        this.setCurrentPosition(position); //Inizializza myLocation
        this.watchCurrentPosition(); //Aggiorna costantemente myLocation
      }, err => console.log(err));
    } else {
      console.log("Your browser does not support the Geolocation API!");
    }
  }

  initUserPreferences = async () => {
    let user = await this.getUserKey();
    user = JSON.parse(user);
    this.setState({
      user_language: user.lang
    })
    //if(user_language == "undefined"){alert("Choose a language!")}
  }

  wiki = (title) => {
  var url = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks%7Clinks&titles="+ encodeURIComponent(title) +"&lllimit=30&origin=*";
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
    .then(res => res.json())
    .then(
      (data) => { 
        console.log(data);
        if((data.query.pages[Object.keys(data.query.pages)[0]].langlinks) == undefined ) {
          console.log("devo tradurre il nome");
          console.log("nome tradotto: "+ data.query.pages[Object.keys(data.query.pages)[0]].links[0]["title"]);
          return(data.query.pages[Object.keys(data.query.pages)[0]].links[0]["title"]);
        }
        else {
          console.log("il nome va già bene");
          return(titolo);
        }
      } 
    )
    .catch((error) => {
      console.log(error);
      return(title);
    });
}

  osm_call = async (lat, lng) => {
    var url = "https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat="+ lat +"&lon="+ lng;
      console.log(url);
      return fetch(url, {
        method: "GET",
      })
        .then(res => res.json())
        .then(
          (data) => { 
            console.log(data); 
            var title = data.address[Object.keys(data.address)[0]];
            return(title);
          } 
        )
        .catch((error) => {
          console.log(error);
        });
  } 

  dbpedia = async (title) => {
    var coded_title = title.replace(/ /g, "_")
    var url="http://vmdbpedia.informatik.uni-leipzig.de:8080/api/1.0.0/values?property=dbo%3Aabstract&format=JSON&pretty=NONE&limit=100&offset=0&oldVersion=false&key=a87affce-e8fb-4b31-b64c-43d19e64cfcd&oldVersion=false&entities="+ coded_title;//+ encodeURI(this.state.mynextloc.title);
    const proxyurl = "https://yacdn.org/proxy/";
    console.log(url);
      return fetch((proxyurl + url), {
        method: "GET",
      })
        .then(res => res.json())
        .then(
          (data) => { 
            console.log(data);
            if( data.results.bindings[0].dboabstract == undefined ){
              //alert("DBPedia has no info about this location");
              return(undefined);
            }
            else {
              var i = 0;
              var trovato = false;
              while((i < data.results.bindings.length) && (!trovato)){
                //console.log("ul: "+ this.state.user_language + " ab: "+ data.results.bindings[i].dboabstract["xml:lang"]);
                if(this.state.user_language == data.results.bindings[i].dboabstract["xml:lang"]){
                  trovato = true;
                  return(data.results.bindings[i].dboabstract["value"]);
                }
                else
                    i++;
              }
              if(!trovato){
                alert("There is no DBPedia info for this location in your language");
                return(undefined);
              }
            }
          } 
        )
        .catch((err) => {
          console.log("Errore: "+ err);
          return(undefined);
        });
  }

  searchPlusCodes = (location) => { 
    var url = "https://plus.codes/api?address="+ encodeURIComponent(location) +"&ekey="+ GOOGLE_KEY;
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
      .then(res => res.json())
      .then(
        (result) => {
          console.log(result); 
          return(result); 
          /*this.setState(prevState => ({
            myLocation: {
              ...prevState.myLocation,
              plusCode: result.plus_code.global_code,
              city: result.plus_code.locality.local_address, //Bologna, Italia
              city_code: result.plus_code.global_code.substring(0,4)
            }
          }));*/
        }
      )
      .catch((error) => {
        console.log(error);
    }); 
  }
  
  render() {
    //this.printstate();
    return (
      <View style={styles.container}
        onLayout={({ nativeEvent: { layout: { width } } }) => {
          if (this.state.containerWidth !== width) this.setState({ containerWidth: width });
        }}
      >
        <UserMap myLocation={this.state.myLocation} poi={this.state.markers} />

        <View style={styles.buttonGroup}>
          <TouchableOpacity onPress={this.fakeInitSearch} style={styles.button}>
            <Text style={styles.buttonText}>CERCO POI</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={this.shownhide}>
          <Text>SHOWNHIDE</Text>
        </TouchableOpacity>

        <View>
          {
            this.state.status ?
            <YouTube
              apiKey="AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0"
              videoId="nlLhw1mtCFA"
              play={this.state.isPlaying}
              fullscreen={this.state.fullscreen}
              controls={1}
              style={[
                { height: PixelRatio.roundToNearestPixel(this.state.containerWidth / (16 / 9)) },
                styles.player,
              ]}
              onError={e => this.setState({ error: e.error })}
              onReady={e => this.setState({ isReady: true })}
              onChangeState={e => this.setState({ status: e.state })}
              onChangeQuality={e => this.setState({ quality: e.quality })}
              onChangeFullscreen={e => this.setState({ fullscreen: e.isFullscreen })}
              onProgress={e => this.setState({ duration: e.duration, currentTime: e.currentTime })}
            />
            : null
          }
          </View>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  player: {
    alignSelf: 'stretch',
    marginVertical: 10,
  },
  buttonGroup: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#2196F3'
  },
  button: {
    //alignSelf: 'center'
  },
  buttonText: {
    padding: 20,
    color: 'white',
    alignSelf: 'center'
  }
});
