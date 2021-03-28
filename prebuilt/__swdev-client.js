const log = (...args) => console.info("[swdev-client]", ...args);
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
    setInterval(() => reg.update(), 60 * 1000);
}
async function requestRevalidate(cmd) {
    const newPaths = cmd.paths.map((u) => u.startsWith("/") ? `${location.protocol}//${location.host}${u}` : u);
    const res = await fetch("/__swdev/revalidate", {
        method: "POST",
        body: JSON.stringify({ paths: newPaths }),
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        log("revalidate", newPaths);
    }
    else {
        log("revalidate-requested", newPaths);
    }
    return;
}
let dispose = null;
async function run(url) {
    const runId = Math.random().toString();
    log("run", runId);
    await (dispose === null || dispose === void 0 ? void 0 : dispose());
    const mod = await import(url + "?" + runId);
    dispose = mod.default();
}
let started = false;
async function start(url, opts = {}) {
    var _a, _b;
    if (started)
        return;
    started = true;
    log("start");
    await setupServiceWorker();
    const onFileChange = (_a = opts.onFileChange) !== null && _a !== void 0 ? _a : (() => run(url));
    // websocket revalidater
    const socket = new WebSocket(`ws://localhost:${(_b = opts.wsPort) !== null && _b !== void 0 ? _b : 17777}/`);
    socket.onmessage = async (message) => {
        const cmd = JSON.parse(message.data);
        if (cmd.type === "revalidate") {
            await requestRevalidate(cmd);
            log("revalidated", cmd);
            onFileChange();
        }
    };
    await run(url);
}

export { requestRevalidate, start };
