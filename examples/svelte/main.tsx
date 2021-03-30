// @ts-ignore
import SvelteApp from "./App.svelte";

export default () => {
  const target = document.querySelector(".root")!;
  let app: any;
  if (target.firstChild) {
    app = new SvelteApp({ target, hydrate: true });
  } else {
    app = new SvelteApp({ target, hydrate: false });
  }
  return async () => {
    app?.$destroy?.();
  };
};
