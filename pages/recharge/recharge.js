// pages/recharge/recharge.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    checkedRechargeType: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          winWidth: res.windowWidth,
          winHeight: res.windowHeight
        });
      }
    });

    var that = this;
    var app = getApp();
    var api = app.globalData.api;
    api.getAll('recharge-types', { 'sort': 'sequence,realValue' }, function (result) {
      var rechargeTypeList = result.data;
      that.setData({ rechargeTypeList: rechargeTypeList });
    });
    api.checkVip(that);
  },
  rechargeRadioChange: function(e) {
    this.data.rechargeTypeList.forEach((item)=>{
      if (item.id == e.detail.value) {
        this.setData({
          checkedRechargeType: item
        });
      }
    });
  },

  payRecharge: function() {
    var that = this;
    var checkedRechargeType = that.data.checkedRechargeType;
    if (!checkedRechargeType) {
      wx.showToast({
        title: '请选择充值金额',
        icon: 'loading',
        duration: 500,
        complete: function () {
          return;
        }
      })
    }else{
      var app = getApp();
      var api = app.globalData.api;
      api.saveRecharge(
        checkedRechargeType,
        checkedRechargeType.realValue,
        function (data) {
          if (data.data.status == 200) {
            wx.requestPayment({
              'timeStamp': data.data.result.timeStamp.toString(),
              'nonceStr': data.data.result.nonceStr,
              'package': data.data.result.package,
              'signType': data.data.result.signType,
              'paySign': data.data.result.paySign,
              'success': function (res) {
                wx.redirectTo({
                  url: '../rechargeSuccess/rechargeSuccess'
                });
              },
              'fail': function (res) { },
              'complete': function (res) { }
            });
          } else {
            console.log(data.data.message)
            wx.showToast({
              title: '支付失败，请稍后再试',
              icon: 'loading',
              duration: 500,
              complete: function () {
                return;
              }
            });
          }
        }
      );
    }
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})