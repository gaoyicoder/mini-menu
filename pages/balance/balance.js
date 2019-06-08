var that;
Page( {
    data: {
      userBalance: "0.00",
      hasBalance: false,
      balanceMon: "",
      cashMon: "",
      sumMon: "",
      tableList: [],
      tableIndex: 0,
      buttonDisabled: false,
    },
    onLoad:function(){
      that = this;
      wx.getSystemInfo({
        success: function (res) {
          that.setData({
            winWidth: res.windowWidth,
            winHeight: res.windowHeight
          });
        }
      });

      var app = getApp();
      var api = app.globalData.api;
      api.checkVip(that);

      api.getAll('tables', { 'sort': 'name' }, function (result) {
        var tableList = result.data;
        tableList.unshift({id: "0", name: "请选择桌号"});
        var tableIndex = 0;
        wx.getStorage({
          key: 'table',
          success: function (res) {
            wx.getStorage({
              key: 'tableExpiration',
              success: function (resExp) {
                var expiration = resExp.data;
                var timestamp = Date.parse(new Date());
                if (timestamp <= expiration) {
                  var tableId = res.data;
                  tableList.forEach(function (tableItem, index) {
                    if (tableId != "" && tableItem.id == tableId) {
                      tableIndex = index;
                      that.setData({ tableIndex: tableIndex });
                    }
                  });
                }
              },
            });
          }
        });
        that.setData({ tableList: tableList });
        that.setData({ tableIndex: tableIndex });
      });
    },
    balanceChange:function(e) {
      if (e.detail.value.length>0) {
        var balanceMon, cashMon;
        if (parseFloat(that.data.sumMon) > parseFloat(that.data.userBalance)) {
          balanceMon = that.data.userBalance;
          cashMon = (that.data.sumMon - that.data.userBalance).toFixed(2);
        } else {
          balanceMon = that.data.sumMon;
          cashMon = "0.00";
        }
        that.setData({
          balanceMon: balanceMon,
          cashMon: cashMon,
        });
      } else {
        that.setData({
          balanceMon: "",
          cashMon: that.data.sumMon,
        });
      }
    },
    onShow:function(){
      wx.getStorage({
          key: 'orderResult',
          success: function(res) {
              that.setData({
                  sumMon:res.data.sumMon,
                  detail:res.data.detail,
                  cashMon: res.data.sumMon,
              });
          } 
      });
    },
    bindTableChange: function (e) {
      this.setData({
        tableIndex: e.detail.value
      });
    },
    settlement:function(event){
      var tableNum = that.data.tableList[that.data.tableIndex].name;
      var remarks=event.detail.value.remarks;
      var sumMon=that.data.sumMon;
      var cashMon = that.data.cashMon;
      var balanceMon = that.data.balanceMon;
      var orderDetail=that.data.detail;
      if (tableNum =="请选择桌号"){
        wx.showModal({
          title: '桌号未选择',
          content: '请选择桌号',
          showCancel: false,
        });
      } else {
        var app = getApp();
        var api = app.globalData.api;
        wx.showLoading({
          title: '请稍等',
        });
        that.setData({ buttonDisabled: true});
        api.saveOrder(
          {
            tableNum: tableNum,
            subtotal: sumMon,
            cashMon: cashMon,
            balanceMon: balanceMon,
            isPay: 0,
            detail: orderDetail,
            remarks: remarks,
          },
          cashMon,
          function(data){
            wx.hideLoading();
            if(data.data.status==200) {
              wx.requestPayment({
                'timeStamp': data.data.result.timeStamp.toString(),
                'nonceStr': data.data.result.nonceStr,
                'package': data.data.result.package,
                'signType': data.data.result.signType,
                'paySign': data.data.result.paySign,
                'success': function (res) {
                  wx.redirectTo({
                    url: '../transaction/transaction'
                  });
                },
                'fail': function (res) {
                  that.setData({ buttonDisabled: false });
                },
                'complete': function (res) { }
              });
            } else if (data.data.status == 201){
              wx.redirectTo({
                url: '../transaction/transaction'
              });
            } else {
              that.setData({ buttonDisabled: false });
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
    }
})