# 小牛websocket

```js
/**

{
      url:'',//必填
      debug: true,//调试是否打开 默认打开
      reconnectInterval: 3000,//失去链接重连时间 单位：毫秒
      pingInterval: 30000,// ping 30秒检测一次 建议 60秒内ping一次
      pingMsg :'{"type":"ping"}' // 发送的内容
    }

**/
var ws = new XiaoniuWebSocket({
  'url':wsUrl,
  'pingInterval':50000
})

ws.onopen = function () {
  console.log('onopen')
}

ws.onmessage = function (event) {
  var ret = JSON.parse(event.data);
  console.log(ws.is_online())
}
```

