import type { NS } from '@ns';
import { get_servers } from '/util/get_servers';

type Contract = {
	server:string,
	type:string,
	fileName:string,
	data:string
}

export async function main(ns:NS) {
	// Logging
	ns.disableLog('ALL');
	//ns.disableLog('scan');
	// ns.tail();

	// Globals
	const solveContractScript = "/contracts/solvecontract.js";

	while(true){
		// Variables
		const discoveredServers = get_servers(ns);
		const contracts = [];

		for (const serverName of discoveredServers) {
			let contractsOnServer = 0;
			const files = ns.ls(serverName);
			for (const fileName of files) {
				if (fileName.includes(".cct")) {
					const contract :Contract = {
						server : serverName,
						type : ns.codingcontract.getContractType(fileName, serverName),
						fileName : fileName,
						data : ns.codingcontract.getData(fileName, serverName),
					}

					contracts.push(contract);
					contractsOnServer += 1;
				}
			}
		}

		// Solve found contracts
		for (const contract of contracts) {
			const processID = ns.run(solveContractScript, 1, JSON.stringify(contract));
			while (ns.isRunning(processID)){
				await ns.sleep(500);
			}
			ns.printf ("Solved %s on %s", contract.type, contract.server);
		}

		await ns.sleep(30000)
	}
}
