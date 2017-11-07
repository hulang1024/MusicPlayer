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
      
      playList.select(0);
    });
    req.send(null);
  };
  
  this.addPlay = function(song) {
    songs.add(song);
  }
  
  this.select = function(index) {
    if (songs.length == 0)
      return;
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
歌曲播放器
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
    timeDisplay.html('<em>' + padNN(curMinutes) + ':' + padNN(curSeconds) + '</em> / '
      + padNN(durMinutes) + ':' + padNN(durSeconds));
  }
  
  function resize() {
    $('#audio').css('left', ($(window).width() - $('#audio').width()) / 2);
  }
}

function LyricListView(player, lyricLoader) {
  var lyricViewDiv = $('#lyricView');
  
  var tlyricList = null;
  var lyricList = null;
  var lastIndex = 0, currentIndex = 0;
  
  var scroll = new Scroll('#lyricView', 40);
  
  player.signals.loadstart.add(function() {
    player.signals.timeupdate.remove(onTimeUpdate);
    player.signals.seeked.remove(onSeeked);
    reset();
  });
  
  player.signals.loadeddata.add(function(song) {
    lyricLoader.load(song, function(lyrics) {
      lyricList = lyrics.lyric.getSortedTimeTextList();
      if (lyrics.tlyric) {
        tlyricList = lyrics.tlyric.getSortedTimeTextList();
      }
      
      if (lyricList && lyricList.length) {
        draw();
        onSeeked(player.getCurrentTime()); // 跟上
        player.signals.timeupdate.add(onTimeUpdate);
        player.signals.seeked.add(onSeeked);
      }
    });
  });
  
  
  player.signals.ended.add(reset);
  player.signals.prev.add(reset);
  player.signals.next.add(reset);
  
  function onSeeked(time) {
    // 找出大于等于当前时间点time的歌词的索引
    var index = 0;
    while (index < lyricList.length && lyricList[index].getTime() < time) {
      index++;
    }
    currentIndex = index;
    
    unselectLyric(lyricList[lastIndex].getTime());
    
    if (currentIndex > 0) {
      selectLyric(lyricList[currentIndex - 1].getTime());
      lastIndex = currentIndex - 1;
      scrollToLyric(currentIndex - 1, {speed: 'fast'});
    }
    onTimeUpdate(time, false);
  }
  
  function onTimeUpdate(updateMS, seeking) {
    if (seeking)
      return;
    if (currentIndex > lyricList.length - 1)
      return;
    if (updateMS < lyricList[currentIndex].getTime())
      return;
    
    unselectLyric(lyricList[lastIndex].getTime());
    selectLyric(lyricList[currentIndex].getTime());
    scrollToLyric(currentIndex, {speed: 'slow'});
    
    lastIndex = currentIndex;
    currentIndex++;
  }
  
  function unselectLyric(time) {
    lyricViewDiv.find('[data-time=' + time + ']').removeClass('sel');
  }
  
  function selectLyric(time) {
    lyricViewDiv.find('[data-time=' + time + ']').addClass('sel');
  }
  
  function scrollToLyric(index, params) {
    var top = 0;
    for (var i = 0; i < index; i++)
      top += lyricViewDiv.children().eq(i).innerHeight();
    top = top - Math.floor((lyricViewDiv.height() - lyricViewDiv.children().eq(index).innerHeight()) / 2);
    scroll.animateScrollTopTo(top, params);
  }
  
  function reset() {
    lyricViewDiv.html('');
    lastIndex = 0;
    currentIndex = 0;
  }
  
  function draw() {
    lyricViewDiv.html('');
    lyricList.forEach(function(lyric) {
      var lyricEl = $(document.createElement('p'));
      lyricEl.attr('data-time', lyric.getTime());
      var html = lyric.getText();
      for (var j in tlyricList) {
        if (lyric.getTime() == tlyricList[j].getTime()) {
          html += '<br>' + tlyricList[j].getText();
          break;
        }
      }
      lyricEl.html(html);
      lyricViewDiv.append(lyricEl);
    });

    scroll.onViewUpdate();
  }
  
}

