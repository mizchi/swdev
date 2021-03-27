async function setupServiceWorker() {
    if (navigator.serviceWorker == null) {
        throw new Error("Your browser can not use serviceWorker");
    }
    let installed = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (installed) {
            console.warn("[swdev] sw updated. reload it.");
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
    else {
        console.log("[swdev:revalidate-requested]", newUrls);
    }
    return;
}
let dispose = null;
async function run(url) {
    dispose === null || dispose === void 0 ? void 0 : dispose();
    const mod = await import(url);
    dispose = mod.default();
}
async function start(url, opts = {}) {
    var _a;
    await setupServiceWorker();
    navigator.serviceWorker.addEventListener("message", async (ev) => {
        var _a;
        if (((_a = ev.data) === null || _a === void 0 ? void 0 : _a.type) === "swdev:revalidate") {
            await run(url);
        }
    });
    // websocket revalidater
    const socket = new WebSocket(`ws://localhost:${(_a = opts.wsPort) !== null && _a !== void 0 ? _a : 17777}/`);
    socket.onmessage = async (message) => {
        const paths = JSON.parse(message.data);
        await requestRevalidate(paths);
        location.reload();
    };
    await run(url);
}

export { requestRevalidate, start };
