
带歌词同步的简单的网页音乐播放器, 继续各种尝试中, Just for fun.   
地址：[MusicPlayer](https://hulang1024.github.io/MusicPlayer/)

已有功能
-------
1. [LRC](https://en.wikipedia.org/wiki/LRC_(file_format))文件格式解析  
2. 歌曲列表  
3. 列表歌词：显示当前歌曲的歌词、滚动显示当前播放时间的歌词、随着音频进度跳跃到新位置、鼠标滚轮滚动后自动还原到当前时间歌词位置、可显示翻译版本歌曲
4. 窗口式歌词：显示当前歌曲的歌词、显示当前播放时间的歌词、可随着音频进度跳跃到新位置、按L键隐藏/显示、可显示翻译版本歌曲  
5. 播放模式：支持列表循环  
6. 无活跃操作自动隐藏歌曲列表和播放控件  
7. 歌词、歌词播放组件位置自适应  
8. 地址栏参数:
    ```js
    song-index  // 正数, 歌曲索引
    time        // 正数, 歌曲时间(毫秒)
    play        // 1=是, 歌曲加载后是否自动播放

    例子: ?song-index=1&time=100&play=1
    ```

待实现需求
---------
1. ~~兼容IE6~~
2. 美观的UI
3. QRC格式文件解析和Cara OK 
4. 自定义设计和实现播放控件（而非完全使用HTML5 Audio/Video元素的支持）


项目文件说明（目前）
------------------
* [res/songs.json](https://github.com/hulang1024/MusicPlayer/blob/res/songs.json) 描述歌曲数据，例子：
```js
[
  {"name": "告白气球",
   "artist": "周杰伦",
   "url": "http://xxx.mp3",
   "lrcUrl": "https://yyy.lrc"
  },
  {"name": "星座",
   "artist": "王力宏",
   "url": "http://aaa.mp3",
   "lrcUrl": "https://bbb.lrc"
  },
  {"name": "Rap God",
   "artist": "Eminem",
   "url": "http://111.mp3",
   "lrcUrl": "https://222.lrc.json"
  }
]
```

* [res/lrc](https://github.com/hulang1024/MusicPlayer/tree/res/lrc) 其中\*.lrc是纯LRC格式歌词文件；\*.json文件中也包含LRC，但包含歌词的翻译版本，JSON语法：
```js
{
  "lyric": "[by:x]Look[00:01.80]Look..." //原始版本的LRC
  "tlyric": "[00:01.80]看好了..."         //翻译版本的LRC，可为空(填null或"")
}
```
* [config.js](config.js) 配置，包含歌曲数据源URL：
```js
var CONFIG = {
  songsUrl: 'https://raw.githubusercontent.com/hulang1024/MusicPlayer/res/songs.json'
};
```


贡献鸣谢
---------
[soulomoon](https://github.com/soulomoon): 帮助找到 歌词随音频进度跳跃到新位置 的BUG原因。


版权
----
[BSD-3-Clause](https://github.com/hulang1024/MusicPlayer/blob/master/LICENSE)