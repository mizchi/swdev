import type { RevalidateCommand, Command } from "../types.ts";
import type { ServerApiImpl } from "../server_api_impl.ts";
import { wrap } from "../rpc/websocket_adapter.ts";

declare var navigator: any;

const log = (...args: any) => console.info("[swdev-client]", ...args);

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

  navigator.serviceWorker.addEventListener("message", (ev) => {
    log("message", ev);
    // TODO: reload
  });

  const reg = await navigator.serviceWorker.register("/__swdev-worker.js");
  await navigator.serviceWorker.ready;
  installed = true;
  setInterval(() => reg.update(), 60 * 1000);
}

export async function requestRevalidate(cmd: RevalidateCommand) {
  const newPaths = cmd.paths.map((u) =>
    u.startsWith("/") ? `${location.protocol}//${location.host}${u}` : u
  );

  const res = await fetch("/__swdev/revalidate", {
    method: "POST",
    body: JSON.stringify({ paths: newPaths }),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    log("revalidate", newPaths);
  } else {
    log("revalidate-requested", newPaths);
  }
  return;
}

let dispose: any = null;

async function run(url: string, opts: { nocache?: boolean }) {
  const runId = opts.nocache
    ? `nocache-${Math.random()}`
    : Math.random().toString();
  log("run", runId);

  await dispose?.();
  const mod = await import(url + "?" + runId);
  dispose = await mod?.default?.();
}

// init DenoProxy
function initDenoProxySocket() {
  const socket = new WebSocket(`ws://localhost:17777/`);
  const api = wrap<ServerApiImpl>(socket);
  // @ts-ignore
  globalThis.DenoProxy = api;

  // test getFiles
  // socket.onopen = async () => {
  //   const result = await api.exec("run", ["ls"]);
  //   log("init with", result);
  // };
  return socket;
}

let started = false;

const socket = initDenoProxySocket();

export async function start(
  url: string,
  opts: { nocache?: boolean; onFileChange?: () => void } = {}
) {
  if (started) return;
  started = true;
  log("start");

  await setupServiceWorker();

  const onFileChange =
    opts.onFileChange ?? (() => run(url, { nocache: opts.nocache }));

  try {
    socket.onmessage = async (message) => {
      try {
        const cmd = JSON.parse(message.data) as Command;
        if (cmd.type === "revalidate") {
          await requestRevalidate(cmd);
          log("revalidated", cmd.paths);
          onFileChange();
        }
        // TODO: revalidate all
        if (cmd.type === "files") {
          console.log("current-files", cmd.files);
        }
      } catch (e) {
        console.error(e);
      }
    };
  } catch (err) {
    // no socket
    console.error(err);
  }

  await run(url, { nocache: opts.nocache });
}
