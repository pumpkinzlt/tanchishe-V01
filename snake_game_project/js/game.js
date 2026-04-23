(function () {
  const user = SnakeUser.requireUser();
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const previewCanvas = document.getElementById('sidePreview');
  const pctx = previewCanvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const levelPill = document.getElementById('levelPill');
  const modeLabelEl = document.getElementById('modeLabel');
  const levelNameEl = document.getElementById('levelName');
  const goalTextEl = document.getElementById('goalText');
  const boardTitleText = document.getElementById('boardTitleText');
  const tipModeText = document.getElementById('tipModeText');
  const tipGoalText = document.getElementById('tipGoalText');
  const bestEl = document.getElementById('bestScore');
  const goldEl = document.getElementById('gold');
  const finalScoreEl = document.getElementById('finalScore');
  const finalGoldEl = document.getElementById('finalGold');
  const newRecordText = document.getElementById('newRecordText');
  const resultTitle = document.getElementById('resultTitle');
  const levelRewardText = document.getElementById('levelRewardText');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const overlay = document.getElementById('gameOverOverlay');
  const countdownHint = document.getElementById('countdownHint');
  const boardFrame = document.getElementById('boardFrame');
  const pauseBtn = document.getElementById('pauseBtn');
  const mobilePause = document.getElementById('mobilePause');
  const bgm = document.getElementById('bgm');
  const eatSound = document.getElementById('eatSound');
  const hitSound = document.getElementById('hitSound');
  const musicToggle = document.getElementById('musicToggle');
  const volumeRange = document.getElementById('volumeRange');

  document.getElementById('playerName').textContent = user.username;
  bestEl.textContent = user.highScore;
  goldEl.textContent = user.gold;

  const tile = 28;
  const cols = Math.floor(canvas.width / tile);
  const rows = Math.floor(canvas.height / tile);
  const themes = SnakeStore.themes;
  let currentUser = SnakeUser.getCurrentUser();
  let skin = SnakeStore.resolveSkin(currentUser);
  let theme = themes[currentUser.selectedTheme] || themes.sky;

  const query = new URLSearchParams(location.search);
  const rawMode = query.get('mode');
  const gameMode = rawMode === 'level' ? 'level' : (rawMode === 'kids' ? 'kids' : 'endless');
  const levelIndex = Math.max(1, parseInt(query.get('level') || '1', 10) || 1);
  const isKidsMode = gameMode === 'kids';
  document.body.classList.toggle('kids-mode', isKidsMode);
  const levelDefs = {
    1: { id: 1, name: '1-1 练习草地', targetFoods: 6, speed: 210, reward: 12, timer: 0, obstacles: [] },
    2: { id: 2, name: '1-2 小障碍', targetFoods: 8, speed: 195, reward: 18, timer: 0, obstacles: [{x:10,y:7},{x:10,y:8},{x:10,y:9},{x:20,y:12},{x:21,y:12},{x:22,y:12}] },
    3: { id: 3, name: '1-3 窄道转弯', targetFoods: 10, speed: 188, reward: 24, timer: 0, obstacles: [{x:14,y:5},{x:14,y:6},{x:14,y:7},{x:14,y:8},{x:14,y:9},{x:14,y:10},{x:18,y:10},{x:19,y:10},{x:20,y:10},{x:21,y:10},{x:22,y:10}] },
    4: { id: 4, name: '1-4 限时冲刺', targetFoods: 10, speed: 178, reward: 30, timer: 45, obstacles: [{x:8,y:8},{x:9,y:8},{x:22,y:8},{x:23,y:8},{x:15,y:14},{x:16,y:14}] },
    5: { id: 5, name: '1-5 终点挑战', targetFoods: 12, speed: 170, reward: 40, timer: 55, obstacles: [{x:11,y:6},{x:11,y:7},{x:11,y:8},{x:20,y:6},{x:20,y:7},{x:20,y:8},{x:15,y:12},{x:16,y:12},{x:17,y:12},{x:18,y:12}] }
  };
  const currentLevelDef = levelDefs[levelIndex] || levelDefs[1];
  const itemStatusEl = document.getElementById('itemStatus');
  const itemCounts = {
    slow: document.getElementById('countSlow'),
    doubleGold: document.getElementById('countDoubleGold'),
    magnet: document.getElementById('countMagnet')
  };

  let snake = [];
  let prevSnake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let directionQueue = [];
  let foods = [];
  let magnetFx = { active: false, foodIndex: -1, progress: 0, startX: 0, startY: 0, targetX: 0, targetY: 0 };
  let score = 0;
  let roundGold = 0;
  let isPaused = false;
  let isGameOver = false;
  let stepMs = 200;
  let accumulator = 0;
  let lastTime = 0;
  let eatTimer = 0;
  let mouthTongueTimer = 0;
  let eatBurstTimer = 0;
  let eatBurstPos = { x: 0, y: 0 };
  let dizzyTimer = 0;
  let countdown = 0;
  let displayHeadAngle = 0;
  let countdownStart = 0;
  let bodyWave = 0;
  let frameTick = 0;
  let turnPulse = 0;
  let reversePulse = 0;
  let reversePending = null;
  let inputStartedAudio = false;
  let shakeTimer = 0;
  let shakePower = 0;
  let borderFlashTimer = 0;
  let pendingGameOver = false;
  let foodEaten = 0;
  let levelTimer = currentLevelDef.timer || 0;
  let gameWon = false;
  let obstacles = [];
  let lastResultWasWin = false;
  let itemInventory = {};
  let activeEffects = {};
  let gameState = { baseSpeed: 1, speedMultiplier: 1, scoreMultiplier: 1, goldMultiplier: 1, magnetRange: 0, magnetPullStep: 0 };
  let recentItemFx = { type: '', timer: 0 };
  let fxMessageTimer = 0;
  let kidsProtectReady = false;
  let staticLayerCanvas = null;
  let staticLayerCtx = null;
  let staticLayerDirty = true;


  function syncItemCounts() {
    Object.keys(itemCounts).forEach(function (k) {
      if (itemCounts[k]) itemCounts[k].textContent = itemInventory[k] || 0;
    });
    updateItemButtons();
  }

  function updateItemButtons() {
    document.querySelectorAll('[data-item]').forEach(function(btn){
      const key = btn.getAttribute('data-item');
      const count = itemInventory[key] || 0;
      const active = Effects.isActive(key, effectCtx);
      const cooling = Cooldowns.isCooldown(key);
      const cdLeft = Math.ceil(Cooldowns.getRemaining(key) / 1000);
      btn.classList.toggle('has-count', count > 0);
      btn.classList.toggle('disabled-item', count <= 0 || cooling);
      btn.classList.toggle('active-item', !!active);
      btn.title = count > 0
        ? (cooling ? ('冷却中，还需 ' + cdLeft + ' 秒') : ('剩余 ' + count + ' 个，点击立即使用'))
        : '当前没有该道具，先去商店购买';
      btn.disabled = count <= 0 || isGameOver || countdown > 0 || cooling;
    });
  }

  function setItemStatus(msg) {
    if (!itemStatusEl) return;
    itemStatusEl.textContent = msg;
    fxMessageTimer = 140;
  }

  const effectCtx = {
    get activeEffects() { return activeEffects; },
    set activeEffects(v) { activeEffects = v; },
    gameState,
    get recentFx() { return recentItemFx; },
    set recentFx(v) { recentItemFx = v; },
    setStatus: setItemStatus
  };

  function grantLevelStarterItems() {
    if (gameMode !== 'level') return;
    itemInventory.slow = (itemInventory.slow || 0) + 1;
    if (currentLevelDef.id >= 3) itemInventory.doubleGold = (itemInventory.doubleGold || 0) + 1;
    if (currentLevelDef.id >= 5) itemInventory.magnet = (itemInventory.magnet || 0) + 1;
    setItemStatus('本关赠送：减速x1' + (currentLevelDef.id >= 3 ? '、双倍x1' : '') + (currentLevelDef.id >= 5 ? '、磁铁x1' : ''));
  }

  function persistItems() {
    SnakeUser.updateCurrentUser(function (u) {
      u.itemInventory = Object.assign({}, itemInventory);
    });
    currentUser = SnakeUser.getCurrentUser();
  }

function useItem(itemId) {
  if (isGameOver) { setItemStatus('本局已经结束啦，重新开始后再使用道具'); return; }
  if (countdown > 0) { setItemStatus('倒计时结束后才能使用道具'); return; }
  if (!(itemInventory[itemId] > 0)) {
    setItemStatus('这个道具已经用完啦，去商店补货～');
    updateItemButtons();
    return;
  }

  const result = Effects.apply(itemId, effectCtx);
  if (!result.ok) {
    if (result.reason === 'cooldown') {
      setItemStatus('该道具正在冷却中，请稍后再试');
    } else {
      setItemStatus('这个道具当前无法使用');
    }
    updateItemButtons();
    return;
  }

  itemInventory[itemId] -= 1;
  persistItems();
  syncItemCounts();
  Effects.rebuildGameState(effectCtx);
  updateUI();
}

window.useItem = useItem;

  function resetGame() {
    currentUser = SnakeUser.getCurrentUser();
    skin = SnakeStore.resolveSkin(currentUser);
    theme = themes[currentUser.selectedTheme] || themes.sky;
    snake = [
      { x: 6, y: 10 },
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 }
    ];
    prevSnake = snake.map(function(seg){ return { x: seg.x, y: seg.y }; });
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    directionQueue = [];
    obstacles = (currentLevelDef.obstacles || []).map(function(o){ return {x:o.x, y:o.y}; });
    foods = [];
    resetMagnetFx();
    itemInventory = Object.assign({ slow:0, doubleGold:0, magnet:0 }, currentUser.itemInventory || {});
    activeEffects = {};
    Cooldowns.clear();
    recentItemFx = { type: '', timer: 0 };
    gameState.baseSpeed = 1;
    Effects.rebuildGameState(effectCtx);
    grantLevelStarterItems();
    syncItemCounts();
    spawnFood();
    score = 0;
    foodEaten = 0;
    levelTimer = currentLevelDef.timer || 0;
    gameWon = false;
    roundGold = 0;
    isPaused = false;
    isGameOver = false;
    kidsProtectReady = isKidsMode;
    stepMs = gameMode === 'level' ? currentLevelDef.speed : (isKidsMode ? 240 : 200);
    accumulator = 0;
    lastTime = 0;
    eatTimer = 0;
    mouthTongueTimer = 0;
    eatBurstTimer = 0;
    eatBurstPos = { x: 0, y: 0 };
    dizzyTimer = 0;
    countdown = 3;
    countdownStart = performance.now();
    displayHeadAngle = 0;
    overlay.classList.add('hidden');
    scoreEl.textContent = '0';
    updateItemButtons();
    updateModeUI();
    goldEl.textContent = currentUser.gold;
    shakeTimer = 0;
    shakePower = 0;
    borderFlashTimer = 0;
    pendingGameOver = false;
    boardFrame.style.transform = '';
    renderSidePreview();
  }

  function randomFoodCell() {
    return {
      x: Math.floor(Math.random() * (cols - 2)) + 1,
      y: Math.floor(Math.random() * (rows - 2)) + 1,
      type: Math.random() > 0.5 ? 'fruit' : 'candy'
    };
  }


  function resetMagnetFx() {
    magnetFx = { active: false, foodIndex: -1, progress: 0, startX: 0, startY: 0, targetX: 0, targetY: 0 };
  }

  function triggerMagnetFx(index) {
    if (magnetFx.active) return;
    const food = foods[index];
    const head = snake[0];
    if (!food || !head) return;
    magnetFx.active = true;
    magnetFx.foodIndex = index;
    magnetFx.progress = 0;
    magnetFx.startX = food.x;
    magnetFx.startY = food.y;
    magnetFx.targetX = head.x;
    magnetFx.targetY = head.y;
    recentItemFx = { type: 'magnet', timer: 32 };
  }

  function updateMagnetFx() {
    if (!magnetFx.active) return false;
    const food = foods[magnetFx.foodIndex];
    const head = snake[0];
    if (!food || !head) {
      resetMagnetFx();
      return false;
    }
    magnetFx.targetX = head.x;
    magnetFx.targetY = head.y;
    magnetFx.progress = Math.min(1, magnetFx.progress + 0.24);
    const ease = 1 - Math.pow(1 - magnetFx.progress, 3);
    food.x = magnetFx.startX + (magnetFx.targetX - magnetFx.startX) * ease;
    food.y = magnetFx.startY + (magnetFx.targetY - magnetFx.startY) * ease;
    food.isBeingPulled = true;
    return magnetFx.progress >= 1 || (Math.abs(food.x - head.x) + Math.abs(food.y - head.y) <= 0.35);
  }

  function consumeFoodAt(index, headRef) {
    const head = headRef || snake[0];
    if (index < 0 || index >= foods.length) return 'skip';
    const gainScore = 10 * gameState.scoreMultiplier;
    const gainGold = 1 * gameState.goldMultiplier;
    score += gainScore;
    foodEaten += 1;
    roundGold += gainGold;
    if (score % 100 === 0) roundGold += 5;
    scoreEl.textContent = score;
    eatTimer = 12;
    mouthTongueTimer = 18;
    eatBurstTimer = 18;
    eatBurstPos = gridToPixel(head);
    try { eatSound.currentTime = 0; eatSound.play(); } catch(e) {}
    foods.splice(index, 1);
    resetMagnetFx();
    spawnFood();
    if (score > 0 && score % 50 === 0) stepMs = Math.max(120, stepMs - 8);
    updateModeUI();
    if (gameMode === 'level' && foodEaten >= currentLevelDef.targetFoods) {
      levelClear();
      return 'levelClear';
    }
    return 'ok';
  }

  function spawnFood() {
    const targetCount = isKidsMode ? 3 : 1;
    let guard = 0;
    while (foods.length < targetCount && guard < 300) {
      guard++;
      const f = randomFoodCell();
      const blockedBySnake = snake.some(function(s){ return s.x === f.x && s.y === f.y; });
      const blockedByObstacle = obstacles.some(function(o){ return o.x === f.x && o.y === f.y; });
      const blockedByFood = foods.some(function(existing){ return existing.x === f.x && existing.y === f.y; });
      if (!blockedBySnake && !blockedByObstacle && !blockedByFood) {
        foods.push(f);
      }
    }
    if (foods.length === 0) {
      foods.push({ x: 2, y: 2, type: 'fruit' });
    }
  }

  function startAudio() {
    if (inputStartedAudio) return;
    inputStartedAudio = true;
    bgm.volume = currentUser.settings.volume || 0.45;
    volumeRange.value = bgm.volume;
    musicToggle.checked = !!currentUser.settings.musicOn;
    if (musicToggle.checked) {
      bgm.play().catch(function () {});
    }
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function sameDir(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function setDirection(nx, ny) {
    startAudio();
    const candidate = { x: nx, y: ny };
    const lastQueued = directionQueue.length ? directionQueue[directionQueue.length - 1] : dir;
    if (sameDir(candidate, lastQueued) || sameDir(candidate, dir)) return;

    // 终极优化版：直接禁止反向输入，避免原地折返造成的视觉错乱和手感不稳
    if (isOpposite(candidate, lastQueued) || isOpposite(candidate, dir)) {
      return;
    }

    if (directionQueue.length >= 2) return;
    directionQueue.push(candidate);
    nextDir = directionQueue[0] || dir;
    turnPulse = 1;
  }

  function handleStep() {
    prevSnake = snake.map(function(seg){ return { x: seg.x, y: seg.y }; });
    if (directionQueue.length) {
      const candidate = directionQueue.shift();
      nextDir = candidate;
    }
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const willHitBody = snake.slice(0, -1).some(function(seg){ return seg.x === head.x && seg.y === head.y; });
    const hitWall = head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows;
    const hitObstacle = obstacles.some(function(o){ return o.x === head.x && o.y === head.y; });
    if (hitWall || willHitBody || hitObstacle) {
      if (isKidsMode && kidsProtectReady) {
        kidsProtectReady = false;
        recentItemFx = { type: '', timer: 0 };
        shakeTimer = 8; shakePower = 4; borderFlashTimer = 5;
        setItemStatus('小心撞到啦～再试一次');
        return;
      }
      triggerImpact(hitWall || hitObstacle);
      return;
    }

    snake.unshift(head);
    const eatenIndex = foods.findIndex(function(f){ return head.x === f.x && head.y === f.y; });
    if (eatenIndex !== -1) {
      const gainScore = 10 * gameState.scoreMultiplier;
      const gainGold = 1 * gameState.goldMultiplier;
      score += gainScore;
      foodEaten += 1;
      roundGold += gainGold;
      if (score % 100 === 0) roundGold += 5;
      scoreEl.textContent = score;
      eatTimer = 12;
      mouthTongueTimer = 18;
      eatBurstTimer = 18;
      eatBurstPos = gridToPixel(head);
      try { eatSound.currentTime = 0; eatSound.play(); } catch(e) {}
      foods.splice(eatenIndex, 1);
      spawnFood();
      if (score > 0 && score % 50 === 0) stepMs = Math.max(120, stepMs - 8);
      updateModeUI();
      if (gameMode === 'level' && foodEaten >= currentLevelDef.targetFoods) {
        levelClear();
        return;
      }
    } else {
      snake.pop();
      updateModeUI();
    }
  }



function updateUI() {
  updateModeUI();
  updateItemButtons();
}

  function updateModeUI() {
    if (gameMode === 'level') {
      modeLabelEl.textContent = '闯关模式';
      levelNameEl.textContent = currentLevelDef.name;
      goalTextEl.textContent = foodEaten + '/' + currentLevelDef.targetFoods;
      boardTitleText.textContent = currentLevelDef.timer ? (currentLevelDef.name + ' · 倒计时 ' + Math.max(0, Math.ceil(levelTimer)) + ' 秒') : (currentLevelDef.name + ' · 吃够 ' + currentLevelDef.targetFoods + ' 个食物即可通关');
      tipModeText.textContent = '首通奖励 +' + currentLevelDef.reward + ' 金币';
      tipGoalText.textContent = currentLevelDef.timer ? ('限时 ' + currentLevelDef.timer + ' 秒内完成') : '注意障碍物，别撞晕啦';
      levelPill.classList.remove('hidden');
    } else if (isKidsMode) {
      modeLabelEl.textContent = '儿童模式';
      levelNameEl.textContent = '轻松游玩';
      goalTextEl.textContent = '∞';
      boardTitleText.textContent = '速度更慢，还有一次自动保护机会';
      tipModeText.textContent = kidsProtectReady ? '本局保护：未使用' : '本局保护：已使用';
      tipGoalText.textContent = '轻松吃果果，熟悉操作最重要';
      levelPill.classList.remove('hidden');
    } else {
      modeLabelEl.textContent = '经典无尽模式';
      levelNameEl.textContent = '-';
      goalTextEl.textContent = '∞';
      boardTitleText.textContent = '边界更清晰，撞墙前更容易判断';
      tipModeText.textContent = '每吃 1 个食物 +1 金币';
      tipGoalText.textContent = '每 100 分额外 +5 金币';
      levelPill.classList.add('hidden');
    }
  }

  function levelClear() {
    if (isGameOver) return;
    isGameOver = true;
    gameWon = true;
    lastResultWasWin = true;
    const oldBest = currentUser.highScore;
    const firstClear = !(currentUser.clearedLevels && currentUser.clearedLevels[currentLevelDef.id]);
    const bonus = currentLevelDef.reward + (firstClear ? 10 : 0);
    SnakeUser.updateCurrentUser(function (u) {
      u.gold += roundGold + bonus;
      if (score > u.highScore) u.highScore = score;
      u.settings.musicOn = musicToggle.checked;
      u.settings.volume = Number(volumeRange.value);
      u.itemInventory = Object.assign({}, itemInventory);
      u.clearedLevels = u.clearedLevels || {};
      u.levelBest = u.levelBest || {};
      u.clearedLevels[currentLevelDef.id] = true;
      u.levelBest[currentLevelDef.id] = Math.max(u.levelBest[currentLevelDef.id] || 0, score);
      u.unlockedLevel = Math.max(u.unlockedLevel || 1, Math.min(5, currentLevelDef.id + 1));
    });
    currentUser = SnakeUser.getCurrentUser();
    bestEl.textContent = currentUser.highScore;
    goldEl.textContent = currentUser.gold;
    finalScoreEl.textContent = score;
    finalGoldEl.textContent = roundGold + bonus;
    resultTitle.textContent = '通关成功！';
    newRecordText.textContent = score > oldBest ? '本关也顺手刷新了最高分，太厉害啦！' : '这关拿下啦，继续冲下一关～';
    levelRewardText.textContent = '本关奖励：局内 ' + roundGold + ' 金币 + 关卡奖励 ' + bonus + ' 金币';
    nextLevelBtn.classList.toggle('hidden', currentLevelDef.id >= 5);
    overlay.classList.remove('hidden');
    updateItemButtons();
  }


  function triggerImpact(isWallHit) {
    if (pendingGameOver || isGameOver) return;
    pendingGameOver = true;
    shakeTimer = isWallHit ? 14 : 9;
    shakePower = isWallHit ? 9 : 6;
    borderFlashTimer = isWallHit ? 10 : 6;
    try { hitSound.currentTime = 0; hitSound.play(); } catch(e) {}
    setTimeout(function () {
      gameOver();
    }, isWallHit ? 170 : 120);
  }

  function updateShakeFrame() {
    if (shakeTimer > 0) {
      const dx = (Math.random() * 2 - 1) * shakePower;
      const dy = (Math.random() * 2 - 1) * shakePower * 0.65;
      boardFrame.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      shakeTimer--;
      shakePower *= 0.82;
    } else if (boardFrame.style.transform) {
      boardFrame.style.transform = '';
    }
  }

  function drawBorderWarning() {
    const head = snake[0];
    if (!head) return;
    const leftDist = head.x;
    const rightDist = cols - 1 - head.x;
    const topDist = head.y;
    const bottomDist = rows - 1 - head.y;
    const pulse = Math.sin(performance.now() / 120) * 0.5 + 0.5;

    ctx.save();
    if (leftDist === 2) drawWarningSide('left', 'rgba(255, 210, 70, 0.22)');
    if (leftDist === 1) drawWarningSide('left', 'rgba(255, 112, 112, 0.38)', pulse);

    if (rightDist === 2) drawWarningSide('right', 'rgba(255, 210, 70, 0.22)');
    if (rightDist === 1) drawWarningSide('right', 'rgba(255, 112, 112, 0.38)', pulse);

    if (topDist === 2) drawWarningSide('top', 'rgba(255, 210, 70, 0.22)');
    if (topDist === 1) drawWarningSide('top', 'rgba(255, 112, 112, 0.38)', pulse);

    if (bottomDist === 2) drawWarningSide('bottom', 'rgba(255, 210, 70, 0.22)');
    if (bottomDist === 1) drawWarningSide('bottom', 'rgba(255, 112, 112, 0.38)', pulse);

    if (borderFlashTimer > 0) {
      const alpha = 0.14 + (borderFlashTimer / 10) * 0.2;
      drawWarningSide('left', 'rgba(255, 82, 82, ' + alpha + ')');
      drawWarningSide('right', 'rgba(255, 82, 82, ' + alpha + ')');
      drawWarningSide('top', 'rgba(255, 82, 82, ' + alpha + ')');
      drawWarningSide('bottom', 'rgba(255, 82, 82, ' + alpha + ')');
      borderFlashTimer--;
    }
    ctx.restore();
  }

  function drawWarningSide(side, color, pulse) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = pulse ? 18 + pulse * 18 : 8;
    const t = pulse ? 10 + pulse * 7 : 10;
    if (side === 'left') ctx.fillRect(0, 0, t, canvas.height);
    if (side === 'right') ctx.fillRect(canvas.width - t, 0, t, canvas.height);
    if (side === 'top') ctx.fillRect(0, 0, canvas.width, t);
    if (side === 'bottom') ctx.fillRect(0, canvas.height - t, canvas.width, t);
    ctx.restore();
  }

  function gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    pendingGameOver = false;
    dizzyTimer = 60;
    const oldBest = currentUser.highScore;
    SnakeUser.updateCurrentUser(function (u) {
      u.gold += roundGold;
      if (score > u.highScore) u.highScore = score;
      u.settings.musicOn = musicToggle.checked;
      u.settings.volume = Number(volumeRange.value);
      u.itemInventory = Object.assign({}, itemInventory);
    });
    currentUser = SnakeUser.getCurrentUser();
    bestEl.textContent = currentUser.highScore;
    goldEl.textContent = currentUser.gold;
    finalScoreEl.textContent = score;
    finalGoldEl.textContent = roundGold;
    resultTitle.textContent = isKidsMode ? '再试一次吧～' : '哎呀，撞晕啦～';
    if (gameMode === 'level') {
      newRecordText.textContent = '本关目标：' + currentLevelDef.targetFoods + ' 个食物，目前完成 ' + foodEaten + ' 个。';
      levelRewardText.textContent = '再试一次就能拿到首通奖励 +' + currentLevelDef.reward + ' 金币';
      nextLevelBtn.classList.add('hidden');
    } else {
      newRecordText.textContent = score > oldBest ? '恭喜你刷新了历史最高分！' : '再试一次，一定能更高分～';
      levelRewardText.textContent = '经典模式继续练手感，顺便攒金币买皮肤～';
      nextLevelBtn.classList.add('hidden');
    }
    setTimeout(function () {
      overlay.classList.remove('hidden');
    updateItemButtons();
    }, 700);
  }

  function ensureStaticLayer() {
    if (!staticLayerCanvas) {
      staticLayerCanvas = document.createElement('canvas');
      staticLayerCanvas.width = canvas.width;
      staticLayerCanvas.height = canvas.height;
      staticLayerCtx = staticLayerCanvas.getContext('2d');
    }
    if (!staticLayerDirty) return;

    const c = staticLayerCtx;
    c.clearRect(0, 0, canvas.width, canvas.height);

    const bg = c.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, theme.bgTop);
    bg.addColorStop(1, theme.bgBottom);
    c.fillStyle = bg;
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.strokeStyle = theme.grid;
    c.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += tile) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, canvas.height); c.stroke();
    }
    for (let y = 0; y <= canvas.height; y += tile) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(canvas.width, y); c.stroke();
    }

    // 静态障碍直接画进缓存层，减少每帧重绘负担
    if (obstacles.length) {
      obstacles.forEach(function(o){
        const x = o.x * tile + 4;
        const y = o.y * tile + 4;
        const w = tile - 8;
        const h = tile - 8;
        const g = c.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, '#90b9ff');
        g.addColorStop(1, '#5f8ef5');
        c.fillStyle = g;
        roundRect(c, x, y, w, h, 9);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)';
        roundRect(c, x + 3, y + 3, w - 6, 6, 6);
        c.fill();
      });
    }

    c.save();
    c.strokeStyle = '#73cdfd';
    c.lineWidth = 8;
    c.strokeRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    c.restore();

    staticLayerDirty = false;
  }

  function drawBackground() {
    ensureStaticLayer();
    ctx.drawImage(staticLayerCanvas, 0, 0);
    drawBorderWarning();
  }

  function drawObstacles() {
    // 障碍已并入静态缓存层，这里保留函数占位，避免改动其他调用链
  }
  function drawObstacles() {
    // 障碍已画入静态缓存层
  }

  function drawFood(food) {
    const x = food.x * tile + tile / 2;
    const y = food.y * tile + tile / 2;
    const pulse = 1 + Math.sin(performance.now() / 180) * (isKidsMode ? 0.09 : 0.06);
    const pullBoost = food && food.isBeingPulled ? 1.12 : 1;
    const foodScale = (isKidsMode ? 1.1 : 1) * pullBoost;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse * foodScale, pulse * foodScale);
    if (food && food.isBeingPulled && snake[0]) {
      const headPx = gridToPixel(snake[0]);
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#ff8fc5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(headPx.x - x, headPx.y - y);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.restore();
    }
    if (food.type === 'candy') {
      const wrap = ctx.createRadialGradient(-2, -2, 2, 0, 0, 22);
      wrap.addColorStop(0, '#ffd8e6');
      wrap.addColorStop(1, '#ff87ad');
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = wrap;
      ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff1f6'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, 6.2, 0.3, Math.PI * 1.7); ctx.stroke();
      ctx.fillStyle = '#ffa1bf';
      ctx.beginPath(); ctx.moveTo(-11,-2); ctx.lineTo(-22,-10); ctx.lineTo(-19,2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(11,-2); ctx.lineTo(22,-10); ctx.lineTo(19,2); ctx.closePath(); ctx.fill();
    } else {
      const fruit = ctx.createRadialGradient(-4, -6, 3, 0, 0, 18);
      fruit.addColorStop(0, '#ffb0b0');
      fruit.addColorStop(1, '#ff6f7f');
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.arc(0, 2, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fruit;
      ctx.beginPath(); ctx.arc(-4, 1, 9.5, 0, Math.PI * 2); ctx.arc(4, 1, 9.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, 1); ctx.quadraticCurveTo(0, 20, 14, 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.ellipse(-4, -3, 3.2, 1.8, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#73bf73'; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(5, -18, 12, -14); ctx.stroke();
      ctx.fillStyle = '#91dc8f';
      ctx.beginPath(); ctx.ellipse(8, -11, 5, 2.7, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function gridToPixel(seg) {
    return { x: seg.x * tile + tile / 2, y: seg.y * tile + tile / 2 };
  }

  function getRenderSnake(progress) {
    const pts = [];
    const maxLen = snake.length;
    const prevPixels = prevSnake.map(gridToPixel);
    const currPixels = snake.map(gridToPixel);
    for (let i = 0; i < maxLen; i++) {
      const from = prevPixels[i] || prevPixels[prevPixels.length - 1] || currPixels[i];
      const to = currPixels[i] || currPixels[currPixels.length - 1] || from;
      const px = from.x + (to.x - from.x) * progress;
      const py = from.y + (to.y - from.y) * progress;
      pts.push({ x: px, y: py });
    }

    if (pts.length <= 2) return pts;

    const smooth = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];
      smooth.push({
        x: prev.x * 0.22 + curr.x * 0.56 + next.x * 0.22,
        y: prev.y * 0.22 + curr.y * 0.56 + next.y * 0.22
      });
    }
    smooth.push(pts[pts.length - 1]);
    return smooth;
  }

  function getPixelPoints(progress) {
    return getRenderSnake(progress);
  }

  function getPointAt(pts, dist) {
    if (pts.length === 1) return pts[0];
    let remain = dist;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (remain <= segLen) {
        const t = segLen ? remain / segLen : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      remain -= segLen;
    }
    return pts[pts.length - 1];
  }

  function angleForDir(d) {
    // 头部原始绘制朝向是“向下”，所以这里要做一个方向偏移，
    // 否则向上再向左时会出现脸倒过来的违和感。
    if (d.x === 1) return -Math.PI / 2;
    if (d.x === -1) return Math.PI / 2;
    if (d.y === 1) return 0;
    return Math.PI;
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function drawSnake(progress) {
    const pts = getPixelPoints(progress);
    if (pts.length < 2) return;

    const targetAngle = angleForDir(dir);
    const diff = normalizeAngle(targetAngle - displayHeadAngle);
    displayHeadAngle += diff * 0.18;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawSoftPath(ctx, pts.slice().reverse(), skin.body, 20);
    drawSoftPath(ctx, pts.slice().reverse().map(function(p){ return { x: p.x - 2.5, y: p.y - 4 }; }), skin.highlight || shade(skin.body, 35), 7);
    drawPatternAlongBody(pts);

    if (pts.length > 1) {
      const tail = pts[pts.length - 1];
      const tailPrev = pts[pts.length - 2];
      const tailAngle = Math.atan2(tail.y - tailPrev.y, tail.x - tailPrev.x);
      ctx.save();
      ctx.translate(tail.x, tail.y);
      ctx.rotate(tailAngle);
      ctx.fillStyle = skin.body;
      ctx.beginPath();
      ctx.moveTo(-2, -5.5);
      ctx.quadraticCurveTo(10, 0, -2, 5.5);
      ctx.quadraticCurveTo(3.5, 0, -2, -5.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = skin.highlight || shade(skin.body, 35);
      ctx.beginPath();
      ctx.moveTo(-1, -2.6);
      ctx.quadraticCurveTo(5.8, -0.5, -0.5, 1.3);
      ctx.quadraticCurveTo(1.4, 0, -1, -2.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    drawHead(pts[0], pts);
  }


  function drawSoftPath(context, pts, color, width) {
    if (pts.length < 2) return;
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      context.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
  }

  function drawPatternAlongBody(pts) {
    ctx.save();
    const total = Math.max(0, (pts.length - 1) * tile);
    const count = Math.max(2, Math.floor(total / 36));
    for (let i = 1; i <= count; i++) {
      const p = getPointAt(pts, i * 30);
      ctx.fillStyle = shade(skin.highlight || skin.body, 10);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 1.8, 4.3, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x - 1.1, p.y - 2.4, 1.7, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHead(head, pts) {

    ctx.save();
    let angle = displayHeadAngle;
    const eatScale = mouthTongueTimer > 0 ? 1 + Math.sin(performance.now() / 65) * 0.045 : 1;
    if (dizzyTimer > 0) {
      angle += Math.sin(performance.now() / 80) * 0.14;
    }
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);
    ctx.scale(eatScale, eatScale);

    const headRadius = 24.6 + turnPulse * 0.55;
    const grad = ctx.createRadialGradient(-8, -10, 4, -2, -4, 28);
    grad.addColorStop(0, shade(skin.body, 34));
    grad.addColorStop(1, skin.body);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(-7.6, -12.6, 11.4, 6.4, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skin.blush;
    ctx.beginPath();
    ctx.ellipse(-16.6, 12.6, 6.2, 3.8, 0, 0, Math.PI * 2);
    ctx.ellipse(16.6, 12.6, 6.2, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (dizzyTimer > 0) {
      drawDizzyEyes();
    } else {
      drawEye(-12.4, -7.0, skin.eyeStyle);
      drawEye(12.4, -7.0, skin.eyeStyle);
    }

    if (mouthTongueTimer > 0) {
      const chew = 1 + Math.sin(performance.now() / 90) * 0.06;
      // 更可爱的“啊呜”张嘴：圆润、对称，不再像奇怪的舌头/口腔块
      ctx.fillStyle = '#5b4b58';
      ctx.beginPath();
      ctx.ellipse(0, 13.8, 9.8 * chew, 7.2 * chew, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffcfdd';
      ctx.beginPath();
      ctx.ellipse(0, 15.4, 6.1 * chew, 4.1 * chew, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff7fb';
      ctx.beginPath();
      ctx.ellipse(-2.6, 11.4, 1.9, 1.3, -0.25, 0, Math.PI * 2);
      ctx.ellipse(2.2, 12.2, 1.1, 0.75, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ff9eba';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 15.9, 4.2, 0.15, Math.PI - 0.15);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.6, 7.3);
      ctx.lineTo(-1.3, 9.0);
      ctx.moveTo(4.6, 7.3);
      ctx.lineTo(1.3, 9.0);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#614e59';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 16.9, 6.6, 0.18, Math.PI - 0.18);
      ctx.stroke();
    }

    if (dizzyTimer > 0) drawStars();
    ctx.restore();

    if (false && recentItemFx.type === 'shieldBreak') {
      const pulse = Math.sin(performance.now() / 120) * 0.5 + 0.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(255,255,255,0.95)';
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 30 + pulse * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEye(x, y, style) {
    ctx.save();
    ctx.translate(x, y);
    if (style === 'sparkle') {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = skin.eyeRing;
      ctx.lineWidth = 2.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10.4, 12.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const iris = ctx.createRadialGradient(-1.5, -3.5, 1.1, 0, 2.5, 7.2);
      iris.addColorStop(0, '#485977');
      iris.addColorStop(1, '#1f2838');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.ellipse(0, 3.6, 4.9, 6.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff4af';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4;
        const r = i % 2 === 0 ? 2.9 : 1.35;
        const px = Math.cos(a) * r;
        const py = 3.1 + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-2.2, -2.2, 1.5, 0, Math.PI * 2);
      ctx.arc(1.5, 1.2, 0.85, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(6.6, -6.2); ctx.lineTo(6.6, -4.1);
      ctx.moveTo(5.55, -5.15); ctx.lineTo(7.65, -5.15);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = skin.eyeRing;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9.3, 11.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const iris = ctx.createRadialGradient(-1.6, -4.2, 1.2, 0, 2.8, 7.4);
      iris.addColorStop(0, '#33435b');
      iris.addColorStop(1, '#202634');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.ellipse(0, 3.2, 4.5, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-2.0, -1.0, 1.6, 0, Math.PI * 2);
      ctx.arc(1.4, 1.9, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDizzyEyes() {
    ctx.strokeStyle = '#2a2d39';
    ctx.lineWidth = 2.6;
    [-13, 13].forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(x - 5, -12); ctx.lineTo(x + 5, -2); ctx.moveTo(x + 5, -12); ctx.lineTo(x - 5, -2); ctx.stroke();
    });
  }

  function drawStars() {
    const t = performance.now() / 170;
    for (let i = 0; i < 3; i++) {
      const a = t + i * 2.1;
      const x = Math.cos(a) * 30;
      const y = -36 + Math.sin(a) * 12;
      drawStar(x, y, 5, 3, '#ffd84b');
    }
  }

  function drawStar(cx, cy, outer, inner, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawEatBurst() {
    if (eatBurstTimer <= 0) return;
    const t = eatBurstTimer / 18;
    const scale = 1 + (1 - t) * 0.35;
    const alpha = Math.max(0, t);
    ctx.save();
    ctx.translate(eatBurstPos.x, eatBurstPos.y - 2);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + i * (Math.PI / 4);
      const radius = 14 + (1 - t) * 16 + (i % 2) * 3;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i % 2 === 0) {
        ctx.fillStyle = '#ff7fa2';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x - 4 * scale, y - 5 * scale, x - 10 * scale, y + 2 * scale, x, y + 8 * scale);
        ctx.bezierCurveTo(x + 10 * scale, y + 2 * scale, x + 4 * scale, y - 5 * scale, x, y);
        ctx.fill();
      } else {
        drawStar(x, y, 4.4 * scale, 2.2 * scale, '#ffe07a');
      }
    }
    ctx.restore();
  }


  function drawCountdown(now) {
    if (countdown <= 0) {
      countdownHint.classList.add('hidden');
      return;
    }
    const elapsed = now - countdownStart;
    const left = 3 - Math.floor(elapsed / 1000);
    if (left <= 0) {
      countdown = 0;
      countdownHint.classList.add('hidden');
      return;
    }
    countdownHint.textContent = left;
    countdownHint.classList.remove('hidden');
  }

  function renderSidePreview() {
    pctx.clearRect(0,0,previewCanvas.width, previewCanvas.height);
    const bg = pctx.createLinearGradient(0,0,0,previewCanvas.height);
    bg.addColorStop(0, theme.bgTop); bg.addColorStop(1, theme.bgBottom);
    pctx.fillStyle = bg; pctx.fillRect(0,0,previewCanvas.width,previewCanvas.height);
    pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    pctx.strokeStyle = skin.body; pctx.lineWidth = 20;
    pctx.beginPath(); pctx.moveTo(34,102); pctx.lineTo(72,92); pctx.lineTo(108,86); pctx.stroke();
    pctx.save();
    pctx.translate(150,76);
    const grad = pctx.createRadialGradient(-8,-10,4,-2,-2,28);
    grad.addColorStop(0, shade(skin.body,35)); grad.addColorStop(1, skin.body);
    pctx.fillStyle = grad; pctx.beginPath(); pctx.arc(0,0,35,0,Math.PI*2); pctx.fill();
    pctx.fillStyle = skin.blush; pctx.beginPath(); pctx.ellipse(-20,12,5.2,3.5,0,0,Math.PI*2); pctx.fill(); pctx.beginPath(); pctx.ellipse(20,12,5.2,3.5,0,0,Math.PI*2); pctx.fill();
    drawEyePreview(-13,-8,skin.eyeStyle); drawEyePreview(13,-8,skin.eyeStyle);
    pctx.strokeStyle='#555'; pctx.lineWidth=2.5; pctx.beginPath(); pctx.arc(0,16,6,0.2,Math.PI-0.2); pctx.stroke();
    pctx.restore();
  }

  function drawEyePreview(x,y,style){
    pctx.save();
    pctx.translate(150+x,76+y);
    pctx.fillStyle='#fff';
    pctx.strokeStyle=skin.eyeRing;
    pctx.lineWidth=2.2;
    pctx.beginPath(); pctx.ellipse(0,0,8.3,10.2,0,0,Math.PI*2); pctx.fill(); pctx.stroke();
    if(style==='sparkle'){
      const iris = pctx.createRadialGradient(-1,-2,1,0,2,5.6);
      iris.addColorStop(0,'#445571'); iris.addColorStop(1,'#1f2737');
      pctx.fillStyle=iris;
      pctx.beginPath(); pctx.ellipse(0,2.6,3.8,4.8,0,0,Math.PI*2); pctx.fill();
      pctx.fillStyle='#fff3a8';
      pctx.beginPath(); for(let i=0;i<8;i++){ const a=-Math.PI/2+i*Math.PI/4; const r=i%2===0?2.3:1.05; const px=Math.cos(a)*r; const py=2.2+Math.sin(a)*r; i?pctx.lineTo(px,py):pctx.moveTo(px,py);} pctx.closePath(); pctx.fill();
      pctx.fillStyle='#fff'; pctx.beginPath(); pctx.arc(-1.5,-1.4,0.95,0,Math.PI*2); pctx.arc(1.05,1.15,.45,0,Math.PI*2); pctx.fill();
    } else {
      const iris = pctx.createRadialGradient(-1,-2,1,0,2,5.6);
      iris.addColorStop(0,'#34445b'); iris.addColorStop(1,'#1f2430');
      pctx.fillStyle=iris;
      pctx.beginPath(); pctx.ellipse(0,2.8,3.9,5.0,0,0,Math.PI*2); pctx.fill();
      pctx.fillStyle='#fff'; pctx.beginPath(); pctx.arc(-1.25,-0.9,0.95,0,Math.PI*2); pctx.arc(0.95,1.15,.45,0,Math.PI*2); pctx.fill();
    }
    pctx.restore();
  }

  function drawRecentItemFx() {
    const head = snake[0];
    if (!head) return;
    const p = gridToPixel(head);

    if (Effects.isActive('slow', effectCtx) || Effects.isActive('doubleGold', effectCtx) || Effects.isActive('magnet', effectCtx)) {
      ctx.save();
      let auraColor = '#8fd96b';
      if (Effects.isActive('doubleGold', effectCtx)) auraColor = '#ffcf4b';
      if (Effects.isActive('magnet', effectCtx)) auraColor = '#ff84c1';

      // 最终版：跟随游戏帧节奏，而不是独立时间频率，避免看起来比蛇头还快
      const syncedPulse = 1 + Math.sin(frameTick * 0.12) * 0.025;
      const outerAlpha = 0.24 + Math.sin(frameTick * 0.12) * 0.02;

      // 外圈柔光，贴近蛇头，不再“跑”在蛇前面
      ctx.globalAlpha = outerAlpha;
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 21.5 + 2.2 * syncedPulse, 0, Math.PI * 2);
      ctx.stroke();

      // 内圈稳定描边
      ctx.globalAlpha = 0.82;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 19.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    if (recentItemFx.timer <= 0) return;
    const t = recentItemFx.timer / 80;
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.25 + t);
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px system-ui';
    let label = '';
    let color = '#ffffff';
    if (recentItemFx.type === 'slow') { label = '减速!'; color = '#8fd96b'; }
    else if (recentItemFx.type === 'doubleGold') { label = '双倍!'; color = '#ffcf4b'; }
    else if (recentItemFx.type === 'magnet') { label = '磁铁!'; color = '#ff84c1'; }
    else if (recentItemFx.type === 'shieldBreak') { label = '挡住啦!'; color = '#ffffff'; }
    const rise = (1 - t) * 34;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillText(label, p.x, p.y - 36 - rise);
    ctx.restore();
  }


  function shade(hex, amount) {
    const c = hex.replace('#', '');
    const n = parseInt(c, 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (n & 0xff) + amount));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function loop(now) {
    if (!lastTime) lastTime = now;
    const delta = Math.min(34, now - lastTime); // 限制超大 delta，减少突发卡顿后的“跳步感”
    lastTime = now;
    updateShakeFrame();
    frameTick++;

    let effectiveStep = stepMs * gameState.speedMultiplier;

    if (!isPaused && !isGameOver && countdown <= 0) {
      Effects.tick(effectCtx);
      Effects.rebuildGameState(effectCtx);
      if (gameState.magnetRange > 0 && foods.length) {
        const hx = snake[0].x, hy = snake[0].y;
        if (!magnetFx.active) {
          let triggerIndex = -1;
          let bestDist = Infinity;
          for (let i = 0; i < foods.length; i++) {
            const d = Math.abs(hx - foods[i].x) + Math.abs(hy - foods[i].y);
            if (d <= 2 && d < bestDist) {
              bestDist = d;
              triggerIndex = i;
            }
          }
          if (triggerIndex !== -1) triggerMagnetFx(triggerIndex);
        }
        if (magnetFx.active) {
          const done = updateMagnetFx();
          if (done) {
            const consumeResult = consumeFoodAt(magnetFx.foodIndex, snake[0]);
            if (consumeResult === 'levelClear') return;
          }
        }
      }
      effectiveStep = stepMs * gameState.speedMultiplier;
      if (gameMode === 'level' && currentLevelDef.timer) {
        levelTimer = Math.max(0, levelTimer - delta / 1000);
        updateModeUI();
        if (levelTimer <= 0) {
          triggerImpact(true);
        }
      }
      accumulator += delta;
      while (accumulator >= effectiveStep) {
        handleStep();
        accumulator -= effectiveStep;
        if (isGameOver) break;
      }
    }

    const moveProgress = countdown > 0 || isPaused || isGameOver ? 0 : easeOutCubic(Math.min(1, accumulator / effectiveStep));
    foods.forEach(function(food){ food.isBeingPulled = false; });
    if (magnetFx.active && foods[magnetFx.foodIndex]) foods[magnetFx.foodIndex].isBeingPulled = true;
    drawBackground();
    drawObstacles();
    foods.forEach(function(food){ drawFood(food); });
    drawEatBurst();
    drawSnake(moveProgress);
    drawRecentItemFx();
    drawCountdown(now);

    if (mouthTongueTimer > 0) mouthTongueTimer--;
    if (eatBurstTimer > 0) eatBurstTimer--;
    if (eatTimer > 0) eatTimer--;
    if (dizzyTimer > 0) dizzyTimer--;
    turnPulse *= 0.88;
    reversePulse *= 0.86;
    if (recentItemFx.timer > 0) recentItemFx.timer--;

    if (fxMessageTimer > 0) fxMessageTimer--; else if (itemStatusEl) {
      const tips = [];
      if (Effects.isActive('slow', effectCtx)) tips.push('减速 ' + Effects.getRemainingSeconds('slow', effectCtx) + 's');
      if (Effects.isActive('doubleGold', effectCtx)) tips.push('双倍 ' + Effects.getRemainingSeconds('doubleGold', effectCtx) + 's');
      if (Effects.isActive('magnet', effectCtx)) tips.push('磁铁 ' + Effects.getRemainingSeconds('magnet', effectCtx) + 's');
      itemStatusEl.textContent = tips.length ? ('当前效果：' + tips.join(' / ')) : '右侧点击道具立即使用；没有数量时先去商店补货';
      updateItemButtons();
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', function (e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDirection(0, -1);
    else if (k === 'arrowdown' || k === 's') setDirection(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDirection(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDirection(1, 0);
    else if (k === ' ') togglePause();
  });

  document.querySelectorAll('[data-dir]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const dir = btn.getAttribute('data-dir');
      if (dir === 'up') setDirection(0, -1);
      if (dir === 'down') setDirection(0, 1);
      if (dir === 'left') setDirection(-1, 0);
      if (dir === 'right') setDirection(1, 0);
    });
  });

  function togglePause() {
    if (isGameOver || countdown > 0) return;
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    if (musicToggle.checked) {
      if (isPaused) bgm.pause();
      else bgm.play().catch(function () {});
    }
  }
  pauseBtn.addEventListener('click', togglePause);
  mobilePause.addEventListener('click', togglePause);

  musicToggle.checked = currentUser.settings.musicOn;
  volumeRange.value = currentUser.settings.volume;
  musicToggle.addEventListener('change', function () {
    SnakeUser.updateCurrentUser(function (u) { u.settings.musicOn = musicToggle.checked; });
    if (musicToggle.checked && inputStartedAudio && !isPaused) bgm.play().catch(function () {});
    else bgm.pause();
  });
  volumeRange.addEventListener('input', function () {
    bgm.volume = Number(volumeRange.value);
    SnakeUser.updateCurrentUser(function (u) { u.settings.volume = Number(volumeRange.value); });
  });
  document.body.addEventListener('click', startAudio, { once: true });
  document.querySelectorAll('[data-item]').forEach(function(btn){ btn.addEventListener('click', function(){ useItem(btn.getAttribute('data-item')); }); });
  updateItemButtons();
  document.getElementById('restartBtn').addEventListener('click', resetGame);
  nextLevelBtn.addEventListener('click', function(){
    if (currentLevelDef.id >= 5) { location.href = 'menu.html'; return; }
    location.href = 'game.html?mode=level&level=' + (currentLevelDef.id + 1);
  });

  resetGame();
  requestAnimationFrame(loop);
})();
