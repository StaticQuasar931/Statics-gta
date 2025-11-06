import { SHOP_TYPES } from './constants.js';

export class EconomySystem {
  constructor(player, ui) {
    this.player = player;
    this.ui = ui;
    this.ownedVehicles = new Set();
    this.ownedSafehouses = new Set();
    this.transactionHistory = [];
  }

  findShopById(id) {
    return SHOP_TYPES.find((shop) => shop.id === id);
  }

  canAfford(amount) {
    return this.player.money >= amount;
  }

  purchase(type, price, meta = {}) {
    if (!this.canAfford(price)) {
      this.ui.showToast(`Not enough cash for ${type}`, 'error');
      return false;
    }
    this.player.spendMoney(price);
    this.transactionHistory.push({ type: 'purchase', item: type, price, meta, at: performance.now() });
    this.ui.showToast(`Purchased ${type} for $${price.toLocaleString()}`);
    return true;
  }

  earn(label, amount) {
    this.player.addMoney(amount);
    this.transactionHistory.push({ type: 'income', item: label, price: amount, at: performance.now() });
    this.ui.showToast(`+ $${amount.toLocaleString()} from ${label}`, 'success');
  }

  registerOwnedVehicle(vehicleId) {
    this.ownedVehicles.add(vehicleId);
  }

  registerSafehouse(id) {
    this.ownedSafehouses.add(id);
  }
}
