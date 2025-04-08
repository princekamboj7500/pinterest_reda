import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    return json({
      pinterest_app_id: process.env.PINTEREST_APP_ID,
      PINTEREST_REDIRECT: process.env.SHOPIFY_APP_URL,
      application_url: process.env.SHOPIFY_APP_URL,
    });
  } catch (error) {
    console.log("error", error);
    return json({ error });
  }
};
