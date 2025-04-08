import {  json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
 
  
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const product_id = body.get("product_id")
  const product_title = body.get("product_title")
  const status = body.get("status")
  const productEditJson = body.get("productEditJson")
  const pinterestJson = body.get("pinterestJson")
  

  let pin = await prisma.PinterestProductPins.create({
    data: {
      shopifyShopId,
      product_id,
      product_title,
      productEditJson,
      pinterestJson,
      status
    },
  });

  return json(pin);
}


