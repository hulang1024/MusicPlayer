"use strict";

/*
音乐播放器主程序
author: HuLang
*/
window.onload = function() {
  var playList = new PlayList();
  var player = new Player(playList);
  var lyricView = new LyricView(player);
  var lyricWindow = new LyricWindow(player);
  
  playList.setPlayer(player);
  playList.init();
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
播放歌曲列表
0.展示有哪些歌曲
1.用户可以在列表中选择一个歌曲.
2.用户可以往列表中添加歌曲,和给歌曲设置对应的歌词.
3.给播放器提供歌曲
*/
function PlayList() {
  var songs = [];
  var playList = this;
  var player;
  
  this.signals = {
    songSelected: new signals.Signal()
  };
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
  
  this.setPlayer = function(_player) {
    player = _player;
  }
  
  this.init = function(_songs) {
    // load
    var req = new XMLHttpRequest();
    var url = CONFIG['songsUrl'];
    req.open('GET', url + '?t=' + +new Date(), true);
    req.addEventListener('load', function(event){
      var json = event.target.responseText;
      songs = JSON.parse(json);
      draw();
      
      playList.select(1);
    });
    req.send(null);
  };
  
  this.addPlay = function(song) {
    songs.add(song);
  }
  
  this.select = function(index) {
    select(index);
    player.load(index);
  }

  this.getSong = function(index) {
    select(index);
    return songs[index];
  }
  
  this.getLength = function() {
    return songs.length;
  }
  
  function draw() {
    var songListDiv = $('#songList');
    var ul = $(document.createElement('ul'));
    songs.forEach(function(song, index){
      var li = $(document.createElement('li'));
      li.data('index', index);
      li.text(song.name + " - " + song.artist);
      li.click(function() {
        var index = $(this).data('index');
        select(index);
        player.play(index);
      });
      
      ul.append(li);
    });
    songListDiv.append(ul);
  }
  
  function select(index) {
    var lis = $('#songList>ul>li');
    lis.removeClass('sel');
    lis.eq(index).addClass('sel');
  }
  
}

/*
歌曲播放
控制播放/暂停,上一首,下一首,显示进度条和进度数值
*/
function Player(playList) {
  var audio = document.getElementById('audio');
  var player = this;
  var playing = true; // 播放器播放状态
  // 模式: 循环=loop, 随机=shuffle, 单曲循环=one
  var mode = 'loop';
  // 当前要播放歌曲在列表中的索引
  var songSelectedIndex = 0;
  
  this.signals = {};
  ['timeupdate', 'loaded', 'played', 'paused', 'ended', 'seeking', 'seeked', 'prev', 'next'].forEach(function(name) {
    player.signals[name] = new signals.Signal();
  });
  
  var timeDisplay = $('#time');
  
  init();
  
  function init() {
    audio.onloadeddata = function() {
      displayTime(this.duration, this.currentTime);
      
      player.signals.loaded.dispatch(playList.getSong(songSelectedIndex), mode);
    }
    
    // 当用户点击Audio开始按钮可导致onplay
    audio.onplay = function() {
      console.log('play');
      playing = true;
      if (audio.played.length == 0 && audio.src == "") {
        var song = playList.getSong(songSelectedIndex);
        audio.src = song.url;
        audio.play();
      }
    }
    
    audio.onpause = function() {
      console.log('paused');
      playing = false;
      player.signals.paused.dispatch();
    }
    
    audio.ontimeupdate = function() {
      player.signals.timeupdate.dispatch( Math.round(this.currentTime * 1000) );
      
      displayTime(this.duration, this.currentTime);
    }
    
    audio.onseeking = function() {
      console.log('seeking');
      player.signals.seeking.dispatch(this.currentTime * 1000);
    }
    
    audio.onseeked = function() {
      console.log('seeked');
      player.signals.seeked.dispatch(this.currentTime * 1000);
    }
    
    audio.onended = function() {
      player.signals.ended.dispatch();
      
      switch (mode) {
        case 'loop':
          if (songSelectedIndex < playList.getLength() - 1)
            songSelectedIndex++;
          else
            songSelectedIndex = 0;
          break;
        case 'one':
          audio.loop = true;
          audio.play();
          return;
        case 'shuffle':
          shuffle();
          break;
      }
      
      var song = playList.getSong(songSelectedIndex);
      audio.src = song.url;
      audio.play();
    }
  
    // 为按钮绑定事件处理
    $('#player [data-action]').each(function(){
      $(this).click(function(){
        player[ $(this).data('action') + 'OnClick' ]($(this));
      });
    });
    
    displayTime(0,0);
  }
  
  this.load = function(index) {
    songSelectedIndex = index;
    var song = playList.getSong(index);
    audio.src = song.url;
  }
  
  this.play = function(index) {
    songSelectedIndex = index;
    var song = playList.getSong(index);
    audio.src = song.url;
    audio.play();
  }
  
  // 上一首
  this.prevOnClick = function() {
    player.signals.prev.dispatch();
    
    switch (mode) {
      case 'loop':
      case 'one':
        if (songSelectedIndex > 0)
          songSelectedIndex--;
        else
          songSelectedIndex = playList.getLength() - 1;
        break;
      case 'shuffle':
        shuffle();
        break;
    }
    
    var song = playList.getSong(songSelectedIndex);
    audio.src = song.url;
    // 如果播放状态中,上一首自动播放,如果暂停,上一首不自动播放
    if (playing) {
      audio.play();
    }
  }
  
  // 下一首
  this.nextOnClick = function() {
    player.signals.next.dispatch();
    
    switch (mode) {
      case 'loop':
      case 'one':
        if (songSelectedIndex < playList.getLength() - 1)
          songSelectedIndex++;
        else
          songSelectedIndex = 0;
        break;
      case 'shuffle':
        shuffle();
        break;
    }
    
    var song = playList.getSong(songSelectedIndex);
    audio.src = song.url;
    // 如果播放状态中,下一首自动播放,如果暂停,下一首不自动播放
    if (playing) {
      audio.play();
    }
  }
  
  this.modeOnClick = function(a) {
    a.removeClass('icon-' + mode);
    turnMode();
    a.addClass('icon-' + mode);
    var name = {'loop': '循环', 'shuffle': '随机', 'one': '单曲循环'}[mode];
    a.text(name);
    a.attr('title', name);
  }
  
  this.getMode = function() { return mode; }
  this.setMode = function(m) {
    if (['loop', 'shuffle', 'one'].indexOf(m) != -1)
      mode = m;
  }
  
  function turnMode() {
    switch (mode) {
      case 'loop':
        mode = 'shuffle';
        break;
      case 'shuffle':
        mode = 'one';
        break;
      case 'one':
        mode = 'loop';
        break;
    }
  }
  
  function shuffle() {
    var oldIndex = songSelectedIndex;
    do {
      songSelectedIndex = randInt(0, songs.length);
    } while(oldIndex == songSelectedIndex);
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
}

function LyricView(player) {
  var lyricViewDiv = $('#lyricView>div');
  var lyricViewHeight = $('#lyricView').height();
  var lyricTextHeight = 38;
  var lyricWindowDiv = $('#lyricWindow');
  
  var lyricList = null;
  var lastUpdateMS = 0;
  var lastIndex = 0, currentIndex = 0;
  var lyricReader = new LyricReader();

  player.signals.loaded.add(function(song, mode) {
    var req = new XMLHttpRequest();
    req.open('GET', song.lrcUrl, true);
    req.addEventListener('load', function(event){
      var content = event.target.responseText;
      
      lyricReader.addReadListener(function(){
        lyricList = lyricReader.getSortedTimeTextList();
        reset();
        draw();
      });
      lyricReader.readString(content);
    });
    req.send(null);
  });
  
  player.signals.timeupdate.add(onTimeUpdate);
  player.signals.seeking.add(onSeeking);
  player.signals.seeked.add(onSeeked);
  player.signals.ended.add(reset);
  player.signals.prev.add(reset);
  player.signals.next.add(reset);
  
  function onSeeking(time) {
  }
  
  function onSeeked(time) {
    for (var i = 0; i < lyricList.length; i++) {
      if (time >= lyricList[i].time)
        break;
    }
    currentIndex = i;
  }
  
  function onTimeUpdate(updateMS) {
    if (updateMS < lyricList[currentIndex].time) {
      lastUpdateMS = updateMS;
      return;
    }
    
    gotoLyric(currentIndex, 'slow');
    
    lyricWindowDiv.text(lyricList[currentIndex].text);
    
    lastIndex = currentIndex;
    currentIndex++;
    
    lastUpdateMS = updateMS;
  }
  
  function gotoLyric(index, speed) {
    lyricViewDiv.find('#time-' + lyricList[lastIndex].time).removeClass('sel');
    lyricViewDiv.find('#time-' + lyricList[index].time).addClass('sel');
    
    if (index < Math.floor(lyricViewHeight / lyricTextHeight) / 2) {
      var top = parseInt(lyricViewDiv.css('top'));
      if (top != 0) {
        lyricViewDiv.animate({'top': '0'}, speed, 'swing');
      }
    } else {
      var top = - (index - Math.floor(lyricViewHeight / lyricTextHeight) / 2) * lyricTextHeight;
      lyricViewDiv.animate({'top': top + 'px'}, speed, 'swing');
    }
  }
  
  function reset() {
    lyricViewDiv.text('');
    lastIndex = 0;
    currentIndex = 0;
    lastUpdateMS = 0;
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

function LyricWindow() {
  
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

function padNN(n) {
  return n < 10 ? '0' + n : n;
}

// 随机[m,n)
function randInt(m, n) {
  return Math.floor(Math.random() * (m + n)) - m;
}