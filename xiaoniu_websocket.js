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
    me.timeoutObj = null;//ping 定时器
    me.serverTimeoutObj = null; // 发送消息 等待服务器 定时器
    me.reconnectTimeObj = null;//重连
    me.checkNetWorkTimeObj = null; //检查网络
    me.tryPingCounts = 1;//ping 次数 记录n
    me.pingSendTime = 0;//ping的时候当前时间戳

    me.connect_status = 200;

    me.connect_status_info = {
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

    me.listenerList = {
      //插件事件数组
      "message":function(e){
        console.log( e );
      },
      "conn_status":function (code,msg) { // 链接状态
        console.log(msg);
      }
    };
    me.init(options);
  }

  XiaoniuWebSocket.prototype.set_conn_status = function(code){
    this.connect_status = code;
    this.listenerList['conn_status'](code,this.connect_status_info[code]);
  };

  XiaoniuWebSocket.prototype.logs = function (msg) {
    if (this.debug) {
      console.log(
        `%c 小牛websocket.js简易封装调试 %c  ${msg} %c`,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
        'background:transparent'
      );
    }
  };

  XiaoniuWebSocket.prototype.init = function(options){

    var settings = {
      url:'',
      debug: true,
      reconnectInterval: 3000,
      pingInterval: 10000,
      serverTimeout:5000,
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

    this.old_pingInterval = this.pingInterval;

    if(!this.url) {
      this.logs("未填写url");
      return;
    }
    if (!this.pingMsg) {
      this.logs("ping内容不能为空");
      return;
    }

    this.createWebSocket();

    var me = this;

    // 监听网络状态
    window.addEventListener('online',function () {
      // 网络来了... 马上ping一下是否挂了
      me.set_conn_status(10003);
      if (me.ws) {
        if (me.ws.readyState === 3) {
          me.lockReconnect = false;
          me.reconnectInterval = 1000;
          clearTimeout(me.reconnectTimeObj);
          me.heartCheck_reset().reconnect();
          return;
        }
      }
      me.reconnectInterval = 2000;
      me.pingInterval = 100;
      me.heartCheck_reset().heartOnlineCheck_start();
      me.pingInterval = me.old_pingInterval;
    });

    window.addEventListener('offline',function () {
      // 断网了 ...
      me.set_conn_status(10002);
    });

  };

  // 检查网络状态
  XiaoniuWebSocket.prototype.check_net = function (){
    var me = this;
    if (!me.checkNetWorkTimeObj) {
      // 检查网络状态
      if (navigator.onLine) {
        me.__jsonp('https://www.baidu.com/sugrec?prod=pc&wd=websocket',function (data) {
          clearTimeout(me.checkNetWorkTimeObj)
          me.checkNetWorkTimeObj = null;
        });
        me.checkNetWorkTimeObj = setTimeout(function () {
          me.checkNetWorkTimeObj = null
          // 网络延迟
          me.set_conn_status(10008);
          // 关闭链接
          if (me.tryPingCounts >3){
            me.tryPingCounts = 1;
            me.pingInterval = me.old_pingInterval;
            me.set_conn_status(10007);
            me.ws.close();
          }else {
            me.pingInterval = 3000;
            me.heartCheck_reset().heartCheck_start();
            me.tryPingCounts = me.tryPingCounts + 1;
            me.logs("尝试PING:第" +　me.tryPingCounts +'次');
          }
        },1500);
      }else {
        //断网了...
        me.pingInterval = 10000
        me.set_conn_status(10002);
        // 关闭链接
        if (me.tryPingCounts > 2 ){
          me.pingInterval = me.old_pingInterval;
          me.set_conn_status(10007);
          me.ws.close();
        }else {
          me.tryPingCounts = me.tryPingCounts + 1;
          me.logs("尝试PING:第" +　me.tryPingCounts +'次');
        }
        me.heartCheck_reset().heartCheck_start();
      }
    }
  }

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

  XiaoniuWebSocket.prototype.on = function(eventKey, callback) {
    var me = this;
    if(typeof eventKey ==="string" && typeof callback==="function"){
      me.listenerList[eventKey] = callback;
    }
  }

  XiaoniuWebSocket.prototype.send = function (msg,cb) {
    if (this.is_online() === false) {
      this.connect_err_reset().reconnect();
      if (typeof cb === 'function') cb("链接已失效");
      return;
    }
    if (this.debug) {
      console.log("发送消息：",this.ws,msg);
    }
    this.ws.send(msg);
  }

  XiaoniuWebSocket.prototype.initEventHandle = function () {

    var me = this;

    me.ws.onclose = function () {
      me.logs("链接关闭...");
      me.set_conn_status(10001);
      me.connect_err_reset().reconnect();
    };

    me.ws.onerror = function (e) {
      me.set_conn_status(10004);
      me.logs("链接有错误...");
      me.connect_err_reset().reconnect();
    };

    me.ws.onopen = function () {
      me.set_conn_status(200);
      //心跳检测重置
      me.heartCheck_start();
      // 调用
      me.onopen();
    };

    me.ws.onmessage = function (event) {
      //恢复直接的ping时间
      me.pingInterval = me.old_pingInterval;
      me.tryPingCounts = 1;
      if (new Date().getTime() - me.pingSendTime < 1500 && me.connect_status === 10008) {
        me.set_conn_status(10009);
      }
      me.heartCheck_reset().heartCheck_start();
      me.onmessage(event);
    };
  };

  XiaoniuWebSocket.prototype.reconnect = function(){
    var me = this;
    if(me.lockReconnect) {
      return;
    }
    if (me.ws && me.ws.readyState === 1) {
      return;
    }
    me.set_conn_status(10005);
    me.lockReconnect = true;
    me.reconnectTimeObj = setTimeout(function () {
      if (me.ws && me.ws.readyState === 1) {
        return;
      }
      me.logs("重试链接...");
      me.set_conn_status(10006);
      me.lockReconnect = false;
      me.createWebSocket(me.url);
    }, me.reconnectInterval);

    if (me.reconnectInterval < 1000) {
      me.reconnectInterval = 1000;
    } else {
      // 每次重连间隔增大一倍
      me.reconnectInterval = me.reconnectInterval * 2;
    }
    if (me.reconnectInterval > 2000 && navigator.onLine) {
      me.reconnectInterval = 2000;
    }
  };

  XiaoniuWebSocket.prototype.heartCheck_reset = function (){
    clearTimeout(this.timeoutObj);
    clearTimeout(this.serverTimeoutObj);
    clearTimeout(this.reconnectTimeObj);
    clearTimeout(this.checkNetWorkTimeObj);
    this.timeoutObj = null;
    this.serverTimeoutObj = null;
    this.reconnectTimeObj = null;
    this.checkNetWorkTimeObj = null;
    return this;
  };

  XiaoniuWebSocket.prototype.connect_err_reset = function (){
    clearTimeout(this.timeoutObj);
    clearTimeout(this.serverTimeoutObj);
    clearTimeout(this.checkNetWorkTimeObj);
    this.timeoutObj = null;
    this.serverTimeoutObj = null;
    this.reconnectTimeObj = null;
    this.checkNetWorkTimeObj = null;
    return this;
  };

  XiaoniuWebSocket.prototype.heartCheck_start = function (){
    var me = this;
    if (me.pingInterval === 0) {return;}
    me.timeoutObj = setTimeout(function(){
      me.logs("发送ping...");
      me.pingSendTime = new Date().getTime();
      me.send(me.pingMsg);
      me.serverTimeoutObj = setTimeout(function(){
        me.check_net();
      }, me.serverTimeout);
    }, me.pingInterval);
    return this;
  };

  XiaoniuWebSocket.prototype.heartOnlineCheck_start = function (){
    var me = this;
    me.timeoutObj = setTimeout(function(){
      me.send(me.pingMsg);
      me.pingSendTime = new Date().getTime();
      me.serverTimeoutObj = setTimeout(function(){
        me.set_conn_status(10007);
        me.ws.close();
      }, 2000);
    }, me.pingInterval);
    return this;
  };

  XiaoniuWebSocket.prototype.is_online = function () {
    if (this.ws) {
      if (this.ws.readyState === 1) {return true;}
    }
    return false;
  }

  // 网络请求
  XiaoniuWebSocket.prototype.__ajax = function(options){
    var me = this;
    var xhr;
    options = options || {}
    if(window.XMLHttpRequest){
      xhr = new XMLHttpRequest();
    }else{
      xhr = ActiveXObject('Microsoft.XMLHTTP');
    }
    xhr.onreadystatechange=function(){
      if(xhr.readyState === 4){
        var status=xhr.status;
        if (status === 0) {
          me.__jsonp(options.url,function (data) {
            options.success && options.success(data);
          });
        }else {
          if(status>=200 && status<300){
            options.success && options.success(xhr.responseText,xhr.responseXML);
          }else{
            options.error && options.error(status);
          }
        }
      }
    }
    xhr.open('GET',options.url,true);
    xhr.send();
  }

  // 跨域请求
  XiaoniuWebSocket.prototype.__jsonp = function (url, callback) {
    try{
      var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      window[callbackName] = function(data) {
        delete window[callbackName];
        document.body.removeChild(script);
        callback(data);
      };
      var script = document.createElement('script');
      script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
      document.body.appendChild(script);
    }catch (e) {
      console.log(e);
    }
  }

  return XiaoniuWebSocket;
});
