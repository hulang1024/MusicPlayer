"use strict";

/*
歌词列表视图
*/
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

/*
歌词窗口
*/
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

/* 滚动条(应是通用的) */
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
        lastLyric.lyric = new LRCParser().fromString(lyrics.lyric);
        // 解析翻译版本歌词
        if (lyrics.tlyric)
          lastLyric.tlyric = new LRCParser().fromString(lyrics.tlyric);
      } else {
        lastLyric.lyric = new LRCParser().fromString(content);
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
LRC歌词
*/
function LRCLyric() {
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
function LRCParser() {
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
    
    var lyric = new LRCLyric();
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
    var ms; // 毫秒
    //[mm:ss], [mm:ss.ms]或[mm:ss:ms]
    if (parts.length == 2) {
      if (parts[1].indexOf('.') != -1) {
        var t = parts[1].split('.');
        seconds = parseInt(t[0]);
        ms = parseInt(t[1]);
      } else {
        seconds = parseInt(parts[1]);
        ms = 0;
      }
    } else if (parts.length == 3) {
      seconds = parseInt(parts[1]);
      ms = parseInt(parts[2]);
    }
    
    return minutes * 60 * 1000 + seconds * 1000 + ms;
  }

}
