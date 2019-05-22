import React, {Component} from 'react';
import {Platform, StyleSheet, Text, TouchableOpacity, ScrollView, View, AsyncStorage, PixelRatio} from 'react-native';

import UserMap from './components/UserMap';
import Tts from 'react-native-tts';
import Speech from './components/Speech';
import TestButton from './components/TestButton';
import update from 'immutability-helper';
import geolib from 'geolib';
import YouTube, { YouTubeStandaloneIOS, YouTubeStandaloneAndroid } from 'react-native-youtube';
import geomock from './components/geomock';

var GOOGLE_KEY = "AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
var DBPEDIA_KEY = "a87affce-e8fb-4b31-b64c-43d19e64cfcd";
var nextkey = 0; //valore necessario da attribuire come 'key' a ciascun <Marker> di <MapView>. Da aggiornare (++) dopo ogni assegnazione
var plus_code_digits = ["2", "3", "4", "5", "6", "7", "8", "9", "C", "F", "G", "H", "J", "M", "P", "Q", "R", "V", "W", "X"];


type Props = {};

export default class App extends Component<Props> {

  state = {
    //myLocation: null,
    myLocation: {
      latitude: 44.494412, 
      longitude: 11.346656,
      latitudeDelta: 0.002,
      longitudeDelta: 0.005
    },
    markers: [],
    text_to_read: "This is Hoormi",
    ttsStatus: "initializing",
    selectedVoice: null,
    speechRate: 1,//0.6,
    //speechPitch: 1.5
    user_language: null,
    in_ascolto: false, //controllo del riproduttore vocale
    stopped: false, //true se ho un soundbite che è stato interrotto (STOP button)
    ready_to_listen: false, //controllo di riproduzioni di annotazioni (sia video sia testo)
    trip_started: false, //controllo se ho iniziato un tour
    current_poi: 0, //intero che è indice dell'array markers (Es: if(current_poi==5) allora sto considerando markers[5] )
    //current_annotation: 0, // indice dell'array del tipo (what/how/why) che è stato riprodotto per ultimo
    again: null, //memorizza ultimo soundbite riprodotto (utile per comando 'again')
    lastTypeAnn: null, //memorizza il tipo dell'ultimo soundbite riprodotto (utile per 'more') NB: si può integrare con 'again' in un'unica variabile
    isReady: false,
    yt_id: null,
    quality: null,
    error: null,
    isPlaying: false, //controllo di riproduzione video
    duration: 0,
    currentTime: 0,
    fullscreen: false,
    containerWidth: null,
    yt_status: false, //toggleClass di YouTube
    seekto: false,
    followUserLocation: true,
    buttonstatus: "CERCA" //toggleClass di Go/Stop
  }

