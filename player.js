"use strict";

/*
音乐播放器主程序
author: HuLang
*/
window.onload = function() {
  var playList = new PlayList();
  var player = new Player(playList);
  var lyricView = new LyricView(player);
  
  playList.load();
}

/*
播放歌曲列表
0.展示有哪些歌曲
1.用户可以在列表中选择一个歌曲.
2.用户可以往列表中添加歌曲,和给歌曲设置对应的歌词.
3.给播放器提供歌曲
*/
function PlayList() {
  var songs = [];
  var playList = this;
  // 当前要播放歌曲在列表中的索引
  var nowIndex = 0;
  
  /*
  var openAudioUrlButton = document.getElementById('openAudioUrl');
  openAudioUrlButton.onclick = function() {
    var url = document.getElementById('audioUrl').value.trim();
    if (!url)
      return;
    playList.addPlay(
      new Song({
        url: url
      }));
  }


  var openLyricUrlButton = document.getElementById('openLyricUrl');
  openLyricUrlButton.onclick = function() {
    var url = document.getElementById('lyricUrl').value.trim();
    if (!url)
      return;
  }
  
  var openLyricFileButton = document.getElementById('openLyricFile');
  openLyricFileButton.onclick = function() {
    var fileUpload = document.getElementById('file');
    fileUpload.addEventListener('change', function() {
      var file = this.files[0];
      //var type = file.type.split('/')[0];
      var src = this.value;
      var ext = src.substring(src.lastIndexOf('.') + 1);
      // 检查是否是lrc文件
      if (ext != 'lrc') {
        alert('该文件不是lrc歌词格式文件!');
        return;
      }
      
      var reader = new FileReader();
      reader.onload = function() {
        lyricReader.readString(this.result);
      };
      reader.readAsText(file);
      
    });
    fileUpload.click();
  }
  */
  
  this.load = function() {
    var SONGS = [
      {name: '心跳 - 王力宏', artist: '王力宏',
        url: "http://og11a17b0.bkt.clouddn.com/%E7%8E%8B%E5%8A%9B%E5%AE%8F%20-%20%E5%BF%83%E8%B7%B3.mp3",
        lrcUrl: "http://og11a17b0.bkt.clouddn.com/%E7%8E%8B%E5%8A%9B%E5%AE%8F%20-%20%E5%BF%83%E8%B7%B3.lrc"
      }
    ];
    songs = SONGS;
    
    draw();
  };
  
  this.addPlay = function(song) {
    songs.add(song);
  }
  
  // 返回歌曲
  this.getSong = function() {
    return songs[nowIndex];
  }
  
  function draw() {
    
  }
  
}

/*
歌曲
*/
function Song(sepc) {
  this.name = sepc.name;
  this.artist = sepc.artist;
  this.url = sepc.url;
  this.lrcUrl = sepc.lrcUrl;
}

/*
播放歌曲
控制播放/暂停,上一首,下一首,显示进度条和进度数值
*/
function Player(playList) {
  var audio = document.getElementById('audio');

  var player = this;
  
  this.signals = {};
  ['timeupdate', 'played', 'paused', 'seeking', 'seeked', 'prev', 'next'].forEach(function(name) {
    player.signals[name] = new signals.Signal();
  });
  
  var timeDisplay = $('#time');
  
  init();
  
  function init() {
    audio.onloadeddata = function() {
      displayTime(this.duration, this.currentTime);
    }
    
    // 当用户点击Audio开始按钮
    audio.onplay = function() {
      console.log('play');
      
      if (audio.played.length == 0 && audio.src == "") {
        // 获取歌曲信息
        var song = playList.getSong();
        // 设置URL
        audio.src = song.url;
        // 播放
        audio.play();
      }
    
      player.signals.played.dispatch(playList.getSong());
    }
    
    audio.onpause = function() {
      console.log('paused');
      player.signals.paused.dispatch();
    }
    
    audio.ontimeupdate = function() {
      player.signals.timeupdate.dispatch( Math.round(this.currentTime * 1000) );
      
      displayTime(this.duration, this.currentTime);
    }
    
    $('#btns>a').each(function(){
      $(this).click(function(){
        player[ $(this).data('action') ]();
      });
    });
    
    displayTime(0,0);
  }
  
  audio.onseeking = function() {
    console.log('seeking');
    player.signals.seeking.dispatch(this.currentTime * 1000);
  }
  
  audio.onseeked = function() {
    console.log('seeked');
    player.signals.seeked.dispatch(this.currentTime * 1000);
  }
  
  this.play = function() {
    if (audio.paused) {
      //TODO: 结束时是否也是paused? 待测试
      if (audio.played.length == 0 && audio.src == "") {
        // 获取歌曲信息
        var song = playList.getSong();
        // 设置URL
        audio.src = song.url;
        // 播放
        audio.play();
      }
    } else {
      audio.pause();
    }
  }
  
  function displayTime(duration, currentTime) {
    return;
    var curMinutes = currentTime / 60;
    var curSeconds = currentTime % 60;
    var durMinutes = duration / 60;
    var durSeconds = duration % 60;
    timeDisplay.html('<em>' + padNN(curMinutes) + ':' + padNN(curSeconds) + '</em> / '
      + padNN(durMinutes) + ':' + padNN(durSeconds));
  }
  
  function padNN(n) {
    return n < 10 ? '0' + n : n;
  }
}

