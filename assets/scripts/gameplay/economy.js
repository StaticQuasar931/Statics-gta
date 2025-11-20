const CAR_STORE = [
  { label: 'Aurora GT', price: 4200, maxSpeed: 280 },
  { label: 'Pulse Runner', price: 5200, maxSpeed: 320 },
  { label: 'Metro Cruiser', price: 3200, maxSpeed: 240 },
];

export class EconomySystem {
  constructor(ui) {
    this.ui = ui;
    this.ownedCars = [];
    this.garageOwned = false;
  }

  open(shop, player, world) {
    if (!shop) return;
    switch (shop.type) {
      case 'garage':
        this._openGarage(shop, player, world);
        break;
      case 'weapons':
        this._openWeapons(shop, player, world);
        break;
      case 'bank':
        this._openBank(shop, player, world);
        break;
      default:
        this._openBoutique(shop, player);
        break;
    }
  }

  _openGarage(shop, player, world) {
    const options = [];
    if (!this.garageOwned) {
      options.push({
        label: `Buy garage access for $${shop.price}`,
        action: () => {
          if (player.money < shop.price) {
            this.ui.showToast('Not enough cash for the garage.', 'error');
            return;
          }
          player.money -= shop.price;
          this.garageOwned = true;
          this.ui.showToast('Garage unlocked! Car deliveries available.', 'success');
          this.ui.hideModal();
        },
      });
    }

    CAR_STORE.forEach((car) => {
      options.push({
        label: `Buy ${car.label} – $${car.price}`,
        action: () => this._purchaseCar(car, player, world),
      });
    });

    if (this.ownedCars.length > 0) {
      options.push({
        label: 'Summon last purchased car',
        action: () => {
          const car = this.ownedCars[this.ownedCars.length - 1];
          const vehicle = world.spawnOwnedVehicle?.(car, player);
          if (vehicle) {
            vehicle.owner = 'player';
            player.vehicle = vehicle;
            vehicle.driver = player;
            this.ui.showToast(`${car.label} delivered`, 'success');
          }
          this.ui.hideModal();
        },
      });
    }

    options.push({ label: 'Close', action: () => this.ui.hideModal() });

    this.ui.showModal({
      title: shop.label,
      description: 'Upgrade your rides and store them safely.',
      options,
    });
  }

  _purchaseCar(car, player, world) {
    if (player.money < car.price) {
      this.ui.showToast('Not enough cash to buy this car.', 'error');
      return;
    }
    player.money -= car.price;
    this.ownedCars.push(car);
    const vehicle = world.spawnOwnedVehicle?.(car, player);
    if (vehicle) {
      vehicle.owner = 'player';
      vehicle.maxSpeed = car.maxSpeed;
      player.vehicle = vehicle;
      vehicle.driver = player;
    }
    this.ui.hideModal();
    this.ui.showToast(`${car.label} added to your garage!`, 'success');
  }

  _openWeapons(shop, player, world) {
    const options = [
      {
        label: 'Buy ammo pack – $250',
        action: () => {
          if (player.money < 250) {
            this.ui.showToast('Not enough cash for ammo.', 'error');
            return;
          }
          player.money -= 250;
          world.ui.showToast('Ammo refilled.', 'success');
          this.ui.hideModal();
        },
      },
      {
        label: 'Upgrade armor – $450',
        action: () => {
          if (player.money < 450) {
            this.ui.showToast('Not enough cash for armor.', 'error');
            return;
          }
          player.money -= 450;
          player.armor = Math.min(120, player.armor + 60);
          this.ui.hideModal();
          this.ui.showToast('Armor reinforced.', 'success');
        },
      },
      { label: 'Leave shop', action: () => this.ui.hideModal() },
    ];

    this.ui.showModal({
      title: shop.label,
      description: 'Stock up on ammo and armor before taking on Metro Patrol.',
      options,
    });
  }

  _openBoutique(shop, player) {
    const options = [
      {
        label: 'Buy streetwear outfit – $150',
        action: () => {
          if (player.money < 150) {
            this.ui.showToast('Need more cash for that fit.', 'error');
            return;
          }
          player.money -= 150;
          this.ui.showToast('Fresh threads equipped.', 'success');
          this.ui.hideModal();
        },
      },
      { label: 'Leave', action: () => this.ui.hideModal() },
    ];

    this.ui.showModal({
      title: shop.label,
      description: 'Cosmetic upgrades with light reputation boosts.',
      options,
    });
  }

  _openBank(shop, player, world) {
    const options = [
      {
        label: 'Deposit $1000',
        action: () => {
          if (player.money < 1000) {
            this.ui.showToast('You need $1000 in cash to deposit.', 'error');
            return;
          }
          player.money -= 1000;
          this.ui.showToast('Deposit complete. Interest gains arriving daily.', 'success');
          this.ui.hideModal();
        },
      },
      {
        label: 'Attempt robbery (high risk)',
        action: () => {
          const payout = 800 + Math.floor(Math.random() * 900);
          player.money += payout;
          this.ui.hideModal();
          this.ui.showToast(`You grabbed $${payout}! Police alerted.`, 'warning');
          world.reportCrime?.('Bank robbery in progress', 28, 'robbery');
        },
      },
      { label: 'Leave bank', action: () => this.ui.hideModal() },
    ];

    this.ui.showModal({
      title: shop.label,
      description: 'Manage your cashflow or risk everything for a quick payout.',
      options,
    });
  }
}
