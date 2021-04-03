import init, { source, transformSync } from "./wasm.js";
import { TransformConfig, ParserConfig } from "./types.ts";

let __initialized = false;
async function _init() {
  if (__initialized) return;
  __initialized = true;
  await init(source);
}

export async function transform(
  code: string,
  opts: {
    jsc: { parser: ParserConfig; transform: TransformConfig; tsc: string };
  }
): Promise<{ code: string }> {
  await _init();
  return transformSync(code, opts);
}

export async function transpileDefault(code: string) {
  return await transform(code, {
    jsc: {
      // @ts-ignore
      target: "es2019",
      parser: {
        syntax: "typescript",
        tsx: true,
      },
      transform: {
        react: {
          pragma: "React.createElement",
          pragmaFrag: "React.Fragment",
          development: false,
          useBuiltins: true,
          throwIfNamespace: true,
        },
      },
    },
  });
}

// const code = `import React from "https://cdn.esm.sh/react";
// import ReactDOM from "https://cdn.esm.sh/react-dom";

// function App() {
//   return <div>Hello React on Swdev</div>;
// }

// export default () => {
//   ReactDOM.render(<App />, document.querySelector(".root"));
// };
// `;

// const out = await transpile(code);
// console.log(out);