function LyricWindow(player, lyricLoader) {
  var lyricList = null;
  var tlyricList = null;
  var lastIndex = 0, currentIndex = 0;
  var lyricWindowDiv = $('#lyricWindow');
  
  
  $(document).bind('keydown', function(event) {
    if (event.keyCode == 76) {   // L
      if ($('#lyricWindow').is(':hidden')) {
        onSeeked(player.getCurrentTime()); // 跟上
        player.signals.timeupdate.add(onTimeUpdate);
        player.signals.seeked.add(onSeeked);
        $('#lyricWindow').show();
      } else {
        $('#lyricWindow').hide();
        player.signals.timeupdate.remove(onTimeUpdate);
        player.signals.seeked.remove(onSeeked);
      }
    }
  });
  
  player.signals.loadstart.add(function() {
    player.signals.timeupdate.remove(onTimeUpdate);
    player.signals.seeked.remove(onSeeked);
    reset();
  });
  
  player.signals.loadeddata.add(function(song) {
    lyricLoader.load(song, function(lyrics) {
      lyricList = lyrics.lyric.getSortedTimeTextList();
      if (lyrics.tlyric) {
        tlyricList = lyrics.tlyric.getSortedTimeTextList();
      }
      
      if (lyricList && lyricList.length) {
        onSeeked(player.getCurrentTime()); // 跟上
        player.signals.timeupdate.add(onTimeUpdate);
        player.signals.seeked.add(onSeeked);
      }
    });
  });
  
  player.signals.ended.add(reset);
  player.signals.prev.add(reset);
  player.signals.next.add(reset);
  
  function onSeeked(time) {
    // 找出大于等于当前时间点time的歌词的索引
    var index = 0;
    while (index < lyricList.length && lyricList[index].getTime() < time) {
      index++;
    }
    currentIndex = index;
    
    lyricWindowDiv.html('');
    if (currentIndex > 0) {
      displayLyric(currentIndex - 1);
    }
    onTimeUpdate(time, false);
  }
  
  function onTimeUpdate(updateMS, seeking) {
    if (seeking)
      return;
    if (currentIndex > lyricList.length - 1)
      return;
    if (updateMS < lyricList[currentIndex].getTime())
      return;
    
    displayLyric(currentIndex);
    
    lastIndex = currentIndex;
    currentIndex++;
  }
  
  function reset() {
    lyricWindowDiv.html('');
    lastIndex = 0;
    currentIndex = 0;
  }
  
  function displayLyric(index) {
    var html = lyricList[index].getText();
    for (var j in tlyricList) {
      if (lyricList[index].getTime() == tlyricList[j].getTime()) {
        html += '<br>' + tlyricList[j].getText();
        break;
      }
    }
    lyricWindowDiv.html(html);
    lyricWindowDiv.css('top', ($(window).height() - lyricWindowDiv.height()) / 2);
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
  
  this.animateScrollTopTo = function(top, params) {
    var oldTop = $(content).scrollTop();
    var dir = top - oldTop > 0 ? 1 : -1;//1=down,-1=up
    $(content).animate({'scrollTop': top}, $.extend({queue: false}, params), 'swing');
    
    var scrollTop = top / scrollSpeed * dir;
    $(scrollElem).animate({'top': scrollTop}, $.extend({queue: false}, params), 'swing');
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
  var lastLyric = {};
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
        return callback(lastLyric);
      }
    }

    wait = 1;
    var req = new XMLHttpRequest();
    req.open('GET', song.lrcUrl + '?t=' + new Date().getTime(), true);
    req.addEventListener('load', function(event){
      var content = event.target.responseText;
      // 判断是否JSON
      if (song.lrcUrl.substring(song.lrcUrl.lastIndexOf('.') + 1) == 'json') {
        var lyrics = JSON.parse(content);
        // 解析原始版本歌词
        lastLyric.lyric = new LyricParser().fromString(lyrics.lyric);
        // 解析翻译版本歌词
        if (lyrics.tlyric)
          lastLyric.tlyric = new LyricParser().fromString(lyrics.tlyric);
      } else {
        lastLyric.lyric = new LyricParser().fromString(content);
        lastLyric.tlyric = null;
      }
      callback(lastLyric);
      loadedSignal.dispatch(lastLyric);
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
    timeTextList.sort(function(x, y){ return x.getTime() - y.getTime(); });
    return timeTextList;
  }
  
  this.setIdMap = function(map) {
    idMap = map;
  }
  
  this.getIdMap = function() {
    return idMap;
  }
}

/*
LRC格式解析器
*/
function LyricParser() {
  this.fromString = function(str) {
    var timeTextList = [];
    var idMap = {};
    
    var tag;
    var state = 1;//1=文本/标签
    
    var i = 0;
    while (i < str.length) {
      switch (str[i]) {
        case '[': {
          var result = readTag(str, i);
          i = result.i;
          var parts = result.parts;
          
          if (result.isTag) {
            //判断是否注释标签
            if (parts.length == 0) {
              
            } else {
              //判断是否时间标签
              if (/[+-]*\d+/.test(parts[0])) {
                tag = timePartsToMS(parts);
                state = 1;
              }
              // 标识标签
              else {
                idMap[parts[0]] = parts[1];
              }
            }
          } else {
            timeTextList.push(makeTimeText(tag, parts.join('')));
          }
          i++;
          break;
        }
        
        default:
          if (!tag) {
            i++;
            break;
          }
          // 读歌词
          var lyricText = str[i];
          i++;
          while (i < str.length) {
            if (str[i] == '[') {
              break;
            }
            lyricText += str[i];
            i++;
          }
          
          timeTextList.push(makeTimeText(tag, lyricText));
          break;
      }
    }
    
    var lyric = new Lyric();
    lyric.setTimeTextList(timeTextList);
    lyric.setIdMap(idMap);
    return lyric;
  }
  
  function makeTimeText(time, text) {
    return {
      getTime: function() {
        return time;
      },
      getText: function() {
        return text;
      }
    };
  }
  
  // 读标签
  function readTag(str, i) {
    var isTag = true;
    var parts = [];
    var part = null;
    i++;
    while (i < str.length) {
      if (str[i] == ']') {
        if (part != null) {
          parts.push(part);
          part = null;
        }
        break;
      } else if (str[i] == '[') { // "[["
        isTag = false;
        break;
      } else if (str[i] == ':') {
        if (part != null) {
          parts.push(part);
          part = null;
        }
      } else {
        part = part || '';
        part += str[i];
      }
      i++;
    }
    
    return {
      isTag: isTag,
      i: i,
      parts: parts
    };
  }
  
  // 时间标签转换成毫秒
  function timePartsToMS(parts) {
    var minutes = parseInt(parts[0]); //分
    var seconds; // 秒
    var xx; // 毫秒
    //[mm:ss], [mm:ss.xx]或[mm:ss:xx]
    if (parts.length == 2) {
      if (parts[1].indexOf('.') != -1) {
        var t = parts[1].split('.');
        seconds = parseInt(t[0]);
        xx = parseInt(t[1]);
      } else {
        seconds = parseInt(parts[1]);
        xx = 0;
      }
    } else if (parts.length == 3) {
      seconds = parseInt(parts[1]);
      xx = parseInt(parts[2]);
    }
    
    return minutes * 60 * 1000 + seconds * 1000 + xx;
  }

}

function padNN(n) {
  return n < 10 ? '0' + n : n;
}

// 随机[m,n)
function randInt(m, n) {
  return Math.floor(Math.random() * (m + n)) - m;
}