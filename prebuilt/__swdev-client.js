const e=(...e)=>console.info("[swdev-client]",...e);async function requestRevalidate(t){const a=t.paths.map((e=>e.startsWith("/")?`${location.protocol}//${location.host}${e}`:e));(await fetch("/__swdev/revalidate",{method:"POST",body:JSON.stringify({paths:a}),headers:{"Content-Type":"application/json"}})).ok?e("revalidate-requested",a):e("revalidate",a);}let t=null;async function a(a,o){const r=o.nocache?"nocache":Math.random().toString();e("run",r),await(null==t?void 0:t());const n=await import(a+"?"+r);t=n.default();}let o=!1;async function start(t,r={}){var n,i;if(o)return;o=!0,e("start"),await async function(){if(null==navigator.serviceWorker)throw new Error("Your browser can not use serviceWorker");let e=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener("controllerchange",(()=>{e&&console.warn("[swdev] service-worker updated. reload it.");}));const t=await navigator.serviceWorker.register("/__swdev-worker.js");await navigator.serviceWorker.ready,e=!0,setInterval((()=>t.update()),6e4);}();const s=null!==(n=r.onFileChange)&&void 0!==n?n:()=>a(t,{nocache:r.nocache});new WebSocket(`ws://localhost:${null!==(i=r.wsPort)&&void 0!==i?i:17777}/`).onmessage=async t=>{const a=JSON.parse(t.data);"revalidate"===a.type&&(await requestRevalidate(a),e("revalidated",a),s()),"files"===a.type&&console.log("current-files",a.files);},await a(t);}

export { requestRevalidate, start };
