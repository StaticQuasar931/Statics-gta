export class UIManager {
    constructor({ hudElements, screens }) {
        this.hudElements = hudElements;
        this.screens = screens;
        this.currentScreen = 'startup';
    }

    showScreen(name) {
        Object.entries(this.screens).forEach(([key, element]) => {
            element.classList.toggle('hidden', key !== name);
        });
        this.currentScreen = name;
    }

    togglePause(show) {
        this.screens.pause.classList.toggle('hidden', !show);
    }

    getCurrentScreen() {
        return this.currentScreen;
    }

    updateHUD(player, weapon, wantedLevel, mission, economy, context = {}) {
        this.hudElements.money.textContent = `$${Math.floor(economy.balance)}`;
        this.hudElements.health.textContent = `HP: ${Math.floor(player.health)}`;
        this.hudElements.armor.textContent = `Armor: ${Math.floor(player.armor)}`;
        this.hudElements.stamina.textContent = `Stamina: ${Math.floor(player.stamina)}`;
        const wantedDisplay = Number.isInteger(wantedLevel)
            ? wantedLevel
            : wantedLevel.toFixed(1);
        this.hudElements.wanted.textContent = `Wanted: ${wantedDisplay}`;
        this.hudElements.weapon.textContent = weapon?.name ?? 'Unarmed';
        this.hudElements.ammo.textContent = `Ammo: ${weapon?.ammo ?? '∞'}`;
        this.hudElements.mission.textContent = mission
            ? `${mission.name}: ${mission.steps[mission.stepIndex]}`
            : 'No Active Mission';

        if (this.hudElements.weaponIcon) {
            if (context.weaponIcon) {
                this.hudElements.weaponIcon.src = context.weaponIcon;
                this.hudElements.weaponIcon.classList.remove('hidden');
            } else {
                this.hudElements.weaponIcon.src = '';
                this.hudElements.weaponIcon.classList.add('hidden');
            }
        }

        if (this.hudElements.vehiclePanel) {
            const { vehicleName, vehicleSpeed } = this.hudElements;
            const isDriving = !!context.vehicle;
            this.hudElements.vehiclePanel.classList.toggle('hidden', !isDriving);
            if (isDriving && vehicleName && vehicleSpeed) {
                vehicleName.textContent = context.vehicle.name ?? 'Vehicle';
                vehicleSpeed.textContent = `${context.vehicle.speed ?? 0} km/h`;
            }
        }

        if (this.hudElements.clock && context.clockLabel) {
            this.hudElements.clock.textContent = context.clockLabel;
        }
    }

    showInteractionHint(text) {
        if (!this.hudElements.interaction) return;
        if (!text) {
            this.hudElements.interaction.classList.add('hidden');
            this.hudElements.interaction.textContent = '';
            return;
        }
        this.hudElements.interaction.textContent = text;
        this.hudElements.interaction.classList.remove('hidden');
    }
}
