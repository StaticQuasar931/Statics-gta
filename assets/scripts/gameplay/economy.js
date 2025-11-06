import { SHOP_TYPES, VEHICLE_VALUES } from './constants.js';

export class EconomySystem {
  constructor(player, ui) {
    this.player = player;
    this.ui = ui;
    this.ownedVehicles = new Set();
    this.ownedSafehouses = new Set();
    this.transactionHistory = [];
    this.vehicleUpgrades = new Map();
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

  getVehicleValue(id, multiplier = 1) {
    const base = VEHICLE_VALUES[id] ?? 18000;
    return Math.round(base * multiplier);
  }

  sellVehicle(vehicle) {
    if (!vehicle) return 0;
    if (!this.ownedVehicles.has(vehicle.id)) {
      this.ui.showToast('This ride is not registered to you yet', 'warning');
      return 0;
    }
    const upgradeLevel = this.vehicleUpgrades.get(vehicle.id) ?? 0;
    const payout = this.getVehicleValue(vehicle.id, 0.62 + upgradeLevel * 0.18);
    this.player.addMoney(payout);
    this.ownedVehicles.delete(vehicle.id);
    this.vehicleUpgrades.delete(vehicle.id);
    this.transactionHistory.push({ type: 'sale', item: vehicle.id, price: payout, at: performance.now() });
    this.ui.showToast(`Sold ${vehicle.id} for $${payout.toLocaleString()}`, 'success');
    return payout;
  }

  upgradeVehicle(vehicle) {
    if (!vehicle) return false;
    if (!this.ownedVehicles.has(vehicle.id)) {
      this.ui.showToast('Purchase the vehicle before upgrading it', 'warning');
      return false;
    }
    const current = this.vehicleUpgrades.get(vehicle.id) ?? 0;
    const next = current + 1;
    const cost = this.getVehicleValue(vehicle.id, 0.18 + next * 0.08);
    if (!this.canAfford(cost)) {
      this.ui.showToast(`Upgrade tier ${next} costs $${cost.toLocaleString()}`, 'error');
      return false;
    }
    this.player.spendMoney(cost);
    this.vehicleUpgrades.set(vehicle.id, next);
    vehicle.applyUpgrade(next);
    this.transactionHistory.push({ type: 'upgrade', item: vehicle.id, price: cost, at: performance.now(), level: next });
    this.ui.showToast(`${vehicle.id} tuned to tier ${next}`, 'success');
    return true;
  }
}
