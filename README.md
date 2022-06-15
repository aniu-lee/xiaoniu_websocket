# 小牛websocket（xiaoniu_websocket.js）

### 特性

* 用法跟websocket一样，基于websocket二次封装

* 支持断线重连
* 支持心跳
* 支持链接状态感应包括网络状态等等
* 使用简单粗暴，明了



### 更新记录

#### 2022-06-15


* fix 断线重连，更加优雅。
* 增加链接状态感应，包括网络状态等等。


#### 2022-05-23


* 项目初始化，基本功能，断线重连






### 文档
```js
/**

{
      url:'',//必填
      debug: true,//调试是否打开 默认打开
      reconnectInterval: 3000,//失去链接重连时间 单位：毫秒
      pingInterval: 30000,// ping 30秒检测一次 建议 60秒内ping一次
      pingMsg :'{"type":"ping"}', // 发送的内容
      serverTimeout:3000,//发生消息后多久反馈
}

**/
var ws = new XiaoniuWebSocket({
  'url':wsUrl,
  'pingInterval':50000
})

ws.onopen = function () {
  console.log('onopen')
}
/**
{
      200:'connect',//连接成功
      10001:'close',//关闭链接
      10002:'network_offline',//网络关闭
      10003:'network_online',//网络连接上
      10004:'connect_err',//链接发生错误
      10005:'try_connect',//尝试链接
      10006:'connecting',//正在链接
      10007:'break_connect',//主动断开链接
      10008:'network_slow',
      10009:'network_resume'//网络恢复
}

*/
// 监听状态的改变
ws.on('conn_status',function (code,msg) {
  console.log("链接状态：",msg)
})


ws.onmessage = function (event) {
  var ret = JSON.parse(event.data);
  console.log(ws.is_online())
}
```