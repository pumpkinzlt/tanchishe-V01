(function (window) {
  const USERS_KEY = 'snake_users_v5';
  const CURRENT_KEY = 'snake_current_user_v5';

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function defaultProfile(email, password, nickname) {
    const derivedName = (nickname || email.split('@')[0] || '玩家').trim().slice(0, 16) || '玩家';
    return {
      email,
      password,
      username: derivedName,
      highScore: 0,
      gold: 40,
      lastLoginDate: '',
      loginStreak: 0,
      unlockedSkins: ['classicBlue'],
      selectedSkin: 'classicBlue',
      selectedTheme: 'sky',
      useCustomSkin: false,
      customSkin: {
        body: '#7FD8FF',
        belly: '#FFF6E9',
        eyeRing: '#7fbfff',
        blush: '#ffbfd0',
        eyeStyle: 'classic'
      },
      settings: {
        musicOn: true,
        volume: 0.45
      },
      unlockedLevel: 1,
      clearedLevels: {},
      levelBest: {},
      itemInventory: {
        slow: 1,
        doubleGold: 1,
        magnet: 0
      }
    };
  }

  function ensureLegacyMigration() {
    const legacyUsers = JSON.parse(localStorage.getItem('snake_users_v4') || '{}');
    if (!Object.keys(legacyUsers).length || localStorage.getItem(USERS_KEY)) return;
    const migrated = {};
    Object.keys(legacyUsers).forEach(function(name){
      const fakeEmail = name.indexOf('@') > -1 ? name.toLowerCase() : (name.toLowerCase().replace(/\s+/g, '') + '@local.player');
      migrated[fakeEmail] = Object.assign(defaultProfile(fakeEmail, '1234', name), legacyUsers[name], { email: fakeEmail, username: legacyUsers[name].username || name, password: '1234' });
    });
    saveUsers(migrated);
    const oldCurrent = localStorage.getItem('snake_current_user_v4');
    if (oldCurrent) {
      const currentEmail = oldCurrent.indexOf('@') > -1 ? oldCurrent.toLowerCase() : (oldCurrent.toLowerCase().replace(/\s+/g, '') + '@local.player');
      localStorage.setItem(CURRENT_KEY, currentEmail);
    }
  }

  function sanitizeEye(user) {
    if (user.customSkin && user.customSkin.eyeStyle === 'sleepy') user.customSkin.eyeStyle = 'classic';
  }


  function ensureItemInventory(user) {
    user.itemInventory = user.itemInventory || { shield: 1, slow: 1, doubleGold: 1, magnet: 0 };
    ['shield','slow','doubleGold','magnet'].forEach(function (k) {
      if (typeof user.itemInventory[k] !== 'number') user.itemInventory[k] = 0;
    });
  }

  function applyDailyReward(user) {
    const today = todayStr();
    let dailyReward = 0;
    if (user.lastLoginDate !== today) {
      const prev = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
      const now = new Date(today);
      let streak = 1;
      if (prev) {
        const diff = Math.round((now - prev) / 86400000);
        streak = diff === 1 ? (user.loginStreak || 0) + 1 : 1;
      }
      user.loginStreak = streak;
      dailyReward = Math.min(20 + (streak - 1) * 5, 50);
      user.gold += dailyReward;
      user.lastLoginDate = today;
    }
    localStorage.setItem('snake_daily_reward_msg_v4', dailyReward ? '今日登录奖励 +' + dailyReward + ' 金币，连续登录 ' + user.loginStreak + ' 天' : '今天的登录奖励已经领过啦～');
  }

  function register(email, password, nickname) {
    ensureLegacyMigration();
    const key = (email || '').trim().toLowerCase();
    if (!key) throw new Error('邮箱不能为空');
    const users = getUsers();
    if (users[key]) throw new Error('该邮箱已经注册过了');
    users[key] = defaultProfile(key, password, nickname);
    saveUsers(users);
    return users[key];
  }

  function login(email, password) {
    ensureLegacyMigration();
    const key = (email || '').trim().toLowerCase();
    const users = getUsers();
    const user = users[key];
    if (!user) throw new Error('该邮箱未注册');
    if (String(user.password) !== String(password)) throw new Error('邮箱或密码错误');
    sanitizeEye(user);
    ensureItemInventory(user);
    applyDailyReward(user);
    saveUsers(users);
    localStorage.setItem(CURRENT_KEY, key);
    return user;
  }

  function getCurrentUser() {
    ensureLegacyMigration();
    const key = localStorage.getItem(CURRENT_KEY);
    if (!key) return null;
    const users = getUsers();
    const user = users[key] || null;
    if (user) { sanitizeEye(user); ensureItemInventory(user); }
    return user;
  }

  function requireUser() {
    const user = getCurrentUser();
    if (!user) location.href = 'login.html';
    return user;
  }

  function updateCurrentUser(patch) {
    const key = localStorage.getItem(CURRENT_KEY);
    if (!key) return null;
    const users = getUsers();
    if (!users[key]) return null;
    if (typeof patch === 'function') patch(users[key]);
    else Object.assign(users[key], patch);
    sanitizeEye(users[key]);
    ensureItemInventory(users[key]);
    saveUsers(users);
    return users[key];
  }

  function logout() {
    localStorage.removeItem(CURRENT_KEY);
  }

  window.SnakeUser = {
    getUsers,
    saveUsers,
    register,
    login,
    logout,
    getCurrentUser,
    requireUser,
    updateCurrentUser,
    defaultProfile
  };
})(window);
