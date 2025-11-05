export class UIManager {
    constructor({ hudElements, screens }) {
        this.hudElements = hudElements;
        this.screens = screens;
    }

    showScreen(name) {
        Object.entries(this.screens).forEach(([key, element]) => {
            element.classList.toggle('hidden', key !== name);
        });
    }

    togglePause(show) {
        this.screens.pause.classList.toggle('hidden', !show);
    }

    updateHUD(player, weapon, wantedLevel, mission, economy) {
        this.hudElements.money.textContent = `$${Math.floor(economy.balance)}`;
        this.hudElements.health.textContent = `HP: ${Math.floor(player.health)}`;
        this.hudElements.armor.textContent = `Armor: ${Math.floor(player.armor)}`;
        this.hudElements.stamina.textContent = `Stamina: ${Math.floor(player.stamina)}`;
        this.hudElements.wanted.textContent = `Wanted: ${wantedLevel}`;
        this.hudElements.weapon.textContent = weapon?.name ?? 'Unarmed';
        this.hudElements.ammo.textContent = `Ammo: ${weapon?.ammo ?? '∞'}`;
        this.hudElements.mission.textContent = mission
            ? `${mission.name}: ${mission.steps[mission.stepIndex]}`
            : 'No Active Mission';
    }
}