function LyricView(player) {
  var lyricViewDiv = $('#lyricView>div');
  var lyricViewHeight = $('#lyricView').height();
  
  var lyricList = null;
  var lastUpdateMS = 0;
  var lastIndex = 0, currentIndex = 0;
  var lyricReader = new LyricReader();

  player.signals.played.add(function(song) {
    var req = new XMLHttpRequest();
    req.open('GET', song.lrcUrl, true);
    req.addEventListener('load', function(event){
      var content = event.target.responseText;
      lyricReader.readString(content);
    });
    req.send(null);
  });
  
  player.signals.timeupdate.add(function(time){
    onTimeUpdate(time);
  });

  player.signals.seeking.add(function(time){
    onSeeking(time);
  });
  player.signals.seeked.add(function(time){
    onSeeked(time);
  });
  
  lyricReader.addReadListener(function(){
    lyricList = lyricReader.getSortedTimeTextList();
    draw();
  });
  
  function getLyricTextHeight() {
    return 42;
  }
  
  var seeking = false;
  
  function onSeeking(time) {
    seeking = true;
  }
  
  function onSeeked(time) {
    for (var i = 0; i < lyricList.length; i++) {
      if (time >= lyricList[i].time)
        break;
    }
    currentIndex = i;
    
    gotoLyric(currentIndex, 'fast');
    seeking = false;
  }
  
  function onTimeUpdate(updateMS) {
    console.log('lyricView.onTimeUpdate')
    if (seeking)
      return;
    if (updateMS < lyricList[currentIndex].time) {
      lastUpdateMS = updateMS;
      return;
    }
    
    gotoLyric(currentIndex, 'slow');
    
    lastIndex = currentIndex;
    currentIndex++;
    
    lastUpdateMS = updateMS;
  }
  
  function gotoLyric(index, speed) {
    lyricViewDiv.find('#time-' + lyricList[lastIndex].time).removeClass('sel');
    lyricViewDiv.find('#time-' + lyricList[index].time).addClass('sel');
    var top;

    top = -index * getLyricTextHeight() + Math.ceil(lyricViewHeight / getLyricTextHeight() / 2) * getLyricTextHeight();
    lyricViewDiv.animate({'top': top + 'px'}, speed, 'swing');
  }
  
  function draw() {
    lyricViewDiv.text('');
    lyricList.forEach(function(lyric) {
      var text = document.createElement('p');
      text.id = 'time-' + lyric.time;
      $(text).text(lyric.text);
      text.title = lyric.timeText;
      lyricViewDiv.append(text);
    });
  }
}


/*
歌词读取器
*/
function LyricReader() {
  var timeTextList = []; //时间标签列表 [{time:绝对毫秒,text:文本},...]
  var idMap = {}; // 标识标签map
  
  this.readString = function(str) {
    timeTextList = [];
    idMap = {};
    
    var lines = str.split('\n');
    
    var lyricLineCnt = 0;
    lines.forEach(function(line) {
      
      line = line.trim();
      if (line.length == 0)
        return;
      
      var index = line.indexOf(']');
      var lead = line.substring(0, index + 1); //TODO:只支持行首

      //是否标签 [*]
      if (lead.length > 2 && (lead[0] == '[' && lead[lead.length - 1] == ']')) {
        var tag = lead.substring(1, lead.length - 1); //标签内容 *
        //判断是否注释标签 [:]
        if (tag == ':') {
          
        } else { 
          //拆分标签内容
          var parts = tag.split(':');
          //判断是否有效标签
          if (parts.length > 1) {
            //判断是否时间标签 [mm:ss], [mm:ss.xx]或[mm:ss:xx]
            if (/[+-]*\d+/.test(parts[0])) {
              var minutes = parseInt(parts[0]); //分
              var seconds; // 秒
              var xx; // 毫秒
              if (parts.length == 2) {
                if (parts[1].indexOf('.') != -1) {
                  var t = parts[1].split('.');
                  seconds = parseInt(t[0]);
                  if (t[0][0] == '-') //TODO: 不支持负数
                    return;
                  xx = parseInt(t[1]);
                } else {
                  seconds = parseInt(parts[1]);
                  xx = 0;
                }
              } else if (parts.length == 3) {
                seconds = parseInt(parts[1]);
                xx = parseInt(parts[2]);
              }

              //转换成毫秒
              var ms = minutes * 60 * 1000 + seconds * 1000 + xx;
               //TODO: 同行支持多个时间标签
              var text = line.substring(index + 1).trim();
              timeTextList.push({time: ms, text: text, timeText: tag});
              lyricLineCnt++;
            } else {
              var text = line.substring(index + 1).trim();
              idMap[tag] = text;
            }
          }
        }
      }
    })
    
    
    timeTextList.sort(function(x, y){ return x.time - y.time; });
        
    readListener();
  }
  
  var readListener;
  
  this.addReadListener = function(func) {
    readListener = func;
  }

  this.getSortedTimeTextList = function() {
    return timeTextList;
  }
  
  this.getIdValue = function(id) {
    return idMap[id];
  }
}
