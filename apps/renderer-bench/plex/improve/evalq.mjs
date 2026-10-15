// node evalq.mjs <variant> '<expr>'
import { open } from './common.mjs';
const [variant, expr] = process.argv.slice(2);
const c = await open(variant, { probe: false });
console.log(JSON.stringify(await c.evaluate(expr), null, 0));
c.close();
