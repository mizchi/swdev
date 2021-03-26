import App from "./App.svelte";

export default () => {
  console.log("start!!!");
  const app = new App({ target: document.querySelector(".root") });
  return () => {
    console.log("destroy");
    app.$destroy();
  };
};
