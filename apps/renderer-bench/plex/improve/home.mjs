import { open, reachHome } from './common.mjs';
const c = await open(process.argv[2], { probe: false });
c.startTicker();
console.log((await reachHome(c, Number(process.env.SETTLE ?? 6000))).slice(0, 100));
c.stopTicker(); c.close();
