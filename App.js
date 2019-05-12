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
    myLocation: null,
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
    buttonstatus: "START" //toggleClass di Go/Stop
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
  }

  componentDidMount(){
    navigator.geolocation.delay = 5000;
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
      console.log("pp: "+ position.coords.latitude);
      if(this.state.trip_started){
        if(this.getDistance()<100){
          console.log("distance is ok");
          if(this.state.ready_to_listen){
            console.log("ready_to_listen is true");
            this.setState({ ready_to_listen: false });
            this.playAnnotation("why");
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

  shownhide = () => {
    if(this.state.yt_status) {
      this.setState({ yt_status: false })
    }
    else {
      this.setState({ yt_status: true })
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

  searchHoormiStrings = async () => {
    //pulire dalle ricerche precedenti
    //prendere city_code rispetto alla posizione dell'utente
    //trovare le boxes vicine
    //chiamare YouTube
    //filtrare i video HooRMI dalle descrizioni
    //chiama initMarkersAnnotations
    this.setState({
      markers: []
    })

    var myloc = this.state.myLocation.latitude + "," + this.state.myLocation.longitude;
    var city_code = await this.searchPlusCodes(myloc);
    city_code = city_code.plus_code.global_code.substring(0,6);
    var search_boxes = this.find_close_boxes(city_code);
    var video_list = [];
    //YouTube
    var i = 0; //cicli for
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
        for(let z=0; z<response.length; z++){
          let type_of_ann = response[z].match(/(why|how|what){1}?/);
          hoormi_str.push({ str: response[z], type: type_of_ann[0], video_id: video_list[i].id.videoId });
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
      promise = await this.initMarkersWithAnnotations(hoormi_str[i].str, "video", hoormi_str[i].video_id, hoormi_str[i].type);
    }
    this.setState({
      trip_started: true,
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

  pause = () => {
    if(this.state.in_ascolto){
      if(Platform === 'ios')
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
      if(Platform === 'ios'){
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
    Tts.stop();
    Tts.speak(this.state.text_to_read);
    this.setState({
      in_ascolto: true
    });
  }

  getDistance = () => {
    return geolib.getDistance(
      {latitude: this.state.myLocation.latitude, longitude: this.state.myLocation.longitude},
      {latitude: this.state.markers[this.state.current_poi].latitude, longitude: this.state.markers[this.state.current_poi].longitude}
    );
  }

  playAnnotation = (typoo) => {
    //stoppa prima un'eventuale annotazione in riproduzione
    this.pause();
    var my_ann = this.state.markers[this.state.current_poi][typoo]; 

    var i = 0; //cicli 
    while(i<my_ann.length){
      if(my_ann[i].visited){
        i++;
      } 
      else {
        if(my_ann[i].type_of_file == "text"){
          this.setState({
            text_to_read: my_ann[i].value
          });
          this.readText();
        }
        else if(my_ann[i].type_of_file == "video") {
          this.setState({
            yt_status: true,
            yt_id: my_ann[i].value,
            isPlaying: true
          });
        }
        this.setState({
          again: my_ann[i],
          stopped: false,
          lastTypeAnn: typoo,
          buttonstatus: "STOP"
        });
        var updated_markers = update(this.state.markers, {
          [this.state.current_poi]: {[typoo]: {[i]: {visited: {$set: true}}}}
        });
        this.setState({
          markers: updated_markers
        });
        break;
      }
      if(i>=my_ann.length){
        console.log("Non ci sono altri soundbite in lista");
      }
    }
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
    let watchid=navigator.geolocation.watchPosition(position => {  
      this.setState(prevState => ({
        myLocation: {
          ...prevState.myLocation,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.005
        }
      })); 
      console.log(position.coords.latitude);
      alert("meow");
      //doesn't work in emulator 
      /*if(this.state.trip_started){
        if(this.getDistance()<20){
          console.log("distance is ok");
          if(this.state.ready_to_listen){
            console.log("ready_to_listen is true");
            this.setState({ ready_to_listen: false });
            this.playAnnotation();
          }
        }
      }*/
      navigator.geolocation.clearWatch(watchid);
    }, error => console.log(err), this.options
    );
  }

  initLocationProcedure = () => {
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => { 
        this.setCurrentPosition(position); //Inizializza myLocation
        //this.watchCurrentPosition(); //Aggiorna costantemente myLocation
      }, err => console.log(err), this.options
    );
    } else {
      console.log("Your browser does not support the Geolocation API!");
    }
  }

  initUserPreferences = async () => {
    let user = await this.getUserKey();
    user = JSON.parse(user);
    //console.log(user);
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

  ytube = (query) => {
    var url="https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=AIzaSyD1saWNvYTd_v8sfbPB8puL7fvxKdjcfF0&maxResults=15&q="+ query;
    console.log(url);
    return fetch(url, {
      method: "GET",
    })
    .then(res => res.json())
    .then(
      (data) => { 
        console.log(data);
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
    console.log("PREMUTO"+ this.state.buttonstatus);
    if(this.state.buttonstatus == "START"){
      console.log("STARTED!");
      this.setState({
        buttonstatus: "GO",
      });
      this.searchHoormiStrings();
    }
    else if(this.state.buttonstatus == "GO"){
      if(this.state.stopped){
        this.resume(); 
      }   
      //else do nothing
    }
    else {
      //non metto controlli perchè l'unico caso in cui buttonstatus == STOP è se ho premuto GO, quindi so per certo che c'è qualcosa in riproduzione
      this.pause();
    }
  }

  longPress = () => {
    console.log("onlongpress");
    this.setState({ 
      buttonstatus: "START"
    });
  }

  //BACK: ri-riproduce il soundbite che precede l'ultimo riprodotto

  //MORE: riproduce il soundbite successivo dello stesso tipo dell'ultimo riprodotto
  getMore = () => {
    this.playAnnotation(this.state.lastTypeAnn);
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
  
  render() {
    //this.printstate();
    /*<TouchableOpacity onPress={this.shownhide}>
          <Text>SHOWNHIDE</Text>
        </TouchableOpacity>
      */
    return (
      <View style={styles.container}
        onLayout={({ nativeEvent: { layout: { width } } }) => {
          if (this.state.containerWidth !== width) this.setState({ containerWidth: width });
        }}
      >
        <UserMap myLocation={this.state.myLocation} poi={this.state.markers} />

        <View>

          <View style={styles.centralButton}>
            <TouchableOpacity 
              title="Go/Stop"
              onPress={this.toggleClass}
              onLongPress={this.longPress}
              style={styles.button}>
              <Text style={styles.buttonText}>{this.state.buttonstatus}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            title="MORE"
            style={styles.buttonGroup} 
            onPress={this.getMore}
            >
            <Text style={styles.buttonText}>MORE</Text>
          </TouchableOpacity>

        </View>

        <View>
          <TouchableOpacity onPress={this.printstate}>
            <Text>Stampami</Text>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity onPress={this.getGeoLocation}>
            <Text>get geolocation.navigator</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ytc}>
          {
            this.state.yt_status ?
            <YouTube
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
                this.setState({ yt_status: e.state });
                if(e.state == "ended"){
                  this.setState({
                    isPlaying: false, 
                    buttonstatus: "GO"
                  })
                }
                else if(e.state == "paused"){
                  this.setState({
                    isPlaying: false,
                    stopped: true,
                    buttonstatus: "GO"
                  })
                }
                else if(e.state == "playing"){
                  this.setState({
                    isPlaying: true,
                    stopped: false,
                    buttonstatus: "STOP"
                  })
                }
              }
              }
              onChangeQuality={e => this.setState({ quality: e.quality })}
              onChangeFullscreen={e => this.setState({ fullscreen: e.isFullscreen })}
              onProgress={e => this.setState({ duration: e.duration, currentTime: e.currentTime })}
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
    marginTop: 10
  },
  centralButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'red',
    borderRadius: 60,
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
    color: 'white'
    //alignSelf: 'center'
  }
});

/*
  PixelRatio.getPixelSizeForLayoutSize()
*/
