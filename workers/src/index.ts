// TODO: Refactor

// import { handleRequest } from './handler'

// addEventListener('fetch', (event) => {
//   event.respondWith(handleRequest(event.request))
// })

import ts from 'typescript'
import hash from 'string-hash'
import { compile as svelteCompile, preprocess } from 'svelte/compiler'
import type { Preprocessor } from 'svelte/types/compiler/preprocess/types'

const CACHE_VERSION = 'v1'

const TARGET_EXTENSIONS = ['.ts', '.tsx', '.svelte']

// Fetch mock
function fetch(e: string | Request, opts: any) {
  return {
    async text() {
      return `export default 'eee'`
    },
  }
  // return {
  //   async json() {
  //     return {
  //       url,
  //     }
  //   },
  //   async text() {
  //     return url
  //   },
  // }
}

async function handleRequest(event: FetchEvent) {
  return new Response('answer:' + event.request.url, {
    // @ts-ignore
    mode: 'no-cors',
    status: 200,
  })
}

addEventListener('fetch', (event: FetchEvent) => {
  // if (event.request.url) {
  //   event.respondWith(handleRequest(event))
  //   return
  // }
  const url = event.request.url
  if (url.endsWith('/__swdev/revalidate')) {
    console.info('[swdev:revalidate]')
    event.respondWith(revalidateResponse(event))
  }
  if (TARGET_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    console.info('[swdev:handle]', event.request.url)
    event.respondWith(respondWithTransform(event))
  }
})

async function revalidateResponse(event: FetchEvent): Promise<Response> {
  const data = await event.request.json()
  const cache = await caches.open(CACHE_VERSION)
  await Promise.all(
    data.urls.map(async (url: string) => {
      try {
        await cache.delete(url)
      } catch (err) {
        console.log(err)
      }
    }),
  )
  console.log('[swdev-worker:revalidate]', data.urls)
  return new Response(event.request.url, {
    // @ts-ignore
    mode: 'no-cors',
    status: 200,
  })
}

async function transform(url: string, code: string): Promise<string> {
  const newHash = hash(code)
  const header = `/* SWDEV-HASH:${newHash} */\n`
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const result = ts.transpile(code, {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
    })
    return header + result
  } else if (url.endsWith('.svelte')) {
    const { code: preprocessed } = await preprocess(code, [tsPreprocess()], {
      filename: '$.tsx',
    })
    const compiled = svelteCompile(preprocessed, {
      css: false,
    })
    return header + compiled.js.code
  } else {
    throw new Error(`unknown extension: ${url}`)
  }
}

async function createNewResponseWithCache(url: string, newCode: string) {
  const output = await transform(url, newCode)
  const modifiedResponse = new Response(output, {
    // @ts-ignore
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/javascript',
    },
  })
  const cache = await caches.open(CACHE_VERSION)
  await cache.put(url, modifiedResponse.clone())
  return modifiedResponse
}

async function respondWithTransform(event: FetchEvent): Promise<Response> {
  const cache = await caches.open(CACHE_VERSION)
  const matched = await cache.match(event.request)
  if (matched == null) {
    const response = await fetch(event.request)
    const raw: string = await response.text()
    return createNewResponseWithCache(event.request.url, raw)
  }

  // revalidate in build
  // const cloned = matched.clone();
  // if (false) {
  //   setTimeout(async () => {
  //     const modifiedText = await cloned.text();
  //     const oldHash = modifiedText.match(/\/\*\sSWDEV-HASH:(\d+)\s\*/)?.[1];
  //     const newCode = await fetch(event.request).then((res) => res.text());
  //     if (oldHash !== hash(newCode).toString()) {
  //       await cache.delete(event.request.url);
  //       console.log("[swdev:detect-change]", event.request.url);
  //       const client = await clients.get(event.clientId);
  //       client.postMessage({
  //         type: "swdev:revalidate",
  //         url: event.request.url,
  //       });
  //     }
  //   }, 0);
  // }
  return matched
}

const tsPreprocess = () => {
  const script: Preprocessor = async ({ content, filename }) => {
    const out = ts.transpile(content, {
      fileName: filename || '/$$.tsx',
      target: ts.ScriptTarget.ES2019,
    })
    return { code: out }
  }
  return {
    script,
  }
}
