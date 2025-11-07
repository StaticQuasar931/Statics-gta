const VEHICLE_PRICES = [
  { id: 'compact', label: 'City Compact', cost: 12000, maxSpeed: 70 },
  { id: 'sport', label: 'Phantom Sport', cost: 38000, maxSpeed: 120 },
  { id: 'suv', label: 'Sentinel SUV', cost: 28000, maxSpeed: 90 },
];

export class EconomySystem {
  constructor(ui) {
    this.ui = ui;
    this.shops = [];
  }

  addShop(shop) {
    this.shops.push(shop);
  }

  findNearby(position, radius) {
    return this.shops.find((shop) => {
      const dx = position.x - shop.position.x;
      const dz = position.z - shop.position.z;
      return Math.hypot(dx, dz) < radius;
    });
  }

  openShop(shop, player, world) {
    if (shop.type === 'dealership') {
      const options = VEHICLE_PRICES.map((vehicle) => ({
        id: vehicle.id,
        label: `${vehicle.label} — $${vehicle.cost.toLocaleString()}`,
        action: () => {
          if (player.money < vehicle.cost) {
            this.ui.showToast('Not enough cash.', 'error');
            return;
          }
          player.money -= vehicle.cost;
          world.spawnOwnedVehicle(vehicle, player);
          this.ui.hideModal();
          this.ui.showToast(`Purchased ${vehicle.label}!`, 'success');
        },
      }));
      this.ui.showModal({
        title: shop.label,
        description: 'Browse the latest rides and add them to your personal garage.',
        options,
      });
    } else if (shop.type === 'garage') {
      this.ui.showModal({
        title: shop.label,
        description: 'Tune your current ride or sell it for quick cash.',
        options: [
          {
            id: 'repair',
            label: 'Repair current vehicle ($800)',
            action: () => {
              if (!player.vehicle) {
                this.ui.showToast('No vehicle to repair.', 'warning');
                return;
              }
              if (player.money < 800) {
                this.ui.showToast('Need more funds.', 'error');
                return;
              }
              player.money -= 800;
              player.vehicle.health = 150;
              this.ui.showToast('Vehicle restored.', 'success');
            },
          },
          {
            id: 'sell',
            label: 'Sell current vehicle (receive $15000)',
            action: () => {
              if (!player.vehicle) {
                this.ui.showToast('You are not inside a vehicle.', 'warning');
                return;
              }
              const vehicle = player.vehicle;
              player.detachVehicle();
              world.removeVehicle(vehicle);
              player.money += 15000;
              this.ui.showToast('Vehicle sold.', 'success');
            },
          },
        ],
      });
    } else if (shop.type === 'weapons') {
      this.ui.showModal({
        title: shop.label,
        description: 'Upgrade your loadout with premium firepower.',
        options: [
          {
            id: 'smg',
            label: 'Purchase SMG ($4500)',
            action: () => {
              if (player.money < 4500) {
                this.ui.showToast('Need more funds.', 'error');
                return;
              }
              player.money -= 4500;
              player.activeWeapon = 'smg';
              this.ui.showToast('SMG equipped!', 'success');
            },
          },
          {
            id: 'rifle',
            label: 'Purchase Rifle ($6200)',
            action: () => {
              if (player.money < 6200) {
                this.ui.showToast('Need more funds.', 'error');
                return;
              }
              player.money -= 6200;
              player.activeWeapon = 'rifle';
              this.ui.showToast('Rifle equipped!', 'success');
            },
          },
        ],
      });
    } else if (shop.type === 'bank') {
      this.ui.showModal({
        title: shop.label,
        description: 'Deposit your cash to keep it safe from the streets.',
        options: [
          {
            id: 'deposit',
            label: 'Deposit $5000',
            action: () => {
              if (player.money < 5000) {
                this.ui.showToast('Not enough cash.', 'error');
                return;
              }
              player.money -= 5000;
              player.bank = (player.bank ?? 0) + 5000;
              this.ui.showToast('Cash deposited to bank account.', 'success');
            },
          },
        ],
      });
    } else {
      this.ui.showToast(`${shop.label} is under construction.`, 'info');
    }
  }
}
