"use strict";

/*
音乐播放器主程序
author: HuLang
*/
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

function ActiveManager(player) {
  var me = this;
  var timer = null;
  var isSleeping = true;
  var lastActiveTime = 0;
  
  var intervalTime = 3000;
  
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
  var hovered = false;
  
  this.signals = {};
  
  var signalNames = [
    'loadstart', 'loadeddata',
    'played', 'timeupdate', 'paused', 'ended', 'seeking', 'seeked',
    'prev', 'next'
  ];
  signalNames.forEach(function(name) {
    player.signals[name] = new signals.Signal();
  });
  
  var timeDisplay = $('#time');
  
  init();
  
  function init() {
    $('#player').show();
    $('#audio').css('left', ($(window).width() - $('#audio').width()) / 2);
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

    displayTime(0,0);
    
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
  
  this.hide = function() {
    if (hovered)
      return;
    
    $(audio).animate({bottom: - $('#player').height()}, 'slow');
  }
  
  this.show = function() {
    $(audio).animate({bottom: 0}, 100);
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

function LyricListView(player, lyricLoader) {
  var lyricViewDiv = $('#lyricView');
  var lyricViewHeight = $('#lyricView').height();
  var lyricTextHeight = 38;
  
  var lyricList = null;
  var lastIndex = 0, currentIndex = 0;
  
  var scroll = new Scroll('#lyricView', lyricTextHeight);
  
  player.signals.loadstart.add(function() {
    player.signals.timeupdate.remove(onTimeUpdate);
    player.signals.seeked.remove(onSeeked);
    reset();
  });
  
  player.signals.loadeddata.add(function(song) {
    player.signals.timeupdate.add(onTimeUpdate);
    player.signals.seeked.add(onSeeked);
    
    lyricLoader.load(song, function(lyric) {
      lyricList = lyric.getSortedTimeTextList();
      draw();
    });
  });
  
  
  player.signals.ended.add(reset);
  player.signals.prev.add(reset);
  player.signals.next.add(reset);
  
  function onSeeked(time) {
    // 找出大于等于当前时间点time的歌词的索引
    var index = 0;
    while (index < lyricList.length && lyricList[index].time < time) {
      index++;
    }
    currentIndex = index;
    
    unselectLyric(lyricList[lastIndex].time);
    
    if (currentIndex > 0) {
      selectLyric(lyricList[currentIndex - 1].time);
      lastIndex = currentIndex - 1;
      scrollToLyric(currentIndex - 1, 1);
    }
    onTimeUpdate(time, false);
  }
  
  function onTimeUpdate(updateMS, seeking) {
    if (seeking)
      return;
    if (currentIndex > lyricList.length - 1)
      return;
    if (updateMS < lyricList[currentIndex].time)
      return;
    
    unselectLyric(lyricList[lastIndex].time);
    selectLyric(lyricList[currentIndex].time);
    scrollToLyric(currentIndex, 'slow');
    
    lastIndex = currentIndex;
    currentIndex++;
  }
  
  function unselectLyric(time) {
    lyricViewDiv.find('[data-time=' + time + ']').removeClass('sel');
  }
  
  function selectLyric(time) {
    lyricViewDiv.find('[data-time=' + time + ']').addClass('sel');
  }
  
  function scrollToLyric(index, speed) {
    if (index < Math.floor(lyricViewHeight / lyricTextHeight) / 2) {
      var top = parseInt(lyricViewDiv.scrollTop());
      if (top != 0) {
        scroll.animateScrollTopTo(0, speed);
      }
    } else {
      var top = (index - Math.floor(lyricViewHeight / lyricTextHeight) / 2) * lyricTextHeight;
      scroll.animateScrollTopTo(top, speed);
    }
  }
  
  function reset() {
    lyricViewDiv.html('');
    lastIndex = 0;
    currentIndex = 0;
  }
  
  function draw() {
    lyricViewDiv.html('');
    lyricList.forEach(function(lyric) {
      var text = $(document.createElement('p'));
      text.attr('data-time', lyric.time);
      $(text).text(lyric.text);
      lyricViewDiv.append(text);
    });
    
    scroll.onViewUpdate();
  }
}

function LyricWindow(player, lyricLoader) {
  var lyricList = null;
  var lastIndex = 0, currentIndex = 0;
  var lyricWindowDiv = $('#lyricWindow');
  
  player.signals.loadstart.add(function() {
    player.signals.timeupdate.remove(onTimeUpdate);
    player.signals.seeked.remove(onSeeked);
    reset();
  });
  
  player.signals.loadeddata.add(function(song) {
    player.signals.timeupdate.add(onTimeUpdate);
    player.signals.seeked.add(onSeeked);
    
    lyricLoader.load(song, function(lyric) {
      lyricList = lyric.getSortedTimeTextList();
    });
  });
  
  player.signals.ended.add(reset);
  player.signals.prev.add(reset);
  player.signals.next.add(reset);
  
  function onSeeked(time) {
    // 找出大于等于当前时间点time的歌词的索引
    var index = 0;
    while (index < lyricList.length && lyricList[index].time < time) {
      index++;
    }
    currentIndex = index;
    
    lyricWindowDiv.text('');
    if (currentIndex > 0) {
      lyricWindowDiv.text(lyricList[currentIndex - 1].text);
    }
    onTimeUpdate(time, false);
  }
  
  function onTimeUpdate(updateMS, seeking) {
    if (seeking)
      return;
    if (currentIndex > lyricList.length - 1)
      return;
    if (updateMS < lyricList[currentIndex].time)
      return;
    
    lyricWindowDiv.text(lyricList[currentIndex].text);
    
    lastIndex = currentIndex;
    currentIndex++;
  }
  
  function reset() {
    lyricWindowDiv.text('');
    lastIndex = 0;
    currentIndex = 0;
  }
}

function Scroll(content, step) {
  var scrollBar = $(content).next('.scrollBar');
  var scrollElem = scrollBar.find('.scroll');
  var scrollBaseTop = parseInt(scrollElem.css('top'));

  var height = 20;
  var scrollSpeed = 0;
  var contentHeight = 0;
  
  scrollBar.hide();
  
  /*
  scrollBar.click(function(event) {
    var posY = event.clientY - parseInt(scrollBar.css('top'));
    scrollElem.css('top', posY - height / 2);
    $(content).scrollTop(posY * step);
  });*/
  
  $(content).bind('mousewheel', function(event) {
    var top = $(this).scrollTop();

    if (event.deltaY > 0) {
      if (top <= 0)
        return;
    } else if (top >= contentHeight + step) {
        return;
    }

    top += (event.deltaY * step * -1);
    $(this).scrollTop(top);
    
    var scrollTop = parseInt(scrollElem.css('top')) + (event.deltaY * scrollSpeed * -1);
    if (scrollTop < 0)
      scrollTop = 0;
    scrollElem.css('top', scrollTop);
  });
  
  this.onViewUpdate = function() {
    contentHeight = 0;
    $(content).children().each(function() {
      contentHeight += $(this).height();
    });
    scrollSpeed = ($(content).height() - height) / contentHeight * step;
    //scrollBar.show();
  }
  
  this.animateScrollTopTo = function(top, speed) {
    var oldTop = $(content).scrollTop();
    var dir = Math.sign(top - oldTop);//1=down,-1=up
    $(content).animate({'scrollTop': top}, {queue: false, speed: speed}, 'swing');
    
    var scrollTop = top / scrollSpeed * dir;
  $(scrollElem).animate({'top': scrollTop}, {queue: false, speed: speed}, 'swing');
  }
  
  function scrollTopTo(top) {
    //onScrollChanged
  }
}


/*
歌词加载器
提供缓存优化
*/
function LyricLoader() {
  var lyric = null;
  var lastUrl = null;
  
  var wait = 0;
  var loadedSignal = new signals.Signal();
  
  this.load = function(song, callback) {
    if (lastUrl == song.lrcUrl) {
      if (wait) {
        loadedSignal.add(function(lyric) {
          callback(lyric);
        });
        return;
      } else {
        return callback(lyric);
      }
    }

    wait = 1;
    var req = new XMLHttpRequest();
    req.open('GET', song.lrcUrl, true);
    req.addEventListener('load', function(event){
      var content = event.target.responseText;
      lyric = new LyricParser().fromString(content);
      callback(lyric);
      loadedSignal.dispatch(lyric);
      loadedSignal.removeAll();
      wait = 0;
    });
    
    req.send(null);
    
    lastUrl = song.lrcUrl;
  }
}

/*
歌词
*/
function Lyric() {
  var timeTextList = []; //时间标签列表 [{time:绝对毫秒,text:文本},...]
  var idMap = {}; // 标识标签map
  
  
  this.setTimeTextList = function(list) {
    timeTextList = list;
  }
  
  this.getSortedTimeTextList = function() {
    timeTextList.sort(function(x, y){ return x.time - y.time; });
    return timeTextList;
  }
  
  this.setIdMap = function(map) {
    idMap = map;
  }
  
  this.getIdValue = function(id) {
    return idMap[id];
  }
}

/*
歌词读取器
*/
function LyricParser() {
  this.fromString = function(str) {
    var timeTextList = [];
    var idMap = {};
    
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
                  if (t[0][0] == '-')
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
    });
    
    var lyric = new Lyric();
    lyric.setTimeTextList(timeTextList);
    lyric.setIdMap(idMap);

    return lyric;
  }
}

function padNN(n) {
  return n < 10 ? '0' + n : n;
}

// 随机[m,n)
function randInt(m, n) {
  return Math.floor(Math.random() * (m + n)) - m;
}