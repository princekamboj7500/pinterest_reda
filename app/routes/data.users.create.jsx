import {  json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
 
  
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const pinterestUserId = body.get("pinterestUserId")
  const accessToken = body.get("accessToken")
  const refreshToken = body.get("refreshToken")
  const userName = body.get("userName")

  
  let existingUser = await prisma.PinterestUser.findMany({
    where: { shopifyShopId : shopifyShopId },
  });
  
  let user = {}
  if (Object.keys(existingUser).length > 0) {
    user = await prisma.PinterestUser.update({
      where: { id : existingUser[0].id },
      data: { accessToken, refreshToken, userName },
    });
  }else{
    user = await prisma.PinterestUser.create({
      data: {
        shopifyShopId,
        pinterestUserId,
        accessToken,
        refreshToken,
        userName,
      },
    });
  }
  return json(user);
}


