import { json } from "@remix-run/node";
//import { authenticate } from "../shopify.server";
import axios from "axios";
import { parse, stringify, toJSON, fromJSON } from "flatted";
export const action = async ({ request }) => {
  //const query = body.get("media_source");

  try {
    const body = await request.formData();
    let access_key = body.get("access_key");
    let rawData = body.get("data");
    rawData = JSON.parse(rawData);
    const response = await axios.post(
      process.env.PINTEREST_API_HOST + "/pins",
      rawData,
      {
        headers: {
          Authorization: `Bearer ${access_key}`, // Pinterest access token
          "Content-Type": "application/json",
        },
      }
    );

    return json(response?.data);
    //return json({data:{status: 200, msg : 'created'}});
  } catch (error) {
    console.error("Failed to fetch Pinterest data:", error);
    return json(error);
  }
};
