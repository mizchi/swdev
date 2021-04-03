import { assertNotMatch } from "https://deno.land/std@0.82.0/testing/asserts.ts";
import { rewriteWithRandomHash } from "./cache_buster.ts";

const code = `
import "./direct";
import { a } from "./a.ts";
export { b } from "./b.ts";
`;

Deno.test("doSomething", async () => {
  const x = rewriteWithRandomHash(code);
  assertNotMatch(x, /a\.ts\"/);
  assertNotMatch(x, /b\.ts\"/);
  assertNotMatch(x, /direct"/);
  console.log(x);
  // assertEquals(actual, expected);
});
