import {  json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
 
  
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const product_id = body.get("product_id")
  const pinterestJson = body.get("pinterestJson")
  let pins = await prisma.PinterestProductPins.findMany({
    where: { shopifyShopId : shopifyShopId }
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
  return json(pins);
}


