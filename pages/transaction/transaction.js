Page( {
  onLoad: function (options) {
    wx.setStorage({
      key: "paidOrder",
      data: true
    });
    var app = getApp();
    var api = app.globalData.api;
    api.getToken();
  },
})