import {  json } from "@remix-run/node";
import prisma from "../db.server";
import axios from "axios";

export const action = async ({ request }) => {
 
  
  const body = await request.formData();
  const id = body.get("id");
  let pins = await prisma.PinterestProductPins.delete({
    where: { id : id }
  });


  let access_key = body.get("access_key");
  let pin_id = body.get("pin_id");
  const response = await axios.delete(process.env.PINTEREST_API_HOST+'/pins/'+pin_id, {
    headers: {
      'Authorization': `Bearer ${access_key}`, // Pinterest access token
      'Content-Type': 'application/json',
    },
  }).catch(()=>{
    
  });
  
  return json({
    success : true
  })

}


