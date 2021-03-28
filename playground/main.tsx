// @ts-ignore
import SvelteApp from "./App.svelte";
import React from "https://cdn.esm.sh/react";
import ReactDOM from "https://cdn.esm.sh/react-dom";

function App() {
  return <div>Hello react example2</div>;
}

export default () => {
  const target = document.querySelector(".svelte-root")!;
  let app: any;
  if (target.firstChild) {
    app = new SvelteApp({ target, hydrate: true });
  } else {
    app = new SvelteApp({ target, hydrate: false });
  }
  ReactDOM.render(<App />, document.querySelector(".react-root"));
  return async () => {
    app?.$destroy?.();
  };
};
