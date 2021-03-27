async function setupServiceWorker() {
    if (navigator.serviceWorker == null) {
        throw new Error("Your browser can not use serviceWorker");
    }
    let installed = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (installed) {
            const modal = document.createElement("div");
            modal.innerHTML = `
        <div style='position: absolute; outline: 1px solid black; right: 10px; bottom: 10px; width: 350px; height: 80px'>
          <div>New version available!</div>
          <span>It will be applied from the next</span> - <button onclick="location.reload()">Reload</button>
        </div>
      `;
            document.body.appendChild(modal);
        }
    });
    const reg = await navigator.serviceWorker.register("/__swdev-worker.js");
    await navigator.serviceWorker.ready;
    installed = true;
    setInterval(() => {
        reg.update();
    }, 60 * 1000);
}
async function requestRevalidate(urls) {
    const newUrls = urls.map((u) => u.startsWith("/") ? `${location.protocol}//${location.host}${u}` : u);
    const res = await fetch("/__swdev/revalidate", {
        method: "POST",
        body: JSON.stringify({ urls: newUrls }),
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        console.log("[swdev:failed-revalidate]", newUrls);
    }
    return;
}
let dispose = null;
async function run(url) {
    dispose === null || dispose === void 0 ? void 0 : dispose();
    // const text = await fetch(url).then((res) => res.text());
    // const encoded = btoa(unescape(encodeURIComponent(text)));
    // const mod = await import(`data:text/javascript;base64,${encoded}`);
    const mod = await import(url);
    dispose = mod.default();
}
async function start(url) {
    await setupServiceWorker();
    // service worker revalidater
    navigator.serviceWorker.addEventListener("message", async (ev) => {
        var _a;
        if (((_a = ev.data) === null || _a === void 0 ? void 0 : _a.type) === "swdev:revalidate") {
            await run(url);
        }
    });
    // websocket revalidater
    const socket = new WebSocket("ws://localhost:9000/");
    socket.onmessage = async (message) => {
        const paths = JSON.parse(message.data);
        await requestRevalidate(paths);
        // console.log("requested", paths);
        // TODO: I want to re-fetch module but I can not burst esm
        // console.log("reload!");
        location.reload();
        // await run(url);
    };
    await run(url);
}

export { requestRevalidate, start };
