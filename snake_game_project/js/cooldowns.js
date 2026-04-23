(function () {
  const Cooldowns = {
    data: {},

    start(itemId, durationMs) {
      this.data[itemId] = Date.now() + durationMs;
    },

    isCooldown(itemId) {
      return Date.now() < (this.data[itemId] || 0);
    },

    getRemaining(itemId) {
      return Math.max(0, (this.data[itemId] || 0) - Date.now());
    },

    clear() {
      this.data = {};
    }
  };

  window.Cooldowns = Cooldowns;
})();
