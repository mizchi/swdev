export const version = "0.4.0";

import { parse } from "./deps.ts";

const args = parse(Deno.args);

console.log(args);
