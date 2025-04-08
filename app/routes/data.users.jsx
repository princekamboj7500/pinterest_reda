import {  json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  let user = await prisma.PinterestUser.findMany({
    where: { shopifyShopId },
  });
  
  return json(user);
}


