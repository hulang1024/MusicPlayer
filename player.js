/*
音乐播放器主程序
author: HuLang
*/
window.onload = function() {
  // 初始化文件上传事件监听
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
    openLyricFile(file);
  })
  
  function openLyricFile(file) {
    var reader = new FileReader();
    reader.onload = function() {
      lyricReader.read(this.result);
    };
    reader.readAsText(file);
  }
  
  var lyricReader = new LyricReader();
  var lyricView = new LyricView();
  
  lyricReader.addReadListener(function(){
    lyricView.setSortedTimeTextList(lyricReader.getSortedTimeTextList());
    lyricView.draw();
  })
  
  
  var openAudioUrlButton = document.getElementById('openAudioUrl');
  openAudioUrlButton.onclick = function() {
    var url = document.getElementById('audioUrl').value.trim();
    if (!url)
      return;
    audio.src = url;
  }
  openAudioUrlButton.click();

  var openLyricUrlButton = document.getElementById('openLyricUrl');
  openLyricUrlButton.onclick = function() {
    var url = document.getElementById('lyricUrl').value.trim();
    if (!url)
      return;
    
    var ext = url.substring(url.lastIndexOf('.') + 1);
    // 检查是否是lrc文件
    if (ext == 'lrc') {
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.addEventListener('load', function(event){
        var content = event.target.responseText;
        lyricReader.read(content);
      });
      req.send(null);
    }
  }
  openLyricUrlButton.click();
  
  var openLyricFileButton = document.getElementById('openLyricFile');
  openLyricFileButton.onclick = function() {
    fileUpload.click();
  }

  audio.onplay = function() {
    console.log('play');
  }
  
  audio.ontimeupdate = function() {
    var currentMS = Math.round(this.currentTime * 1000);
    lyricView.onTimeUpdate(currentMS);
  }
}

function LyricReader() {
  var timeTextList = []; //时间标签列表 [{ms:绝对毫秒,text:文本},...]
  var idMap = {}; // 标识标签map
  
  this.read = function(str) {
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
              var xx; // 百分之一秒
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
              var ms = minutes * 60 * 1000 + seconds * 1000 + Math.round(xx / 10);
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

function LyricView() {
  var lyricViewDiv = $('#lyricView>div');
  var lyricViewHeight = $('#lyricView').height();
  
  var list = null;
  var lastUpdateMS = 0;
  var lastIndex = 0, currentIndex = 0;
  
  this.setSortedTimeTextList = function(_list) {
    list = _list;
  }
  
  function getLyricTextHeight() {
    return 42;
  }
  
  this.onTimeUpdate = function(updateMS) {
    if (updateMS < list[currentIndex].time) {
      lastUpdateMS = updateMS;
      return;
    }
    
    lyricViewDiv.find('#time-' + list[lastIndex].time).removeClass('sel');
    lyricViewDiv.find('#time-' + list[currentIndex].time).addClass('sel');
    
    if (currentIndex + 1 > Math.ceil(lyricViewHeight / getLyricTextHeight() / 2)) {
      var top = parseInt(lyricViewDiv.css('top')) || 0;
      lyricViewDiv.animate({'top': top - getLyricTextHeight() + 'px'}, 'slow');
    }
    
    lastIndex = currentIndex; // 因为可以跳到前或后,所以需要记录
    currentIndex++;
    
    lastUpdateMS = updateMS;
  }
  
  this.draw = function() {
    lyricViewDiv.text('');
    list.forEach(function(lyric) {
      var text = document.createElement('p');
      text.id = 'time-' + lyric.time;
      $(text).text(lyric.text);
      text.title = lyric.timeText;
      lyricViewDiv.append(text);
    });
  }
}
