// app/routes/api/pinterest/boards.jsx
import { json } from "@remix-run/node"; // or '@remix-run/cloudflare'
import axios from "axios";
//import { authenticate } from "../shopify.server";
export const action = async ({ request }) => {
  // const { admin } = await authenticate.admin(request);

  try {
    const body = await request.formData();
    const access_key =
      body.get("access_key") || request.headers.get("access_key");
    console.log("host", process.env.PINTEREST_API_HOST);
    const response = await axios
      .get(process.env.PINTEREST_API_HOST + "/boards", {
        headers: {
          Authorization: `Bearer ${access_key}`, // Pinterest access token
          "Content-Type": "application/json",
        },
      })
      .catch((error) => {
        if (error.response) {
          if (error.response.status == 401) {
          }
        }
      });
    return json(response?.data);
  } catch (error) {
    return json(error.message);
  }
};
