(function () {
  const EFFECT_DEFS = {
    slow: {
      durationMs: 12000,
      cooldownMs: 4000,
      start(effectState, gameState) {
        effectState.recentFx = { type: 'slow', timer: 70 };
        effectState.setStatus('慢速糖浆已生效 16 秒，移动速度明显降低');
      },
      applyTo(gameState) {
        gameState.speedMultiplier *= 1.65;
      },
      end(effectState) {
        effectState.setStatus('慢速糖浆已结束');
      }
    },
    doubleGold: {
      durationMs: 18000,
      cooldownMs: 5000,
      start(effectState, gameState) {
        effectState.recentFx = { type: 'doubleGold', timer: 70 };
        effectState.setStatus('双倍金币卡已生效 18 秒，经验和金币都会翻倍');
      },
      applyTo(gameState) {
        gameState.scoreMultiplier = 2;
        gameState.goldMultiplier = 2;
      },
      end(effectState) {
        effectState.setStatus('双倍金币已结束');
      }
    },
    magnet: {
      durationMs: 12000,
      cooldownMs: 4000,
      start(effectState, gameState) {
        effectState.recentFx = { type: 'magnet', timer: 70 };
        effectState.setStatus('果果磁铁已开启 12 秒，靠近食物 2 格内会触发吸附');
      },
      applyTo(gameState) {
        gameState.magnetRange = 10;
        gameState.magnetPullStep = 2;
      },
      end(effectState) {
        effectState.setStatus('果果磁铁已结束');
      }
    }
  };

  const Effects = {
    defs: EFFECT_DEFS,

    apply(itemId, state) {
      const def = this.defs[itemId];
      if (!def) return { ok: false, reason: 'missing_def' };
      if (Cooldowns.isCooldown(itemId)) return { ok: false, reason: 'cooldown' };

      const now = Date.now();
      Cooldowns.start(itemId, def.cooldownMs);

      if (state.activeEffects[itemId]) {
        state.activeEffects[itemId].endTime = now + def.durationMs;
      } else {
        state.activeEffects[itemId] = { endTime: now + def.durationMs };
      }

      def.start(state, state.gameState);
      return { ok: true };
    },

    remove(itemId, state) {
      if (!state.activeEffects[itemId]) return;
      delete state.activeEffects[itemId];
      const def = this.defs[itemId];
      if (def && typeof def.end === 'function') def.end(state);
    },

    tick(state) {
      const now = Date.now();
      Object.keys(state.activeEffects).forEach((itemId) => {
        const effect = state.activeEffects[itemId];
        if (!effect || now >= effect.endTime) {
          this.remove(itemId, state);
        }
      });
    },

    rebuildGameState(state) {
      const next = {
        baseSpeed: state.gameState.baseSpeed,
        speedMultiplier: 1,
        scoreMultiplier: 1,
        goldMultiplier: 1,
        magnetRange: 0,
        magnetPullStep: 0
      };

      Object.keys(state.activeEffects).forEach((itemId) => {
        const def = this.defs[itemId];
        if (def && typeof def.applyTo === 'function') {
          def.applyTo(next);
        }
      });

      state.gameState.speedMultiplier = next.speedMultiplier;
      state.gameState.scoreMultiplier = next.scoreMultiplier;
      state.gameState.goldMultiplier = next.goldMultiplier;
      state.gameState.magnetRange = next.magnetRange;
      state.gameState.magnetPullStep = next.magnetPullStep;
    },

    getRemainingSeconds(itemId, state) {
      const effect = state.activeEffects[itemId];
      if (!effect) return 0;
      return Math.max(0, Math.ceil((effect.endTime - Date.now()) / 1000));
    },

    isActive(itemId, state) {
      return !!state.activeEffects[itemId];
    }
  };

  window.Effects = Effects;
})();
