import type { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
	while(true) {
        // Check optimal purchase
        let nodeNum = 0;
        let itemType = "New Node";
        let cheapest = ns.hacknet.getPurchaseNodeCost();
        const num_nodes = ns.hacknet.numNodes();
 
        // Iterate through all nodes and select lowest purchase/upgrade available
        for (let i = 0; i < num_nodes; i++) {
            const level_cost = ns.hacknet.getLevelUpgradeCost(i, 1);
            const ram_cost = ns.hacknet.getRamUpgradeCost(i, 1);
            const cpu_cost = ns.hacknet.getCoreUpgradeCost(i, 1);
 
            if (level_cost < cheapest) {
                    cheapest = level_cost;
                    nodeNum = i;
                    itemType = "Level";
            } if (ram_cost < cheapest) {
                    cheapest = ram_cost;
                    nodeNum = i;
                    itemType = "RAM";
            } if (cpu_cost < cheapest) {
                    cheapest = cpu_cost;
                    nodeNum = i;
                    itemType = "CPU";
            }
        }
 
        // If affordable, purchase and recalculate above
        let purchased = false;
        while (!purchased) {
            const money = ns.getServerMoneyAvailable("home");
 
            if (money >= cheapest * 10) {
                if (itemType === "New Node"){
                    ns.hacknet.purchaseNode();
                } if (itemType === "Level"){
                    ns.hacknet.upgradeLevel(nodeNum , 1);
                } if (itemType === "RAM"){
                    ns.hacknet.upgradeRam(nodeNum , 1);
                } if (itemType === "CPU"){
                    ns.hacknet.upgradeCore(nodeNum , 1);
                }
                purchased = true;
            }
 
            // If we didn't purchase, wait 1 second and try again
            if(!purchased) {
                await ns.sleep(1000);
            }
        }
 
    }
}
