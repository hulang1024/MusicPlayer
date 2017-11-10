// JS严格模式
"use strict";

window.onload = function() {
  new MusicPlayer();
}

function MusicPlayer() {
  var playList = new PlayList();
  var player = new Player(playList);
  var lyricLoader = new LyricLoader();
  var lyricListView = new LyricListView(player, lyricLoader);
  var lyricWindow = new LyricWindow(player, lyricLoader);
  playList.setPlayer(player);
  playList.init();
  
  new ActiveManager(player);
}

/*
歌曲
*/
function Song(sepc) {
  this.name = sepc.name;
  this.artist = sepc.artist;
  // 歌曲URL
  this.url = sepc.url;
  // 歌词文件URL
  this.lrcUrl = sepc.lrcUrl;
}

/*
播放歌曲列表
0.展示有哪些歌曲
1.用户可以在列表中选择一个歌调用播放器播放.
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
      
      // 处理地址栏参数
      var index = 0;
      var params = getURLParamMap(window.location.search);
      if (!isNaN(params['song-index'])) {
        index = parseInt(params['song-index']);
      }
      if (params['time']) {
        player.signals.loadeddata.addOnce(function() {
          player.setCurrentTime(parseInt(params['time']));
        });
      }
      if (params['play']) {
        player.signals.loadeddata.addOnce(function() {
          player.play();
        });
      }
      
      playList.select(index);
    });
    req.send(null);
  };
  
  this.select = function(index) {
    if (songs.length <= 0)
      return;
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
        player.load(index);
        player.play();
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
歌曲播放器
*/
function Player(playList) {
  var player = this;
  // HTML5 Audio组件
  var audio = document.getElementById('audio');

  // 播放器播放按钮状态
  var playing = true;
  // 模式: 循环=loop, 随机=shuffle, 单曲循环=one
  var mode = 'loop';
  // 当前要播放歌曲在列表中的索引
  var songSelectedIndex = 0;
  // 鼠标是否悬停
  var hovered = false;
  /* 可订阅的信号 */
  this.signals = {};
  var signalNames = [
    'loadstart', 'loadeddata', 'played', 'timeupdate', 'paused', 'ended', 'seeking', 'seeked', 'prev', 'next'
  ];
  signalNames.forEach(function(name) {
    player.signals[name] = new signals.Signal();
  });
    
  init();
  
  function init() {
    // 为按钮绑定事件处理
    $('#player [data-action]').each(function(){
      $(this).click(function(){
        player[ $(this).data('action') + 'OnClick' ]($(this));
      });
    });
    
    $('#player').hover(function() {
      hovered = true;
    }).mouseout(function() {
      hovered = false;
    });
    
    $('#player').show();
    resize();
    window.addEventListener('resize', resize);
    
    audio.onloadstart = function() {
      console.log('loadstart');
      player.signals.loadstart.dispatch();
    }
    
    audio.onloadeddata = function() {
      console.log('loadeddata');
      displayTime(this.duration, this.currentTime);
      
      player.signals.loadeddata.dispatch(playList.getSong(songSelectedIndex), mode);
    }
    
    // 当用户点击Audio开始按钮可导致onplay
    audio.onplay = function() {
      console.log('play');
      playing = true;
      var song = playList.getSong(songSelectedIndex);
      document.title = song.name;
      player.signals.played.dispatch(songSelectedIndex);
    }
    
    audio.onpause = function() {
      console.log('paused');
      playing = false;
      player.signals.paused.dispatch();
    }
    
    audio.ontimeupdate = function() {
      player.signals.timeupdate.dispatch( Math.round(this.currentTime * 1000), this.seeking);
      
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
  }
  
  this.load = function(index) {
    songSelectedIndex = index;
    var song = playList.getSong(index);
    audio.src = song.url;
  }
  
  this.play = function(index) {
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
  
  this.hide = function() {
    if (hovered)
      return;
    
    $(audio).animate({bottom: - $('#player').height()}, 'slow');
  }
  
  this.show = function() {
    $(audio).animate({bottom: 0}, 100);
  }
  
  this.setCurrentTime = function(currentTime) {
    audio.currentTime = currentTime;
  }
  this.getCurrentTime = function() {
    return audio.currentTime * 1000;
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
    $('#time').html('<em>' + padNN(curMinutes) + ':' + padNN(curSeconds) + '</em> / '
      + padNN(durMinutes) + ':' + padNN(durSeconds));
  }
  
  function resize() {
    $('#audio').css('left', ($(window).width() - $('#audio').width()) / 2);
  }
}

function ActiveManager(player) {
  var me = this;
  var timer = null;
  var isSleeping = true;
  var lastActiveTime = 0;
  
  var intervalTime = 3000;
  
  
  /* 1.在指定间隔时间内没有活动操作就表现‘睡眠’.
     2.活动操作时醒来  */
  
  $(document).mousemove(function(){
    lastActiveTime = +new Date;
    wakeup();
  });
  
  var timer = setInterval(function(){
    if ((+new Date - lastActiveTime) > intervalTime) {
      sleep();
    }
  }, intervalTime);

  function wakeup() {
    if (!isSleeping)
      return;
    isSleeping = false;
    $('#songList').fadeIn(100);
    player.show();
  }
  
  function sleep() {
    if (isSleeping)
      return;
    isSleeping = true;
    $('#songList').fadeOut();
    player.hide();
  }
}

function padNN(n) {
  return n < 10 ? '0' + n : n;
}

// 随机[m,n)
function randInt(m, n) {
  return Math.floor(Math.random() * (m + n)) - m;
}

function getURLParamMap(url) {
  //解析参数map
  var param = url.substr(url.lastIndexOf("?") + 1);
  if (!param)
    return {};
  
  param = param.split("&");
  var paramMap = {};
  param.map(function(p){
    var pairs = p.split("=");
    paramMap[pairs[0]] = pairs[1];
  });
  return paramMap;
}
