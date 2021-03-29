// from https://deno.land/std@0.90.0/http/file_server.ts

// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

// This program serves files in the current directory over HTTP.
// TODO(bartlomieju): Stream responses instead of reading them into memory.
// TODO(bartlomieju): Add tests like these:
// https://github.com/indexzero/http-server/blob/master/test/http-server-test.js

import type { ServeArgs } from "./types.ts";

import prebuiltData from "./prebuilt.ts";
import { extname, posix } from "https://deno.land/std@0.90.0/path/mod.ts";
import {
  HTTPSOptions,
  listenAndServe,
  listenAndServeTLS,
  Response,
  ServerRequest,
} from "https://deno.land/std@0.90.0/http/server.ts";
import { assert } from "https://deno.land/std@0.90.0/_util/assert.ts";

interface EntryInfo {
  mode: string;
  size: string;
  url: string;
  name: string;
}

const encoder = new TextEncoder();

const MEDIA_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".map": "application/json",
  ".txt": "text/plain",
  ".ts": "text/typescript",
  ".tsx": "text/tsx",
  ".js": "application/javascript",
  ".jsx": "text/jsx",
  ".gz": "application/gzip",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".mjs": "application/javascript",
  ".svg": "image/svg+xml",
};

/** Returns the content-type based on the extension of a path. */
function contentType(path: string): string | undefined {
  return MEDIA_TYPES[extname(path)];
}

function modeToString(isDir: boolean, maybeMode: number | null): string {
  const modeMap = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];

  if (maybeMode === null) {
    return "(unknown mode)";
  }
  const mode = maybeMode.toString(8);
  if (mode.length < 3) {
    return "(unknown mode)";
  }
  let output = "";
  mode
    .split("")
    .reverse()
    .slice(0, 3)
    .forEach((v): void => {
      output = modeMap[+v] + output;
    });
  output = `(${isDir ? "d" : "-"}${output})`;
  return output;
}

function fileLenToString(len: number): string {
  const multiplier = 1024;
  let base = 1;
  const suffix = ["B", "K", "M", "G", "T"];
  let suffixIndex = 0;

  while (base * multiplier < len) {
    if (suffixIndex >= suffix.length - 1) {
      break;
    }
    base *= multiplier;
    suffixIndex++;
  }

  return `${(len / base).toFixed(2)}${suffix[suffixIndex]}`;
}

/**
 * Returns an HTTP Response with the requested instance
 * @param req The server request context used to cleanup the file handle
 * @param content Instance on memory
 */
export async function serveInstance(
  _req: ServerRequest,
  content: string
): Promise<Response> {
  const headers = new Headers();
  // headers.set("content-length", content.length.toString());
  headers.set("content-type", "text/javascript");
  return {
    status: 200,
    body: content,
    headers,
  };
}

/**
 * Returns an HTTP Response with the requested file as the body
 * @param req The server request context used to cleanup the file handle
 * @param filePath Path of the file to serve
 */
export async function serveFile(
  req: ServerRequest,
  filePath: string
): Promise<Response> {
  const [file, fileInfo] = await Promise.all([
    Deno.open(filePath),
    Deno.stat(filePath),
  ]);
  const headers = new Headers();
  headers.set("content-length", fileInfo.size.toString());
  const contentTypeValue = contentType(filePath);
  if (contentTypeValue) {
    headers.set("content-type", contentTypeValue);
  }
  req.done.then(() => {
    file.close();
  });
  return {
    status: 200,
    body: file,
    headers,
  };
}

function serveFallback(_req: ServerRequest, e: Error): Promise<Response> {
  if (e instanceof URIError) {
    return Promise.resolve({
      status: 400,
      body: encoder.encode("Bad Request"),
    });
  } else if (e instanceof Deno.errors.NotFound) {
    return Promise.resolve({
      status: 404,
      body: encoder.encode("Not Found"),
    });
  } else {
    return Promise.resolve({
      status: 500,
      body: encoder.encode("Internal server error"),
    });
  }
}

