import App from "./App.svelte";
import React from "react";
import ReactDOM from "react-dom";

export default () => {
  console.log("start!!!");
  const app = new App({ target: document.querySelector(".svelte-root") });
  ReactDOM.render(
    <div>React component</div>,
    document.querySelector(".react-root")
  );
  return () => {
    console.log("destroy");
    app.$destroy();
  };
};
