
(function () {
  const user = SnakeUser.requireUser();
  const skins = SnakeStore.skins;
  const themes = SnakeStore.themes;
  const items = SnakeStore.items;
  const levels = [
    { id: 1, name: '1-1 练习草地', desc: '吃到 6 个食物通关', reward: 12 },
    { id: 2, name: '1-2 小障碍', desc: '吃到 8 个食物，注意石块', reward: 18 },
    { id: 3, name: '1-3 窄道转弯', desc: '吃到 10 个食物，路线更刁钻', reward: 24 },
    { id: 4, name: '1-4 限时冲刺', desc: '45 秒内吃到 10 个食物', reward: 30 },
    { id: 5, name: '1-5 终点挑战', desc: '55 秒内吃到 12 个食物', reward: 40 }
  ];

  const usernameEl = document.getElementById('menuUsername');
  const highScoreEl = document.getElementById('highScore');
  const goldCountEl = document.getElementById('goldCount');
  const loginStreakEl = document.getElementById('loginStreak');
  const skinCountEl = document.getElementById('skinCount');
  const dailyRewardText = document.getElementById('dailyRewardText');
  const skinList = document.getElementById('skinList');
  const itemList = document.getElementById('itemList');
  const previewCanvas = document.getElementById('previewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  const themeSelect = document.getElementById('themeSelect');
  const colorInputs = {
    body: document.getElementById('bodyColor'),
    belly: document.getElementById('bellyColor'),
    eyeRing: document.getElementById('eyeRingColor'),
    blush: document.getElementById('blushColor'),
    eyeStyle: document.getElementById('eyeStyle')
  };

  function shade(hex, amount) {
    const c = hex.replace('#','');
    const n = parseInt(c, 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amount));
    return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  function refreshStats() {
    const current = SnakeUser.getCurrentUser();
    usernameEl.textContent = current.username;
    highScoreEl.textContent = current.highScore;
    goldCountEl.textContent = current.gold;
    loginStreakEl.textContent = current.loginStreak;
    skinCountEl.textContent = current.unlockedSkins.length;
    dailyRewardText.textContent = localStorage.getItem('snake_daily_reward_msg_v4') || '今天也要开开心心吃果果～';
    renderMiniHead();
  }

  function renderMiniHead() {
    const wrap = document.getElementById('menuSnakePreview');
    wrap.innerHTML = '<span class="eye left"></span><span class="eye right"></span><span class="blush left"></span><span class="blush right"></span>';
    const skin = SnakeStore.resolveSkin(SnakeUser.getCurrentUser());
    wrap.style.background = 'radial-gradient(circle at 35% 28%, ' + shade(skin.body, 30) + ', ' + skin.body + ' 58%, ' + shade(skin.body, -20) + ' 100%)';
    wrap.querySelectorAll('.eye').forEach(function (el) { el.style.borderColor = skin.eyeRing; });
    wrap.querySelectorAll('.blush').forEach(function (el) { el.style.background = skin.blush; });
  }

  function renderSkinList() {
    const current = SnakeUser.getCurrentUser();
    skinList.innerHTML = '';
    Object.values(skins).forEach(function (skin) {
      const unlocked = current.unlockedSkins.indexOf(skin.id) >= 0;
      const active = current.selectedSkin === skin.id && !current.useCustomSkin;
      const row = document.createElement('div');
      row.className = 'skin-item';
      row.innerHTML = [
        '<div>',
        '<span class="skin-preview-chip" style="background:linear-gradient(90deg,' + skin.body + ', ' + skin.belly + ')"></span>',
        '<span class="skin-name">' + skin.name + '</span><div class="skin-state">' + (unlocked ? (active ? '当前使用中' : '已解锁') : '未解锁') + '</div>',
        '</div>',
        '<div class="skin-price">' + (skin.price ? skin.price + ' 金币' : '默认') + '</div>',
        '<button class="cute-btn small">' + (unlocked ? (active ? '已选择' : '使用') : '购买') + '</button>'
      ].join('');
      row.querySelector('button').addEventListener('click', function () {
        const now = SnakeUser.getCurrentUser();
        if (!unlocked) {
          if (now.gold < skin.price) {
            alert('金币不够，先多玩几局吧～');
            return;
          }
          SnakeUser.updateCurrentUser(function (u) {
            u.gold -= skin.price;
            if (u.unlockedSkins.indexOf(skin.id) < 0) u.unlockedSkins.push(skin.id);
            u.selectedSkin = skin.id;
            u.useCustomSkin = false;
            u.customSkin = { body: skin.body, belly: skin.belly, eyeRing: skin.eyeRing, blush: skin.blush, eyeStyle: skin.eyeStyle };
          });
        } else if (!active) {
          SnakeUser.updateCurrentUser(function (u) {
            u.selectedSkin = skin.id;
            u.useCustomSkin = false;
            u.customSkin = { body: skin.body, belly: skin.belly, eyeRing: skin.eyeRing, blush: skin.blush, eyeStyle: skin.eyeStyle };
          });
        }
        applySkinToControls();
        renderSkinList();
        refreshStats();
        drawPreview();
      });
      skinList.appendChild(row);
    });
  }

  function renderItemList() {
    const current = SnakeUser.getCurrentUser();
    itemList.innerHTML = '';
    Object.values(items).forEach(function(item) {
      const count = (current.itemInventory && current.itemInventory[item.id]) || 0;
      const card = document.createElement('div');
      card.className = 'item-shop-card';
      card.innerHTML = [
        '<div class="item-shop-top">',
          '<div class="item-icon" style="background:' + item.color + '">' + item.icon + '</div>',
          '<div><strong>' + item.name + '</strong><div class="item-desc">' + item.desc + '</div></div>',
        '</div>',
        '<div class="item-qty">背包数量：<strong>' + count + '</strong></div>',
        '<div class="item-buy-row">',
          '<button class="cute-btn small gold-buy">金币 ' + item.goldPrice + '</button>',
          '<button class="cute-btn small cash-buy">卡支付 ' + item.cardPrice + '</button>',
          '<button class="cute-btn small paypal-buy">PayPal ' + item.paypalPrice + '</button>',
        '</div>'
      ].join('');
      card.querySelector('.gold-buy').addEventListener('click', function(){
        const now = SnakeUser.getCurrentUser();
        if (now.gold < item.goldPrice) { alert('金币不够，先去闯关拿奖励吧～'); return; }
        SnakeUser.updateCurrentUser(function(u){ u.gold -= item.goldPrice; u.itemInventory[item.id] = (u.itemInventory[item.id] || 0) + 1; });
        refreshStats(); renderItemList();
      });
      card.querySelector('.cash-buy').addEventListener('click', function(){
        location.href = 'checkout.html?item=' + encodeURIComponent(item.id) + '&method=credit_card';
      });
      card.querySelector('.paypal-buy').addEventListener('click', function(){
        location.href = 'checkout.html?item=' + encodeURIComponent(item.id) + '&method=paypal';
      });
      itemList.appendChild(card);
    });
  }

  function initThemeOptions() {
    themeSelect.innerHTML = Object.values(themes).map(function (t) {
      return '<option value="' + t.id + '">' + t.name + '</option>';
    }).join('');
    themeSelect.value = user.selectedTheme || 'sky';
  }

  function applySkinToControls() {
    const current = SnakeUser.getCurrentUser();
    const skin = SnakeStore.resolveSkin(current);
    colorInputs.body.value = current.customSkin.body || skin.body;
    colorInputs.belly.value = current.customSkin.belly || skin.belly;
    colorInputs.eyeRing.value = current.customSkin.eyeRing || skin.eyeRing;
    colorInputs.blush.value = current.customSkin.blush || skin.blush;
    colorInputs.eyeStyle.value = current.customSkin.eyeStyle || skin.eyeStyle;
    themeSelect.value = current.selectedTheme || 'sky';
  }

  function drawEye(ctx, x, y, ring, eyeStyle) {
    ctx.save();
    ctx.translate(x, y);
    if (eyeStyle === 'sparkle') {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = ring; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, 21, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const iris = ctx.createRadialGradient(-3, -6, 2, 0, 2, 14); iris.addColorStop(0, '#41506d'); iris.addColorStop(1, '#1f2737');
      ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(0, 3.4, 10.8, 12.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff7bd'; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4; const r = i % 2 === 0 ? 5.8 : 2.6; const px = Math.cos(a) * r; const py = 3 + Math.sin(a) * r; i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3.8, -4.8, 3.1, 0, Math.PI * 2); ctx.arc(2.6, -0.8, 1.6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ring; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const iris = ctx.createRadialGradient(-2, -6, 2, 0, 3, 12); iris.addColorStop(0, '#2c3950'); iris.addColorStop(1, '#1e2430');
      ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(0, 4.4, 9.8, 12.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3.4, -1.6, 2.8, 0, Math.PI * 2); ctx.arc(2.6, 2.2, 1.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPreview() {
    const current = SnakeUser.getCurrentUser();
    const baseSkin = SnakeStore.resolveSkin(current);
    const skin = Object.assign({}, baseSkin, {
      body: colorInputs.body.value || baseSkin.body,
      belly: colorInputs.belly.value || baseSkin.belly,
      eyeRing: colorInputs.eyeRing.value || baseSkin.eyeRing,
      blush: colorInputs.blush.value || baseSkin.blush,
      eyeStyle: colorInputs.eyeStyle.value || baseSkin.eyeStyle
    });
    const theme = themes[themeSelect.value || current.selectedTheme] || themes.sky;
    const ctx = previewCtx;
    ctx.clearRect(0,0,previewCanvas.width, previewCanvas.height);
    const bg = ctx.createLinearGradient(0,0,0,previewCanvas.height);
    bg.addColorStop(0, theme.bgTop); bg.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bg; ctx.fillRect(0,0,previewCanvas.width, previewCanvas.height);
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    for (let x=0;x<previewCanvas.width;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,previewCanvas.height);ctx.stroke();}
    for (let y=0;y<previewCanvas.height;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(previewCanvas.width,y);ctx.stroke();}
    const bodyPoints = [{x:90,y:110},{x:120,y:104},{x:155,y:100},{x:190,y:95},{x:225,y:88}];
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth = 47; ctx.strokeStyle = skin.body;
    ctx.beginPath(); ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y); bodyPoints.forEach(function(p,i){ if(i) ctx.lineTo(p.x,p.y);}); ctx.stroke();
    ctx.save(); ctx.translate(280,84);
    const hg = ctx.createRadialGradient(-14,-18,8,-10,-10,58); hg.addColorStop(0, shade(skin.body, 35)); hg.addColorStop(1, skin.body);
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0,0,60,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-8, -14, 12, 7, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin.blush; ctx.beginPath(); ctx.ellipse(-33,19,9,5.6,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(33,19,9,5.6,0,0,Math.PI*2); ctx.fill();
    drawEye(ctx, -22, -13, skin.eyeRing, skin.eyeStyle); drawEye(ctx, 22, -13, skin.eyeRing, skin.eyeStyle);
    ctx.strokeStyle = '#5b4e57'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0, 24, 9.8, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.restore();
  }

  function renderLevelGrid() {
    const levelGrid = document.getElementById('levelGrid');
    const current = SnakeUser.getCurrentUser();
    const unlockedLevel = current.unlockedLevel || 1;
    levelGrid.innerHTML = '';
    levels.forEach(function(level){
      const unlocked = level.id <= unlockedLevel;
      const cleared = !!(current.clearedLevels && current.clearedLevels[level.id]);
      const best = current.levelBest && current.levelBest[level.id];
      const item = document.createElement('div');
      item.className = 'level-item' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
      item.innerHTML = [
        '<div class="level-top"><strong>' + level.name + '</strong><span class="level-badge">' + (cleared ? '已通关' : (unlocked ? '可挑战' : '未解锁')) + '</span></div>',
        '<p>' + level.desc + '</p>',
        '<div class="level-meta"><span>首通奖励 +' + level.reward + ' 金币</span><span>' + (best ? ('最佳 ' + best + '分') : '暂无记录') + '</span></div>',
        '<button class="cute-btn small">' + (unlocked ? '开始本关' : '先通前一关') + '</button>'
      ].join('');
      const btn = item.querySelector('button');
      if (unlocked) btn.addEventListener('click', function(){ location.href = 'game.html?mode=level&level=' + level.id; });
      else btn.disabled = true;
      levelGrid.appendChild(item);
    });
  }

  document.getElementById('logoutBtn').addEventListener('click', function () { SnakeUser.logout(); location.href = 'login.html'; });
  document.getElementById('openShopBtn').addEventListener('click', function () { document.getElementById('shopCard').scrollIntoView({ behavior: 'smooth' }); });
  document.getElementById('saveCustomBtn').addEventListener('click', function () {
    SnakeUser.updateCurrentUser(function (u) {
      u.useCustomSkin = true;
      u.customSkin = { body: colorInputs.body.value, belly: colorInputs.belly.value, eyeRing: colorInputs.eyeRing.value, blush: colorInputs.blush.value, eyeStyle: colorInputs.eyeStyle.value };
      u.selectedTheme = themeSelect.value;
    });
    refreshStats(); drawPreview(); alert('已保存当前自定义外观');
  });
  document.getElementById('resetCustomBtn').addEventListener('click', function () {
    const selected = SnakeStore.skins[SnakeUser.getCurrentUser().selectedSkin] || SnakeStore.skins.classicBlue;
    SnakeUser.updateCurrentUser(function (u) {
      u.useCustomSkin = false;
      u.customSkin = { body: selected.body, belly: selected.belly, eyeRing: selected.eyeRing, blush: selected.blush, eyeStyle: selected.eyeStyle };
      u.selectedTheme = 'sky';
    });
    applySkinToControls(); refreshStats(); drawPreview();
  });
  Object.values(colorInputs).forEach(function (el) { el.addEventListener('input', drawPreview); el.addEventListener('change', drawPreview); });
  themeSelect.addEventListener('change', function () { SnakeUser.updateCurrentUser({ selectedTheme: themeSelect.value }); refreshStats(); drawPreview(); });
  document.getElementById('startMainGameBtn').addEventListener('click', function(){ const current = SnakeUser.getCurrentUser(); location.href = 'game.html?mode=level&level=' + (current.unlockedLevel || 1); });
  document.getElementById('startKidsModeBtn').addEventListener('click', function(){ location.href = 'game.html?mode=kids'; });
  document.getElementById('startLevelBtn').addEventListener('click', function(){ const current = SnakeUser.getCurrentUser(); location.href = 'game.html?mode=level&level=' + (current.unlockedLevel || 1); });
  document.getElementById('startEndlessBtn').addEventListener('click', function(){ location.href = 'game.html?mode=endless'; });

  refreshStats(); initThemeOptions(); applySkinToControls(); renderSkinList(); renderItemList(); renderLevelGrid(); drawPreview();
})();
