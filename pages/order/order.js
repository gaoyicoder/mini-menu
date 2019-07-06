var Base64 = require('../../utils/base64.js');
var base64 = new Base64();
var that;
var optionId;
Page( {
  hasLogin: false,
  data:{
    hasPhoneNumber: false,
    userBalance: "0.00",
    currentTab: 0,
    currentType:"0",
    toView:"1",
    showCart:false,
    showTag:false,
    sumNum:0,
    sumMon:0,
    heightList: new Array(),
    orderList: [],
    tagMenu:{},
    tagList: {},
    tagOtherIndexList: [],
  },
  onShareAppMessage: function () {
    var title = "点餐小程序";
    var path = "pages/order/order";
    return {
      title: title,
      path: path
    }
  },
  bindChange: function( e ) {

      that = this;
      that.setData( { currentTab: e.detail.current });

  },
  onLoad: function(options) {
    let table = '';
    if (options.scene) {
      table = decodeURIComponent(options.scene).trim();
      wx.setStorage({
        key: "table",
        data: table
      });
      var timestamp = Date.parse(new Date());
      var expiration = timestamp + 7200000;
      wx.setStorage({
        key: "tableExpiration",
        data: expiration
      });
    }
    optionId = options.currentTab ? options.currentTab: 0;
    that = this;
    that.setData({
        currentTab:optionId
    })
    wx.getSystemInfo( {
        success: function( res ) {
            that.setData( {
                winWidth: res.windowWidth,
                winHeight: res.windowHeight
            });
        }
    });
    
    //目的是为了确保，在获取用户电话时，所使用的wx的code和服务器端的code是一致的。
    //防止用户在小程序中停留时间过长，然后造成wx的sessionKey失效。
    that.hasLogin = false;
    var app = getApp();
    var api = app.globalData.api;
    
    wx.checkSession({
      success() {
        console.log('session did not expired');
        that.hasLogin = true;
      },
      fail() {
        console.log('session expired');
        api.getToken().then(function (jwtToken) {
          if (jwtToken) {
            that.hasLogin = true;
          }
        });
      }
    });

    //加载菜单
    api.getAll('menus', { 'sort': 'sequence' }, function (result) {
      var menuData = result.data;
      var menuList = new Array();
      for (var i = 0; i < menuData.length; i++) {
        var v = menuData[i];
        if (menuList[v.menuTypeId] == undefined) {
          menuList[v.menuTypeId] = new Array();
        }
        v.num = 0;
        menuList[v.menuTypeId].push(v);
      }
      that.setData({ menuList: menuList });

      api.getAll('menu-types', { 'sort': 'sequence' }, function (result) {
        var menuTypeList = result.data;
        var height = 0;
        for (var i = 0; i < menuTypeList.length; i++) {
          var menuTypeId = menuTypeList[i].id;
          if (menuList[menuTypeId]) {
            var num = menuList[menuTypeId].length;
            height = height + 41 + num * 91 + 10;
            var heightRow = {
              id: 0,
              height: 0,
            }
            heightRow.id = i;
            heightRow.height = height;
            that.data.heightList.push(heightRow);
          } else {
            menuTypeList.splice(i, 1);
            i = i - 1;
          }
        }
        that.setData({ menuTypeList: menuTypeList });
      });

    });
  },
  onShow:function(){
    var that = this;
    wx.setStorage({
      key:"orderResult",
      data:{}
    });
    wx.getStorage({
      key: 'paidOrder',
      success: function (res) {
        //当用户支付成功，然后点击返回后paidOrder有值，而且data.menuList也有值。而执行onload时,data.menuList为空.
        //从而实现在用户点击返回时，清空购物车.
        if(res.data == true && that.data.menuList) {
          that.clearCart();
          wx.removeStorageSync('paidOrder');
        }
      }
    });
    //更新我的界面的用户账户余额的显示
    var app = getApp();
    var api = app.globalData.api;
    //更新今日订单的中的列表，并防止用户支付成功后，点击返回按钮后，今日订单不刷新。
    var myDate = new Date();
    var year = myDate.getFullYear();
    var month = myDate.getMonth() + 1;
    var day = myDate.getDate();
    api.getAll('orders/search', { 'createdAt': year + '-' + month + '-' + day, 'sort': '-createdAt' }, function (result) {
      var orderList = result.data;
      that.setData({
        orderList: orderList
      });
      api.checkVip(that);
    });
  },
  swichNav: function( e ) {
    var that = this;
    if( this.data.currentTab == e.target.dataset.current ) {
      return false;
    } else {
      that.setData( {
          currentTab: e.target.dataset.current
      });
    }
  },
  
  chooseType:function(event){
      var foodType=event.target.dataset.foodtype;
      var toView=foodType;
      that.setData({
          currentType:foodType,
          toView: toView,
      })
  },

  seeDetailCart:function(){
    if(that.data.showCart!=false||that.data.sumNum>0) {
      that.setData({
        showCart: !that.data.showCart
      });
    }
  },
  addFoodNum:function(e){
    var that = this;
    var menuList = that.data.menuList;
    var menuTypeId = parseInt(e.target.dataset.menuTypeId);
    var jdx = parseInt(e.target.dataset.jdx);
    if (menuList[menuTypeId][jdx].tagId!=0) {
      var app = getApp();
      var api = app.globalData.api;
      var selectedTag = "";
      api.getOne('tags', menuList[menuTypeId][jdx].tagId, {}, function(result) {
        var tagList = result.data;
        tagList.group.forEach(function(tagGroupData) {
          tagGroupData.selected = tagGroupData.type[0];
          selectedTag = selectedTag + tagGroupData.name + '(' +tagGroupData.selected+')；';
        });
        var tagOtherIndexList = [];
        tagList.other.type.forEach(function(typeData, index){
          tagOtherIndexList[index] = 0;
        });
        var tagMenu = menuList[menuTypeId][jdx];
        tagMenu.selectedTag = selectedTag;
        tagMenu.jdx = jdx;
        that.setData({
          tagList: tagList,
          tagOtherIndexList: tagOtherIndexList,
          tagMenu: tagMenu,
        });
        that.showTag();
      });
    } else {
      var addFoodNum = e.target.dataset.num + 1;
      var price = parseFloat(e.target.dataset.price);
      menuList[menuTypeId][jdx].num = addFoodNum;

      that.setData({
        menuList: menuList,
        sumNum: parseInt(that.data.sumNum) + 1,
        sumMon: (parseFloat(that.data.sumMon) + price).toFixed(2),
      });
    }
      
  },
  reduceFoodNum:function(event){
    var that = this;
    var menuList = that.data.menuList;
    var menuTypeId = parseInt(event.target.dataset.menuTypeId);
    var jdx = parseInt(event.target.dataset.jdx);
    
    if (menuList[menuTypeId][jdx].tagId != 0) {
      var num = menuList[menuTypeId][jdx].num;
      menuList[menuTypeId][jdx].num = 0;
      menuList[menuTypeId][jdx].selectedTagList = [];
      that.setData({
        menuList: menuList,
        sumNum: parseInt(that.data.sumNum) - num,
        sumMon: (parseFloat(that.data.sumMon) - menuList[menuTypeId][jdx].price * num).toFixed(2)
      });
    } else {
      var redFoodNum = event.target.dataset.num - 1;
      var price = parseFloat(event.target.dataset.price);
      menuList[menuTypeId][jdx].num = redFoodNum;
      that.setData({
        menuList: menuList,
        sumNum: parseInt(that.data.sumNum) - 1,
        sumMon: (parseFloat(that.data.sumMon) - price).toFixed(2)
      });
    }
  },
  hiddenLayer:function(){
      that.setData({
          showCart:false
      })
  },
  hideTag: function () {
    that.setData({
      showTag: false
    })
  },
  showTag: function () {
    that.setData({
      showTag: true
    })
  },
  tapGroupTag: function(e) {
    var tagList = this.data.tagList;
    tagList.group[e.target.dataset.groupIndex].selected = e.target.dataset.tag;
    this.setData({
      tagList: tagList
    });
    this.resetSelectedTag();
  },
  tapOtherTag: function(e) {
    var tagOtherIndexList = this.data.tagOtherIndexList;
    tagOtherIndexList[e.target.dataset.otherIndex] = tagOtherIndexList[e.target.dataset.otherIndex]==1 ? 0 : 1;
    this.setData({
      tagOtherIndexList: tagOtherIndexList
    });
    this.resetSelectedTag();
  },
  resetSelectedTag: function() {
    var tagMenu = this.data.tagMenu;
    var tagList = this.data.tagList;
    var tagOtherIndexList = this.data.tagOtherIndexList;
    var selectedTag = "";
    tagList.group.forEach(function (tagGroupData) {
      selectedTag = selectedTag + tagGroupData.name + '(' + tagGroupData.selected + ')；';
    });
    var selectedOtherTag = "";
    tagOtherIndexList.forEach(function(other, index) {
      if(other == 1) {
        if (selectedOtherTag == "") {
          selectedOtherTag = tagList.other.type[index];
        } else {
          selectedOtherTag = selectedOtherTag + "," + tagList.other.type[index];
        }
      }
    });
    if (selectedOtherTag != "") {
      selectedTag = selectedTag + tagList.other.name + '(' + selectedOtherTag + ')；'
    }
    tagMenu.selectedTag = selectedTag;
    this.setData({
      tagMenu: tagMenu
    });
  },
  tagDone: function () {
    var tagMenu = this.data.tagMenu;
    var menuList = this.data.menuList;

    tagMenu.num = tagMenu.num + 1;
    var price = parseFloat(tagMenu.price);
    menuList[tagMenu.menuTypeId][tagMenu.jdx].num = tagMenu.num;
    if (menuList[tagMenu.menuTypeId][tagMenu.jdx].selectedTagList == undefined) {
      menuList[tagMenu.menuTypeId][tagMenu.jdx].selectedTagList = Array();
    }
    menuList[tagMenu.menuTypeId][tagMenu.jdx].selectedTagList.push(tagMenu.selectedTag);

    this.setData({
      menuList: menuList,
      sumNum: parseInt(that.data.sumNum) + 1,
      sumMon: (parseFloat(that.data.sumMon) + price).toFixed(2),
    });
    this.hideTag();
  },

  clearCart:function(){
    var menuList=that.data.menuList;
    menuList.forEach(function (typeMenuList, index){
      for (var j = 0; j < typeMenuList.length; j++) {
        if (typeMenuList[j].num > 0) {
          typeMenuList[j].num=0;
        }
      }
    });
    that.setData({
      menuList: menuList,
      sumNum: 0,
      sumMon: 0,
      showCart: false
    });
  },
  placeOrder:function(){
    var detailArray = new Array();
    var menuList = that.data.menuList;
    menuList.forEach(function (typeMenuList, index){
      for (var j = 0; j < typeMenuList.length; j++) {
        if (typeMenuList[j].num > 0) {
          var selectedTagList = [];
          if (typeMenuList[j].selectedTagList != undefined) {
            selectedTagList = typeMenuList[j].selectedTagList;
          }
          var temp = {
            menuId: typeMenuList[j].id,
            menuName: typeMenuList[j].menuName,
            num: typeMenuList[j].num,
            price: typeMenuList[j].price,
            selectedTagList: selectedTagList,
          };
          detailArray.push(temp);
        }
      }
    });
    if(detailArray.length>0) {
      var orderResult = {
        sumMon: that.data.sumMon,
        detail: detailArray
      }
      wx.setStorage({
        key: "orderResult",
        data: orderResult
      })
      wx.navigateTo({
        url: '../balance/balance'
      })
    }
  },
  getPhoneNumber(e) {
    if (this.hasLogin) {
      //如果用户同意提供手机号权限
      if (e.detail.iv != undefined && e.detail.encryptedData != undefined) {
        var app = getApp();
        var api = app.globalData.api;
        var iv = e.detail.iv;
        var encryptedData = e.detail.encryptedData;
        api.getPhoneNumber(iv, encryptedData, function (result) {
          var data = result.data;
          if (data.status == 200) {
            var jwtToken = data.token;
            wx.setStorageSync('jwtToken', jwtToken);
            api.checkVip(that);
          }
        });
      }
    } else {
      wx.showToast({
        title: '注册会员失败，请稍后再试',
        icon: 'loading',
        duration: 500,
        complete: function () {
          return;
        }
      })
    }
  },
  goRecharge: function() {
    wx.navigateTo({
      url: '../recharge/recharge'
    })
  },
  goRechargeList: function () {
    wx.navigateTo({
      url: '../rechargeHistory/rechargeHistory'
    });
  },
  goOrderList:function() {
    wx.navigateTo({
      url: '../orderHistory/orderHistory'
    });
  },
  bindScroll:function(event) {
    var position = event.detail.scrollTop;
    var i = 0;
    while (position >= this.data.heightList[i].height ) {
      i++;
    }
    var menuTypeId = this.data.heightList[i].id;
    that.setData({
      currentType: menuTypeId,
    });
  },
  bindLower: function () {
    var menuTypeId = this.data.heightList[this.data.heightList.length-1].id;
    that.setData({
      currentType: menuTypeId,
    });
  },
  bindUpper: function() {
    
  }
})