function serverLog(req: ServerRequest, res: Response): void {
  const d = new Date().toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const s = `${dateFmt} "${req.method} ${req.url} ${req.proto}" ${res.status}`;
  console.log(s);
}

function setCORS(res: Response): void {
  if (!res.headers) {
    res.headers = new Headers();
  }
  res.headers.append("access-control-allow-origin", "*");
  res.headers.append(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range"
  );
}

function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  const l = strings.length - 1;
  let html = "";

  for (let i = 0; i < l; i++) {
    let v = values[i];
    if (v instanceof Array) {
      v = v.join("");
    }
    const s = strings[i] + v;
    html += s;
  }
  html += strings[l];
  return html;
}

function normalizeURL(url: string): string {
  let normalizedUrl = url;
  try {
    normalizedUrl = decodeURI(normalizedUrl);
  } catch (e) {
    if (!(e instanceof URIError)) {
      throw e;
    }
  }

  try {
    //allowed per https://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
    const absoluteURI = new URL(normalizedUrl);
    normalizedUrl = absoluteURI.pathname;
  } catch (e) {
    //wasn't an absoluteURI
    if (!(e instanceof TypeError)) {
      throw e;
    }
  }

  if (normalizedUrl[0] !== "/") {
    throw new URIError("The request URI is malformed.");
  }

  normalizedUrl = posix.normalize(normalizedUrl);
  const startOfParams = normalizedUrl.indexOf("?");
  return startOfParams > -1
    ? normalizedUrl.slice(0, startOfParams)
    : normalizedUrl;
}

export function startStaticServer(serverArgs: ServeArgs, target: string): void {
  const CORSEnabled = serverArgs.cors ? true : false;
  const port = serverArgs.port ?? serverArgs.p ?? 4507;
  const host = serverArgs.host ?? "0.0.0.0";
  const addr = `${host}:${port}`;
  const tlsOpts = {} as HTTPSOptions;

  tlsOpts.certFile = serverArgs.cert ?? serverArgs.c ?? "";
  tlsOpts.keyFile = serverArgs.key ?? serverArgs.k ?? "";

  if (tlsOpts.keyFile || tlsOpts.certFile) {
    if (tlsOpts.keyFile === "" || tlsOpts.certFile === "") {
      console.log("--key and --cert are required for TLS");
      serverArgs.h = true;
    }
  }

  const handler = async (req: ServerRequest): Promise<void> => {
    let response: Response | undefined;
    try {
      const normalizedUrl = normalizeURL(req.url);
      let fsPath = posix.join(target, normalizedUrl);
      // handle __swdev
      if (req.url.startsWith("/__swdev-")) {
        const existFile = Deno.stat(fsPath)
          .then(() => true)
          .catch(() => false);
        if (await existFile) {
          response = await serveFile(req, fsPath);
        } else {
          const t = req.url.substr(1) as keyof typeof prebuiltData;
          if (prebuiltData[t]) {
            response = await serveInstance(req, prebuiltData[t]);
          } else {
            throw new Error(`Not Found for ${t}`);
          }
        }
      } else {
        if (fsPath.indexOf(target) !== 0) {
          fsPath = target;
        }
        const fileInfo = await Deno.stat(fsPath);
        if (fileInfo.isDirectory) {
          response = await serveFile(req, posix.join(fsPath, "index.html"));
        } else {
          response = await serveFile(req, fsPath);
        }
      }
    } catch (e) {
      console.error(e.message);
      response = await serveFallback(req, e);
    } finally {
      if (CORSEnabled) {
        assert(response);
        setCORS(response);
      }
      serverLog(req, response!);
      try {
        await req.respond(response!);
      } catch (e) {
        console.error(e.message);
      }
    }
  };

  let proto = "http";
  if (tlsOpts.keyFile || tlsOpts.certFile) {
    proto += "s";
    tlsOpts.hostname = host;
    tlsOpts.port = port;
    listenAndServeTLS(tlsOpts, handler);
  } else {
    listenAndServe(addr, handler);
  }
  console.log(`${proto.toUpperCase()} server listening on ${proto}://${addr}/`);
}
