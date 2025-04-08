import { json } from "@remix-run/node";
import axios from "axios";

export const action = async ({ request }) => {
  //const { admin } = await authenticate.admin(request);

  const body = await request.formData();
  // Convert FormData to an object
  let refresh_token = body.get("refresh_token");

  const urlencoded = new URLSearchParams();
  urlencoded.append("refresh_token", refresh_token);
  urlencoded.append("grant_type", "refresh_token");
  urlencoded.append(
    "scope",
    "boards:read,boards:write,pins:read,pins:write,pins:read_secret,pins:write_secret,user_accounts:read"
  );
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
      console.error("error:===>", error);
      return error.response;
    });
  return json(response?.data);
};
