/**
 * EconomySystem maintains player money, shops, and purchases.
 */
export class EconomySystem {
    constructor(pointsOfInterest) {
        this.balance = 250;
        this.inventory = [];
        this.properties = [];
        this.shops = pointsOfInterest?.shops ?? [];
    }

    award(amount, reason = 'Mission Reward') {
        this.balance += amount;
        return { amount, reason, balance: this.balance };
    }

    purchase(item) {
        if (item.cost > this.balance) {
            return { success: false, message: 'Not enough cash.' };
        }
        this.balance -= item.cost;
        this.inventory.push(item);
        return { success: true, message: `Purchased ${item.name}`, balance: this.balance };
    }

    buyProperty(property) {
        if (property.cost > this.balance) {
            return { success: false, message: 'Insufficient funds.' };
        }
        this.balance -= property.cost;
        this.properties.push(property);
        return { success: true, message: `Property acquired: ${property.name}`, balance: this.balance };
    }
}
