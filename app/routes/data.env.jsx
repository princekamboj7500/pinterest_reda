import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import fs from "fs";
import toml from "toml";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const tomlContent = fs.readFileSync("shopify.app.pinterest-dev.toml");
  const config = toml.parse(tomlContent);
  return json({
    pinterest_app_id: process.env.PINTEREST_APP_ID,
    PINTEREST_REDIRECT:
      process.env.PINTEREST_REDIRECT || config.application_url,
    application_url: config.application_url,
  });
};
