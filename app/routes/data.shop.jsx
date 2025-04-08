import {  json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`query getShopCurrency {
    shop {
      currencyCode
    }
  }`
  );

  const shop = await response.json();
  return json(shop);
}
