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
              var text = line.substring(index + 1);
              timeTextList.push({ms: ms, text: text});
              lyricLineCnt++;
            } else {
              var text = line.substring(index + 1);
              idMap[tag] = text;
            }
          }
        }
      }
    })
    
    console.log(lyricLineCnt);
    
    timeTextList.sort(function(x, y){ return x.ms - y.ms; });
    
    console.log(timeTextList);
    
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
  var lyricViewDiv = document.getElementById('lyricView');
  
  var index = 0;
  var list = null;
  var lastMS = 0;
  
  
  this.setSortedTimeTextList = function(_list) {
    list = _list;
  }
  
  this.onTimeUpdate = function(ms) {
    var indexMS = list[index].ms;
    for (var iterMS = lastMS; iterMS < ms; iterMS++) {
      if (iterMS == indexMS) {
        lyricViewDiv.innerHTML = list[index].text;
        index++;
        break;
      }
    }
    
    lastMS = ms;
  }
}

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
  
  
  function openAudioFile(src) {
    audio.src = src;
  }
  
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
  })
  
  var openLyricFileButton = document.getElementById('openLyricFile');
  openLyricFileButton.onclick = function() {
    fileUpload.click();
  }
  
  var openUrlButton = document.getElementById('openUrl');
  var urlTextInput = document.getElementById('url');
  openUrlButton.onclick = function() {
    openAudioFile(urlTextInput.value);
  }
  


  audio.onplay = function() {
    console.log('play');
  }
  
  audio.ontimeupdate = function() {
    var currentMS = Math.round(this.currentTime * 1000);
    lyricView.onTimeUpdate(currentMS);
  }
}