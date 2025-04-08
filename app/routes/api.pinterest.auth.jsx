import { json } from "@remix-run/node";
import axios from "axios";

export const action = async ({ request }) => {
  //const { admin } = await authenticate.admin(request);
  try {
    const body = await request.formData();
    // Convert FormData to an object
    let grant_type = body.get("grant_type");
    let code = body.get("code");
    let state = body.get("state");

    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", grant_type);
    urlencoded.append("redirect_uri", process.env.SHOPIFY_APP_URL + "/connect");
    urlencoded.append("code", code);

    const base64Encoded = Buffer.from(
      `${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_API_SECRET}`
    ).toString("base64");

    const authHeader = `Basic ${base64Encoded}`;

    const response = await axios
      .post(
        process.env.PINTEREST_API_HOST + "/oauth/token",
        urlencoded.toString(),
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .catch((error) => {
        console.log("error.response", error.response);
        return error.response;
      });
    // return json({ status: 200, success: true });
    return json(response?.data);
  } catch (error) {
    return json(error.message);
  }
};
