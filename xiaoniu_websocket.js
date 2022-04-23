(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module !== 'undefined' && module.exports){
    module.exports = factory();
  } else {
    global.XiaoniuWebSocket = factory();
  }
})(this, function () {

  if (!('WebSocket' in window)) {
    return;
  }

  var XiaoniuWebSocket = function(options){
    let me = this;
    me.ws = null;
    me.sid = null;
    me.lockReconnect = false; // 避免重复链接
    me.timeoutObj = null;
    me.serverTimeoutObj = null;
    me.init(options);
  }

  XiaoniuWebSocket.prototype.logs = function (msg) {
    if (this.debug) {
      console.log(
        `%c 小牛websocket.js简易封装调试 %c  ${msg} %c`,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
        'background:transparent'
      )
    }
  };

  XiaoniuWebSocket.prototype.init = function(options){

    var settings = {
      url:'',
      debug: true,
      reconnectInterval: 3000,
      pingInterval: 30000,
      pingMsg :'{"type":"ping"}'
    }

    if (!options) { options = {}; }

    for (var key in settings) {
      if (typeof options[key] !== 'undefined') {
        this[key] = options[key];
      } else {
        this[key] = settings[key];
      }
    }

    if(!this.url) {
      this.logs("未填写url");
      return
    }
    if (!this.pingMsg) {
      this.logs("ping内容不能为空");
      return
    }

    this.createWebSocket()
  };

  XiaoniuWebSocket.prototype.createWebSocket = function() {
    var me = this;
    try {
      me.ws = new WebSocket(me.url);
      me.initEventHandle();
    } catch (e) {
      me.logs("重新链接中...")
      me.reconnect(me.url);
    }
  };

  XiaoniuWebSocket.prototype.onopen = function () {}
  XiaoniuWebSocket.prototype.onclose = function () {}
  XiaoniuWebSocket.prototype.onerror = function () {}
  XiaoniuWebSocket.prototype.onmessage = function () {}

  XiaoniuWebSocket.prototype.send = function (msg) {
    this.ws.send(msg)
  }

  XiaoniuWebSocket.prototype.initEventHandle = function () {

    var me = this;

    me.ws.onclose = function () {
      me.logs("链接关闭...")
      me.reconnect(me.url);
    };

    me.ws.onerror = function () {
      me.logs("链接有错误...")
      me.reconnect(me.url);
    };

    me.ws.onopen = function () {
      me.logs("链接成功...")
      //心跳检测重置
      me.heartCheck_start();
      me.onopen()
    };

    me.ws.onmessage = function (event) {
      me.heartCheck_reset().heartCheck_start();
      me.onmessage(event)
    }
  };

  XiaoniuWebSocket.prototype.reconnect = function(){
    var me = this;
    if(me.lockReconnect) {
      return;
    }
    me.lockReconnect = true;
    //没连接上会一直重连，设置延迟避免请求过多
    setTimeout(function () {
      me.logs("重试链接...");
      me.lockReconnect = false;
      me.createWebSocket(me.url);
    }, me.reconnectInterval);
  };

  XiaoniuWebSocket.prototype.heartCheck_reset = function (){
    clearTimeout(this.timeoutObj);
    clearTimeout(this.serverTimeoutObj);
    return this;
  };

  XiaoniuWebSocket.prototype.heartCheck_start = function (){
    var me = this;
    if (me.pingInterval == 0) return
    me.timeoutObj = setTimeout(function(){
      me.logs("发送ping...");
      me.ws.send(me.pingMsg);
      me.serverTimeoutObj = setTimeout(function(){
        me.logs("关闭链接，促发重新链接函数...")
        me.ws.close();
      }, me.pingInterval)
    }, me.pingInterval)
    return this;
  };

  XiaoniuWebSocket.prototype.is_online = function () {
    if (this.ws) {
      if (this.ws.readyState == 1) return true
    }
    return false
  }

  return XiaoniuWebSocket;
});
