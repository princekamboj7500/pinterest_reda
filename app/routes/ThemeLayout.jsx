import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Navigate,
  useFetcher,
  useLocation,
  useNavigate,
} from "@remix-run/react";
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
import Screens from "./Screens";
import styles from "./styles";
import svg from "../../public/loading.svg";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/slices/user/index";
import AuthChecker from "./AuthChecker";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const navigate = useNavigate();
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
    }
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
    }
  );
  const variantResponseJson = await variantResponse.json();
};

export default function Index({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);

  const style = {
    main_sidebar_navigation: {
      padding: "10px 10px",
    },
    navigation_dash: {
      borderBottom: "1px solid #cacaca",
      width: "100%",
      display: "block",
      fontSize: "13px",
      fontFamily: "Inter",
      padding: "0px 10px 20px 10px",
    },
    navigation_dash_a: {
      padding: "7px 10px",
      borderRadius: "10px",
      fontSize: "13px",
      fontFamily: "Inter",
      display: "grid",
      background: "white",
      gridTemplateColumns: "30px auto",
      alignItems: "center",
      cursor: "pointer",
    },
    navigation_dash_svg: {
      fontSize: "3px",
      width: "15px",
      height: "15px",
      fill: "rgba(74, 74, 74, 1)",
    },
    navigation_dash_text: {
      color: "black",
    },
    navigation_dash_list: {
      margin: "0px",
      listStyle: "none",
      padding: "10px 10px 0px",
    },
  };

  const [shopConfig, setShopConfig] = useState(null);
  const [storeRegistered, setStoreRegistered] = useState(null);
  const appBridge = useAppBridge();
  const userFetcher = useFetcher();
  const envFetcher = useFetcher();
  const loaderData = useLoaderData();
  useEffect(() => {
    // This code runs only on the client side
    if (typeof window !== "undefined") {
      const config = appBridge.config; // or any other client-side config
      setShopConfig(config);
    }
  }, []);

  const initFunction = useMemo(() => {
    const _init = async () => {
      if (shopConfig?.shop) {
        await envFetcher.load("/data/env");
        await userFetcher.submit(
          { shopifyShopId: shopConfig.shop },
          { method: "post", action: "/data/users" }
        );
      }
    };

    return _init;
  }, [shopConfig]);

  useEffect(() => {
    initFunction();
  }, [shopConfig]);

  useEffect(() => {
    if (userFetcher.data) {
      //console.log("userFetcher.data",userFetcher.data)
      dispatch(setUserData(userFetcher.data[0]));
      if (Object.keys(userFetcher.data).length == 0) {
        setStoreRegistered(false);
      } else {
        setStoreRegistered(true);
      }
    }
  }, [userFetcher.data]);

  const pinterest_check_auth = (user) => {
    // userAccountFetcher.submit(
    //   {
    //     access_key : user.accessToken,
    //   },
    //   { method: "post", action: "/api/pinterest/user_account" }
    // )
  };

  // useEffect(()=>{
  //   console.log('userAccountFetcher.data',userAccountFetcher.data)
  // },[userAccountFetcher.data])

  const [selected_menu, set_selected_menu] = useState(location?.pathname);
  if (storeRegistered == null) {
    return (
      <div
        style={{
          display: "flex",
          height: "400px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>
          <img
            style={{ width: "50px", height: "50px" }}
            src={"/loading.svg"}
          ></img>
        </div>
      </div>
    );
  }

  return (
    <Page fullWidth style={{ background: "green" }}>
      <AuthChecker
        storeRegistered={storeRegistered}
        user={userFetcher.data}
      ></AuthChecker>
      {storeRegistered == null || storeRegistered == false ? (
        <div style={{ padding: "0px 30px" }}>
          <Card>
            <div style={{ padding: "1.5rem" }}>
              <Text as="h2" variant="headingLg">
                Connect your account
              </Text>
              <div style={{ marginTop: "20px" }}>
                <Text as="p" variant="">
                  Connect your Pinterest account to automatically turn your
                  products into Pins and track your best performing ads.
                </Text>
              </div>
              <div style={{ marginTop: "30px" }}>
                {console.log("envFetcher", envFetcher)}
                <Link
                  style={{ ...styles.theme_button }}
                  to={`https://www.pinterest.com/oauth/?client_id=${envFetcher?.data?.pinterest_app_id}&redirect_uri=${envFetcher?.data?.application_url}/connect&state=${shopConfig?.shop}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write,pins:read_secret,pins:write_secret,user_accounts:read`}
                  rel="noopener noreferrer"
                  target="_parent"
                  // onClick={() => {
                  //   window.location = `https://www.pinterest.com/oauth/?client_id=${envFetcher?.data?.pinterest_app_id}&redirect_uri=${envFetcher?.data?.application_url}/connect&state=${shopConfig?.shop}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write,pins:read_secret,pins:write_secret,user_accounts:read`;
                  // }}
                >
                  Connect Pinterest Account
                </Link>
                {/* <button to="select_product"  style={{...styles.theme_button}} type="button" onClick={()=>{
                        redirect(`https://www.pinterest.com/oauth/?client_id=${envFetcher?.data?.pinterest_app_id}&redirect_uri=${envFetcher?.data?.application_url}/connect&state=${shopConfig.shop}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write,pins:read_secret,pins:write_secret,user_accounts:read`);

                      }}>
                        Connect Pinterest Account
                      </button> */}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div
          class="main"
          style={{
            width: "100%",
            height: "400px",
            display: "grid",
            gridTemplateColumns: "250px auto",
          }}
        >
          <div
            className="main-sidebar"
            style={{
              borderRight: "1px solid #cacaca",
            }}
          >
            <div className={""} style={style.main_sidebar_navigation}>
              <div className={""} style={style.navigation_dash}>
                <span
                  to="/app"
                  rel="home"
                  className={""}
                  onClick={() => navigate("/app")}
                  style={{
                    ...style.navigation_dash_a,
                    background: selected_menu == "/app" ? "white" : "none",
                  }}
                >
                  <span className="nav-icon">
                    <svg
                      style={style.navigation_dash_svg}
                      xmlns="http://www.w3.org/2000/svg"
                      id="bars-icon"
                      viewBox="0 0 24 24"
                      class="bars-icon"
                    >
                      <path d="M12,24c-1.65,0-3-1.35-3-3V3c0-1.65,1.35-3,3-3s3,1.35,3,3V21c0,1.65-1.35,3-3,3Zm9,0c-1.65,0-3-1.35-3-3V9c0-1.65,1.35-3,3-3s3,1.35,3,3v12c0,1.65-1.35,3-3,3Zm-18,0c-1.65,0-3-1.35-3-3v-6c0-1.65,1.35-3,3-3s3,1.35,3,3v6c0,1.65-1.35,3-3,3Z" />
                    </svg>
                  </span>
                  <span style={style.navigation_dash_text}>Dashboard</span>
                </span>
              </div>
              <ul className="nav-list" style={style.navigation_dash_list}>
                <li>
                  <span
                    to="/app/select_product"
                    onClick={() => {
                      navigate("/app/select_product");
                    }}
                    className={""}
                    style={{
                      ...style.navigation_dash_a,
                      background:
                        selected_menu == "/app/select_product"
                          ? "white"
                          : "none",
                    }}
                  >
                    <span
                      className="nav-icon"
                      style={style.navigation_dash_svg}
                    >
                      <svg
                        version="1.1"
                        id="icon"
                        xmlns="http://www.w3.org/2000/svg"
                        x="0px"
                        y="0px"
                        viewBox="0 0 409.603 409.603"
                        class="custom-icon"
                      >
                        <g>
                          <g>
                            <path
                              d="M375.468,0.002h-141.87c-9.385,0-22.502,5.437-29.133,12.063L9.961,206.568c-13.281,13.266-13.281,35.016,0,48.266
                                        l144.824,144.819c13.251,13.266,34.98,13.266,48.251-0.015L397.54,205.165c6.625-6.625,12.063-19.763,12.063-29.128V34.137
                                        C409.603,15.367,394.237,0.002,375.468,0.002z M307.197,136.537c-18.852,0-34.135-15.299-34.135-34.135
                                        c0-18.867,15.283-34.135,34.135-34.135c18.852,0,34.14,15.268,34.14,34.135C341.338,121.238,326.049,136.537,307.197,136.537z"
                            />
                          </g>
                        </g>
                      </svg>
                    </span>
                    <span style={style.navigation_dash_text}>
                      Select Product
                    </span>
                  </span>
                </li>
                {/*  */}
                <li>
                  <Link
                    to={"javascript:;"}
                    style={{
                      ...style.navigation_dash_a,
                      background:
                        selected_menu == "/app/create_pin" ? "white" : "none",
                    }}
                  >
                    <span
                      className="nav-icon"
                      style={style.navigation_dash_svg}
                    >
                      <svg
                        viewBox="0 0 14 14"
                        class="custom-svg"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M1.25522 2.84699C1.45499 1.49858 2.6124 0.5 3.97553 0.5H10.0245C11.3876 0.5 12.545 1.49858 12.7448 2.84699L13.4055 7.30708C13.4684 7.73161 13.5 8.1602 13.5 8.58938V10.25C13.5 12.0449 12.0449 13.5 10.25 13.5H3.75C1.95507 13.5 0.5 12.0449 0.5 10.25V8.58938C0.5 8.1602 0.531575 7.73161 0.59447 7.30708L1.25522 2.84699ZM3.97553 2C3.35593 2 2.82983 2.4539 2.73903 3.06681L2.15633 7H4.63962C5.17766 7 5.65533 7.34429 5.82547 7.85472L5.98359 8.32906C6.01762 8.43114 6.11315 8.5 6.22076 8.5H7.77924C7.88685 8.5 7.98238 8.43114 8.01641 8.32906L8.17453 7.85472C8.34467 7.34429 8.82234 7 9.36038 7H11.8437L11.261 3.06681C11.1702 2.4539 10.6441 2 10.0245 2H3.97553Z"
                          class="svg-path"
                        />
                      </svg>
                    </span>
                    <span style={style.navigation_dash_text}>Create Pin</span>
                  </Link>
                </li>
                {/*  */}
                <li>
                  <Link
                    to={"javascript:;"}
                    style={{
                      ...style.navigation_dash_a,
                      background:
                        selected_menu == "/app/preview_and_publish"
                          ? "white"
                          : "none",
                    }}
                  >
                    <span
                      className="nav-icon"
                      style={style.navigation_dash_svg}
                    >
                      <svg
                        viewBox="0 0 16 12"
                        class="custom-svg"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M11 6C11 7.65685 9.65685 9 8 9C6.34315 9 5 7.65685 5 6C5 4.34315 6.34315 3 8 3C9.65685 3 11 4.34315 11 6ZM9.5 6C9.5 6.82843 8.82843 7.5 8 7.5C7.17157 7.5 6.5 6.82843 6.5 6C6.5 5.17157 7.17157 4.5 8 4.5C8.82843 4.5 9.5 5.17157 9.5 6Z"
                          class="custom-path"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M8 0C5.52353 0 3.65153 1.22977 2.42264 2.53216C1.80748 3.18413 1.34017 3.86704 1.02329 4.45447C0.86488 4.74811 0.739729 5.02591 0.652246 5.27169C0.571431 5.49874 0.5 5.76019 0.5 6C0.5 6.23981 0.571431 6.50126 0.652246 6.72831C0.739729 6.97409 0.86488 7.25189 1.02329 7.54553C1.34017 8.13296 1.80748 8.81587 2.42264 9.46784C3.65153 10.7702 5.52353 12 8 12C10.4765 12 12.3485 10.7702 13.5774 9.46784C14.1925 8.81587 14.6598 8.13296 14.9767 7.54553C15.1351 7.25189 15.2603 6.97409 15.3478 6.72831C15.4286 6.50126 15.5 6.23981 15.5 6C15.5 5.76019 15.4286 5.49874 15.3478 5.27169C15.2603 5.02591 15.1351 4.74811 14.9767 4.45447C14.6598 3.86704 14.1925 3.18413 13.5774 2.53216C12.3485 1.22977 10.4765 0 8 0ZM2.00141 6.00207L2.00103 6L2.00141 5.99793C2.00509 5.97812 2.01827 5.90708 2.0654 5.77469C2.12269 5.61374 2.21422 5.40618 2.34345 5.16663C2.60183 4.68764 2.9936 4.11275 3.51365 3.56159C4.55519 2.45773 6.05819 1.5 8 1.5C9.94181 1.5 11.4448 2.45773 12.4864 3.56159C13.0064 4.11275 13.3982 4.68764 13.6566 5.16663C13.7858 5.40618 13.8773 5.61374 13.9346 5.77469C13.9817 5.90708 13.9949 5.97813 13.9986 5.99793L13.999 6L13.9986 6.00207C13.9949 6.02187 13.9817 6.09292 13.9346 6.22531C13.8773 6.38626 13.7858 6.59382 13.6566 6.83337C13.3982 7.31236 13.0064 7.88725 12.4864 8.43841C11.4448 9.54227 9.94181 10.5 8 10.5C6.05819 10.5 4.55519 9.54227 3.51365 8.43841C2.9936 7.88725 2.60183 7.31236 2.34345 6.83337C2.21422 6.59382 2.12269 6.38626 2.0654 6.22531C2.01827 6.09292 2.00509 6.02188 2.00141 6.00207Z"
                          class="custom-path"
                        />
                      </svg>
                    </span>
                    <span style={style.navigation_dash_text}>
                      Preview & Publish
                    </span>
                  </Link>
                </li>
                {/*  */}
                <li>
                  <span
                    onClick={() => {
                      navigate("/app/view_pins");
                    }}
                    to="/app/view_pins"
                    className={""}
                    style={{
                      ...style.navigation_dash_a,
                      background:
                        selected_menu == "/app/view_pins" ? "white" : "none",
                    }}
                  >
                    <span className="nav-icon">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 5C9.55229 5 10 4.55229 10 4C10 3.44772 9.55229 3 9 3C8.44772 3 8 3.44772 8 4C8 4.55229 8.44772 5 9 5Z"
                          fill="#4A4A4A"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M4.41957 0.5H9.58044C10.1146 0.49999 10.5604 0.499982 10.9247 0.52974C11.3046 0.560778 11.6612 0.627889 11.9985 0.799733C12.5159 1.06339 12.9366 1.48408 13.2003 2.00153C13.3721 2.33879 13.4392 2.69545 13.4703 3.07533C13.5 3.43955 13.5 3.88538 13.5 4.41951V6.33045C13.5 6.86458 13.5 7.31045 13.4703 7.67467C13.4392 8.05456 13.3721 8.41121 13.2003 8.74848C12.9366 9.26592 12.5159 9.68662 11.9985 9.95027C11.6612 10.1221 11.3046 10.1892 10.9247 10.2203C10.8338 10.2277 10.7379 10.2333 10.6367 10.2374C10.5918 10.2458 10.546 10.25 10.5 10.25H5L4.99761 10.25H4.41955C3.88542 10.25 3.43955 10.25 3.07533 10.2203C2.69545 10.1892 2.33879 10.1221 2.00153 9.95027C1.57632 9.73361 1.21644 9.41091 0.955348 9.01561C0.872058 8.92764 0.811978 8.82151 0.779069 8.70679C0.622433 8.38185 0.559503 8.03894 0.52974 7.67467C0.499982 7.31044 0.49999 6.8646 0.5 6.33046V4.41957C0.49999 3.88542 0.499982 3.43956 0.52974 3.07533C0.560778 2.69545 0.627889 2.33879 0.799733 2.00153C1.06339 1.48408 1.48408 1.06339 2.00153 0.799733C2.33879 0.627889 2.69545 0.560778 3.07533 0.52974C3.43956 0.499982 3.88542 0.49999 4.41957 0.5ZM12 6.3C12 6.49916 11.9999 6.67553 11.9988 6.83333L11.8645 6.64147C11.2032 5.6967 9.82476 5.63876 9.08647 6.5247L8 7.82847L5.58854 4.93472C4.89232 4.09925 3.61071 4.09443 2.90823 4.92464L2 5.998V4.45C2 3.87757 2.00058 3.49336 2.02476 3.19748C2.04822 2.91036 2.0901 2.77307 2.13624 2.68251C2.25608 2.44731 2.44731 2.25608 2.68251 2.13624C2.77307 2.0901 2.91036 2.04822 3.19748 2.02476C3.49336 2.00058 3.87757 2 4.45 2H9.55C10.1224 2 10.5066 2.00058 10.8025 2.02476C11.0896 2.04822 11.2269 2.0901 11.3175 2.13624C11.5527 2.25608 11.7439 2.44731 11.8638 2.68251C11.9099 2.77307 11.9518 2.91036 11.9752 3.19748C11.9994 3.49336 12 3.87757 12 4.45V6.3Z"
                          fill="#4A4A4A"
                        />
                        <path
                          d="M1 12.75C1 12.3358 1.33579 12 1.75 12H7.25C7.66422 12 8 12.3358 8 12.75C8 13.1642 7.66422 13.5 7.25 13.5H1.75C1.33579 13.5 1 13.1642 1 12.75Z"
                          fill="#4A4A4A"
                        />
                        <path
                          d="M9.75 12C9.33579 12 9 12.3358 9 12.75C9 13.1642 9.33579 13.5 9.75 13.5H12.25C12.6642 13.5 13 13.1642 13 12.75C13 12.3358 12.6642 12 12.25 12H9.75Z"
                          fill="#4A4A4A"
                        />
                      </svg>
                    </span>
                    <span style={style.navigation_dash_text}>View Pins</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div
            className="page-content"
            style={{
              paddingBottom: "60px",
            }}
          >
            {children}
          </div>
        </div>
      )}
    </Page>
  );
}
