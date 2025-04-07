import { ActionFunctionArgs , json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    mutation populateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
        }
      }
    }`,
    {
      variables: {
        input: { title: "Product Name" },
      },
    },
  );

  const productData = await response.json();
  return json({
    productId: productData.data?.productCreate?.product?.id,
  });
}
