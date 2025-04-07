import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
         <link
          rel="stylesheet"
          href="/pin-style.css"
        />


            <meta name="shopify-api-key" content={process.env.SHOPIFY_API_KEY} />
            <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <Meta />
        <Links />
      </head>
      <body>
       
          <Outlet />
          <ScrollRestoration />
          <Scripts />
 
      </body>
    </html>
  );
}
