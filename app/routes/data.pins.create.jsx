import {  json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
 
  
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const product_id = body.get("product_id")
  const product_title = body.get("product_title")
  const pinterestJson = body.get("pinterestJson")
  const productEditJson = body.get("productEditJson")
  const status = body.get("status")
  let pin = await prisma.PinterestProductPins.create({
    data: {
      shopifyShopId,
      product_id,
      pinterestJson,
      product_title,
      status,
      productEditJson
    },
  });
  // let existingUser = await prisma.PinterestUser.findMany({
  //   where: { shopifyShopId : shopifyShopId },
  // });
  
  // // let user = {}
  // // if (Object.keys(existingUser).length > 0) {
  //   user = await prisma.PinterestUser.update({
  //     where: { id : existingUser[0].id },
  //     data: { accessToken, refreshToken, userName },
  //   });
  // }else{
    
  // }
  return json(pin);
}


