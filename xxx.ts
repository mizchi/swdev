const code = `import App from "./App.svelte";
import React from "https://cdn.esm.sh/react";
import ReactDOM from "https://cdn.esm.sh/react-dom";
export default () => {
    console.log(3);
    const app = new App({ target: document.querySelector(".svelte-root") });
    ReactDOM.render(React.createElement("div", null, "React component 4"), document.querySelector(".react-root"));
    return () => {
        console.log("destroy");
        app.$destroy();
    };
};`;

const out = code.replace(
  /import\s+(.*)\s+from\s+['"](\..*)['"]/gi,
  `import $1 from "$2?${Math.random()}"`
);
console.log(out);
