import{j as e}from"./jsx-runtime-BLI8ZJsa.js";import{a as m,b as y,_ as f,M as x,L as j,S}from"./components-BlTBjdub.js";import{u as w,a as k,r as n,O as g}from"./index-CP26dfb2.js";/**
 * @remix-run/react v2.16.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let a="positions";function _({getKey:r,...l}){let{isSpaMode:c}=m(),o=w(),p=k();y({getKey:r,storageKey:a});let h=n.useMemo(()=>{if(!r)return null;let t=r(o,p);return t!==o.key?t:null},[]);if(c)return null;let d=((t,u)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let i=JSON.parse(sessionStorage.getItem(t)||"{}")[u||window.history.state.key];typeof i=="number"&&window.scrollTo(0,i)}catch(s){console.error(s),sessionStorage.removeItem(t)}}).toString();return n.createElement("script",f({},l,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${d})(${JSON.stringify(a)}, ${JSON.stringify(h)})`}}))}var M={};function b(){return e.jsxs("html",{children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width,initial-scale=1"}),e.jsx("link",{rel:"preconnect",href:"https://cdn.shopify.com/"}),e.jsx("link",{rel:"stylesheet",href:"https://cdn.shopify.com/static/fonts/inter/v4/styles.css"}),e.jsx("link",{rel:"stylesheet",href:"/pin-style.css"}),e.jsx("meta",{name:"shopify-api-key",content:M.SHOPIFY_API_KEY}),e.jsx("script",{src:"https://cdn.shopify.com/shopifycloud/app-bridge.js"}),e.jsx(x,{}),e.jsx(j,{})]}),e.jsxs("body",{children:[e.jsx(g,{}),e.jsx(_,{}),e.jsx(S,{})]})]})}export{b as default};
