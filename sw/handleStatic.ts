import { FetchEvent, Env } from "./env.ts";

export function createHandleStatic(_env: Env) {
  return async (_event: FetchEvent): Promise<Response> => {
    const { pathname } = new URL(_event.request.url);
    if (["/"].includes(pathname)) {
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      });
    }
    throw new Error(`[handle-static] not found`);
  };
}

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWDEV Playground</title>
  <script type="module">
    const dev = location.hostname === "localhost"
    import v from "./version.ts";
    console.log(v);
    // if (dev) {
    //   const { start } = await import("/__swdev-client.js");
    //   start("/main.tsx", { nocache: true });
    // } else {
    //   import("/main.bundle.js").then(mod => mod.default());
    // }
  </script>
</head>
<body>
  <div class="root"></div>
</body>
</html>
`;
