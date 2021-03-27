declare var navigator: any;

async function setupServiceWorker() {
  if (navigator.serviceWorker == null) {
    throw new Error("Your browser can not use serviceWorker");
  }
  let installed = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (installed) {
      console.warn("[swdev] service-worker updated. reload it.");
    }
  });
  const reg = await navigator.serviceWorker.register("/__swdev-worker.js");
  await navigator.serviceWorker.ready;
  installed = true;
  setInterval(() => {
    reg.update();
  }, 60 * 1000);
}

export async function requestRevalidate(urls: string[]) {
  const newUrls = urls.map((u) =>
    u.startsWith("/") ? `${location.protocol}//${location.host}${u}` : u
  );

  const res = await fetch("/__swdev/revalidate", {
    method: "POST",
    body: JSON.stringify({ urls: newUrls }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    console.log("[swdev:failed-revalidate]", newUrls);
  } else {
    console.log("[swdev:revalidate-requested]", newUrls);
  }
  return;
}

let dispose: any = null;

async function run(url: string) {
  dispose?.();
  const mod = await import(url + "?" + Math.random());
  dispose = mod.default();
}

export async function start(url: string, opts: { wsPort?: number } = {}) {
  console.log("[swdev] start");
  await setupServiceWorker();
  // websocket revalidater
  const socket = new WebSocket(`ws://localhost:${opts.wsPort ?? 17777}/`);
  socket.onmessage = async (message) => {
    const paths = JSON.parse(message.data);
    await requestRevalidate(paths);
    console.log("[swdev:revalidate] paths", paths);
    await run(url);
    // location.reload();
  };

  await run(url);
}
