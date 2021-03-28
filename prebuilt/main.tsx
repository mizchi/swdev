import App from "./App.svelte";
import React from "https://cdn.esm.sh/react";
import ReactDOM from "https://cdn.esm.sh/react-dom";

export default async () => {
  // on start
  const app = new App({ target: document.querySelector(".svelte-root") });
  ReactDOM.render(
    <div>React component</div>,
    document.querySelector(".react-root")
  );
  return async () => {
    // on dispose
    console.log("destroy");
    app.$destroy();
  };
};
