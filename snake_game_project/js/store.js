(function (window) {
  const skins = {
    classicBlue: {
      id: 'classicBlue',
      name: '奶蓝经典款',
      price: 0,
      body: '#7FD8FF',
      belly: '#FFF6E9',
      eyeRing: '#7fbfff',
      blush: '#ffbfd0',
      eyeStyle: 'classic',
      highlight: '#bfefff'
    },
    puddingPink: {
      id: 'puddingPink',
      name: '布丁粉限定',
      price: 80,
      body: '#ffb7d9',
      belly: '#fff0f6',
      eyeRing: '#ff8fbe',
      blush: '#ff8aa8',
      eyeStyle: 'classic',
      highlight: '#ffd8ec'
    },
    mintBaby: {
      id: 'mintBaby',
      name: '薄荷奶绿',
      price: 120,
      body: '#9be6cf',
      belly: '#f8fff8',
      eyeRing: '#72ceb0',
      blush: '#ffcbda',
      eyeStyle: 'classic',
      highlight: '#d9fff2'
    },
    starDream: {
      id: 'starDream',
      name: '星梦限定',
      price: 180,
      body: '#9ab5ff',
      belly: '#f4f7ff',
      eyeRing: '#7e96f0',
      blush: '#ffc9da',
      eyeStyle: 'sparkle',
      highlight: '#d9e4ff'
    }
  };



  const items = {    slow: { id:'slow', name:'慢速糖浆', desc:'12 秒减速，更容易过窄道', goldPrice: 45, cardPrice:'$0.79', paypalPrice:'$0.79', color:'#9fe2a9', icon:'🐢' },
    doubleGold: { id:'doubleGold', name:'双倍金币卡', desc:'15 秒内吃到食物金币翻倍', goldPrice: 90, cardPrice:'$1.29', paypalPrice:'$1.29', color:'#ffd76c', icon:'💰' },
    magnet: { id:'magnet', name:'果果磁铁', desc:'12 秒内自动吸附附近食物', goldPrice: 120, cardPrice:'$1.49', paypalPrice:'$1.49', color:'#ffb7cf', icon:'🧲' }
  };

  const themes = {
    sky: { id: 'sky', name: '晴空草地', bgTop: '#eaf8ff', bgBottom: '#fff7e8', grid: '#d8eefb', deco: '#c5ebff' },
    candy: { id: 'candy', name: '糖果粉云', bgTop: '#fff1f6', bgBottom: '#fff8e9', grid: '#ffe0ea', deco: '#ffd3de' },
    mint: { id: 'mint', name: '奶绿小镇', bgTop: '#eefdf7', bgBottom: '#f8fff8', grid: '#daf5e8', deco: '#d0efe4' }
  };

  function resolveSkin(user) {
    const selected = skins[user.selectedSkin] || skins.classicBlue;
    if (user && user.useCustomSkin && user.customSkin) {
      return Object.assign({}, selected, user.customSkin || {});
    }
    return Object.assign({}, selected);
  }

  window.SnakeStore = {
    skins,
    themes,
    items,
    resolveSkin
  };
})(window);
