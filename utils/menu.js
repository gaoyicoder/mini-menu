var Base64 = require('base64.js');
var base64 = new Base64();

const ENV = 'dev';
const serverConfig = {
  'dev': {'serverUrl': 'https://apidev.gaoyicoder.com'},
  'live': { 'serverUrl': 'https://api.gaoyicoder.com' }
};
function ApiConnect() {
  this.serverURL = serverConfig[ENV].serverUrl;
  this.accessToken = '87c73aca29b94b6b44c0cbb646885846';
  ApiConnect.prototype.requestWithJwt = function (route, method, data, success) {
    let that = this;
    var jwtToken = wx.getStorageSync('jwtToken');
    if (jwtToken == '') {
      this.getToken().then(function (jwtToken) {
        that.requestJwt(route, method, jwtToken, data, success);
      });
    } else {
      that.requestJwt(route, method, jwtToken, data, success);
    }
  };
  ApiConnect.prototype.requestJwt = function (route, method, token, data, success) {
    wx.request({
      url: `${this.serverURL}/${route}`,
      method: method,
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: data,
      success: success
    });
  }
  ApiConnect.prototype.request = function (route, method, data, success) {
    wx.request({
      url: `${this.serverURL}/${route}`,
      method: method,
      data: data,
      success: success
    })
  };
  ApiConnect.prototype.getAll = function (object, data, success) {
    this.requestWithJwt(object, 'get', data, success);
  }
  ApiConnect.prototype.getOpenId = function(code, options) {
    this.request('wechat/login', 'post', { 'accessToken': this.accessToken, 'code':code}, options.success);
  };

  ApiConnect.prototype.saveOrder = function(data, total, success) {
    this.prepay('order', data, total, success);
  };

  ApiConnect.prototype.saveRecharge = function (data, total, success) {
    console.log(data);
    this.prepay('recharge', data, total, success);
  };
  ApiConnect.prototype.prepay = function (type, data, total, success) {
    var params = {
      type: type,
      total: total,
      data: data
    }
    this.requestWithJwt('transactions/prepay-transaction', 'post', params, success);
  };

  ApiConnect.prototype.getToken = function () {
    let that = this;
    return new Promise(function (resolve, reject) {
      wx.login({
        success: function (res) {
          if (res.code) {
            that.getOpenId(res.code, {
              success: function (result) {
                var data = result.data;
                if (data.status == 200) {
                  console.log('login success');
                  var jwtToken = data.token;
                  wx.setStorageSync('jwtToken', jwtToken);
                  resolve(jwtToken);
                } else {
                  console.log('login error');
                }
              }
            });
          } else {
            console.log('获取用户登录态失败！' + res.errMsg)
          }
        }
      });
    });
  }

  ApiConnect.prototype.getPhoneNumber = function (iv, encryptedData, success) {
    let that = this;
    let data = {
      encryptedData: encryptedData,
      iv: iv,
    };
    that.requestWithJwt('wechat/get-phone', 'post', data, success);
  }
  //获取用户的账户余额以及是否为会员
  //checkVip必须在获取token之后调用
  ApiConnect.prototype.checkVip = function(pageObj) {
    var jwtToken = wx.getStorageSync('jwtToken');
    var jwtArray = jwtToken.split('.');
    var userInfo = base64.decode(jwtArray[1]);
    userInfo = JSON.parse(userInfo.replace(/\u0000/g, ""));
    var hasPhoneNumber = userInfo.phoneNumber ? true : false;
    var userBalance = userInfo.balance ? userInfo.balance : 0;
    pageObj.setData({
      hasPhoneNumber: hasPhoneNumber,
      userBalance: userBalance.toFixed(2),
    });
  }
}

module.exports = ApiConnect;