  options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  }

  constructor(props){
    super(props);
    console.disableYellowBox = true;
    //this.initLocationProcedure();
    this.initUserPreferences();
    Tts.addEventListener("tts-start", event =>
      this.setState({ ttsStatus: "started" })
    );
    Tts.addEventListener("tts-finish", event => {
      this.setState({ 
        ttsStatus: "finished", 
        in_ascolto: false,
        buttonstatus: "GO" 
      });
    });
    Tts.addEventListener("tts-cancel", event =>
      this.setState({ ttsStatus: "cancelled" })
    );
    
    //Tts.setDefaultPitch(this.state.speechPitch);
    //Tts.setDefaultRate(this.state.speechRate);
    Tts.getInitStatus().then(this.initTts()); 
    //this.fakeInitSearch();
    //this.watchCurrentPosition();
    this.changefollow = this.changefollow.bind(this);
  }

  componentDidMount(){
    var watchid;
    watchid=navigator.geolocation.watchPosition(position => { 
      console.log("position: "+ position.coords.latitude + "," + position.coords.longitude); 
      this.setState(prevState => ({
        myLocation: {
          ...prevState.myLocation,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.005
        }
      }));
      if(this.state.trip_started){
        let myloc = Object.assign({}, this.state.myLocation);
        let nextpoi = Object.assign({}, this.state.markers[this.state.current_poi])
        let distanza = this.getDistance(myloc, nextpoi); console.log("distanza: "+ distanza);
        //if(this.getDistance()<100){
        if(distanza < 100){
          console.log("distance is ok");
          if(this.state.ready_to_listen){
            console.log("ready_to_listen is true");
            this.setState({ ready_to_listen: false });
            let myann = Object.assign({}, this.state.markers[this.state.current_poi].why[0]);
            this.playAnnotation(myann);
          }
        }
      }
    }, error => console.log(err), this.options
    )
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(watchid);
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

  initTts = async () => {
    try {
      await Tts.setDefaultLanguage('en-US');
    } catch (err) {
      // My Samsung S9 has always this error: "Language is not supported"
      console.log(`setDefaultLanguage error `, err);
    }
    var myvoice;
    if( Platform.OS === 'android' ){
      await Tts.setDefaultVoice('en-us-x-sfg#male_1-local');
      myvoice = "en-us-x-sfg#male_1-local";
    }
    else if( Platform.OS === 'ios' ){
      await Tts.setDefaultVoice("com.apple.ttsbundle.Samantha-compact");
      myvoice = "com.apple.ttsbundle.Samantha-compact";
    }
    this.setState({
        selectedVoice: myvoice,
        ttsStatus: "initialized"
    });
  }

/*
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
  } */

  get_next = (char) => {
  var nextItem;
  index = plus_code_digits.indexOf(char);
  if((index >= 0 ) && (index < plus_code_digits.length)){
    if(char == "X")
      nextItem = 2;
    else
      nextItem = plus_code_digits[index + 1];
  }
  return(nextItem);
}

  get_prev = (char) => {
    var nextItem;
    index = plus_code_digits.indexOf(char);
    if((index >= 0 ) && (index < plus_code_digits.length)){
      if(char == 2)
        nextItem = "X";
      else
        nextItem = plus_code_digits[index - 1];
    }
    return(nextItem);
  }

  replaceAt = (mystring, index, ftt) => {
    return mystring.substring(0, index) + ftt(mystring.charAt(index)) + mystring.substring(index + 1);
  }

  get_left = (inizialized) => {
    var mystring = inizialized;
    if(inizialized.charAt(3) == "2")
      mystring = this.replaceAt(mystring, 1, this.get_prev);
    if(inizialized.charAt(5) == "2")
      mystring = this.replaceAt(mystring, 3, this.get_prev);
    mystring = this.replaceAt(mystring, 5, this.get_prev);
    return(mystring);
  }

  get_right = (inizialized) => {
    var mystring = inizialized;
    if(inizialized.charAt(3) == "X")
      mystring = this.replaceAt(mystring, 1, this.get_next);
    if(inizialized.charAt(5) == "X")
      mystring = this.replaceAt(mystring, 3, this.get_next);
    mystring = this.replaceAt(mystring, 5, this.get_next);
    return(mystring);
  }

  get_up = (inizialized) => {
    var mystring = inizialized;
    if(inizialized.charAt(2) == "X")
      mystring = this.replaceAt(mystring, 0, this.get_next);
    if(inizialized.charAt(4) == "X")
      mystring = this.replaceAt(mystring, 2, this.get_next);
    mystring = this.replaceAt(mystring, 4, this.get_next);
    return(mystring);
  }

  get_down = (inizialized) => {
    var mystring = inizialized;
    if(inizialized.charAt(2) == "2")
      mystring = this.replaceAt(mystring, 0, this.get_prev);
    if(inizialized.charAt(4) == "2")
      mystring = this.replaceAt(mystring, 2, this.get_prev);
    mystring = this.replaceAt(mystring, 4, this.get_prev);
    return(mystring);
  }

  find_close_boxes = (city_code) => {
    var six_codes = [9]; //JavaScript non vuole la dimensione, forse va tolta
    six_codes[4] = city_code;

    //box up
    six_codes[1] = this.get_up(city_code);

    //box up-left
    six_codes[0] = this.get_left(six_codes[1]);

    //box up-right
    six_codes[2] = this.get_right(six_codes[1]);

    //box right
    six_codes[5] = this.get_right(city_code);;

    //box left
    six_codes[3] = this.get_left(city_code);

    //box down
    six_codes[7] = this.get_down(city_code);

    //box down-left
    six_codes[6] = this.get_left(six_codes[7]);

    //box down-right
    six_codes[8] = this.get_right(six_codes[7]);

    return(six_codes);
  }

  YTube = (city_code) => { 
    
    //considera il NextPage
    var url="https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key="+ GOOGLE_KEY +"&maxResults=50&q="+  encodeURIComponent(city_code);
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
      .then(res => res.json())
      .then(
        (result) => {
          console.log(result);
          //result.items[key].id.videoId
          return(result);
        })
      .catch((error) => {
        console.log(error);
    }); 
  }

  get_YTdescription = (idvid) => { 

    var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&key="+ GOOGLE_KEY +"&id="+ encodeURIComponent(idvid);
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
      .then(res => res.json())
      .then(
        (data) => { 
          console.log(data);
          return(data.items[0].snippet.description);
        } 
      )
      .catch((error) => {
        console.log(error);
      });
  }

  getYTDuration = (id_vid) => {
    var url = "https://www.googleapis.com/youtube/v3/videos?id="+ id_vid +"&part=contentDetails&key=AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
      .then(res => res.json())
      .then(
        (data) => { 
          console.log(data);
          return(data.items[0].contentDetails.duration);
        } 
      )
      .catch((error) => {
        console.log(error);
      });
  }

  searchHoormiStrings = async () => {
    //pulire dalle ricerche precedenti
    //prendere city_code rispetto alla posizione dell'utente
    //trovare le boxes vicine
    //chiamare YouTube
    //filtrare i video HooRMI dalle descrizioni
    //chiama initMarkersAnnotations
    this.setState({
      markers: []
    });

    var myloc = this.state.myLocation.latitude + "," + this.state.myLocation.longitude;
    var city_code = await this.searchPlusCodes(myloc);
    city_code = city_code.plus_code.global_code.substring(0,6);
    var search_boxes = this.find_close_boxes(city_code);
    var video_list = [];
    //YouTube
    var i, z = 0; //cicli for
    for(i=0; i<9; i++){
      var result = await this.YTube(search_boxes[i]);
      if(result.pageInfo.totalResults != (0 || undefined)){
        video_list = video_list.concat(result.items);
      }
    }

    //filtra
    const regex = /([C-X]|[c-x]|[2-9]){8}(\+)+([C-X]|[c-x]|[2-9]){2}(\:)+(\S)*/g;
    var delete_these = []; //salva gli indici dell'array video_list[] che non contengono video HooRMI
    var hoormi_str = [];
    for(i=0; i<video_list.length; i++){
      video_list[i].description = await this.get_YTdescription(video_list[i].id.videoId);
      let response = video_list[i].description.match(regex); 
      if(response != null){
        var start = 0;
        for(z=0; z<response.length; z++){ 
          let type_of_ann = response[z].match(/(why|how|what){1}?/);
          var durata = response[z].match(/([0-9]){1,4}s/); 
          if(durata == null){
            durata = await this.getYTDuration(video_list[i].id.videoId);
            console.log("DUUUUURATA: "+ durata)
            let regex1 = /[0-9]{1,2}M/g;
            let regex2 = /[0-9]{1,2}S/g;
            let min = durata.match(regex1);
            if(min != null){
              min[0] = min[0].substring(0, min[0].length - 1); console.log("MINUTI: "+ min[0]);
              min[0] = parseFloat(min[0]);
              min[0] = min[0] * 60;
            }
            else
              min = [0];
            let sec = durata.match(regex2);
            sec[0] = sec[0].substring(0, sec[0].length - 1); console.log("SECONDI: "+ sec[0]);
            sec[0] = parseFloat(sec[0]);
            durata = [min[0] + sec[0]]; console.log("DURATA: "+ durata[0]);  
            hoormi_str.push({ str: response[z], type: type_of_ann[0], video_id: video_list[i].id.videoId, start: 0, duration: durata[0] });
          }
          else {
            durata[0] = durata[0].substring(0, durata[0].length - 1); console.log("durata aggiustata: "+ durata[0]);
            durata[0] = parseFloat(durata[0]);
            hoormi_str.push({ str: response[z], type: type_of_ann[0], video_id: video_list[i].id.videoId, start: start, duration: durata[0] });
            start = start + durata[0];
          }
        }
      }
      else
        delete_these.push(i);
    }
    var count = 0; //conta gli elementi che mano a mano vengono cancellati
    for(i=0; i<delete_these.length; i++){
      video_list.splice((delete_these[i] - count), 1);
      count++;
    }
    //console.log("hoormi_str: "+ JSON.stringify(hoormi_str));
    //console.log("video_list: "+ JSON.stringify(video_list));
    //initMarker
    var promise;
    for(i=0; i<hoormi_str.length; i++){
      //promise = await this.initMarkersWithAnnotations("8FPHF8VV+57:why:ita:his-art", "video", "DCBRsxLCV40", "why");
      promise = await this.initMarkersWithAnnotations(hoormi_str[i].str, "video", hoormi_str[i].video_id, hoormi_str[i].type, hoormi_str[i].start, hoormi_str[i].duration);
    }
    if(this.state.markers.length > 0){
      var order = await this.getDirections(); 
      console.log("order: "+ order);
      this.mergeMarkers(order);
      this.setState({
        buttonstatus: "START"
      });
    } 
    else
      console.log("Non ci sono annotazioni nelle vicinanze");
  }

  mergeMarkers = (order) => {
    var idx = order[order.length-1]; //indice dell'elemento destination
    console.log("rimuovo: "+ idx);
    //rimuovo destination e copio markers
    //ordino markers
    //markers.push destination 
    var ordered_markers = update(this.state.markers, {
      $splice: [[[idx], 1]]
    }); 

    var ordinato = [];

    for(var i=0; i<order.length-1; i++){
      ordinato.push(ordered_markers[order[i]]);
    }
    ordinato.push(this.state.markers[idx]);
    this.setState({
      markers: ordinato
    });

  }

  initMarkersWithAnnotations = async (rmistring, type_of_file, content, type_of_annotation, start, duration) => {

    var trovato = false;
    var i = 0;
    if(this.state.markers.length != 0){
      while((i<this.state.markers.length) && (!trovato)){
        if(this.state.markers[i].id == rmistring.substring(0,11)){
          //il marker esiste già (questa specifica annotazione invece no, la dobbiamo comunque creare e aggiungerla a what[]/why[]/how[])
          console.log("aggiungo annotazione di una stringa già esistente");
          trovato = true;
          var newmark = update(this.state.markers, {
            [i]: {[type_of_annotation]: {$push: [{type_of_file: type_of_file, value: content, hoormi_str: rmistring, start: start, duration: duration, visited: false}]}}  
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
        id: rmistring.substring(0,11), //è il plus code che definisce tale POI
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
      console.log("dbpedia value: "+ dbpedia_value);
      if(dbpedia_value != undefined) {
        newmark.why.push({type_of_file: "text", value: dbpedia_value, hoormi_str: null, visited: false});
      }
      else {
        var check_title = await this.wiki(newmark.title);
        if(check_title != newmark.title) {
          let promise = await this.dbpedia(check_title);
          if(promise != undefined) {
            newmark.why.push({type_of_file: "text", value: promise, hoormi_str: null, visited: false});
          }
        }
      }
      console.log("ho aggiornato newmark con annotazione dbpedia");
      newmark[type_of_annotation].push({
        type_of_file: type_of_file,
        value: content, //se video-->videoID, se testo-->testo, altro...
        hoormi_str: rmistring,
        start: start,
        duration: duration,
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

  pause = () => {
    console.log("faccio pausa");
    if(this.state.in_ascolto){
      if(Platform.OS === 'ios')
        Tts.pause();
      else
        Tts.stop();
      this.setState({ 
        in_ascolto: false,
        stopped: true,
        buttonstatus: "GO"
      });
    }
    else if(this.state.isPlaying){
      this.setState({ 
        isPlaying: false,
        stopped: true,
        buttonstatus: "GO"
      });
    }
    else {
      console.log("Non c'è niente in riproduzione");
    }
  }

  resume = () => {
    if(this.state.again.type_of_file == "text"){
      if(Platform.OS === 'ios'){
        Tts.resume();
        this.setState({ 
          in_ascolto: true,
          stopped: false,
          buttonstatus: "STOP"
        });
      }
      else
        this.readText();
      this.setState({ 
        //in_ascolto: true, viene già fatto in readText()
        stopped: false,
        buttonstatus: "STOP"
      }); 
    }
    else if(this.state.again.type_of_file == "video"){
      this.setState({
        isPlaying: true,
        stopped: false,
        buttonstatus: "STOP"
      });
    }
  }

  readText = async () => {
    console.log("read text");
    Tts.stop();
    Tts.speak(this.state.text_to_read);
    this.setState({
      in_ascolto: true
    });
  }

  getDistance = (origin, destination) => {
    return geolib.getDistance(
      {latitude: origin.latitude, longitude: origin.longitude},
      {latitude: destination.latitude, longitude: destination.longitude}
    );
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

  initLocationProcedure = () => {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => { 
        this.setCurrentPosition(position); //Inizializza myLocation
      }, err => console.log(err), this.options
    );
    } else {
      console.log("Your browser does not support the Geolocation API!");
    }
  }

  initUserPreferences = async () => {
    var user = await this.getUserKey();
    if( user == null ){
      user = {
        lang: "en"
      }
    }
    else
      user = JSON.parse(user);
    this.setState({
      user_language: user.lang
    })
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
    var url="http://vmdbpedia.informatik.uni-leipzig.de:8080/api/1.0.0/values?property=dbo%3Aabstract&format=JSON&pretty=NONE&limit=100&offset=0&oldVersion=false&key="+ DBPEDIA_KEY +"&oldVersion=false&entities="+ coded_title;//+ encodeURI(this.state.mynextloc.title);
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
        }
      )
      .catch((error) => {
        console.log(error);
    }); 
  }

  toggleClass = () => {
    console.log("PREMUTO "+ this.state.buttonstatus);

    if(this.state.buttonstatus == "CERCA"){
      console.log("STO CERCANDO!");
      //cercare annotations
      //ordinare annotations
      //aggiornare buttonstatus
      this.searchHoormiStrings(); //svolge tutti e tre i compiti
    }
    else if(this.state.buttonstatus == "START"){
      this.setState({
        trip_started: true,
        ready_to_listen: true,
        buttonstatus: "GO"
      });
    }
    else if(this.state.buttonstatus == "GO"){
      if(this.state.stopped){
        this.resume(); 
      }   
      //else do nothing
    }
    else if(this.state.buttonstatus == "STOP"){
      this.pause();
    }
  }

  longPress = () => {
    console.log("onlongpress");
    this.setState({ 
      buttonstatus: "CERCA",
      trip_started: false,
      ready_to_listen: false
    });
  }

  playAnnotation = async (my_ann) => {
    //gestisci eccezioni:
    //  l'annotazione che si vuole riprodurre in realtà non esiste
    //
    if(my_ann != (undefined || null)){
      await this.pause(); 
      this.setState({
        again: my_ann //lo faccio ora e non dopo assieme agli altri setState perché ne ho bisogno per seekTo
      });
      if(my_ann.type_of_file == "text"){
        this.setState({
          text_to_read: my_ann.value,
          yt_status: false
        });
        this.readText();
      }
      else if(my_ann.type_of_file == "video"){
        this.setState({
          yt_status: true,
          yt_id: my_ann.value,
          isPlaying: true,
          seekto: true
        });
      }
      var typoo = "why"; //faccio questo perché le annotazioni dbpedia hanno 'null' nel campo hoormi_str e in quel caso sono di tipo 'why'
      var index = 0;
      if(my_ann.hoormi_str != null){
        let tipo = my_ann.hoormi_str.match(/(why|how|what){1}?/);
        typoo = tipo[0];
        var ann_array = this.state.markers[this.state.current_poi][typoo];
        for(var i=0; i<ann_array.length; i++){
          if(my_ann.hoormi_str == ann_array[i].hoormi_str){
            index = i;
            break;
          }
        }
      }
      
      this.setState({
        stopped: false,
        lastTypeAnn: typoo,
        buttonstatus: "STOP"
      });
      var updated_markers = update(this.state.markers, {
        [this.state.current_poi]: {[typoo]: {[index]: {visited: {$set: true}}}}
      });
      this.setState({
        markers: updated_markers
      });
    }
    else
      console.log("Non ci sono annotazioni da riprodurre");
  }

  

  //COMANDI:

  //MORE: riproduce il soundbite successivo dello stesso tipo dell'ultimo riprodotto
  getMore = () => {
    var my_ann = this.state.markers[this.state.current_poi][this.state.lastTypeAnn];
    if(my_ann != ( undefined || null )){
      var i = 0;
      while(i<my_ann.length){
        if(my_ann[i].visited){
          i++;
        }
        else{
          this.playAnnotation(my_ann[i]);
          break;
        }
      }
      if(i>=my_ann.length){
        console.log("Non ci sono altri soundbite da riprodurre");
      }
    }
  }

  //PREV: riproduce il soundbite precedente all'ultimo riprodotto
  goPrev = () => {
    var my_ann = this.state.markers[this.state.current_poi][this.state.lastTypeAnn];
    var i = 0;
    if(my_ann.length == (0 || undefined || null))
      console.log("Errore: non ci sono annotazioni");
    else if(this.state.again.hoormi_str == my_ann[0].hoormi_str)
        console.log("Can't go backwards more");  
    else{
      while(i<my_ann.length - 1){
        if(my_ann[i+1].hoormi_str === this.state.again.hoormi_str){
          console.log("yes are equal");
          this.playAnnotation(my_ann[i]);
          break;
        }
        else
          i++;
      }
    }
  }

  //AGAIN: ripete l'ultimo soundbite riprodotto
  playAgain = () => {
    var myann = Object.assign({}, this.state.again);
    this.playAnnotation(myann);
  }

  //NEXT: passa alla prossima location in lista
  goNext = () => {
    this.pause();
    this.setState( prevState => ({
      current_poi: prevState.current_poi + 1,
      ready_to_listen: true
    }));
  }

  //BACK: torna indietro di una location in lista
  goBack = () => {
    this.pause();
    this.setState( prevState => ({
      current_poi: prevState.current_poi - 1,
      ready_to_listen: true
    }));
  }

  //LATER: swap location this con location next
  goLater = async () => {
    if(this.state.current_poi < this.state.markers.length - 1){
      await this.pause();
      var swap = Object.assign({}, this.state.markers[this.state.current_poi]);
      var new_order = update( 
        update(this.state.markers, {
          $splice: [[[this.state.current_poi], 1]]
        }), {
          $splice: [[[this.state.current_poi + 1], 0, swap]]
        }
      );
      this.setState({
        markers: new_order,
        ready_to_listen: true
      });
    }
    else
      console.log("Non ci sono POI succssivi");
  }

  getGeoLocation = () => {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => { 
        console.log("position: "+ position.coords.latitude + ", "+ position.coords.longitude);
      }, err => console.log(err), this.options
    );
    } else {
      console.log("Your browser does not support the Geolocation API!");
    }
  }

  changefollow = (val) => {
    this.setState({
      followUserLocation: val
    });
  }

  getDirections = () => {
    var index_max = this.getdis();
    var waypoints = "";
    for(var i=0; i<this.state.markers.length; i++){
      if(i != index_max){
      waypoints = waypoints.concat("|" + this.state.markers[i].latitude + "," + this.state.markers[i].longitude);
      }
    }

    var url = "https://maps.googleapis.com/maps/api/directions/json?origin="+ this.state.myLocation.latitude +","+ this.state.myLocation.longitude +"&destination="+ this.state.markers[index_max].latitude +","+ this.state.markers[index_max].longitude +"&waypoints=optimize:true"+ waypoints +"&key=AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
      .then(res => res.json())
      .then(
        (result) => {
          console.log(result);
          var order = result.routes[0].waypoint_order;
          order.push(index_max);
          return(order);
        })
      .catch((error) => {
        console.log(error);
    }); 
  }

  getdis = () => {
    //var alldistances = [];
    var max = -1;
    var index_max = -1;
    var origin = Object.assign({}, this.state.myLocation);
    for(var i=0; i<this.state.markers.length; i++){
      let destination = Object.assign({}, this.state.markers[i]);
      let distance = this.getDistance(origin, destination);
      if(max<distance){
        max = distance;
        index_max = i;
      }
      //alldistances.push({ myobj: destination, distance: distance});
    }
    console.log("destination: "+ this.state.markers[index_max].title);
    return(index_max);
  }

  getNumber = (type) => {
    var myann = this.state.markers[this.state.current_poi];
    if(myann == (null || undefined)){
      return("");
    }
    else if(myann[type] == (null || undefined)){
      return(0);
    }
    else{
      return(myann[type].length);
    }
  }
  
  render() {

    return (

      <View style={styles.container}
        onLayout={({ nativeEvent: { layout: { width } } }) => {
          if (this.state.containerWidth !== width) this.setState({ containerWidth: width });
        }}
      >
        <UserMap myLocation={this.state.myLocation} poi={this.state.markers} follow={this.state.followUserLocation} changefollow={this.changefollow} />

        <View>

          <TouchableOpacity 
            title="BACK"
            style={{backgroundColor: 'blue', alignSelf: 'center', marginTop: 10}} 
            onPress={this.goBack}
            >
            <Text style={styles.buttonText}>BACK</Text>
          </TouchableOpacity>

          <View style={{flexDirection:'row', alignItems: 'center', alignSelf: 'center'}}>

            <TouchableOpacity 
              title="PREV"
              style={{backgroundColor: 'blue', alignSelf: 'center', marginRight: 10, marginTop: 8}} 
              onPress={this.goPrev}
              >
              <Text style={styles.buttonText}>PREV</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              title="Go/Stop"
              onPress={this.toggleClass}
              onLongPress={this.longPress}
              style={styles.centralButton}>
              <Text style={{color: 'white'}}>{this.state.buttonstatus}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              title="MORE"
              style={{backgroundColor: 'blue', alignSelf: 'center', marginLeft: 10, marginTop: 8}} 
              onPress={this.getMore}
              >
              <Text style={styles.buttonText}>MORE</Text>
            </TouchableOpacity>

          </View>

          <TouchableOpacity 
            title="NEXT"
            style={{backgroundColor: 'blue', alignSelf: 'center', marginTop: 10}} 
            onPress={this.goNext}
            >
            <Text style={styles.buttonText}>NEXT</Text>
          </TouchableOpacity>

          <View style={{flexDirection:'row'}}>

            <TouchableOpacity 
              title="AGAIN"
              style={styles.buttonGroup} 
              onPress={this.playAgain}
              >
              <Text style={styles.buttonText}>AGAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              title="LATER"
              style={styles.buttonGroup} 
              onPress={this.goLater}
              >
              <Text style={styles.buttonText}>LATER</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              title="WHAT"
              style={[ styles.buttontype, {marginLeft: 40}]} 
              onPress={ () => {
                if(this.state.markers[this.state.current_poi] != (null || undefined))
                  this.playAnnotation(this.state.markers[this.state.current_poi].what[0])
              }}
              >
              <Text style={{color: 'black', margin: 5}}>WHAT </Text><Text>{this.getNumber("what")}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              title="HOW"
              style={styles.buttontype} 
              onPress={ () => {
                if(this.state.markers[this.state.current_poi] != (null || undefined))
                  this.playAnnotation(this.state.markers[this.state.current_poi].how[0])
              }}
              >
              <Text style={{color: 'black', margin: 5}}>HOW</Text><Text>{this.getNumber("what")}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              title="WHY"
              style={styles.buttontype} 
              onPress={ () => {
                if(this.state.markers[this.state.current_poi] != (null || undefined))
                  this.playAnnotation(this.state.markers[this.state.current_poi].why[0])
              }}
              >
              <Text style={{color: 'black', margin: 5}}>WHY</Text><Text>{this.getNumber("what")}</Text>
            </TouchableOpacity>

          </View>

        </View>

        <View>
          <TouchableOpacity onPress={this.printstate}>
            <Text>Stampami</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ytc}>
          {
            this.state.yt_status ?
            <YouTube
              ref={component => {
                this.youTubeRef = component;
              }}
              apiKey="AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0"
              videoId={this.state.yt_id}
              play={this.state.isPlaying}
              fullscreen={this.state.fullscreen}
              controls={1}
              style={[
                { height: PixelRatio.roundToNearestPixel(this.state.containerWidth / (16 / 9)) },
                styles.player,
              ]}
              onError={e => this.setState({ error: e.error })}
              onReady={e => this.setState({ isReady: true })}
              onChangeState={e => {
                console.log("e.state: "+ e.state);
                if(e.state == "ended"){
                  this.setState({
                    //isPlaying: false, 
                    buttonstatus: "GO"
                  })
                }
                else if(e.state == "paused"){
                  this.setState({
                    //sPlaying: false,
                    stopped: true,
                    buttonstatus: "GO"
                  })
                }
                else if(e.state == "playing"){
                  this.setState({
                    //isPlaying: true,
                    stopped: false,
                    buttonstatus: "STOP"
                  })
                }
                if(this.state.seekto){
                  this.youTubeRef.seekTo(this.state.again.start);
                  this.setState({
                    seekto: false
                  });
                }
              }}
              onChangeQuality={e => this.setState({ quality: e.quality })}
              onChangeFullscreen={e => this.setState({ fullscreen: e.isFullscreen })}
              onProgress={e => {
                this.setState({ duration: e.duration, currentTime: e.currentTime }); 
                console.log("current time: "+ e.currentTime);
                if(e.currentTime >= (this.state.again.duration + this.state.again.start - 0.500)){
                  console.log("devo fermarmi!");
                  this.pause();
                }
              }}
            />
            : 
            <Text>{this.state.text_to_read}</Text> 
          }
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
    //justifyContent: 'center',
  },
  ytc: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 36
  },
  player: {
    alignSelf: 'stretch'//,
    //bottom: 0,
  },
  buttonGroup: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'blue',
    marginTop: 10,
    marginLeft: 10
  },
  buttontype: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'blue',
    marginTop: 10,
    marginLeft: 10
  },
  centralButton: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'red',
    borderRadius: 50,
    marginTop: 10,
    width: 50,
    height: 50
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    margin: 5
  }
});

/*
  PixelRatio.getPixelSizeForLayoutSize()
*/