import type { NS } from "@ns";
import { type EventSystem, create_msg, Condition} from "/util/event_system";
import { Event } from "/resource";

const base_ram = 4

export namespace server{
  // check condition

  // biome-ignore lint/nursery/useAwait: <explanation>
  async function buy_server_check(ns:NS):Promise<boolean>{
    return ns.getPurchasedServers().length < ns.getPurchasedServerLimit() &&
      ns.getPurchasedServerCost(base_ram) < ns.getServerMoneyAvailable('home')
  }

  // biome-ignore lint/nursery/useAwait: <explanation>
  async function upgrade_server_check(ns:NS):Promise<boolean>{
    if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) { return false }
    const servers = ns.getPurchasedServers()
    const rams = servers.map(ns.getServerMaxRam)
    const min_ram = Math.min(...rams)
    if (min_ram === ns.getPurchasedServerMaxRam()) {return false}

    const idx = rams.findIndex((x)=> x<=min_ram)
    const cost = ns.getPurchasedServerUpgradeCost(servers[idx], rams[idx]*2)
    return cost < ns.getServerMoneyAvailable('home')
  }

  // handle function
  // biome-ignore lint/nursery/useAwait: <explanation>
  async function buy_server(sys:EventSystem){
    const name = sys.ns.purchaseServer("infra",base_ram)
    if (name === "") {
      sys.ns.printf("Purchase Server, %s", name)
    }
  }

  async function upgrade_server(sys:EventSystem) {
    const servers = sys.ns.getPurchasedServers()
    const rams = servers.map(sys.ns.getServerMaxRam)
    const min_ram = Math.min(...rams)
    const idx = rams.findIndex((x)=> x<=min_ram)
    const success= sys.ns.upgradePurchasedServer(servers[idx], rams[idx])
    if (success) {
      sys.ns.printf("Upgrade Server, %s (%d)", servers[idx], rams[idx]*2)
    }
  }

  export function register(sys:EventSystem){
    sys.register(Event.buy_server, buy_server)
    sys.register(Event.upgrade_server, upgrade_server)
  }

  export function add_trigger(sys:EventSystem){
    sys.trigger_on(buy_server_check, create_msg(Event.buy_server))
    sys.trigger_on(upgrade_server_check, create_msg(Event.upgrade_server))
  }
}
