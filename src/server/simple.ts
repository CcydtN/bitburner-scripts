import type { NS } from "@ns";

const base_ram = 4
export async function main(ns: NS): Promise<void> {
  const cost = ns.getPurchasedServerCost(base_ram)

  while (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
    const money = ns.getServerMoneyAvailable("home");
    if (money >= cost) { ns.purchaseServer("infra",base_ram); }
    await ns.sleep(1000)
  }

  const servers = ns.getPurchasedServers()
  const rams = servers.map(ns.getServerMaxRam)
  while (Math.min(...rams) < ns.getPurchasedServerMaxRam()) {
    const min_ram = Math.min(...rams)
    const idx = rams.findIndex((val)=> val===min_ram)
    const cost = ns.getPurchasedServerUpgradeCost(servers[idx], rams[idx] * 2)

    while (ns.getServerMoneyAvailable("home") < cost*10) {
      await ns.sleep(1000)
    }
    if (ns.upgradePurchasedServer(servers[idx], min_ram*2)){
      rams[idx] *= 2
    }
  }
}
