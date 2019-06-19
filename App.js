import React, {Component} from 'react';
import {Platform, StyleSheet, Text, TouchableOpacity, ScrollView, View, AsyncStorage, PixelRatio, Image, FlatList} from 'react-native';
import { ListItem, CheckBox, Overlay } from 'react-native-elements'

import UserMap from './components/UserMap';
import Tts from 'react-native-tts';
import Speech from './components/Speech';
import TestButton from './components/TestButton';
import update from 'immutability-helper';
import geolib from 'geolib';
import YouTube, { YouTubeStandaloneIOS, YouTubeStandaloneAndroid } from 'react-native-youtube';
import GestureRecognizer, {swipeDirections} from 'react-native-swipe-gestures';
import HTML from 'react-native-render-html';
//import geomock from './components/geomock';

var GOOGLE_KEY = "AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
var DBPEDIA_KEY = "a87affce-e8fb-4b31-b64c-43d19e64cfcd";
var nextkey = 0; //valore necessario da attribuire come 'key' a ciascun <Marker> di <MapView>. Da aggiornare (++) dopo ogni assegnazione
var plus_code_digits = ["2", "3", "4", "5", "6", "7", "8", "9", "C", "F", "G", "H", "J", "M", "P", "Q", "R", "V", "W", "X"];


type Props = {};

export default class App extends Component<Props> {

  state = {
    myLocation: null,
    markers: [],
    mypoi: [],
    showInfo: false,
    route: [],
    listenToRoute: false,
    index_route: 0,
    gestureName: null,
    directions: "",
    text_to_read: "",
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
    list: false,
    showSM: false,
    isVisible: false,
    buttonstatus: "FIND" //toggleClass di Go/Stop
  }

