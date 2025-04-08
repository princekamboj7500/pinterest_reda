import {  json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
 
  
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  let existingUser = await prisma.PinterestUser.findMany({
    where: { shopifyShopId : shopifyShopId },
  });
  
  let user = {}
  if (Object.keys(existingUser).length > 0) {
    user = await prisma.PinterestUser.delete({
      where: { id : existingUser[0].id }
    });
  }
  return json(Object.values(existingUser));
}


