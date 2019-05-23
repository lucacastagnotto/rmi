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

----------------- UserMap Button FollowUserLocation

<View
  style={{
      position: 'absolute',//use absolute position to show button on top of the map
      top: '80%', //for center align
      alignSelf: 'flex-end', //for align to right
      marginBottom: 36,
      marginRight: 100
  }}
>
  <TouchableOpacity style={styles.flwusrloc} onPress={ () => {
    this.setfollow(true); 
    myloc = getloc();
    this.mymap.animateToRegion({
    latitude: myloc.latitude, longitude: myloc.longitude, 
    latitudeDelta: 0.002, longitudeDelta: 0.005}, 1000); }}
>
</TouchableOpacity>
</View>

  flwusrloc: {
    backgroundColor: 'blue',
    borderRadius: 50,
    marginRight: 36,
    width: 14,
    height: 14
  }


  ---------------------YTube

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
    <Text style={{fontSize: 100}}>{this.state.text_to_read}</Text> 
  }
</View>

        ytc: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 36
  },

  player: {
    alignSelf: 'stretch'//,
    //bottom: 0,
  },