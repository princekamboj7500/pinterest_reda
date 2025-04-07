import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const body = await request.formData();
  const query = body.get("query");

  const variables = JSON.parse(body.get("variables"));
  const response = await admin.graphql(
    `
      ${query}
    `,
    {
      variables: variables,
    }
  );

  const productData = await response.json();
  return json(productData.data);
};
