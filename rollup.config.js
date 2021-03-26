import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/swdev-client.ts",
    output: {
      format: "es",
      file: "public/swdev-client.js",
    },
    plugins: [
      commonjs({
        include: ["node_modules/**/*"],
      }),
      typescript({}),
    ],
  },
  {
    input: "src/swdev.ts",
    output: {
      format: "es",
      file: "public/swdev.js",
    },
    plugins: [
      {
        name: "fix-typescript-runnable-in-browser",
        transform(code, id) {
          if (id.endsWith("typescript.js")) {
            return code
              .replace(/require\("perf_hooks"\)/, "{}")
              .replace(/require\("inspector"\)/, "{}");
          }
          return;
        },
      },
      nodeResolve({
        include: ["node_modules/**/*"],
        browser: true,
        preferBuiltins: false,
      }),
      commonjs({
        include: ["node_modules/**/*"],
      }),
      typescript({}),
    ],
  },
];
