import { useEffect, useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineStack,
} from "@shopify/polaris";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import ThemeLayout from "./ThemeLayout";
import Dashboard from "./Screens/Dashboard";


export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

 
};

export default function Index() {

  const [refresh,setRefresh] = useState(false);
  const handleRefresh = ()=>{
    setRefresh(!refresh)
  }
  // const fetcher = useFetcher();

  // const shopify = useAppBridge();
  // const isLoading =
  //   ["loading", "submitting"].includes(fetcher.state) &&
  //   fetcher.formMethod === "POST";
  // const productId = fetcher.data?.product?.id.replace(
  //   "gid://shopify/Product/",
  //   "",
  // );

  // useEffect(() => {
  //   if (productId) {
  //     shopify.toast.show("Product created");
  //   }
  // }, [productId, shopify]);
  // const generateProduct = () => fetcher.submit({}, { method: "POST" });
  useEffect(()=>{
    
  },[refresh])
  const style = {
    main_sidebar_navigation : {
      padding : '10px 10px'
    },
    navigation_dash : {
      borderBottom: '1px solid rgba(0, 0, 0, 0.5)',
      width: '100%',
      display: 'block',
      fontSize: '13px',
      fontFamily: 'Inter',
      padding: '0px 10px 20px 10px',
    },
    navigation_dash_a : {
        padding: '7px 10px',
        borderRadius: '10px',
        fontSize: '13px',
        fontFamily: 'Inter',
        display: 'grid',
        background: 'white',
        gridTemplateColumns: '30px auto',
        alignItems : 'center',
        cursor : 'pointer'
    },
    navigation_dash_svg : {
      fontSize: '3px',
      width: '15px',
      height: '15px',
      fill: 'rgba(74, 74, 74, 1)',
    },
    navigation_dash_text :{
    },
    navigation_dash_list:{
      margin: "0px",
      listStyle : "none",
      padding: '10px 10px 0px',
    },
  }

  const [selected_menu , set_selected_menu] = useState('dashboard');
  return (
    <ThemeLayout>
        <Dashboard handleRefresh={handleRefresh}/>
    </ThemeLayout>
  );
}