  options = {
    enableHighAccuracy: true,
    timeout: 5000,
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
        let nextpoi = Object.assign({}, this.state.mypoi[this.state.current_poi])
        var distanza = this.getDistance(myloc, nextpoi); console.log("distanza: "+ distanza);
        if(distanza < 30){
          console.log("distance is ok");
          if(this.state.ready_to_listen){
            console.log("ready_to_listen is true");
            this.setState({ 
              ready_to_listen: false,
              listenToRoute: false,
              route: [],
              index_route: 0
            });
            let myann = Object.assign({}, this.state.mypoi[this.state.current_poi].why[0]);
            this.playAnnotation(myann);
          }
        }
        else {
          //ascolta direzione
          if((this.state.index_route + 1) >= this.state.route.length){
            console.log("Non ho altre indicazioni perché dovresti essere già arrivato. Avvicinati al POI");
          }
          else {
            let nextstep = {
              latitude: this.state.route[this.state.index_route].end_location.lat,
              longitude: this.state.route[this.state.index_route].end_location.lng
            };
            distanza = this.getDistance(myloc, nextstep); console.log("distanza da nextstep: "+ distanza);
            if(distanza < 10){
              console.log("leggi il prossimo step");
              let next_step = this.state.route[this.state.index_route + 1].html_instructions;
              this.setState( prevState => ({
                index_route: prevState.index_route + 1,
                text_to_read: next_step
              }));
            }
            else{
              console.log("Non sei abbastanza vicino nè al poi nè alla prossima indicazione");
            }
          }
        }
      }
    }, error => console.log(error), this.options
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
            let regex1 = /[0-9]{1,2}M/g;
            let regex2 = /[0-9]{1,2}S/g;
            let min = durata.match(regex1);
            if(min != null){
              min[0] = min[0].substring(0, min[0].length - 1); 
              min[0] = parseFloat(min[0]);
              min[0] = min[0] * 60;
            }
            else
              min = [0];
            let sec = durata.match(regex2);
            sec[0] = sec[0].substring(0, sec[0].length - 1);
            sec[0] = parseFloat(sec[0]);
            durata = [min[0] + sec[0]];  
            hoormi_str.push({ str: response[z], type: type_of_ann[0], video_id: video_list[i].id.videoId, start: 0, duration: durata[0] });
          }
          else {
            durata[0] = durata[0].substring(0, durata[0].length - 1); 
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
    return(this.state.markers.length);
    /*if(this.state.markers.length > 0){
      var order = await this.getDirections(); 
      console.log("order: "+ order);
      this.mergeMarkers(order);
      this.setState({
        buttonstatus: "START",
        list: true
      });
      //Genera FlatList
    } 
    else
      console.log("Non ci sono annotazioni nelle vicinanze");*/
  }

  mergeMarkers = (order) => {
    var idx = order[order.length-1]; //indice dell'elemento destination
    //rimuovo destination e copio markers
    //ordino markers
    //markers.push destination 
    var ordered_markers = update(this.state.mypoi, {
      $splice: [[[idx], 1]]
    }); 

    var ordinato = [];

    for(var i=0; i<order.length-1; i++){
      ordinato.push(ordered_markers[order[i]]);
    }
    ordinato.push(this.state.mypoi[idx]);
    this.setState({
      mypoi: ordinato
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
        how: [],
        onlist: false
      }
      nextkey++;
      //Ho stringa HooRMI, da cui trovo: Coordinate tramite searchPlusCodes, da cui trovo Titolo tramite osm_call(), da cui trovo Dbpedia tramite dbpedia()
      var coords = await this.searchPlusCodes(rmistring.substring(0,11)); //ritorna l'oggetto json
      newmark.latitude = coords.plus_code.geometry.location.lat;
      newmark.longitude = coords.plus_code.geometry.location.lng;
      newmark.title = await this.osm_call(newmark.latitude, newmark.longitude);
      console.log("check before dbpedia");
      var dbpedia_value = await this.dbpedia(newmark.title);
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
      showInfo: true,
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

  toggleClass = async () => {
    console.log("PREMUTO "+ this.state.buttonstatus);

    if(this.state.buttonstatus == "FIND"){
      console.log("STO CERCANDO!");
      //cercare annotations
      //ordinare annotations
      //aggiornare buttonstatus
      var results = await this.searchHoormiStrings(); 
      if(results > 0){
        this.setState({
          buttonstatus: "START",
          list: true
        });
        //Genera FlatList
      } 
      else
        console.log("Non ci sono annotazioni nelle vicinanze")
    }
    else if(this.state.buttonstatus == "START"){
      var route = await this.getRoute();
      this.setState({
        showInfo: true,
        route: route,
        listenToRoute: true,
        trip_started: true,
        ready_to_listen: true,
        index_route: 0,
        text_to_read: route[0].html_instructions,
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
      buttonstatus: "FIND",
      trip_started: false,
      ready_to_listen: false,
      showInfo: false,
      list: false
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
          showInfo: true,
          text_to_read: my_ann.value,
          yt_status: false
        });
        this.readText();
      }
      else if(my_ann.type_of_file == "video"){
        this.setState({
          showInfo: true,
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
        var ann_array = this.state.mypoi[this.state.current_poi][typoo];
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
      var updated_markers = update(this.state.mypoi, {
        [this.state.current_poi]: {[typoo]: {[index]: {visited: {$set: true}}}}
      });
      this.setState({
        mypoi: updated_markers
      });
    }
    else
      console.log("Non ci sono annotazioni da riprodurre");
  }

  

  //COMANDI:

  //MORE: riproduce il soundbite successivo dello stesso tipo dell'ultimo riprodotto
  goMore = () => {
    var my_ann = this.state.mypoi[this.state.current_poi];
    if(my_ann == (undefined || null))
      console.log("Non hai ancora scelto una location");
    else if(my_ann[this.state.lastTypeAnn] != (undefined || null)){
      my_ann = my_ann[this.state.lastTypeAnn];
      var i = 0;
      while(i<my_ann.length){
        if(my_ann[i].visited){ //bisogna resettare a 'visited: false' quando si cambia tipo di soundbite o location
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
    var my_ann = this.state.mypoi[this.state.current_poi];
    if(my_ann == (undefined || null)){
      console.log("Errore: non hai ancora scelto una location valida");
      return(null);
    }
    if(my_ann[this.state.lastTypeAnn] == (undefined || null))
      console.log("Errore: non ci sono annotazioni");
    else if(this.state.again.hoormi_str == my_ann[this.state.lastTypeAnn][0].hoormi_str)
        console.log("Can't go backwards more");  
    else{
      var i = 0;
      while(i<my_ann.length - 1){
        if(my_ann[this.state.lastTypeAnn][i+1].hoormi_str === this.state.again.hoormi_str){
          //console.log("yes are equal");
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
  goNext = async () => {
    if(this.state.current_poi < (this.state.mypoi.length - 1)){
      this.pause();
      this.setState( prevState => ({
        current_poi: prevState.current_poi + 1,
        ready_to_listen: true,
        again: null,
        buttonstatus: "GO",
        in_ascolto: false,
        isPlaying: false,
        yt_status: false,
        lastTypeAnn: null,
        stopped: false,
        yt_id: null,
        seekto: false
      }), async function(){
            var route = await this.getRoute();
            this.setState({
              showInfo: true,
              route: route,
              listenToRoute: true,
              trip_started: true,
              index_route: 0,
              text_to_read: route[0].html_instructions
            });
          }
      );
    }
    else
      console.log("Non ci sono altre location");
  }

  //BACK: torna indietro di una location in lista
  goBack = async () => {
    if(this.state.trip_started && (this.state.current_poi > 0)){
      this.pause();
      this.setState( prevState => ({
        current_poi: prevState.current_poi - 1,
        ready_to_listen: true
      }), async function(){
            var route = await this.getRoute();
            this.setState({
              showInfo: true,
              route: route,
              listenToRoute: true,
              trip_started: true,
              index_route: 0,
              text_to_read: route[0].html_instructions,
              yt_status: false
            });
          }
      );
    }
    else
      console.log("Non ci sono location precedenti a questa");
  }

  //LATER: swap location this con location next
  goLater = async () => {
    if(this.state.current_poi < this.state.mypoi.length - 1){
      await this.pause();
      var swap = Object.assign({}, this.state.mypoi[this.state.current_poi]);
      var new_order = update( 
        update(this.state.mypoi, {
          $splice: [[[this.state.current_poi], 1]]
        }), {
          $splice: [[[this.state.current_poi + 1], 0, swap]]
        }
      );
      this.setState({
        mypoi: new_order,
        ready_to_listen: true,
      }, async function(){
            var route = await this.getRoute();
            this.setState({
              showInfo: true,
              route: route,
              listenToRoute: true,
              trip_started: true,
              index_route: 0,
              text_to_read: route[0].html_instructions,
              yt_status: false
            });
          }
      );
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
    var url = "";
    if(this.state.mypoi.length==1)
      url = "https://maps.googleapis.com/maps/api/directions/json?origin="+ this.state.myLocation.latitude +","+ this.state.myLocation.longitude +"&destination="+ this.state.mypoi[index_max].latitude +","+ this.state.mypoi[index_max].longitude +"&key=AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0"; 
    else {
      for(var i=0; i<this.state.mypoi.length; i++){
        if(i != index_max){
          waypoints = waypoints.concat("|" + this.state.mypoi[i].latitude + "," + this.state.mypoi[i].longitude);
        }
      }
      url = "https://maps.googleapis.com/maps/api/directions/json?origin="+ this.state.myLocation.latitude +","+ this.state.myLocation.longitude +"&destination="+ this.state.mypoi[index_max].latitude +","+ this.state.mypoi[index_max].longitude +"&waypoints=optimize:true"+ waypoints +"&key=AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
    }
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

  getRoute = () => {
    console.log("destinazione: "+ this.state.mypoi[this.state.current_poi].latitude +","+ this.state.mypoi[this.state.current_poi].longitude);
    var url = "https://maps.googleapis.com/maps/api/directions/json?origin="+ this.state.myLocation.latitude +","+ this.state.myLocation.longitude +"&destination="+ this.state.mypoi[this.state.current_poi].latitude +","+ this.state.mypoi[this.state.current_poi].longitude +"&language="+ this.state.user_language +"&mode=walking&key=AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0";
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
      .then(res => res.json())
      .then(
        (result) => {
          console.log(result);
          /*for(var i=0; i<result.routes[0].legs[0].steps.length; i++){
            route = route.concat(result.routes[0].legs[0].steps[i].html_instructions + ". <br>");
          }*/
          return(result.routes[0].legs[0].steps);
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
    for(var i=0; i<this.state.mypoi.length; i++){
      let destination = Object.assign({}, this.state.mypoi[i]);
      let distance = this.getDistance(origin, destination);
      if(max<distance){
        max = distance;
        index_max = i;
      }
      //alldistances.push({ myobj: destination, distance: distance});
    }
    console.log("destination: "+ this.state.mypoi[index_max].title);
    return(index_max);
  }

/*
  getNumber = (type) => {
    if(this.state.mypoi.length <= 0){
      return("");
    }
    else {
      var myann = this.state.mypoi[this.state.current_poi];
      return(myann[type].length)
    }
  }*/

  onSwipeUp(gestureState) {
    console.log("Swipe up!");
    this.goBack();
  }

  onSwipeDown(gestureState) {
    console.log("Swipe down!");
    this.goNext();
  }

  onSwipeLeft(gestureState) {
    console.log("Swipe left!");
    this.goPrev();
  }

  onSwipeRight(gestureState) {
    console.log("Swipe right!");
    this.goMore();
  }

  //onProgressAndroid
  gettime = () => {
    this.youTubeRef
      .currentTime()
      .then(currentTime => {
        console.log("currentTime: "+ currentTime);
        if(currentTime >= (this.state.again.duration + this.state.again.start - 0.500)){
          this.pause();
          this.setState({ currentTime: currentTime });
          return(null);
        }
        setTimeout(this.gettime, 500);
    })
  }

  render() {

    return (

      <View style={styles.container}
        onLayout={({ nativeEvent: { layout: { width } } }) => {
          if (this.state.containerWidth !== width) this.setState({ containerWidth: width });
        }}
      >

        <View style={styles.menuBar}>
          <TouchableOpacity onPress={() => {this.printstate(); this.setState({showSM: !this.state.showSM})}}>
            <Image style={{marginLeft: 0}} source={require('./components/menu.png')} />
          </TouchableOpacity>
          <Text style={{color: 'black', marginLeft: 95, fontSize: 20}}>HOORMI</Text>
        </View>

        <View style={styles.mapContainer}>
          <UserMap 
            myLocation={this.state.myLocation} 
            poi={this.state.mypoi} 
            follow={this.state.followUserLocation} 
            changefollow={this.changefollow} 
            hideList={ async () => {
              if(this.state.list){
                var order = await this.getDirections(); 
                this.mergeMarkers(order);
                this.setState({list: false});
              }
            }} />
        </View>

        { this.state.showSM && (
          <View style={styles.sidemenu}>
            <TouchableOpacity onPress={() => this.setState({ isVisible: true })}>
              <Text style={styles.textSM}>Language</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => this.setState({ list: true, showSM: false })}>
              <Text style={styles.textSM}>List of POI</Text>
            </TouchableOpacity>
          </View>
        )}

        <Overlay 
          isVisible={this.state.isVisible}
          overlayBackgroundColor='white'
          height='40%'
          width='60%'
          onBackdropPress={() => this.setState({ isVisible: false })}
        >
          <Text>Ita</Text>
        </Overlay>

        { this.state.showInfo && (
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
                      yt_status: false,
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
                    });
                    if(Platform.OS === 'android'){
                      this.gettime();
                    }
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
                  //console.log("current time: "+ e.currentTime);
                  if(e.currentTime >= (this.state.again.duration + this.state.again.start - 0.500)){
                    this.pause();
                  }
                }}
              />
              : this.state.listenToRoute ?
              <ScrollView style={{ height: 120, backgroundColor: 'white', opacity: 0.8 }}>
                <Text style={{fontSize: 30, alignSelf: 'center', fontWeight: 'bold', backgroundColor: 'white'}}>{this.state.mypoi[this.state.current_poi].title}</Text> 
                <HTML html={this.state.text_to_read} baseFontStyle={{ fontSize: 20}} />
              </ScrollView> 
              : 
              <ScrollView style={{ height: PixelRatio.roundToNearestPixel(this.state.containerWidth / (16 / 9)), backgroundColor: 'white', opacity: 0.8 }}>
                <Text style={{fontSize: 30, alignSelf: 'center', fontWeight: 'bold', backgroundColor: 'white'}}>{this.state.mypoi[this.state.current_poi].title}</Text> 
                <Text style={{fontSize: 20}} >{this.state.text_to_read}</Text>
              </ScrollView>
            }
          </View>
          )}

          {!this.state.list && (
          <GestureRecognizer
            onSwipeUp={(state) => this.onSwipeUp(state)}
            onSwipeDown={(state) => this.onSwipeDown(state)}
            onSwipeLeft={(state) => this.onSwipeLeft(state)}
            onSwipeRight={(state) => this.onSwipeRight(state)}
            style={styles.controls}
          >
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between'}}>
              <TouchableOpacity onPress={() => this.playAgain()} >
                <Image source={require('./components/again24.png')} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => this.goLater()} >
                <Image source={require('./components/later24.png')} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              title="Go/Stop"
              onPress={this.toggleClass}
              onLongPress={this.longPress}
              style={styles.centralButton}>
              <Text style={{color: 'white', fontSize: 10}}>{this.state.buttonstatus}</Text>
            </TouchableOpacity>

            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
              <TouchableOpacity style={styles.wbuttons} onPress={}>
                <Text style={styles.wtext}>WHAT: {this.state.mypoi[this.state.current_poi].what.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.wbuttons}>
                <Text style={styles.wtext}>WHY: {this.state.mypoi[this.state.current_poi].why.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.wbuttons}>
                <Text style={styles.wtext}>HOW: {this.state.mypoi[this.state.current_poi].how.length}</Text>
              </TouchableOpacity>
            </View>
          </GestureRecognizer>
          )}

          {this.state.list && (
            <FlatList
              data={this.state.markers}
              renderItem={({item, index}) =>  (
                <ListItem
                  leftAvatar={{source: {uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Bologna-SanPetronioPiazzaMaggiore1.jpg/1504px-Bologna-SanPetronioPiazzaMaggiore1.jpg"} }}
                  title={item.title}
                  subtitle={"Dis: "+ ((this.getDistance(this.state.myLocation, item)/1000).toFixed(2)) + " km"}
                  rightSubtitle={"WHY: "+ item.why.length}
                  checkBox={{checked: item.onlist, onPress:() => {
                    if(!item.onlist){
                      var nwpoi = update(this.state.mypoi, {
                        $push: [this.state.markers[index]]
                      })
                    }
                    else {
                      //trova indice corrispondente di mypoi
                      var pos = this.state.mypoi.findIndex(e => e.id === this.state.markers[index].id)
                      var nwpoi = update(this.state.mypoi, {
                        $splice: [[[pos], 1]]
                      })
                    }
                    this.setState({
                      mypoi: nwpoi
                    });
                    var nwmark = update(this.state.markers, {
                      [index]: {onlist: {$set: !this.state.markers[index].onlist}}
                    });
                    this.setState({
                      markers: nwmark
                    });
                  } }}
                  containerStyle={{ borderBottomWidth: 1, borderColor: 'grey'}}
                />
              )}
              keyExtractor={item => item.title}
              style={{position: 'absolute', height: '40%', width: '100%', bottom: 0}}
            />
          )}

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
  menuBar: {
    height: 60,
    width: '100%',
    top: 0,
    borderWidth: 5,
    borderColor: 'red',
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  mapContainer: {
    flex: 1,
    width: '100%'
  },
  sidemenu: {
    position: 'absolute',
    flex: 1,
    top: 0,
    marginTop: 60,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderRightColor: 'blue',
    height: '40%',
    width: '55%',
    backgroundColor: 'white',
    flexDirection: 'column'
  },
  textSM: {
    fontSize: 20, 
    marginTop: 15,
    marginLeft: 10, 
    fontWeight: 'bold',

  },
  controls: {
    position: 'absolute',
    flex: 0,
    flexDirection: 'column',
    alignSelf: 'center',
    height: 150,
    width: '80%',
    bottom: 0,
    marginBottom: 60,
    borderWidth: 2,
    borderColor: 'blue'
    //opacity: 0.2, 
  },
  centralButton: {    
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'red',
    borderRadius: 50,
    width: 50,
    height: 50
  },
  wbuttons: {
    margin: 5
  },
  wtext: {
    fontSize: 5
  },
  ytc: {
    position: 'absolute',
    flex: 1,
    top: '20%',
    //justifyContent: 'center',
    alignSelf: 'center',
    //alignItems: 'center',
    borderWidth: 2,
    borderColor: 'orange',
    width: '80%'
  },
  player: {
    alignSelf: 'stretch'
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
  <TouchableOpacity style={{borderWidth: 2, marginLeft: 0, borderColor: 'green'}} onPress={this.printstate}><Image source={require('./images/menu.png')} /></TouchableOpacity>
*/