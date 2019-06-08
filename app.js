//app.js
var Api = require('utils/menu.js');
var api = new Api();
App({
  onLaunch: function () {
    //调用API从本地缓存中获取数据
    try {
      var that = this;
      that.globalData.api = api;
      //在小程序打开时获取token，同时刷新用户的余额等，防止有后台为用户充值的情况
      api.getToken();
    } catch (e) {
      
    }
  },
  globalData:{
    api:null,
  }
})