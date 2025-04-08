var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useFetcher, useNavigate, useLoaderData, useLocation, Link, useActionData, Form as Form$1, useRouteError } from "@remix-run/react";
import { createReadableStreamFromReadable, json as json$1, redirect } from "@remix-run/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import { PrismaClient } from "@prisma/client";
import { Worker, Queue } from "bullmq";
import { Redis } from "ioredis";
import axios from "axios";
import "flatted";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button, Page, Card, Spinner, DataTable, Text, Icon, DatePicker, TextField, Select, Banner, Toast, ResourceList, ResourceItem, Thumbnail, BlockStack, Form, Grid, Frame, Modal as Modal$1, EmptyState, Layout, LegacyCard, AppProvider, FormLayout } from "@shopify/polaris";
import { useAppBridge, Modal, TitleBar, NavMenu } from "@shopify/app-bridge-react";
import { useDispatch, useSelector, Provider } from "react-redux";
import moment from "moment";
import { createSlice, configureStore } from "@reduxjs/toolkit";
import { ToastContainer } from "react-toastify";
import { NumericFormat } from "react-number-format";
import { RefreshIcon, EditIcon, DeleteIcon, ThemeTemplateIcon, TextBlockIcon, ImageIcon, ImageAddIcon, TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon, TextBoldIcon, TextItalicIcon, TextUnderlineIcon, ClipboardIcon } from "@shopify/polaris-icons";
import * as Konva from "react-konva";
import { Stage, Layer, Rect, Image, Transformer, Group, Circle, Text as Text$1, Star, Arrow, Line, Ellipse } from "react-konva";
import { Html } from "react-konva-utils";
import "jquery";
import { Routes, Route } from "react-router-dom";
import { AppProvider as AppProvider$1 } from "@shopify/shopify-app-remix/react";
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
}
const shopify$1 = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  restResources,
  future: {
    unstable_newEmbeddedAuthStrategy: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.January25;
const addDocumentResponseHeaders = shopify$1.addDocumentResponseHeaders;
const authenticate = shopify$1.authenticate;
shopify$1.unauthenticated;
const login = shopify$1.login;
shopify$1.registerWebhooks;
shopify$1.sessionStorage;
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASSWORD || "",
  maxRetriesPerRequest: null
});
redisClient.on("connect", () => {
  console.log("Redis client connected");
});
redisClient.on("error", (err) => {
  console.error("Redis client error:", err);
});
const worker = new Worker(
  "shopifyJobQueue",
  async (job) => {
    var _a2, _b, _c, _d;
    console.log(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === "shopifyProcessJob") {
      const { url, method, headers: headers2, data, shopifyShopId } = job.data;
      console.log("headers", headers2);
      const { Authorization, "Content-Type": ContentType } = headers2;
      console.log("access_key", Authorization);
      let base64 = (_b = (_a2 = data.pin_data) == null ? void 0 : _a2.product_image_base64) == null ? void 0 : _b.replaceAll("data:image/jpeg;base64,", "").replaceAll("data:image/png;base64,", "");
      let edited_pin_base64 = (_d = (_c = data.pin_data) == null ? void 0 : _c.edited_pin_base64) == null ? void 0 : _d.replaceAll("data:image/jpeg;base64,", "").replaceAll("data:image/png;base64,", "");
      let pin_data = {
        title: data.pin_data.title,
        description: data.pin_data.description,
        board_id: data.pin_data.board_id,
        media_source: {
          source_type: "image_base64",
          content_type: "image/png",
          data: data.pin_data.edited_pin_base64 == null ? base64 : edited_pin_base64
        }
      };
      const response = await axios.post(url, pin_data, {
        headers: {
          Authorization,
          // Correctly extracted token
          "Content-Type": ContentType
          // Use extracted Content-Type
        }
      }).catch((error) => {
        console.log("response.data", error);
      });
      let pintrestData = response.data;
      let product_id = data.pin_data.product.node.id;
      let product_title = data.pin_data.product.node.title;
      let pinterestJson = JSON.stringify(pintrestData);
      let productEditJson = JSON.stringify(data.pin_data);
      let status = "published";
      let record = await prisma.PinterestProductPins.findFirst({
        where: { QueJobId: job.id }
      });
      console.log("record find", record);
      await prisma.PinterestProductPins.update({
        where: {
          id: record.id
          // Unique identifier for the record
        },
        data: {
          shopifyShopId,
          product_id,
          pinterestJson,
          product_title,
          status,
          productEditJson
        }
      });
    }
  },
  { connection: redisClient }
);
worker.on("completed", (job) => {
  console.log(`Job ${job.id} has been completed.`);
});
worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} has failed with error: ${err.message}`);
});
const ABORT_DELAY = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
function App$2() {
  return /* @__PURE__ */ jsxs("html", { children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "/pin-style.css"
        }
      ),
      /* @__PURE__ */ jsx("meta", { name: "shopify-api-key", content: process.env.SHOPIFY_API_KEY }),
      /* @__PURE__ */ jsx("script", { src: "https://cdn.shopify.com/shopifycloud/app-bridge.js" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$2
}, Symbol.toStringTag, { value: "Module" }));
const action$m = async ({ request }) => {
  try {
    const data = await request.json();
    console.log(data, "data");
    const { name, description } = data;
    const access_token = request.headers.get("access_token");
    console.log(access_token, "access_token");
    if (!access_token) {
      return json$1({ message: "Access token not found" }, { status: 401 });
    }
    const response = await fetch(`${process.env.PINTEREST_API_HOST}/boards`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    });
    const jsonResponse = await response.json();
    console.log(jsonResponse, "response");
    if (!response.ok) {
      return json$1(
        { message: "Failed to create board: " + jsonResponse.message },
        { status: 500 }
      );
    }
    return json$1({ message: "Board created successfully" });
  } catch (error) {
    console.error("Failed to fetch Pinterest data:", error);
    return json$1(
      { error: "An error occurred while creating the board" },
      { status: 500 }
    );
  }
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$m
}, Symbol.toStringTag, { value: "Module" }));
const action$l = async ({ request }) => {
  const body = await request.formData();
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
  const response = await axios.post(
    process.env.PINTEREST_API_HOST + "/oauth/token",
    urlencoded.toString(),
    {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  ).catch((error) => {
    console.error("error:===>", error);
    return error.response;
  });
  return json$1(response == null ? void 0 : response.data);
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$l
}, Symbol.toStringTag, { value: "Module" }));
const jobQueue = new Queue("shopifyJobQueue", {
  connection: redisClient
});
const action$k = async ({ request }) => {
  try {
    const body = await request.formData();
    const access_key = body.get("access_key");
    const rawData = body.get("data");
    const delay = body.get("delay");
    if (!access_key || !rawData || !delay) {
      return json$1({ error: "Missing required fields" }, { status: 400 });
    }
    console.log(access_key, "access_key");
    const parsedData = JSON.parse(rawData);
    const shopifyShopId = parsedData.shopifyShopId;
    const product_id = parsedData.pin_data.product.node.id;
    const product_title = parsedData.pin_data.product.node.title;
    const status = "scheduled";
    const productEditJson = JSON.stringify(parsedData.pin_data);
    const pinterestJson = JSON.stringify({});
    const job = await jobQueue.add(
      "shopifyProcessJob",
      {
        url: `${process.env.PINTEREST_API_HOST}/pins`,
        method: "post",
        headers: {
          Authorization: `Bearer ${access_key}`,
          "Content-Type": "application/json"
        },
        data: parsedData,
        shopifyShopId
      },
      {
        delay: parseInt(delay, 10),
        attempts: 5
      }
    );
    const QueJobId = job.id;
    await prisma.PinterestProductPins.create({
      data: {
        shopifyShopId,
        product_id,
        product_title,
        productEditJson,
        pinterestJson,
        status,
        QueJobId
      }
    });
    return json$1({ jobID: job.id }, { status: 200 });
  } catch (error) {
    console.error("Failed to process request:", error);
    return json$1({ error: "Internal Server Error" }, { status: 500 });
  }
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$k
}, Symbol.toStringTag, { value: "Module" }));
const action$j = async ({ request }) => {
  const body = await request.formData();
  let access_key = body.get("access_key");
  const response = await axios.get(process.env.PINTEREST_API_HOST + "/user_account", {
    headers: {
      "Authorization": `Bearer ${access_key}`,
      // Pinterest access token
      "Content-Type": "application/json"
    }
  });
  return json$1(response == null ? void 0 : response.data);
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$j
}, Symbol.toStringTag, { value: "Module" }));
const action$i = async ({ request }) => {
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
          Authorization: `Bearer ${access_key}`,
          // Pinterest access token
          "Content-Type": "application/json"
        }
      }
    );
    return json$1(response == null ? void 0 : response.data);
  } catch (error) {
    console.error("Failed to fetch Pinterest data:", error);
    return json$1(error);
  }
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$i
}, Symbol.toStringTag, { value: "Module" }));
const action$h = async ({ request }) => {
  const body = await request.formData();
  let access_key = body.get("access_key");
  const response = await axios.get(process.env.PINTEREST_API_HOST + "/user_account", {
    headers: {
      "Authorization": `Bearer ${access_key}`,
      // Pinterest access token
      "Content-Type": "application/json"
    }
  }).catch((error) => {
    if (error.response.status == 401) {
      return {
        data: 401
      };
    }
  });
  return json$1(response == null ? void 0 : response.data);
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$h
}, Symbol.toStringTag, { value: "Module" }));
const styles$6 = {
  theme_button: {
    background: "rgba(215, 44, 13, 1)",
    color: "white",
    border: "none",
    padding: "10px 40px",
    cursor: "pointer",
    borderRadius: "4px",
    minWidth: "150px"
  },
  theme_button_light: {
    background: "white",
    border: "1px solid rgba(0, 0, 0, 0.05)",
    borderColor: "#d72c0d",
    color: "black",
    padding: "10px 40px",
    cursor: "pointer",
    borderRadius: "4px",
    minWidth: "150px"
  },
  theme_button_2: {
    background: "white",
    color: "black",
    border: "1px solid gainsboro",
    padding: "10px 40px",
    cursor: "pointer",
    borderRadius: "4px",
    minWidth: "150px"
  },
  create_checklist_ul_li: {
    marginBottom: "10px"
  },
  style_pin_title_s_items_container: {
    padding: "5px",
    background: "white",
    borderRadius: "7px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer"
  },
  style_pin_title_s_items_fontsize_select: {
    outline: "none",
    border: "none",
    width: "45px"
  },
  style_pin_title_s_items_fontfamily_select: {
    outline: "none",
    border: "none",
    width: "145px"
  },
  style_pin_title_s_items_color_select: {
    border: "none",
    outline: "none",
    padding: "0px",
    width: "25px",
    paddingTop: "0px",
    margin: "0",
    background: "none"
  }
};
const route39 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: styles$6
}, Symbol.toStringTag, { value: "Module" }));
const initialState$1 = {
  data: {
    title: "",
    description: "",
    destination_url: "",
    board_id: null,
    style: {
      text_scaleX: 1,
      text_scaleY: 1,
      text_x: 10,
      text_y: 10,
      text: "Title..",
      text_font_size: 20,
      text_font_family: "Arial",
      text_color: "#000000",
      text_align: "center",
      text_wieght: "bold",
      text_italic: "normal",
      text_underline: "none",
      rect_bg: "#d3d3d3"
    },
    edited_pin_base64: null
  }
};
const pinSlice$1 = createSlice({
  name: "new_pin",
  initialState: initialState$1,
  reducers: {
    setData: (state, action2) => {
      state.data = action2.payload;
    }
  }
});
const { setData } = pinSlice$1.actions;
const newPinReducer = pinSlice$1.reducer;
function Dashboard(props) {
  const [get_started_tab, set_get_started_tab] = useState(1);
  const [shopConfig, setShopConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const disconnectFetcher = useFetcher();
  const storePinFetcher = useFetcher();
  const deletePinFetcher = useFetcher();
  const navigate = useNavigate();
  useLoaderData();
  const appBridge = useAppBridge();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const [deleteItemData, setDeleteItemData] = useState({});
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [DeleteAlertMsg, setDeleteAlertMsg] = useState("");
  const toggleDeleteAlert = useCallback(
    () => setShowDeleteAlert((active) => !active),
    []
  );
  const DeleteAlertMarkup = showDeleteAlert ? shopify.toast.show(DeleteAlertMsg, {
    duration: 1e3,
    onDismiss: toggleDeleteAlert
  }) : null;
  useEffect(() => {
    if (typeof window !== "undefined") {
      const config = appBridge.config;
      setShopConfig(config);
    }
  }, []);
  const handleDisconnect = () => {
    disconnectFetcher.submit(
      { shopifyShopId: shopConfig.shop },
      { method: "post", action: "/data/users/delete" }
    );
    window.location.reload();
  };
  const getPins = () => {
    setLoading(true);
    storePinFetcher.submit(
      {
        shopifyShopId: user == null ? void 0 : user.shopifyShopId
      },
      { method: "post", action: "/data/pins/get" }
    );
  };
  const handleDelete = (id, pin_id) => {
    deletePinFetcher.submit(
      {
        access_key: user == null ? void 0 : user.accessToken,
        id,
        pin_id
      },
      { method: "post", action: "/data/pins/delete" }
    );
  };
  const handleEditPin = (data) => {
    dispatch(setData(data));
    navigate("/app/create_pin");
  };
  useEffect(() => {
    getPins();
  }, []);
  useEffect(() => {
    var _a2;
    if ((_a2 = deletePinFetcher == null ? void 0 : deletePinFetcher.data) == null ? void 0 : _a2.success) {
      setDeleteAlertMsg("Pin deleted successfully.");
      setShowDeleteAlert(true);
      getPins();
    }
  }, [deletePinFetcher.data]);
  useEffect(() => {
    console.log("inside useEffect");
    if (Object.keys((storePinFetcher == null ? void 0 : storePinFetcher.data) ?? {}).length > 0) {
      const data = Object.values(storePinFetcher.data).map((row) => {
        let pin = JSON.parse(row.pinterestJson);
        let pinEdit = row.productEditJson ? JSON.parse(row.productEditJson) : {};
        const status = row.status === "draft" ? /* @__PURE__ */ jsx(Button, { children: "Draft" }) : row.status === "scheduled" ? /* @__PURE__ */ jsx(Button, { variant: "primary", tone: "critical", children: "Waiting" }) : row.status === "published" ? /* @__PURE__ */ jsx(Button, { variant: "primary", tone: "success", children: "Published" }) : null;
        const ActionButton = /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "7px" }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "dash-action-icon-edit",
              onClick: () => handleEditPin(pinEdit),
              children: /* @__PURE__ */ jsx(Icon, { source: EditIcon, tone: "base" })
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "dash-action-icon-delete",
              onClick: () => {
                setDeleteItemData({ id: row.id, pin_id: pin.id });
                setShowDeleteAlertModal(true);
                shopify.modal.show("delete-modal");
              },
              children: /* @__PURE__ */ jsx(Icon, { source: DeleteIcon, tone: "base" })
            }
          )
        ] });
        return [
          row.product_title,
          pinEdit.title,
          status,
          new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }),
          ActionButton
        ];
      });
      setRows(data);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [storePinFetcher.data]);
  const [showDeleteAlertModal, setShowDeleteAlertModal] = useState(false);
  const handleCloseModal = () => {
    shopify.modal.hide("delete-modal");
  };
  const confirmDelete = () => {
    shopify.modal.hide("delete-modal");
    handleDelete(deleteItemData == null ? void 0 : deleteItemData.id, deleteItemData == null ? void 0 : deleteItemData.pin_id);
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs(Page, { children: [
      DeleteAlertMarkup,
      /* @__PURE__ */ jsx(
        Page,
        {
          style: { display: "block" },
          title: "Dashboard",
          fullWidth: true,
          subtitle: "The integration process guide through the main features of the application.",
          compactTitle: true,
          secondaryActions: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "7px" }, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => {
                  getPins();
                },
                children: /* @__PURE__ */ jsx(Icon, { source: RefreshIcon, tone: "base" })
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => {
                  handleDisconnect();
                },
                children: "Disconnect Pinterest"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => {
                  navigate("/app/boards");
                },
                children: "Boards"
              }
            )
          ] }),
          children: /* @__PURE__ */ jsx(Card, { children: loading ? /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh"
              },
              children: /* @__PURE__ */ jsx(Spinner, { size: "large" })
            }
          ) : rows && rows.length > 0 ? /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: [],
              headings: [
                "Product",
                "Title Pin",
                "Status",
                "Date of Creation",
                "Actions"
              ],
              rows
            }
          ) : /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh"
              },
              children: /* @__PURE__ */ jsx(Text, { children: "No Pins Found" })
            }
          ) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      "ui-modal",
      {
        id: "delete-modal",
        children: [
          /* @__PURE__ */ jsx("div", { gap: "4", children: /* @__PURE__ */ jsx(Text, { children: "Are you sure you want to delete this pin?" }) }),
          /* @__PURE__ */ jsxs("ui-title-bar", { title: "Delete Item", children: [
            /* @__PURE__ */ jsx("button", { variant: "primary", tone: "critical", onClick: confirmDelete, children: "Delete" }),
            /* @__PURE__ */ jsx("button", { onClick: handleCloseModal, children: "Cancel" })
          ] })
        ]
      }
    )
  ] });
}
function Screens() {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs(Routes, { children: [
      /* @__PURE__ */ jsx(Route, { path: "/", exact: true, component: Dashboard }),
      /* @__PURE__ */ jsx(Route, { path: "/about", component: Dashboard }),
      /* @__PURE__ */ jsx(Route, { path: "/contact", component: Dashboard })
    ] }),
    /* @__PURE__ */ jsx(Dashboard, { title: "Dashboard" })
  ] });
}
const route37 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Screens
}, Symbol.toStringTag, { value: "Module" }));
const initialState = {
  user: {}
};
const pinSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserData: (state, action2) => {
      state.user = action2.payload;
    }
  }
});
const { setUserData } = pinSlice.actions;
const userReducer = pinSlice.reducer;
const AuthChecker = (props) => {
  const userAccountFetcher = useFetcher();
  const reAuthUserfetcher = useFetcher();
  const userSaveFetcher = useFetcher();
  useEffect(() => {
    const _init = async () => {
      var _a2, _b;
      if ((props == null ? void 0 : props.storeRegistered) && ((_a2 = props == null ? void 0 : props.user) == null ? void 0 : _a2.length) > 0) {
        await userAccountFetcher.submit(
          {
            access_key: (_b = props == null ? void 0 : props.user[0]) == null ? void 0 : _b.accessToken
          },
          { method: "post", action: "/api/pinterest/user_check" }
        );
      }
    };
    _init();
    return () => {
    };
  }, [props.storeRegistered, props.user]);
  useEffect(() => {
    if (userAccountFetcher.data === 401 && props.user.length > 0) {
      reAuthUserfetcher.submit(
        {
          refresh_token: props.user[0].refreshToken
        },
        { method: "post", action: "/api/pinterest/refresh_auth" }
      );
    }
  }, [userAccountFetcher.data, props.user]);
  useEffect(() => {
    console.log("reAuthUserfetcher", reAuthUserfetcher);
    if (reAuthUserfetcher.data && reAuthUserfetcher.data.access_token) {
      userSaveFetcher.submit(
        {
          shopifyShopId: props.user[0].shopifyShopId,
          accessToken: reAuthUserfetcher.data.access_token
        },
        { method: "post", action: "/data/users/update" }
      );
    }
  }, [reAuthUserfetcher.data, props.user]);
  return null;
};
const route27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AuthChecker
}, Symbol.toStringTag, { value: "Module" }));
const action$g = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][Math.floor(Math.random() * 4)];
  useNavigate();
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
          title: `${color} Snowboard`
        }
      }
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
        variants: [{ id: variantId, price: "100.00" }]
      }
    }
  );
  await variantResponse.json();
};
function Index$2({ children }) {
  var _a2, _b;
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useSelector((state) => state.user.user);
  const style = {
    main_sidebar_navigation: {
      padding: "10px 10px"
    },
    navigation_dash: {
      borderBottom: "1px solid #cacaca",
      width: "100%",
      display: "block",
      fontSize: "13px",
      fontFamily: "Inter",
      padding: "0px 10px 20px 10px"
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
      cursor: "pointer"
    },
    navigation_dash_svg: {
      fontSize: "3px",
      width: "15px",
      height: "15px",
      fill: "rgba(74, 74, 74, 1)"
    },
    navigation_dash_text: {
      color: "black"
    },
    navigation_dash_list: {
      margin: "0px",
      listStyle: "none",
      padding: "10px 10px 0px"
    }
  };
  const [shopConfig, setShopConfig] = useState(null);
  const [storeRegistered, setStoreRegistered] = useState(null);
  const appBridge = useAppBridge();
  const userFetcher = useFetcher();
  const envFetcher = useFetcher();
  useLoaderData();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const config = appBridge.config;
      setShopConfig(config);
    }
  }, []);
  const initFunction = useMemo(() => {
    const _init = async () => {
      if (shopConfig == null ? void 0 : shopConfig.shop) {
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
      dispatch(setUserData(userFetcher.data[0]));
      if (Object.keys(userFetcher.data).length == 0) {
        setStoreRegistered(false);
      } else {
        setStoreRegistered(true);
      }
    }
  }, [userFetcher.data]);
  const [selected_menu, set_selected_menu] = useState(location == null ? void 0 : location.pathname);
  if (storeRegistered == null) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          display: "flex",
          height: "400px",
          justifyContent: "center",
          alignItems: "center"
        },
        children: /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
          "img",
          {
            style: { width: "50px", height: "50px" },
            src: "/loading.svg"
          }
        ) })
      }
    );
  }
  return /* @__PURE__ */ jsxs(Page, { fullWidth: true, style: { background: "green" }, children: [
    /* @__PURE__ */ jsx(
      AuthChecker,
      {
        storeRegistered,
        user: userFetcher.data
      }
    ),
    storeRegistered == null || storeRegistered == false ? /* @__PURE__ */ jsx("div", { style: { padding: "0px 30px" }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs("div", { style: { padding: "1.5rem" }, children: [
      /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingLg", children: "Connect your account" }),
      /* @__PURE__ */ jsx("div", { style: { marginTop: "20px" }, children: /* @__PURE__ */ jsx(Text, { as: "p", variant: "", children: "Connect your Pinterest account to automatically turn your products into Pins and track your best performing ads." }) }),
      /* @__PURE__ */ jsxs("div", { style: { marginTop: "30px" }, children: [
        console.log("envFetcher", envFetcher),
        /* @__PURE__ */ jsx(
          "span",
          {
            style: { ...styles$6.theme_button },
            to: `https://www.pinterest.com/oauth/?client_id=${(_a2 = envFetcher == null ? void 0 : envFetcher.data) == null ? void 0 : _a2.pinterest_app_id}&redirect_uri=${(_b = envFetcher == null ? void 0 : envFetcher.data) == null ? void 0 : _b.application_url}/connect&state=${shopConfig == null ? void 0 : shopConfig.shop}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write,pins:read_secret,pins:write_secret,user_accounts:read`,
            rel: "noopener noreferrer",
            target: "_parent",
            onClick: () => {
              var _a3, _b2;
              navigate(
                `https://www.pinterest.com/oauth/?client_id=${(_a3 = envFetcher == null ? void 0 : envFetcher.data) == null ? void 0 : _a3.pinterest_app_id}&redirect_uri=${(_b2 = envFetcher == null ? void 0 : envFetcher.data) == null ? void 0 : _b2.application_url}/connect&state=${shopConfig == null ? void 0 : shopConfig.shop}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write,pins:read_secret,pins:write_secret,user_accounts:read`
              );
            },
            children: "Connect Pinterest Account"
          }
        )
      ] })
    ] }) }) }) : /* @__PURE__ */ jsxs(
      "div",
      {
        class: "main",
        style: {
          width: "100%",
          height: "400px",
          display: "grid",
          gridTemplateColumns: "250px auto"
        },
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "main-sidebar",
              style: {
                borderRight: "1px solid #cacaca"
              },
              children: /* @__PURE__ */ jsxs("div", { className: "", style: style.main_sidebar_navigation, children: [
                /* @__PURE__ */ jsx("div", { className: "", style: style.navigation_dash, children: /* @__PURE__ */ jsxs(
                  "span",
                  {
                    to: "/app",
                    rel: "home",
                    className: "",
                    onClick: () => navigate("/app"),
                    style: {
                      ...style.navigation_dash_a,
                      background: selected_menu == "/app" ? "white" : "none"
                    },
                    children: [
                      /* @__PURE__ */ jsx("span", { className: "nav-icon", children: /* @__PURE__ */ jsx(
                        "svg",
                        {
                          style: style.navigation_dash_svg,
                          xmlns: "http://www.w3.org/2000/svg",
                          id: "bars-icon",
                          viewBox: "0 0 24 24",
                          class: "bars-icon",
                          children: /* @__PURE__ */ jsx("path", { d: "M12,24c-1.65,0-3-1.35-3-3V3c0-1.65,1.35-3,3-3s3,1.35,3,3V21c0,1.65-1.35,3-3,3Zm9,0c-1.65,0-3-1.35-3-3V9c0-1.65,1.35-3,3-3s3,1.35,3,3v12c0,1.65-1.35,3-3,3Zm-18,0c-1.65,0-3-1.35-3-3v-6c0-1.65,1.35-3,3-3s3,1.35,3,3v6c0,1.65-1.35,3-3,3Z" })
                        }
                      ) }),
                      /* @__PURE__ */ jsx("span", { style: style.navigation_dash_text, children: "Dashboard" })
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxs("ul", { className: "nav-list", style: style.navigation_dash_list, children: [
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                    "span",
                    {
                      to: "/app/select_product",
                      onClick: () => {
                        navigate("/app/select_product");
                      },
                      className: "",
                      style: {
                        ...style.navigation_dash_a,
                        background: selected_menu == "/app/select_product" ? "white" : "none"
                      },
                      children: [
                        /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: "nav-icon",
                            style: style.navigation_dash_svg,
                            children: /* @__PURE__ */ jsx(
                              "svg",
                              {
                                version: "1.1",
                                id: "icon",
                                xmlns: "http://www.w3.org/2000/svg",
                                x: "0px",
                                y: "0px",
                                viewBox: "0 0 409.603 409.603",
                                class: "custom-icon",
                                children: /* @__PURE__ */ jsx("g", { children: /* @__PURE__ */ jsx("g", { children: /* @__PURE__ */ jsx(
                                  "path",
                                  {
                                    d: "M375.468,0.002h-141.87c-9.385,0-22.502,5.437-29.133,12.063L9.961,206.568c-13.281,13.266-13.281,35.016,0,48.266\n                                        l144.824,144.819c13.251,13.266,34.98,13.266,48.251-0.015L397.54,205.165c6.625-6.625,12.063-19.763,12.063-29.128V34.137\n                                        C409.603,15.367,394.237,0.002,375.468,0.002z M307.197,136.537c-18.852,0-34.135-15.299-34.135-34.135\n                                        c0-18.867,15.283-34.135,34.135-34.135c18.852,0,34.14,15.268,34.14,34.135C341.338,121.238,326.049,136.537,307.197,136.537z"
                                  }
                                ) }) })
                              }
                            )
                          }
                        ),
                        /* @__PURE__ */ jsx("span", { style: style.navigation_dash_text, children: "Select Product" })
                      ]
                    }
                  ) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                    Link,
                    {
                      to: "javascript:;",
                      style: {
                        ...style.navigation_dash_a,
                        background: selected_menu == "/app/create_pin" ? "white" : "none"
                      },
                      children: [
                        /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: "nav-icon",
                            style: style.navigation_dash_svg,
                            children: /* @__PURE__ */ jsx(
                              "svg",
                              {
                                viewBox: "0 0 14 14",
                                class: "custom-svg",
                                xmlns: "http://www.w3.org/2000/svg",
                                children: /* @__PURE__ */ jsx(
                                  "path",
                                  {
                                    "fill-rule": "evenodd",
                                    "clip-rule": "evenodd",
                                    d: "M1.25522 2.84699C1.45499 1.49858 2.6124 0.5 3.97553 0.5H10.0245C11.3876 0.5 12.545 1.49858 12.7448 2.84699L13.4055 7.30708C13.4684 7.73161 13.5 8.1602 13.5 8.58938V10.25C13.5 12.0449 12.0449 13.5 10.25 13.5H3.75C1.95507 13.5 0.5 12.0449 0.5 10.25V8.58938C0.5 8.1602 0.531575 7.73161 0.59447 7.30708L1.25522 2.84699ZM3.97553 2C3.35593 2 2.82983 2.4539 2.73903 3.06681L2.15633 7H4.63962C5.17766 7 5.65533 7.34429 5.82547 7.85472L5.98359 8.32906C6.01762 8.43114 6.11315 8.5 6.22076 8.5H7.77924C7.88685 8.5 7.98238 8.43114 8.01641 8.32906L8.17453 7.85472C8.34467 7.34429 8.82234 7 9.36038 7H11.8437L11.261 3.06681C11.1702 2.4539 10.6441 2 10.0245 2H3.97553Z",
                                    class: "svg-path"
                                  }
                                )
                              }
                            )
                          }
                        ),
                        /* @__PURE__ */ jsx("span", { style: style.navigation_dash_text, children: "Create Pin" })
                      ]
                    }
                  ) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                    Link,
                    {
                      to: "javascript:;",
                      style: {
                        ...style.navigation_dash_a,
                        background: selected_menu == "/app/preview_and_publish" ? "white" : "none"
                      },
                      children: [
                        /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: "nav-icon",
                            style: style.navigation_dash_svg,
                            children: /* @__PURE__ */ jsxs(
                              "svg",
                              {
                                viewBox: "0 0 16 12",
                                class: "custom-svg",
                                xmlns: "http://www.w3.org/2000/svg",
                                children: [
                                  /* @__PURE__ */ jsx(
                                    "path",
                                    {
                                      "fill-rule": "evenodd",
                                      "clip-rule": "evenodd",
                                      d: "M11 6C11 7.65685 9.65685 9 8 9C6.34315 9 5 7.65685 5 6C5 4.34315 6.34315 3 8 3C9.65685 3 11 4.34315 11 6ZM9.5 6C9.5 6.82843 8.82843 7.5 8 7.5C7.17157 7.5 6.5 6.82843 6.5 6C6.5 5.17157 7.17157 4.5 8 4.5C8.82843 4.5 9.5 5.17157 9.5 6Z",
                                      class: "custom-path"
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "path",
                                    {
                                      "fill-rule": "evenodd",
                                      "clip-rule": "evenodd",
                                      d: "M8 0C5.52353 0 3.65153 1.22977 2.42264 2.53216C1.80748 3.18413 1.34017 3.86704 1.02329 4.45447C0.86488 4.74811 0.739729 5.02591 0.652246 5.27169C0.571431 5.49874 0.5 5.76019 0.5 6C0.5 6.23981 0.571431 6.50126 0.652246 6.72831C0.739729 6.97409 0.86488 7.25189 1.02329 7.54553C1.34017 8.13296 1.80748 8.81587 2.42264 9.46784C3.65153 10.7702 5.52353 12 8 12C10.4765 12 12.3485 10.7702 13.5774 9.46784C14.1925 8.81587 14.6598 8.13296 14.9767 7.54553C15.1351 7.25189 15.2603 6.97409 15.3478 6.72831C15.4286 6.50126 15.5 6.23981 15.5 6C15.5 5.76019 15.4286 5.49874 15.3478 5.27169C15.2603 5.02591 15.1351 4.74811 14.9767 4.45447C14.6598 3.86704 14.1925 3.18413 13.5774 2.53216C12.3485 1.22977 10.4765 0 8 0ZM2.00141 6.00207L2.00103 6L2.00141 5.99793C2.00509 5.97812 2.01827 5.90708 2.0654 5.77469C2.12269 5.61374 2.21422 5.40618 2.34345 5.16663C2.60183 4.68764 2.9936 4.11275 3.51365 3.56159C4.55519 2.45773 6.05819 1.5 8 1.5C9.94181 1.5 11.4448 2.45773 12.4864 3.56159C13.0064 4.11275 13.3982 4.68764 13.6566 5.16663C13.7858 5.40618 13.8773 5.61374 13.9346 5.77469C13.9817 5.90708 13.9949 5.97813 13.9986 5.99793L13.999 6L13.9986 6.00207C13.9949 6.02187 13.9817 6.09292 13.9346 6.22531C13.8773 6.38626 13.7858 6.59382 13.6566 6.83337C13.3982 7.31236 13.0064 7.88725 12.4864 8.43841C11.4448 9.54227 9.94181 10.5 8 10.5C6.05819 10.5 4.55519 9.54227 3.51365 8.43841C2.9936 7.88725 2.60183 7.31236 2.34345 6.83337C2.21422 6.59382 2.12269 6.38626 2.0654 6.22531C2.01827 6.09292 2.00509 6.02188 2.00141 6.00207Z",
                                      class: "custom-path"
                                    }
                                  )
                                ]
                              }
                            )
                          }
                        ),
                        /* @__PURE__ */ jsx("span", { style: style.navigation_dash_text, children: "Preview & Publish" })
                      ]
                    }
                  ) }),
                  /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                    "span",
                    {
                      onClick: () => {
                        navigate("/app/view_pins");
                      },
                      to: "/app/view_pins",
                      className: "",
                      style: {
                        ...style.navigation_dash_a,
                        background: selected_menu == "/app/view_pins" ? "white" : "none"
                      },
                      children: [
                        /* @__PURE__ */ jsx("span", { className: "nav-icon", children: /* @__PURE__ */ jsxs(
                          "svg",
                          {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 14 14",
                            fill: "none",
                            xmlns: "http://www.w3.org/2000/svg",
                            children: [
                              /* @__PURE__ */ jsx(
                                "path",
                                {
                                  d: "M9 5C9.55229 5 10 4.55229 10 4C10 3.44772 9.55229 3 9 3C8.44772 3 8 3.44772 8 4C8 4.55229 8.44772 5 9 5Z",
                                  fill: "#4A4A4A"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                "path",
                                {
                                  "fill-rule": "evenodd",
                                  "clip-rule": "evenodd",
                                  d: "M4.41957 0.5H9.58044C10.1146 0.49999 10.5604 0.499982 10.9247 0.52974C11.3046 0.560778 11.6612 0.627889 11.9985 0.799733C12.5159 1.06339 12.9366 1.48408 13.2003 2.00153C13.3721 2.33879 13.4392 2.69545 13.4703 3.07533C13.5 3.43955 13.5 3.88538 13.5 4.41951V6.33045C13.5 6.86458 13.5 7.31045 13.4703 7.67467C13.4392 8.05456 13.3721 8.41121 13.2003 8.74848C12.9366 9.26592 12.5159 9.68662 11.9985 9.95027C11.6612 10.1221 11.3046 10.1892 10.9247 10.2203C10.8338 10.2277 10.7379 10.2333 10.6367 10.2374C10.5918 10.2458 10.546 10.25 10.5 10.25H5L4.99761 10.25H4.41955C3.88542 10.25 3.43955 10.25 3.07533 10.2203C2.69545 10.1892 2.33879 10.1221 2.00153 9.95027C1.57632 9.73361 1.21644 9.41091 0.955348 9.01561C0.872058 8.92764 0.811978 8.82151 0.779069 8.70679C0.622433 8.38185 0.559503 8.03894 0.52974 7.67467C0.499982 7.31044 0.49999 6.8646 0.5 6.33046V4.41957C0.49999 3.88542 0.499982 3.43956 0.52974 3.07533C0.560778 2.69545 0.627889 2.33879 0.799733 2.00153C1.06339 1.48408 1.48408 1.06339 2.00153 0.799733C2.33879 0.627889 2.69545 0.560778 3.07533 0.52974C3.43956 0.499982 3.88542 0.49999 4.41957 0.5ZM12 6.3C12 6.49916 11.9999 6.67553 11.9988 6.83333L11.8645 6.64147C11.2032 5.6967 9.82476 5.63876 9.08647 6.5247L8 7.82847L5.58854 4.93472C4.89232 4.09925 3.61071 4.09443 2.90823 4.92464L2 5.998V4.45C2 3.87757 2.00058 3.49336 2.02476 3.19748C2.04822 2.91036 2.0901 2.77307 2.13624 2.68251C2.25608 2.44731 2.44731 2.25608 2.68251 2.13624C2.77307 2.0901 2.91036 2.04822 3.19748 2.02476C3.49336 2.00058 3.87757 2 4.45 2H9.55C10.1224 2 10.5066 2.00058 10.8025 2.02476C11.0896 2.04822 11.2269 2.0901 11.3175 2.13624C11.5527 2.25608 11.7439 2.44731 11.8638 2.68251C11.9099 2.77307 11.9518 2.91036 11.9752 3.19748C11.9994 3.49336 12 3.87757 12 4.45V6.3Z",
                                  fill: "#4A4A4A"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                "path",
                                {
                                  d: "M1 12.75C1 12.3358 1.33579 12 1.75 12H7.25C7.66422 12 8 12.3358 8 12.75C8 13.1642 7.66422 13.5 7.25 13.5H1.75C1.33579 13.5 1 13.1642 1 12.75Z",
                                  fill: "#4A4A4A"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                "path",
                                {
                                  d: "M9.75 12C9.33579 12 9 12.3358 9 12.75C9 13.1642 9.33579 13.5 9.75 13.5H12.25C12.6642 13.5 13 13.1642 13 12.75C13 12.3358 12.6642 12 12.25 12H9.75Z",
                                  fill: "#4A4A4A"
                                }
                              )
                            ]
                          }
                        ) }),
                        /* @__PURE__ */ jsx("span", { style: style.navigation_dash_text, children: "View Pins" })
                      ]
                    }
                  ) })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "page-content",
              style: {
                paddingBottom: "60px"
              },
              children
            }
          )
        ]
      }
    )
  ] });
}
const route28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$g,
  default: Index$2
}, Symbol.toStringTag, { value: "Module" }));
function CreatePin$1() {
  var _a2, _b, _c;
  const [buttonPressed, setButtonPressed] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const new_pin_data = useSelector((state) => state.new_pin.data);
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const pinterestFetcher = useFetcher();
  const storePinFetcher = useFetcher();
  const DraftPinFetcher = useFetcher();
  const [scheduleButtonPressed, setScheduleButtonPressed] = useState(false);
  const [draftButtonPressed, setDraftButtonPressed] = useState(false);
  const SchedulePinFetcher = useFetcher();
  const [errorToastActive, setErrorToastActive] = useState(false);
  const [errorToastMsg, setErrorToastMsg] = useState("");
  const toggleErrorToastActive = useCallback(
    () => setErrorToastActive((active) => !active),
    []
  );
  const ErrorToast = errorToastActive ? /* @__PURE__ */ jsx(
    Toast,
    {
      content: errorToastMsg,
      error: true,
      onDismiss: toggleErrorToastActive,
      duration: 4500
    }
  ) : null;
  const [scheduleToastActive, setScheduleToastActive] = useState(false);
  const [scheduleToastMsg, setScheduleToastMsg] = useState("");
  const toggleScheduleToastActive = useCallback(
    () => setScheduleToastActive((active) => !active),
    []
  );
  const scheduleToast = scheduleToastActive ? /* @__PURE__ */ jsx(
    Toast,
    {
      content: scheduleToastMsg,
      onDismiss: toggleScheduleToastActive,
      duration: 4500
    }
  ) : null;
  const [selectedDates, setSelectedDates] = useState({
    start: /* @__PURE__ */ new Date(),
    end: /* @__PURE__ */ new Date()
  });
  const currentTime = moment();
  const updatedTime = currentTime.add(20, "minutes");
  const currentHour = updatedTime.format("h");
  const currentMinutes = updatedTime.format("mm");
  const currentPeriod = updatedTime.format("A");
  const [hour, setHour] = useState(currentHour);
  const [minute, setMinute] = useState(currentMinutes);
  const [meridian, setMeridian] = useState(currentPeriod);
  const [errors, setErrors] = useState({ hour: "", minute: "" });
  const handleDateChange = useCallback((value) => setSelectedDates(value), []);
  const handleHourChange = useCallback((value) => {
    const hourValue = parseInt(value, 10);
    if (!value || hourValue < 1 || hourValue > 12) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        hour: "Hour must be between 1 and 12"
      }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, hour: "" }));
    }
    setHour(value);
  }, []);
  const handleMinuteChange = useCallback((value) => {
    const minuteValue = parseInt(value, 10);
    if (!value || minuteValue < 0 || minuteValue > 59) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        minute: "Minute must be between 0 and 59"
      }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, minute: "" }));
    }
    setMinute(value);
  }, []);
  const handleMeridianChange = useCallback((value) => setMeridian(value), []);
  const meridianOptions = [
    { label: "AM", value: "AM" },
    { label: "PM", value: "PM" }
  ];
  const handleSubmit = async () => {
    setError("");
    setButtonPressed(true);
    let base64 = new_pin_data.product_image_base64.replaceAll("data:image/jpeg;base64,", "").replaceAll("data:image/png;base64,", "").replaceAll("data:text/html;base64,", "");
    let data = {
      title: new_pin_data.title,
      description: new_pin_data.description,
      board_id: new_pin_data.board_id,
      media_source: {
        source_type: "image_base64",
        content_type: "image/png",
        data: base64
      }
    };
    try {
      pinterestFetcher.submit(
        { access_key: user == null ? void 0 : user.accessToken, data: JSON.stringify(data) },
        { method: "post", action: "/api/pinterest/create_pin" }
      );
    } catch (error2) {
      console.log(error2.message);
    }
  };
  const handleSchedule = () => {
    setScheduleButtonPressed(true);
    if (errors.hour || errors.minute) {
      return;
    }
    const date = selectedDates.start;
    const scheduledTime = new Date(date);
    scheduledTime.setHours(
      meridian === "PM" && hour !== "12" ? parseInt(hour) + 12 : parseInt(hour)
    );
    scheduledTime.setMinutes(parseInt(minute));
    const delay = scheduledTime.getTime() - Date.now();
    let data = {
      pin_data: new_pin_data,
      shopifyShopId: user == null ? void 0 : user.shopifyShopId
    };
    if (!delay) {
      setErrorToastActive(true);
      shopify2.toast.show("Please select the right time!");
      return false;
    }
    if (delay < 0) {
      shopify2.toast.show("Please select the right time!");
      return false;
    }
    SchedulePinFetcher.submit(
      {
        access_key: user == null ? void 0 : user.accessToken,
        data: JSON.stringify(data),
        delay
      },
      { method: "post", action: "/api/pinterest/schedule_pin" }
    );
    shopify2.modal.hide("schedule-modal");
  };
  useEffect(() => {
    var _a3;
    if (SchedulePinFetcher == null ? void 0 : SchedulePinFetcher.data) {
      setScheduleButtonPressed(false);
    }
    if ((_a3 = SchedulePinFetcher == null ? void 0 : SchedulePinFetcher.data) == null ? void 0 : _a3.jobID) {
      shopify2.toast.show("Pin Scheduled Successfully!");
      shopify2.modal.hide("schedule-modal");
      dispatch(
        setData({
          title: "",
          description: "",
          destination_url: "",
          board_id: null,
          style: {
            text_scaleX: 1,
            text_scaleY: 1,
            text_x: 10,
            text_y: 10,
            text: "Title..",
            text_font_size: 20,
            text_font_family: "Arial",
            text_color: "#000000",
            text_align: "center",
            text_wieght: "bold",
            text_italic: "normal",
            text_underline: "none",
            rect_bg: "#d3d3d3"
          },
          edited_pin_base64: null
        })
      );
      navigate("/app");
    }
  }, [SchedulePinFetcher.data]);
  const handleSaveToDraft = () => {
    var _a3, _b2, _c2, _d;
    setDraftButtonPressed(true);
    DraftPinFetcher.submit(
      {
        shopifyShopId: user == null ? void 0 : user.shopifyShopId,
        product_id: (_b2 = (_a3 = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _a3.node) == null ? void 0 : _b2.id,
        product_title: (_d = (_c2 = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _c2.node) == null ? void 0 : _d.title,
        status: "draft",
        pinterestJson: JSON.stringify({}),
        productEditJson: JSON.stringify(new_pin_data)
      },
      { method: "post", action: "/data/pins/save_draft" }
    );
  };
  useEffect(() => {
    var _a3;
    if (DraftPinFetcher == null ? void 0 : DraftPinFetcher.data) {
      setDraftButtonPressed(false);
    }
    if ((_a3 = DraftPinFetcher == null ? void 0 : DraftPinFetcher.data) == null ? void 0 : _a3.id) {
      dispatch(
        setData({
          title: "",
          description: "",
          destination_url: "",
          board_id: null,
          style: {
            text_scaleX: 1,
            text_scaleY: 1,
            text_x: 10,
            text_y: 10,
            text: "Title..",
            text_font_size: 20,
            text_font_family: "Arial",
            text_color: "#000000",
            text_align: "center",
            text_wieght: "bold",
            text_italic: "normal",
            text_underline: "none",
            rect_bg: "#d3d3d3"
          },
          edited_pin_base64: null
        })
      );
      navigate("/app");
    }
  }, [DraftPinFetcher.data]);
  useEffect(() => {
    var _a3, _b2, _c2, _d, _e, _f;
    console.log(pinterestFetcher == null ? void 0 : pinterestFetcher.data, "data===>");
    if (((_a3 = pinterestFetcher == null ? void 0 : pinterestFetcher.data) == null ? void 0 : _a3.status) !== 200) {
      setError((_b2 = pinterestFetcher == null ? void 0 : pinterestFetcher.data) == null ? void 0 : _b2.message);
      setButtonPressed(false);
    }
    setButtonPressed(false);
    if ((_c2 = pinterestFetcher == null ? void 0 : pinterestFetcher.data) == null ? void 0 : _c2.id) {
      storePinFetcher.submit(
        {
          shopifyShopId: user == null ? void 0 : user.shopifyShopId,
          product_id: (_d = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _d.id,
          pinterestJson: JSON.stringify(pinterestFetcher == null ? void 0 : pinterestFetcher.data),
          product_title: (_f = (_e = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _e.node) == null ? void 0 : _f.title,
          status: "published",
          productEditJson: JSON.stringify(new_pin_data)
        },
        { method: "post", action: "/data/pins/create" }
      );
    }
  }, [pinterestFetcher.data]);
  useEffect(() => {
    var _a3;
    if ((_a3 = storePinFetcher == null ? void 0 : storePinFetcher.data) == null ? void 0 : _a3.id) {
      shopify2.toast.show("Pin Created successfully!");
      dispatch(
        setData({
          title: "",
          description: "",
          destination_url: "",
          board_id: null,
          style: {
            text_scaleX: 1,
            text_scaleY: 1,
            text_x: 10,
            text_y: 10,
            text: "Title..",
            text_font_size: 20,
            text_font_family: "Arial",
            text_color: "#000000",
            text_align: "center",
            text_wieght: "bold",
            text_italic: "normal",
            text_underline: "none",
            rect_bg: "#d3d3d3"
          },
          edited_pin_base64: null
        })
      );
      navigate("/app/view_pins");
    }
  }, [storePinFetcher.data]);
  const shopify2 = useAppBridge();
  return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsxs(
      Page,
      {
        style: { display: "block" },
        title: "Preview & Publish",
        subtitle: "Review your pin and publish it directly to Pinterest with a single click.",
        compactTitle: true,
        children: [
          scheduleToast,
          ErrorToast,
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsxs("div", { style: { padding: "1.5rem", paddingRight: "0px" }, children: [
              /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    width: "100%",
                    display: "flex",
                    overflow: "hidden"
                  },
                  children: [
                    new_pin_data.edited_pin_base64 == null ? /* @__PURE__ */ jsxs(
                      "div",
                      {
                        style: {
                          background: "#E6E1D2",
                          padding: "30px",
                          width: "20%",
                          height: "400px"
                        },
                        children: [
                          /* @__PURE__ */ jsx(
                            "div",
                            {
                              style: {
                                width: "100%",
                                height: "100px",
                                background: "#C0B5B3",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              },
                              children: /* @__PURE__ */ jsx(Text, { as: "h1", variant: "heading2xl", fontWeight: "bold", children: "Title" })
                            }
                          ),
                          /* @__PURE__ */ jsx("div", { style: { width: "100%" }, children: /* @__PURE__ */ jsx(
                            "img",
                            {
                              style: { width: "100%", height: "100%" },
                              src: (_c = (_b = (_a2 = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _a2.node) == null ? void 0 : _b.featuredImage) == null ? void 0 : _c.url
                            }
                          ) })
                        ]
                      }
                    ) : /* @__PURE__ */ jsx(
                      "div",
                      {
                        style: {
                          width: "40%"
                        },
                        children: /* @__PURE__ */ jsx(
                          "img",
                          {
                            src: new_pin_data.edited_pin_base64,
                            style: { width: "100%" }
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { style: { width: "60%", padding: "20px" }, children: [
                      /* @__PURE__ */ jsxs(
                        "svg",
                        {
                          style: { width: "100%", display: "none" },
                          width: "353",
                          height: "40",
                          viewBox: "0 0 353 40",
                          fill: "none",
                          xmlns: "http://www.w3.org/2000/svg",
                          children: [
                            /* @__PURE__ */ jsx(
                              "path",
                              {
                                d: "M14.4998 21.3333C15.2332 21.3333 15.8332 21.9333 15.8332 22.6667V26.6667C15.8332 27.4 15.2332 28 14.4998 28H2.49984C1.7665 28 1.1665 27.4 1.1665 26.6667V22.6667C1.1665 21.9333 1.7665 21.3333 2.49984 21.3333C3.23317 21.3333 3.83317 21.9333 3.83317 22.6667V25.3333H13.1665V22.6667C13.1665 21.9333 13.7665 21.3333 14.4998 21.3333ZM6.37984 17.8933C5.85984 18.4133 5.01317 18.42 4.49317 17.8933C3.97317 17.3733 3.9665 16.5333 4.4865 16.0133L8.49317 12L12.5065 16.0067C13.0265 16.5267 13.0332 17.3733 12.5132 17.8933C11.9932 18.4133 11.1465 18.42 10.6265 17.8933L9.8265 17.1V21.22C9.8265 21.5736 9.68603 21.9128 9.43598 22.1628C9.18593 22.4129 8.84679 22.5533 8.49317 22.5533C8.13955 22.5533 7.80041 22.4129 7.55036 22.1628C7.30031 21.9128 7.15984 21.5736 7.15984 21.22V17.1067L6.37984 17.8933Z",
                                fill: "#111111"
                              }
                            ),
                            /* @__PURE__ */ jsx("g", { "clip-path": "url(#clip0_1_3587)", children: /* @__PURE__ */ jsx(
                              "path",
                              {
                                d: "M44.5 18C43.3933 18 42.5 18.8933 42.5 20C42.5 21.1067 43.3933 22 44.5 22C45.6067 22 46.5 21.1067 46.5 20C46.5 18.8933 45.6067 18 44.5 18ZM38.5 18C39.6067 18 40.5 18.8933 40.5 20C40.5 21.1067 39.6067 22 38.5 22C37.3933 22 36.5 21.1067 36.5 20C36.5 18.8933 37.3933 18 38.5 18ZM50.5 18C51.6067 18 52.5 18.8933 52.5 20C52.5 21.1067 51.6067 22 50.5 22C49.3933 22 48.5 21.1067 48.5 20C48.5 18.8933 49.3933 18 50.5 18Z",
                                fill: "#111111"
                              }
                            ) }),
                            /* @__PURE__ */ jsx(
                              "path",
                              {
                                d: "M184.96 22.2734V20.6484H187.96C188.684 20.6484 189.247 20.4635 189.648 20.0938C190.049 19.7188 190.249 19.1927 190.249 18.5156V18.5C190.249 17.8177 190.049 17.2917 189.648 16.9219C189.247 16.5521 188.684 16.3672 187.96 16.3672H184.96V14.7266H188.452C189.218 14.7266 189.887 14.8828 190.46 15.1953C191.033 15.5078 191.481 15.9479 191.804 16.5156C192.127 17.0781 192.288 17.737 192.288 18.4922V18.5078C192.288 19.2578 192.127 19.9167 191.804 20.4844C191.481 21.0469 191.033 21.487 190.46 21.8047C189.887 22.1172 189.218 22.2734 188.452 22.2734H184.96ZM183.952 26V14.7266H185.968V26H183.952ZM194.07 26V14.1562H196.015V18.7734H196.148C196.351 18.3099 196.659 17.9479 197.07 17.6875C197.481 17.4271 197.994 17.2969 198.609 17.2969C199.244 17.2969 199.781 17.4219 200.218 17.6719C200.656 17.9167 200.987 18.276 201.211 18.75C201.44 19.224 201.554 19.7995 201.554 20.4766V26H199.609V20.9297C199.609 20.263 199.468 19.763 199.187 19.4297C198.911 19.0964 198.479 18.9297 197.89 18.9297C197.505 18.9297 197.172 19.0156 196.89 19.1875C196.609 19.3594 196.393 19.6016 196.242 19.9141C196.091 20.2266 196.015 20.5964 196.015 21.0234V26H194.07ZM207.219 26.1719C206.37 26.1719 205.638 25.9948 205.023 25.6406C204.409 25.2812 203.935 24.7708 203.602 24.1094C203.273 23.4479 203.109 22.6562 203.109 21.7344V21.7188C203.109 20.8073 203.276 20.0208 203.609 19.3594C203.943 18.6927 204.414 18.1823 205.023 17.8281C205.638 17.474 206.37 17.2969 207.219 17.2969C208.068 17.2969 208.797 17.474 209.406 17.8281C210.021 18.1823 210.495 18.6901 210.828 19.3516C211.161 20.013 211.328 20.8021 211.328 21.7188V21.7344C211.328 22.6562 211.161 23.4479 210.828 24.1094C210.5 24.7708 210.029 25.2812 209.414 25.6406C208.805 25.9948 208.073 26.1719 207.219 26.1719ZM207.219 24.5938C207.667 24.5938 208.047 24.4818 208.359 24.2578C208.677 24.0286 208.919 23.7031 209.086 23.2812C209.253 22.8542 209.336 22.3411 209.336 21.7422V21.7266C209.336 21.1224 209.253 20.6094 209.086 20.1875C208.919 19.7604 208.677 19.4349 208.359 19.2109C208.047 18.9818 207.667 18.8672 207.219 18.8672C206.771 18.8672 206.388 18.9818 206.07 19.2109C205.753 19.4349 205.51 19.7604 205.344 20.1875C205.177 20.6094 205.094 21.1224 205.094 21.7266V21.7422C205.094 22.3411 205.177 22.8542 205.344 23.2812C205.51 23.7083 205.75 24.0339 206.062 24.2578C206.38 24.4818 206.766 24.5938 207.219 24.5938ZM216.321 26.0391C215.341 26.0391 214.636 25.8594 214.203 25.5C213.771 25.1406 213.555 24.5521 213.555 23.7344V18.9688H212.227V17.4609H213.555V15.3672H215.532V17.4609H217.328V18.9688H215.532V23.2734C215.532 23.6953 215.62 24.0052 215.797 24.2031C215.979 24.3958 216.271 24.4922 216.672 24.4922C216.813 24.4922 216.927 24.4896 217.016 24.4844C217.11 24.474 217.214 24.4635 217.328 24.4531V25.9531C217.193 25.9792 217.037 26 216.86 26.0156C216.688 26.0312 216.508 26.0391 216.321 26.0391ZM222.563 26.1719C221.714 26.1719 220.982 25.9948 220.368 25.6406C219.753 25.2812 219.279 24.7708 218.946 24.1094C218.618 23.4479 218.454 22.6562 218.454 21.7344V21.7188C218.454 20.8073 218.62 20.0208 218.954 19.3594C219.287 18.6927 219.758 18.1823 220.368 17.8281C220.982 17.474 221.714 17.2969 222.563 17.2969C223.412 17.2969 224.141 17.474 224.751 17.8281C225.365 18.1823 225.839 18.6901 226.173 19.3516C226.506 20.013 226.673 20.8021 226.673 21.7188V21.7344C226.673 22.6562 226.506 23.4479 226.173 24.1094C225.844 24.7708 225.373 25.2812 224.758 25.6406C224.149 25.9948 223.417 26.1719 222.563 26.1719ZM222.563 24.5938C223.011 24.5938 223.391 24.4818 223.704 24.2578C224.021 24.0286 224.264 23.7031 224.43 23.2812C224.597 22.8542 224.68 22.3411 224.68 21.7422V21.7266C224.68 21.1224 224.597 20.6094 224.43 20.1875C224.264 19.7604 224.021 19.4349 223.704 19.2109C223.391 18.9818 223.011 18.8672 222.563 18.8672C222.115 18.8672 221.732 18.9818 221.415 19.2109C221.097 19.4349 220.855 19.7604 220.688 20.1875C220.521 20.6094 220.438 21.1224 220.438 21.7266V21.7422C220.438 22.3411 220.521 22.8542 220.688 23.2812C220.855 23.7083 221.094 24.0339 221.407 24.2578C221.725 24.4818 222.11 24.5938 222.563 24.5938Z",
                                fill: "#5F5F5F"
                              }
                            ),
                            /* @__PURE__ */ jsx("g", { "clip-path": "url(#clip1_1_3587)", children: /* @__PURE__ */ jsx(
                              "path",
                              {
                                d: "M241.5 23.75L235.83 18.145C235.39 17.715 235.39 17.01 235.83 16.575C236.27 16.14 236.98 16.14 237.42 16.575L241.5 20.605L245.58 16.575C246.02 16.14 246.73 16.14 247.17 16.575C247.61 17.01 247.61 17.715 247.17 18.145L241.5 23.75Z",
                                fill: "#5F5F5F"
                              }
                            ) }),
                            /* @__PURE__ */ jsx(
                              "rect",
                              {
                                x: "283.5",
                                y: "4",
                                width: "69",
                                height: "32",
                                rx: "16",
                                fill: "#E60023"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "path",
                              {
                                d: "M304.964 26.2812C304.089 26.2812 303.329 26.1458 302.683 25.875C302.042 25.6042 301.537 25.2266 301.167 24.7422C300.798 24.2578 300.589 23.6927 300.542 23.0469L300.535 22.9375H302.488L302.496 23.0156C302.527 23.3333 302.652 23.6094 302.871 23.8438C303.095 24.0781 303.391 24.263 303.761 24.3984C304.131 24.5286 304.553 24.5938 305.027 24.5938C305.48 24.5938 305.881 24.5234 306.23 24.3828C306.579 24.2422 306.852 24.0495 307.05 23.8047C307.248 23.5547 307.347 23.2682 307.347 22.9453V22.9375C307.347 22.5312 307.188 22.2005 306.871 21.9453C306.553 21.6849 306.029 21.4766 305.3 21.3203L304.089 21.0703C302.933 20.8255 302.092 20.4349 301.566 19.8984C301.045 19.3568 300.785 18.6667 300.785 17.8281V17.8203C300.785 17.1484 300.962 16.5599 301.316 16.0547C301.675 15.5495 302.167 15.1562 302.792 14.875C303.423 14.5885 304.144 14.4453 304.957 14.4453C305.79 14.4453 306.511 14.5859 307.121 14.8672C307.73 15.1432 308.209 15.5208 308.558 16C308.907 16.4792 309.102 17.0208 309.144 17.625L309.152 17.7266H307.23L307.214 17.6328C307.167 17.3359 307.045 17.0781 306.847 16.8594C306.654 16.6354 306.397 16.4583 306.074 16.3281C305.751 16.1979 305.373 16.1328 304.941 16.1328C304.529 16.1328 304.162 16.1979 303.839 16.3281C303.516 16.4531 303.261 16.6302 303.074 16.8594C302.891 17.0885 302.8 17.3646 302.8 17.6875V17.6953C302.8 18.0911 302.954 18.4193 303.261 18.6797C303.574 18.9401 304.082 19.1432 304.785 19.2891L305.996 19.5469C306.787 19.7135 307.431 19.9349 307.925 20.2109C308.42 20.487 308.782 20.8307 309.011 21.2422C309.246 21.6484 309.363 22.138 309.363 22.7109V22.7188C309.363 23.4479 309.183 24.0781 308.824 24.6094C308.47 25.1406 307.962 25.5521 307.3 25.8438C306.644 26.1354 305.865 26.2812 304.964 26.2812ZM313.355 26.1406C312.819 26.1406 312.337 26.0365 311.91 25.8281C311.488 25.6198 311.155 25.3255 310.91 24.9453C310.67 24.5599 310.551 24.1068 310.551 23.5859V23.5703C310.551 23.0651 310.676 22.6302 310.926 22.2656C311.176 21.8958 311.543 21.6068 312.027 21.3984C312.512 21.1901 313.1 21.0677 313.793 21.0312L316.949 20.8359V22.1172L314.066 22.3047C313.519 22.3359 313.116 22.4505 312.855 22.6484C312.595 22.8464 312.465 23.1224 312.465 23.4766V23.4922C312.465 23.8568 312.603 24.1406 312.879 24.3438C313.16 24.5469 313.517 24.6484 313.949 24.6484C314.34 24.6484 314.689 24.5703 314.996 24.4141C315.303 24.2578 315.545 24.0469 315.722 23.7812C315.9 23.5104 315.988 23.2057 315.988 22.8672V20.1641C315.988 19.737 315.853 19.4115 315.582 19.1875C315.311 18.9583 314.91 18.8438 314.379 18.8438C313.936 18.8438 313.574 18.9219 313.293 19.0781C313.012 19.2292 312.821 19.4453 312.722 19.7266L312.715 19.7578H310.879L310.887 19.6875C310.949 19.2083 311.137 18.7891 311.449 18.4297C311.762 18.0703 312.176 17.7917 312.691 17.5938C313.207 17.3958 313.801 17.2969 314.472 17.2969C315.212 17.2969 315.837 17.4115 316.347 17.6406C316.858 17.8646 317.246 18.1927 317.512 18.625C317.777 19.0521 317.91 19.5651 317.91 20.1641V26H315.988V24.8281H315.855C315.699 25.099 315.496 25.3333 315.246 25.5312C315.001 25.7292 314.72 25.8802 314.402 25.9844C314.084 26.0885 313.736 26.1406 313.355 26.1406ZM321.957 26L318.918 17.4609H320.996L322.965 24.1016H323.106L325.067 17.4609H327.113L324.082 26H321.957ZM331.747 26.1719C330.898 26.1719 330.168 25.9922 329.559 25.6328C328.955 25.2734 328.489 24.763 328.161 24.1016C327.833 23.4401 327.668 22.6562 327.668 21.75V21.7422C327.668 20.8464 327.83 20.0651 328.153 19.3984C328.481 18.7318 328.944 18.2161 329.543 17.8516C330.142 17.4818 330.846 17.2969 331.653 17.2969C332.465 17.2969 333.163 17.4766 333.747 17.8359C334.335 18.1901 334.788 18.6875 335.106 19.3281C335.424 19.9688 335.583 20.7188 335.583 21.5781V22.2188H328.645V20.9141H334.629L333.708 22.1328V21.3594C333.708 20.7917 333.622 20.3203 333.45 19.9453C333.278 19.5703 333.038 19.2891 332.731 19.1016C332.429 18.9141 332.077 18.8203 331.676 18.8203C331.275 18.8203 330.918 18.9193 330.606 19.1172C330.299 19.3099 330.054 19.5964 329.872 19.9766C329.694 20.3516 329.606 20.8125 329.606 21.3594V22.1406C329.606 22.6667 329.694 23.1172 329.872 23.4922C330.049 23.862 330.299 24.1484 330.622 24.3516C330.95 24.5495 331.338 24.6484 331.786 24.6484C332.135 24.6484 332.434 24.599 332.684 24.5C332.939 24.3958 333.145 24.2734 333.301 24.1328C333.458 23.987 333.567 23.849 333.629 23.7188L333.653 23.6641H335.497L335.481 23.7344C335.413 24.0104 335.288 24.2917 335.106 24.5781C334.929 24.8594 334.687 25.1224 334.379 25.3672C334.077 25.6068 333.708 25.8021 333.27 25.9531C332.833 26.099 332.325 26.1719 331.747 26.1719Z",
                                fill: "white"
                              }
                            ),
                            /* @__PURE__ */ jsxs("defs", { children: [
                              /* @__PURE__ */ jsx("clipPath", { id: "clip0_1_3587", children: /* @__PURE__ */ jsx(
                                "rect",
                                {
                                  width: "16",
                                  height: "16",
                                  fill: "white",
                                  transform: "translate(36.5 12)"
                                }
                              ) }),
                              /* @__PURE__ */ jsx("clipPath", { id: "clip1_1_3587", children: /* @__PURE__ */ jsx(
                                "rect",
                                {
                                  width: "12",
                                  height: "12",
                                  fill: "white",
                                  transform: "translate(235.5 14)"
                                }
                              ) })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
                          "span",
                          {
                            style: {
                              fontSize: "11px",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              width: "80%",
                              display: "block",
                              textDecoration: "underline"
                            },
                            children: new_pin_data.destination_url
                          }
                        ) }),
                        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
                          "h3",
                          {
                            style: {
                              fontSize: "30px",
                              fontWeight: "500",
                              fontFamily: "Inter",
                              marginTop: "15px",
                              marginBottom: "20px",
                              color: "#000000"
                            },
                            children: new_pin_data.title
                          }
                        ) }),
                        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("h3", { children: new_pin_data.description }) })
                      ] })
                    ] })
                  ]
                }
              ),
              error && /* @__PURE__ */ jsx("span", { style: { color: "red" }, children: error })
            ] }),
            /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  marginTop: "30px",
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center"
                },
                children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      to: "select_product",
                      style: {
                        ...styles$6.theme_button_light,
                        border: "1px solid #d82c16"
                      },
                      type: "button",
                      onClick: () => {
                        navigate("/app/create_pin");
                      },
                      children: "Back to edit"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      to: "select_product",
                      style: {
                        ...styles$6.theme_button_light,
                        border: "1px solid #d82c16"
                      },
                      type: "button",
                      onClick: () => {
                        handleSaveToDraft();
                      },
                      loading: draftButtonPressed,
                      children: "Save to draft"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      to: "select_product",
                      style: {
                        ...styles$6.theme_button_light,
                        border: "1px solid #d82c16"
                      },
                      type: "button",
                      onClick: () => {
                        shopify2.modal.show("schedule-modal");
                      },
                      children: "Schedule"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      to: "select_product",
                      style: {
                        ...styles$6.theme_button,
                        background: buttonPressed ? "gray" : "rgba(215, 44, 13, 1)"
                      },
                      loading: buttonPressed,
                      type: "button",
                      onClick: () => {
                        handleSubmit();
                      },
                      children: "Public Pin"
                    }
                  )
                ]
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(Modal, { id: "schedule-modal", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          style: {
            padding: "20px"
          },
          children: [
            /* @__PURE__ */ jsx(
              DatePicker,
              {
                month: selectedDates.start.getMonth(),
                year: selectedDates.start.getFullYear(),
                onChange: handleDateChange,
                selected: selectedDates,
                allowRange: false
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "16px",
                  marginTop: "16px",
                  justifyContent: "center"
                },
                children: [
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Hour",
                      type: "number",
                      value: hour,
                      onChange: handleHourChange,
                      min: 1,
                      max: 12,
                      error: errors.hour,
                      autoComplete: "off",
                      defaultValue: "1"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TextField,
                    {
                      label: "Minute",
                      type: "number",
                      value: minute,
                      onChange: handleMinuteChange,
                      min: 0,
                      max: 59,
                      error: errors.minute,
                      autoComplete: "off",
                      defaultValue: "00"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Select,
                    {
                      label: "AM/PM",
                      options: meridianOptions,
                      onChange: handleMeridianChange,
                      value: meridian
                    }
                  )
                ]
              }
            ),
            (errors.hour || errors.minute) && /* @__PURE__ */ jsxs(Banner, { title: "Validation Error", status: "critical", children: [
              /* @__PURE__ */ jsx("p", { children: "Please fix the following errors:" }),
              errors.hour && /* @__PURE__ */ jsx("p", { children: errors.hour }),
              errors.minute && /* @__PURE__ */ jsx("p", { children: errors.minute })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(TitleBar, { title: "Schedule Pin", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            variant: "primary",
            onClick: () => {
              handleSchedule();
            },
            loading: scheduleButtonPressed,
            children: "Submit"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              shopify2.modal.hide("schedule-modal");
            },
            children: "Cancel"
          }
        )
      ] })
    ] })
  ] }) });
}
function select_product$4() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(CreatePin$1, {}) });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: select_product$4
}, Symbol.toStringTag, { value: "Module" }));
const books = {
  highTower: "DAGdwmW9UAs"
};
const generatePrompt = (collection2, age, hairType, faceType, gender) => {
  switch (collection2) {
    case "highTower":
      return {
        prompt: `This ${age} year old ${gender} who has ${hairType} hair, ${faceType} face, wearing wizarding robes and a wizards hat, standing outside of hogwarts, smiling`,
        coverImageId: "5536c269-1ace-4d04-b48c-29839d5b09a2",
        imageId: "2afa8838-226d-4e55-a72f-30c2cb8d2561"
      };
    default:
      return ``;
  }
};
const action$f = async ({ request }) => {
  var _a2;
  try {
    const req = await request.json();
    const {
      firstName,
      lastName,
      age,
      hairType,
      faceType,
      uploadImage,
      gender
    } = req;
    if (!uploadImage) {
      return new Response(
        JSON.stringify(
          { status: "error", message: "Image is required" },
          { status: 400 }
        )
      );
    }
    if (!firstName || !lastName || !age || !hairType || !faceType || !gender)
      return new Response(
        JSON.stringify({ status: "error", message: "All fields are required" }),
        { status: 400 }
      );
    const res = await uploadInitImage(uploadImage);
    const payload = generatePrompt(
      "highTower",
      age,
      hairType,
      faceType,
      gender
    );
    const result = await generateAiImage({ ...payload, id: res.id });
    const jobId = await createAssetUploadJob((_a2 = result == null ? void 0 : result.generated_images[0]) == null ? void 0 : _a2.url);
    const assetId = await getAssetUploadJob(jobId);
    const autoFillJonID = await createAutoFillJob(
      books[collection],
      {
        f_name: {
          type: "text",
          text: firstName
        },
        page1_image: {
          type: "image",
          image: assetId
        }
      },
      `${fname} - preview`
    );
    const designId = await getAutoFillJobStatus(autoFillJonID);
    const exportJobId = await createDesignExport(designId);
    const url = await getDesignExportStatus(exportJobId);
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Image generated successfully",
        url
      })
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
};
async function generateAiImage(data) {
  var _a2, _b, _c;
  console.log(data, "data");
  try {
    const url = "https://cloud.leonardo.ai/api/rest/v1/generations";
    const apiKey = "16f80776-44a1-4023-85d4-dd083cc06415";
    const authorization = `Bearer ${apiKey}`;
    const initHeaders = {
      accept: "application/json",
      "content-type": "application/json",
      authorization
    };
    const body = {
      height: 720,
      modelId: "2067ae52-33fd-4a82-bb92-c2c55e7d2786",
      prompt: data == null ? void 0 : data.prompt,
      width: 1280,
      num_images: 1,
      init_image_id: data == null ? void 0 : data.imageId,
      init_strength: 0.3,
      contrast: 3.5,
      controlnets: [
        {
          preprocessorId: 67,
          initImageType: "UPLOADED",
          initImageId: data == null ? void 0 : data.coverImageId,
          strengthType: "High"
          //data?.cover?.coverImageStrength
        },
        {
          preprocessorId: 133,
          initImageType: "UPLOADED",
          initImageId: data == null ? void 0 : data.id,
          strengthType: "High"
        }
      ]
    };
    const generateImage = await fetch(url, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify(body)
    });
    const aiImage = await generateImage.json();
    console.log(aiImage, "aiImage");
    let maxAttempt = 5;
    let flag = false;
    while (maxAttempt > 0 && flag === false) {
      maxAttempt -= 1;
      const getImage = await fetch(
        url + "/" + ((_a2 = aiImage == null ? void 0 : aiImage.sdGenerationJob) == null ? void 0 : _a2.generationId),
        {
          method: "GET",
          headers: initHeaders
        }
      );
      const responseImage = await getImage.json();
      await new Promise((resolve) => setTimeout(resolve, 1e4));
      if (((_c = (_b = responseImage == null ? void 0 : responseImage.generations_by_pk) == null ? void 0 : _b.generated_images) == null ? void 0 : _c.length) > 0) {
        flag = true;
        return responseImage == null ? void 0 : responseImage.generations_by_pk;
      }
    }
  } catch (error) {
    console.log(error.message);
    console.error(error);
  }
}
async function uploadInitImage(image) {
  const match = image.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return json({ error: "Invalid Data URL" }, { status: 400 });
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const binaryData = atob(base64Data);
  const arrayBuffer = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    arrayBuffer[i] = binaryData.charCodeAt(i);
  }
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const file = new File([blob], "image.png", { type: mimeType });
  const req = await fetch("https://cloud.leonardo.ai/api/rest/v1/init-image", {
    method: "POST",
    headers: {
      Authorization: "Bearer 16f80776-44a1-4023-85d4-dd083cc06415",
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      extension: mimeType.split("/").pop()
    })
  });
  const res = await req.json();
  const fields = JSON.parse(res.uploadInitImage.fields);
  const form2 = new FormData();
  for (const key in fields) {
    form2.append(key, fields[key]);
  }
  form2.append("file", file);
  const upload_req = await fetch(res.uploadInitImage.url, {
    method: "POST",
    body: form2
  });
  await upload_req.text();
  return {
    image: "https://cdn.leonardo.ai/" + res.uploadInitImage.key,
    id: res.uploadInitImage.id
  };
}
const createDesignExport = async (designId) => {
  var _a2;
  const TOKEN = await getValidAccessToken();
  try {
    const response = await fetch("https://api.canva.com/rest/v1/exports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        design_id: designId,
        format: {
          type: "pdf",
          size: "a4",
          pages: [1]
          // export_quality: "pro",
        }
      })
    });
    const data = await response.json();
    return (_a2 = data == null ? void 0 : data.job) == null ? void 0 : _a2.id;
  } catch (error) {
    console.log(error);
    throw new ApiError(
      error.response.status,
      `Failed to create design export: ${error.message}`
    );
  }
};
const createAutoFillJob = async (brandTemplateId, payloadData, title) => {
  const TOKEN = await getValidAccessToken();
  try {
    const response = await fetch("https://api.canva.com/rest/v1/autofills", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        brand_template_id: brandTemplateId,
        title,
        // Modify if needed
        data: payloadData
      })
    });
    if (!response.ok) {
      console.log("Error creating autofill job:", response);
      throw new ApiError(
        response.status,
        `Failed to create autofill job: ${response.statusText}`
      );
    }
    const { job } = await response.json();
    if (job && job.id) {
      return job.id;
    } else {
      throw new ApiError(400, "Job ID not found in the response");
    }
  } catch (error) {
    console.error("Error creating autofill job:", error);
    throw new ApiError(500, `Internal Server Error: ${error.message}`);
  }
};
const getAutoFillJobStatus = async (jobId) => {
  var _a2, _b;
  const TOKEN = await getValidAccessToken();
  try {
    let status = "in_progress";
    let designId = null;
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 1e3;
    while (status === "in_progress" && attempts < maxAttempts) {
      const response = await fetch(
        `https://api.canva.com/rest/v1/autofills/${jobId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${TOKEN}`
          }
        }
      );
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `Failed to fetch autofill job status: ${response.statusText}`
        );
      }
      const data = await response.json();
      if (data && data.job) {
        status = data.job.status;
        if (status === "success") {
          designId = (_b = (_a2 = data.job.result) == null ? void 0 : _a2.design) == null ? void 0 : _b.id;
          if (designId) {
            return designId;
          } else {
            throw new ApiError(
              400,
              "Design ID not found in the job status response"
            );
          }
        } else if (status === "failed") {
          throw new ApiError(400, "Autofill job failed");
        }
      } else {
        throw new ApiError(400, "Job not found in the response");
      }
      attempts++;
      console.log(`Attempt ${attempts}: Job still in progress...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (status === "in_progress") {
      throw new ApiError(408, "Job did not complete within the expected time");
    }
  } catch (error) {
    console.error("Error getting autofill job status:", error);
    throw new ApiError(500, `Internal Server Error: ${error.message}`);
  }
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$f,
  createAutoFillJob,
  getAutoFillJobStatus
}, Symbol.toStringTag, { value: "Module" }));
const action$e = async ({ request }) => {
  try {
    const body = await request.formData();
    const access_key = body.get("access_key") || request.headers.get("access_key");
    console.log("host", process.env.PINTEREST_API_HOST);
    const response = await axios.get(process.env.PINTEREST_API_HOST + "/boards", {
      headers: {
        Authorization: `Bearer ${access_key}`,
        // Pinterest access token
        "Content-Type": "application/json"
      }
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 401) {
        }
      }
    });
    return json$1(response == null ? void 0 : response.data);
  } catch (error) {
    return json$1(error.message);
  }
};
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$e
}, Symbol.toStringTag, { value: "Module" }));
const action$d = async ({ request }) => {
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const product_id = body.get("product_id");
  const product_title = body.get("product_title");
  const status = body.get("status");
  const productEditJson = body.get("productEditJson");
  const pinterestJson = body.get("pinterestJson");
  let pin = await prisma.PinterestProductPins.create({
    data: {
      shopifyShopId,
      product_id,
      product_title,
      productEditJson,
      pinterestJson,
      status
    }
  });
  return json$1(pin);
};
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$d
}, Symbol.toStringTag, { value: "Module" }));
const action$c = async ({ request }) => {
  try {
    const body = await request.formData();
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
    const response = await axios.post(
      process.env.PINTEREST_API_HOST + "/oauth/token",
      urlencoded.toString(),
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    ).catch((error) => {
      console.log("error.response", error.response);
      return error.response;
    });
    return json$1(response == null ? void 0 : response.data);
  } catch (error) {
    return json$1(error.message);
  }
};
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c
}, Symbol.toStringTag, { value: "Module" }));
function SelectProduct() {
  const [loading, setLoading] = useState(true);
  const [buttonPressed, setButtonPressed] = useState(false);
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const new_pin_data = useSelector((state) => {
    var _a2;
    return (_a2 = state.new_pin) == null ? void 0 : _a2.data;
  });
  const dispatch = useDispatch();
  const deselectedOptions = useMemo(
    () => [
      { value: "rustic", label: "Rustic" },
      { value: "antique", label: "Antique" },
      { value: "vinyl", label: "Vinyl" },
      { value: "vintage", label: "Vintage" },
      { value: "refurbished", label: "Refurbished" }
    ],
    []
  );
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showError, setShowError] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [prevCursor, setPrevCursor] = useState(null);
  useEffect(() => {
    dispatch(
      setData({
        title: "",
        description: "",
        destination_url: "",
        board_id: null,
        style: {
          text_scaleX: 1,
          text_scaleY: 1,
          text_x: 10,
          text_y: 10,
          text: "Title..",
          text_font_size: 20,
          text_font_family: "Arial",
          text_color: "#000000",
          text_align: "center",
          text_wieght: "bold",
          text_italic: "normal",
          text_underline: "none",
          rect_bg: "#d3d3d3"
        },
        edited_pin_base64: null
      })
    );
  }, []);
  const handleSearch = (cursor = null, direction = "next") => {
    const searchTerm = inputValue;
    const query = `
      query getProducts($first: Int, $last: Int, $after: String, $before: String, $query: String) {
        products(first: $first, last: $last, after: $after, before: $before, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              featuredImage {
                url
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                    presentmentPrices(first: 1){
                      edges {
                        node {
                          price {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
            startCursor
          }
        }
      }
    `;
    const variables = {
      first: direction === "next" ? 10 : null,
      // Use `first` for forward pagination
      last: direction === "prev" ? 10 : null,
      // Use `last` for backward pagination
      after: direction === "next" ? cursor : null,
      before: direction === "prev" ? cursor : null,
      query: searchTerm ? `${searchTerm} ` : ""
    };
    fetcher.submit(
      { query, variables: JSON.stringify(variables) },
      { method: "post", action: "/data/products" }
    );
  };
  useEffect(() => {
    handleSearch();
  }, [inputValue]);
  useEffect(() => {
    var _a2, _b;
    if (fetcher.data) {
      setLoading(false);
    }
    console.log(fetcher == null ? void 0 : fetcher.data, "fetcher data");
    if ((_b = (_a2 = fetcher.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.pageInfo) {
      setHasNextPage(fetcher.data.products.pageInfo.hasNextPage);
      setHasPreviousPage(fetcher.data.products.pageInfo.hasPreviousPage);
      setNextCursor(fetcher.data.products.pageInfo.endCursor);
      setPrevCursor(fetcher.data.products.pageInfo.startCursor);
    }
  }, [fetcher.data]);
  const handleSelectionChange = (newSelectedItems) => {
    var _a2, _b;
    console.log(newSelectedItems, "newSelectedItems");
    setShowError(false);
    if (newSelectedItems.length === 0) {
      setSelectedItems([]);
      setSelectedProduct(null);
      return;
    }
    const selectedId = newSelectedItems[newSelectedItems.length - 1];
    setSelectedItems([selectedId]);
    const selectedProduct2 = (_b = (_a2 = fetcher == null ? void 0 : fetcher.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges.find(
      (row) => row.node.id === selectedId
    );
    console.log(selectedProduct2, "selectedProduct");
    setSelectedProduct(selectedProduct2 || null);
  };
  const onSubmit = () => {
    var _a2;
    setButtonPressed(true);
    if ((_a2 = selectedProduct == null ? void 0 : selectedProduct.node) == null ? void 0 : _a2.id) {
      dispatch(setData({ ...new_pin_data, product: selectedProduct }));
      navigate("/app/templates", { state: { product: selectedProduct } });
      setButtonPressed(false);
    } else {
      setShowError(true);
      setButtonPressed(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
    Page,
    {
      style: { display: "block" },
      title: "Selected Product",
      fullWidth: true,
      subtitle: "Choose the product you want to turn into a Pinterest pin.",
      compactTitle: true,
      children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs("div", { style: { padding: "1.5rem" }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                gap: "20px",
                alignItems: "center"
              },
              children: /* @__PURE__ */ jsx("div", { style: { width: "75%" }, children: /* @__PURE__ */ jsx(
                TextField,
                {
                  type: "text",
                  label: "",
                  value: inputValue,
                  onChange: setInputValue,
                  autoComplete: "off",
                  placeholder: "Search"
                }
              ) })
            }
          ),
          loading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "1.5rem" }, children: /* @__PURE__ */ jsx(Spinner, { size: "large" }) }) : /* @__PURE__ */ jsx(
            ResourceList,
            {
              resourceName: { singular: "product", plural: "products" },
              items: (fetcher == null ? void 0 : fetcher.data) ? Object.values(fetcher.data.products.edges) : [],
              selectedItems,
              promotedBulkActions: [
                {
                  content: "Next",
                  loading: buttonPressed,
                  onAction: () => onSubmit()
                }
              ],
              onSelectionChange: handleSelectionChange,
              selectable: true,
              pagination: {
                hasNext: hasNextPage,
                hasPrevious: hasPreviousPage,
                onNext: () => handleSearch(nextCursor, "next"),
                onPrevious: () => handleSearch(prevCursor, "prev")
              },
              loading,
              renderItem: (row) => {
                var _a2, _b;
                const { id, title, featuredImage, variants } = row.node;
                const price = ((_b = (_a2 = variants == null ? void 0 : variants.edges[0]) == null ? void 0 : _a2.node) == null ? void 0 : _b.price) || "0.00";
                return /* @__PURE__ */ jsxs(
                  ResourceItem,
                  {
                    id,
                    accessibilityLabel: `View details for ${title}`,
                    name: title,
                    media: /* @__PURE__ */ jsx(
                      Thumbnail,
                      {
                        source: (featuredImage == null ? void 0 : featuredImage.url) || "https://via.placeholder.com/200",
                        alt: title,
                        size: "small"
                      }
                    ),
                    children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "bold", as: "h3", children: title }),
                      /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: /* @__PURE__ */ jsx(
                        NumericFormat,
                        {
                          value: price,
                          displayType: "text",
                          thousandSeparator: true,
                          prefix: "$",
                          decimalScale: 2,
                          fixedDecimalScale: true
                        }
                      ) })
                    ]
                  }
                );
              }
            }
          )
        ] }),
        showError ? /* @__PURE__ */ jsx(
          Banner,
          {
            tone: "warning",
            onDismiss: () => {
            },
            stopAnnouncements: true,
            children: /* @__PURE__ */ jsx("p", { children: "Please select a product to pin." })
          }
        ) : null,
        /* @__PURE__ */ jsx(BlockStack, { inlineAlign: "center", children: /* @__PURE__ */ jsx("div", { style: { marginTop: "30px", display: "flex", gap: "15px" }, children: /* @__PURE__ */ jsx(
          Button,
          {
            to: "select_product",
            style: { ...styles$6.theme_button, margin: "auto" },
            type: "button",
            onClick: () => {
              onSubmit();
            },
            loading: buttonPressed,
            children: "Next"
          }
        ) }) })
      ] })
    }
  ) });
}
function select_product$3() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(SelectProduct, {}) });
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: select_product$3
}, Symbol.toStringTag, { value: "Module" }));
const action$b = async ({ request }) => {
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const pinterestUserId = body.get("pinterestUserId");
  const accessToken = body.get("accessToken");
  const refreshToken = body.get("refreshToken");
  const userName = body.get("userName");
  let existingUser = await prisma.PinterestUser.findMany({
    where: { shopifyShopId }
  });
  let user = {};
  if (Object.keys(existingUser).length > 0) {
    user = await prisma.PinterestUser.update({
      where: { id: existingUser[0].id },
      data: { accessToken, refreshToken, userName }
    });
  } else {
    user = await prisma.PinterestUser.create({
      data: {
        shopifyShopId,
        pinterestUserId,
        accessToken,
        refreshToken,
        userName
      }
    });
  }
  return json$1(user);
};
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b
}, Symbol.toStringTag, { value: "Module" }));
const action$a = async ({ request }) => {
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  let existingUser = await prisma.PinterestUser.findMany({
    where: { shopifyShopId }
  });
  if (Object.keys(existingUser).length > 0) {
    await prisma.PinterestUser.delete({
      where: { id: existingUser[0].id }
    });
  }
  return json$1(Object.values(existingUser));
};
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a
}, Symbol.toStringTag, { value: "Module" }));
const action$9 = async ({ request }) => {
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const accessToken = body.get("accessToken");
  let existingUser = await prisma.PinterestUser.findMany({
    where: { shopifyShopId }
  });
  let user = {};
  if (Object.keys(existingUser).length > 0) {
    user = await prisma.PinterestUser.update({
      where: { id: existingUser[0].id },
      data: { accessToken }
    });
  }
  return json$1(user);
};
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9
}, Symbol.toStringTag, { value: "Module" }));
function CreateBoard(props) {
  useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.user.user);
  console.log(user, "user");
  const handleSubmit = async () => {
    console.log("first");
    setError("");
    setLoading(true);
    if (!name || !description) {
      setError("All fields are required!");
      setLoading(false);
      return;
    }
    const response = await fetch("/api/pinterest/create_board", {
      method: "POST",
      body: JSON.stringify({ name, description }),
      headers: {
        "Content-Type": "application/json",
        access_token: user.accessToken
      }
    });
    const resJson = await response.json();
    console.log(resJson, "response");
    if (response.ok) {
      setLoading(false);
      navigate("/app");
    } else {
      setLoading(false);
      setError(resJson == null ? void 0 : resJson.message);
    }
    return;
  };
  return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
    Page,
    {
      style: { display: "block" },
      title: "Create Board",
      fullWidth: true,
      subtitle: "Create Pinterest Board",
      compactTitle: true,
      children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(Form, { onSubmit: handleSubmit, children: /* @__PURE__ */ jsxs("div", { style: { padding: "1.5rem" }, children: [
          /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: "60px" }, children: /* @__PURE__ */ jsxs("div", { style: { width: "60%" }, children: [
            /* @__PURE__ */ jsx("div", { style: { marginTop: "15px" }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                value: name,
                onChange: (value) => {
                  setName(value);
                },
                label: "Name",
                placeholder: "Enter Board Name",
                type: "text",
                maxLength: 30
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: "15px" }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                value: description,
                onChange: (value) => {
                  setDescription(value);
                },
                multiline: 4,
                label: "Description",
                type: "text",
                placeholder: "Enter Description",
                maxLength: 200
              }
            ) })
          ] }) }),
          error && /* @__PURE__ */ jsx("span", { style: { color: "red" }, children: error })
        ] }) }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              marginTop: "30px",
              display: "flex",
              gap: "15px",
              justifyContent: "center"
            },
            children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  to: "select_product",
                  variant: "primary",
                  size: "large",
                  type: "button",
                  onClick: () => {
                    navigate("/app/boards");
                  },
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  to: "select_product",
                  size: "large",
                  type: "submit",
                  onClick: () => {
                    handleSubmit();
                  },
                  loading,
                  children: "Save"
                }
              )
            ]
          }
        )
      ] })
    }
  ) });
}
function create_board() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(CreateBoard, {}) });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: create_board
}, Symbol.toStringTag, { value: "Module" }));
const action$8 = async ({ request }) => {
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  const product_id = body.get("product_id");
  const product_title = body.get("product_title");
  const pinterestJson = body.get("pinterestJson");
  const productEditJson = body.get("productEditJson");
  const status = body.get("status");
  let pin = await prisma.PinterestProductPins.create({
    data: {
      shopifyShopId,
      product_id,
      pinterestJson,
      product_title,
      status,
      productEditJson
    }
  });
  return json$1(pin);
};
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8
}, Symbol.toStringTag, { value: "Module" }));
const action$7 = async ({ request }) => {
  const body = await request.formData();
  const id = body.get("id");
  await prisma.PinterestProductPins.delete({
    where: { id }
  });
  let access_key = body.get("access_key");
  let pin_id = body.get("pin_id");
  await axios.delete(process.env.PINTEREST_API_HOST + "/pins/" + pin_id, {
    headers: {
      "Authorization": `Bearer ${access_key}`,
      // Pinterest access token
      "Content-Type": "application/json"
    }
  }).catch(() => {
  });
  return json$1({
    success: true
  });
};
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7
}, Symbol.toStringTag, { value: "Module" }));
const ComponentsBar = ({ addElement, deleteElement }) => {
  return /* @__PURE__ */ jsxs("div", { style: styles$5.container, children: [
    /* @__PURE__ */ jsx("h3", { style: styles$5.heading, children: "Add Elements" }),
    /* @__PURE__ */ jsx("button", { style: styles$5.button, onClick: () => addElement("text"), children: "➕ Add Text" }),
    /* @__PURE__ */ jsx("button", { style: styles$5.button, onClick: deleteElement, children: "Delete" })
  ] });
};
const styles$5 = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "15px",
    border: "1px solid #ddd",
    // Subtle border to define the container
    borderRadius: "8px",
    background: "#fff",
    // White background
    boxShadow: "2px 2px 10px rgba(0,0,0,0.1)",
    // Soft shadow
    width: "200px"
  },
  heading: {
    marginBottom: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333"
    // Dark text for contrast
  },
  button: {
    padding: "10px",
    border: "1px solid #ddd",
    // Light border to keep the buttons subtle
    borderRadius: "5px",
    cursor: "pointer",
    background: "#fff",
    // White background for buttons
    color: "#333",
    // Dark text color for contrast
    fontSize: "14px",
    fontWeight: "normal",
    // No bold to keep it minimalist
    transition: "background 0.3s, border 0.3s"
    // Smooth hover transition
  }
};
const SideBar = ({ setCurrentTab, selectedTemplate }) => {
  console.log(selectedTemplate, "selectedTemplate");
  return /* @__PURE__ */ jsxs("div", { style: styles$4.sidebar, children: [
    /* @__PURE__ */ jsxs("div", { style: styles$4.sidebarItem, onClick: () => setCurrentTab("template"), children: [
      /* @__PURE__ */ jsx(Icon, { source: ThemeTemplateIcon, style: { marginRight: "10px" } }),
      /* @__PURE__ */ jsx("span", { style: styles$4.sidebarText, children: "Templates" })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: styles$4.sidebarItem,
        onClick: () => selectedTemplate && setCurrentTab("text"),
        children: [
          /* @__PURE__ */ jsx(Icon, { source: TextBlockIcon }),
          /* @__PURE__ */ jsx("span", { style: styles$4.sidebarText, children: "Text" })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: styles$4.sidebarItem,
        onClick: () => selectedTemplate && setCurrentTab("photos"),
        children: [
          /* @__PURE__ */ jsx(Icon, { source: ImageIcon }),
          /* @__PURE__ */ jsx("span", { style: styles$4.sidebarText, children: "Photos" })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: styles$4.sidebarItem,
        onClick: () => selectedTemplate && setCurrentTab("uploads"),
        children: [
          /* @__PURE__ */ jsx(Icon, { source: ImageAddIcon }),
          /* @__PURE__ */ jsx("span", { style: styles$4.sidebarText, children: "Uploads" })
        ]
      }
    )
  ] });
};
const styles$4 = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f4f4f4",
    padding: "20px",
    width: "100px",
    height: "100vh",
    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
    // Light shadow for separation
    position: "fixed"
  },
  sidebarItem: {
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "start",
    alignItems: "center",
    marginBottom: "15px",
    cursor: "pointer",
    borderRadius: "5px",
    transition: "background-color 0.3s ease"
  },
  sidebarText: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#333"
  }
};
const Uploads = ({ images, setImages }) => {
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    handleUpload(files);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    handleUpload(files);
  };
  const handleUpload = (files) => {
    const uploadedImages = files.map(
      (file) => Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    setImages([...images, ...uploadedImages]);
  };
  return /* @__PURE__ */ jsxs("div", { style: styles$3.container, children: [
    /* @__PURE__ */ jsx("div", { style: styles$3.imageSidebar, children: images.map((image, index2) => /* @__PURE__ */ jsx("div", { style: styles$3.imageWrapper, children: /* @__PURE__ */ jsx("img", { src: image.preview, alt: "Uploaded", style: styles$3.image }) }, index2)) }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: styles$3.uploadBox,
        onDragOver: (e) => e.preventDefault(),
        onDrop: handleDrop,
        children: [
          /* @__PURE__ */ jsx("p", { children: "Drag & drop images here, or" }),
          /* @__PURE__ */ jsx("label", { htmlFor: "fileUpload", style: styles$3.uploadLabel, children: "Click to Upload" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "fileUpload",
              type: "file",
              accept: "image/*",
              multiple: true,
              onChange: handleFileChange,
              style: styles$3.fileInput
            }
          )
        ]
      }
    )
  ] });
};
const styles$3 = {
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: "0px"
  },
  imageSidebar: {
    width: "500px",
    height: "400px",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))"
  },
  uploadBox: {
    width: "300px",
    height: "150px",
    border: "2px dashed #aaa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "center",
    marginLeft: "20px"
  },
  uploadLabel: {
    color: "#333",
    cursor: "pointer",
    textDecoration: "underline"
  },
  fileInput: {
    display: "none"
  },
  imageWrapper: {
    width: "100px",
    height: "100px",
    overflow: "hidden",
    borderRadius: "5px",
    border: "1px solid #ddd"
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  }
};
const fontList = [
  "Helvetica Neue",
  "Arial",
  "Georgia",
  "Grechen Fuemen",
  "Times New Roman",
  "Courier New",
  "Trebuchet MS",
  "Verdana",
  "Noto Sans",
  "Noto Serif",
  "Noto Mono",
  "Noto Sans JP",
  "Noto Serif JP",
  "Noto Sans KR",
  "Noto Serif KR",
  "Noto Sans SC",
  "Noto Serif SC",
  "Noto Sans TC",
  "Noto Serif TC",
  "Lato",
  "Playfair Display",
  "Merriweather",
  "Montserrat",
  "Raleway",
  "Roboto",
  "Source Sans Pro",
  "Open Sans",
  "PT Sans",
  "PT Serif",
  "Droid Sans",
  "Droid Serif",
  "Quicksand",
  "Poppins",
  "Oswald"
];
const fontSizes = [
  10,
  12,
  14,
  16,
  18,
  20,
  22,
  24,
  26,
  28,
  30,
  32,
  36,
  40,
  42,
  48,
  54,
  56,
  60,
  64,
  72,
  80,
  96,
  108,
  120,
  144,
  168,
  192,
  216,
  174
];
const styles$2 = {
  toolbarContainer: {
    display: "flex",
    flexDirection: "column",
    padding: "10px",
    backgroundColor: "#f4f4f4",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    width: "250px"
  },
  section: {
    marginBottom: "20px"
  },
  toolbarTitle: {
    fontSize: "18px",
    marginBottom: "10px",
    fontWeight: "bold",
    color: "#333"
  },
  selectContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  fontSizeSelect: {
    padding: "8px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    display: "none"
  },
  fontFamilySelect: {
    padding: "8px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#fff"
  },
  buttonContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px"
  },
  iconButton: {
    padding: "8px 12px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "background-color 0.3s"
  },
  alignmentContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px"
  },
  alignLabel: {
    fontSize: "14px",
    color: "#333"
  },
  alignSelect: {
    padding: "8px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#fff"
  },
  fontColorContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  colorLabel: {
    fontSize: "14px",
    color: "#333"
  },
  colorPicker: {
    width: "30px",
    height: "30px",
    border: "none",
    cursor: "pointer"
  },
  opacitySlider: {
    width: "200px",
    // Increased width for better control
    height: "10px",
    // Increased height for better grip
    cursor: "pointer",
    appearance: "none",
    background: "#ddd",
    borderRadius: "5px",
    outline: "none",
    transition: "0.2s"
  },
  fontSizeInputContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  fontSizeButton: {
    padding: "8px",
    fontSize: "1.25rem",
    cursor: "pointer",
    border: "1px solid #ccc",
    background: "#f0f0f0",
    borderRadius: "4px",
    textAlign: "center"
  },
  fontSizeInput: {
    width: "100%",
    textAlign: "center",
    padding: "6px",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "4px"
  }
};
const Toolbar = ({ id, updateElement, element }) => {
  const handleFontSizeChange = (e) => {
    console.log(element);
    updateElement(id, "fontSize", e.target.value);
  };
  const handleIncreaseFontSize = () => {
    updateElement(id, "fontSize", element.fontSize + 1);
  };
  const handleDecreaseFontSize = () => {
    updateElement(id, "fontSize", element.fontSize - 1);
  };
  const handleFontFamilyChange = (e) => {
    updateElement(id, "fontFamily", e.target.value);
  };
  const handleBoldToggle = () => {
    console.log(element);
    updateElement(
      id,
      "fontWeight",
      element.fontWeight === "bold" ? "" : "bold"
    );
  };
  const handleItalicToggle = () => {
    updateElement(
      id,
      "fontStyle",
      element.fontStyle === "italic" ? "" : "italic"
    );
  };
  const handleTextAlignChange = (e) => {
    updateElement(id, "align", e.target.value);
  };
  const handleFontColorChange = (e) => {
    console.log(e.target.value, "handleFontColorChange");
    updateElement(id, "fill", e.target.value);
  };
  const handleStrokeColorChange = (e) => {
    updateElement(id, "stroke", e.target.value);
  };
  const handleOpacity = (e) => {
    updateElement(id, "opacity", e.target.value);
  };
  return /* @__PURE__ */ jsxs("div", { style: styles$2.toolbarContainer, children: [
    /* @__PURE__ */ jsxs("div", { style: styles$2.section, children: [
      /* @__PURE__ */ jsx("h1", { style: styles$2.toolbarTitle, children: "Fonts" }),
      /* @__PURE__ */ jsxs("div", { style: styles$2.selectContainer, children: [
        /* @__PURE__ */ jsx(
          "select",
          {
            style: styles$2.fontSizeSelect,
            value: element == null ? void 0 : element.fontSize,
            onChange: handleFontSizeChange,
            children: Object.values(fontSizes).map((size) => /* @__PURE__ */ jsx("option", { value: size, children: size }, size))
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: styles$2.fontSizeInputContainer, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleDecreaseFontSize,
              style: styles$2.fontSizeButton,
              children: "-"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: element == null ? void 0 : element.fontSize,
              min: 8,
              onChange: handleFontSizeChange,
              style: styles$2.fontSizeInput
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleIncreaseFontSize,
              style: styles$2.fontSizeButton,
              children: "+"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "select",
          {
            style: styles$2.fontFamilySelect,
            value: element == null ? void 0 : element.fontFamily,
            onChange: handleFontFamilyChange,
            children: Object.values(fontList).map((font) => /* @__PURE__ */ jsx("option", { value: font, children: font }, font))
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: styles$2.section, children: [
      /* @__PURE__ */ jsx("h1", { style: styles$2.toolbarTitle, children: "Style" }),
      /* @__PURE__ */ jsxs("div", { style: styles$2.buttonContainer, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            style: {
              ...styles$2.iconButton,
              fontWeight: (element == null ? void 0 : element.fontWeight) === "bold" ? "bold" : "normal",
              backgroundColor: (element == null ? void 0 : element.fontWeight) === "bold" ? "#ddd" : "transparent"
            },
            onClick: handleBoldToggle,
            children: /* @__PURE__ */ jsx("b", { children: "B" })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            style: {
              ...styles$2.iconButton,
              fontStyle: (element == null ? void 0 : element.fontStyle) === "italic" ? "italic" : "normal",
              backgroundColor: (element == null ? void 0 : element.fontStyle) === "italic" ? "#ddd" : "transparent"
            },
            onClick: handleItalicToggle,
            children: /* @__PURE__ */ jsx("i", { children: "I" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: styles$2.alignmentContainer, children: [
        /* @__PURE__ */ jsx("label", { style: styles$2.alignLabel, children: "Align:" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            style: styles$2.alignSelect,
            value: element == null ? void 0 : element.align,
            onChange: handleTextAlignChange,
            children: [
              /* @__PURE__ */ jsx("option", { value: "left", children: "Left" }),
              /* @__PURE__ */ jsx("option", { value: "center", children: "Center" }),
              /* @__PURE__ */ jsx("option", { value: "right", children: "Right" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: styles$2.fontColorContainer, children: [
        /* @__PURE__ */ jsx("label", { style: styles$2.colorLabel, children: "Fill Color:" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "color",
            value: element == null ? void 0 : element.fill,
            onChange: handleFontColorChange,
            style: styles$2.colorPicker
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: styles$2.fontColorContainer, children: [
        /* @__PURE__ */ jsx("label", { style: styles$2.colorLabel, children: "Stroke Color:" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "color",
            value: element == null ? void 0 : element.stroke,
            onChange: handleStrokeColorChange,
            style: styles$2.colorPicker
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: styles$2.fontColorContainer, children: [
        /* @__PURE__ */ jsx("label", { style: styles$2.colorLabel, children: "Opacity:" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "range",
            value: (element == null ? void 0 : element.opacity) || 1,
            onChange: handleOpacity,
            style: styles$2.opacitySlider,
            min: 0,
            max: 1,
            step: 0.1
          }
        )
      ] })
    ] })
  ] });
};
const Photos = ({ images, addElement }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const handleImageClick = (image) => {
    console.log(image);
    setSelectedImage(image);
    addElement("image", image.preview);
  };
  return /* @__PURE__ */ jsxs("div", { style: styles$1.container, children: [
    /* @__PURE__ */ jsx("h2", { style: styles$1.title, children: "Select an Image" }),
    /* @__PURE__ */ jsx("div", { style: styles$1.imageSidebar, children: images.map((image, index2) => /* @__PURE__ */ jsx(
      "div",
      {
        style: styles$1.imageWrapper,
        onClick: () => handleImageClick(image),
        children: /* @__PURE__ */ jsx("img", { src: image.preview, alt: "Uploaded", style: styles$1.image })
      },
      index2
    )) })
  ] });
};
const styles$1 = {
  container: {
    // padding: "10px",
    maxHeight: "400px",
    borderRight: "1px solid #ddd"
  },
  imageSidebar: {
    width: "250px",
    height: "400px",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))"
  },
  title: {
    fontSize: "16px",
    marginBottom: "10px",
    textAlign: "center"
  },
  imageWrapper: {
    width: "80px",
    height: "80px",
    overflow: "hidden",
    cursor: "pointer",
    borderRadius: "5px"
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "5px"
  }
};
const predefinedShapes = [
  {
    type: "shape",
    subType: "rect",
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    stroke: "black",
    strokeWidth: 2
  },
  {
    type: "shape",
    subType: "circle",
    x: 200,
    y: 100,
    radius: 50,
    stroke: "blue",
    strokeWidth: 2
  },
  {
    type: "shape",
    subType: "line",
    x: 100,
    y: 200,
    points: [0, 0, 100, 0],
    stroke: "red",
    strokeWidth: 3
  },
  {
    type: "shape",
    subType: "star",
    x: 300,
    y: 200,
    numPoints: 5,
    innerRadius: 20,
    outerRadius: 40,
    stroke: "purple",
    strokeWidth: 2
  },
  {
    type: "shape",
    subType: "triangle",
    x: 400,
    y: 100,
    points: [0, 0, -50, 100, 50, 100],
    stroke: "green",
    strokeWidth: 2,
    closed: true
  },
  {
    type: "shape",
    subType: "ellipse",
    x: 150,
    y: 250,
    radiusX: 60,
    radiusY: 40,
    stroke: "orange",
    strokeWidth: 2
  },
  {
    type: "shape",
    subType: "polygon",
    x: 300,
    y: 250,
    points: [0, 0, 40, -80, 80, 0],
    stroke: "brown",
    strokeWidth: 2,
    closed: true
  },
  {
    type: "shape",
    subType: "arrow",
    x: 100,
    y: 300,
    points: [0, 0, 100, 50],
    stroke: "black",
    strokeWidth: 2
  },
  {
    type: "shape",
    subType: "curved-arrow",
    x: 250,
    y: 300,
    points: [0, 0, 50, 50, 100, 0],
    stroke: "black",
    strokeWidth: 2,
    tension: 0.5
  }
];
const Shapes = ({ addShape }) => {
  return /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", marginTop: 20 }, children: [
    /* @__PURE__ */ jsx("h2", { children: "Available Shapes" }),
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }, children: predefinedShapes.map((shape) => {
      return /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            display: "inline-block",
            margin: 10,
            border: "1px solid #ccc",
            padding: 10,
            cursor: "pointer"
          },
          children: /* @__PURE__ */ jsx("h3", { onClick: () => addShape(shape.type, shape), children: shape.type })
        },
        shape.id
      );
    }) }) })
  ] });
};
const templates = [
  {
    id: "UR8AAgRInq",
    elements: [
      {
        id: "jVu-Ju2zxZ",
        type: "svg",
        x: 57.772830427063155,
        y: 643.4677234967324,
        rotation: -11.663318854428432,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 912.6173262723429,
        height: 137.7165738450961,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(240,236,185,1)"
        }
      },
      {
        id: "L1maDLsPQU",
        type: "svg",
        x: 84.4929421978722,
        y: 339.7473189837064,
        rotation: 7.840531667987872,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 919.0968564347784,
        height: 195.87169071940144,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(240,236,185,1)"
        }
      },
      {
        id: "Ab2QHJ_xgn",
        type: "image",
        x: 921.815791359181,
        y: 271.4357102700618,
        rotation: 89.99999999999984,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        width: 587.2670675615708,
        height: 734.0838344519639,
        src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/photo-1552611052-33e04de081de.jpg?v=1740461881",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9999999999999993,
        cropHeight: 0.9999999999999998,
        cornerRadius: 0,
        flipX: false,
        flipY: false,
        clipSrc: "",
        borderColor: "rgba(240,236,185,1)",
        borderSize: 15
      },
      {
        id: "hEPTj-v9SG",
        type: "text",
        x: 171.2738741331999,
        y: 87.61433081412335,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "Coming Soon",
        placeholder: "",
        fontSize: 129,
        fontFamily: "Sedgwick Ave Display",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(240,236,185,1)",
        align: "center",
        width: 767,
        height: 154.79999999999998,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "sdTGsDDFd8",
        type: "text",
        x: 570.7321723743986,
        y: 883.0428499113999,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "Best Noodle in Town",
        placeholder: "",
        fontSize: 56,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(240,236,185,1)",
        align: "right",
        width: 352,
        height: 123.20000000000002,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.1,
        letterSpacing: 0
      }
    ],
    background: "rgba(166,192,24,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-24_174104.png?v=1740399088"
  },
  {
    id: "jbbiJzDTI7",
    elements: [
      {
        id: "BXaeWPIWdH",
        type: "svg",
        x: -44.46337356287459,
        y: 371.99999999999966,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDUxMiA1MTIiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjYTFkNTFjIiBkPSJNMTIyLjQwMiw0NjMuMzU1TDkxLjk2NiwxMTguNDcyaDMyOC4wNjlsLTMwLjQzNiwzNDQuODg0DQoJCQkJYy0xLjM3MiwxNS41NDMtMTQuMzksMjcuNDYzLTI5Ljk5NCwyNy40NjNIMTUyLjM5NkMxMzYuNzkyLDQ5MC44MTksMTIzLjc3NCw0NzguODk5LDEyMi40MDIsNDYzLjM1NXoiLz48cGF0aCBkPSJNNDIwLjAyMiwxMTguNDhMMzg5LjU5LDQ2My4zNDhjLTEuMjc3LDE0LjUzOS0xMi43NDEsMjUuODk5LTI2Ljk5MywyNy4zMDZjMC43NTYtMi4yMTUsMS4yNzctNC41NiwxLjQ4NS02Ljk4Mw0KCQkJCWwyNy45My0zMTYuNTI4YzEuMzQ1LTE1LjI0Ni0xMC42NjgtMjguMzY2LTI1Ljk3My0yOC4zNjZIOTMuNzU4TDkxLjk2LDExOC40OEg0MjAuMDIyeiIgb3BhY2l0eT0iLjEiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTE5LjY0MiAyMzIuMDAybC0xLjc3MS0yMC4xOTNjLS4xNTgtMS43OTMgMS4xNjgtMy4zNzMgMi45NTktMy41MjkgMS44MjItLjE2NCAzLjM3NCAxLjE2OSAzLjUyOSAyLjk1OWwxLjc3MSAyMC4xOTNjLjE1OCAxLjc5My0xLjE2OCAzLjM3My0yLjk1OSAzLjUyOUMxMjEuNDAxIDIzNS4xMjQgMTE5LjggMjMzLjgwNyAxMTkuNjQyIDIzMi4wMDJ6TTExNi4zODUgMTk1LjIxYy0uNTQyLTYuMjI5LS43NjgtOC43MTgtLjc2OC04LjkzNCAwLTEuNzk5IDEuNDU4LTMuMjcgMy4yNTctMy4yNyAxLjc0NSAwIDMuMTcgMS4zNiAzLjI1MiAzLjA4NGwuNzQ4IDguNTUyYy4xNTggMS43OTMtMS4xNjggMy4zNzEtMi45NjIgMy41MjhDMTE4LjE1MiAxOTguMzM3IDExNi41NDMgMTk3LjAxOSAxMTYuMzg1IDE5NS4yMXoiLz48cGF0aCBmaWxsPSIjZjg2NjRmIiBkPSJNNDQ1LjU1OSw4My43Nzd2MTkuNjYzYzAsOC4zMTUtNi43NCwxNS4wNTUtMTUuMDU1LDE1LjA1NUg4MS40OTcNCgkJCQljLTguMzE1LDAtMTUuMDU1LTYuNzQtMTUuMDU1LTE1LjA1NVY4My43NzdjMC04LjMxNSw2Ljc0LTE1LjA1NSwxNS4wNTUtMTUuMDU1aDM0OS4wMDcNCgkJCQlDNDM4LjgxOCw2OC43MjIsNDQ1LjU1OSw3NS40NjMsNDQ1LjU1OSw4My43Nzd6Ii8+PHBhdGggZmlsbD0iI2VlZjBlZSIgZD0iTTM5OS4xMjUsMzguNjM3bDE4LjE4MiwzMC4wNjVIOTQuNjkzbDE4LjE4Mi0zMC4wNjVjNS40NTQtOS4wMTgsMTUuMjI2LTE0LjUyOSwyNS43NjUtMTQuNTI5DQoJCQkJaDIzNC43MkMzODMuODk5LDI0LjEwOCwzOTMuNjcxLDI5LjYxOSwzOTkuMTI1LDM4LjYzN3oiLz48cGF0aCBmaWxsPSIjODc4Nzg3IiBkPSJNMjk0LjI1NCw0NzAuNDk2YzAsMjEuMTIzLTE3LjExNywzOC4yNC0zOC4yNCwzOC4yNHMtMzguMjY4LTE3LjExNy0zOC4yNjgtMzguMjQNCgkJCQkJYzAtMjEuMTIzLDE3LjE0NS0zOC4yNCwzOC4yNjgtMzguMjRTMjk0LjI1NCw0NDkuMzczLDI5NC4yNTQsNDcwLjQ5NnoiLz48cGF0aCBmaWxsPSIjZWVmMGVlIiBkPSJNMjcyLjUxNyA0NzAuNDk2YzAgOS4xMi03LjM5MSAxNi41MTEtMTYuNTExIDE2LjUxMXMtMTYuNTIzLTcuMzktMTYuNTIzLTE2LjUxMWMwLTkuMTIgNy40MDMtMTYuNTEgMTYuNTIzLTE2LjUxUzI3Mi41MTcgNDYxLjM3NiAyNzIuNTE3IDQ3MC40OTZ6TTI0Ni45NjMgMzIzLjgyMmwxLjQ1OSAxOC45NDJjLjMzOSA0LjE0My0yLjc4OCA3Ljc5LTYuOTU3IDguMTI5bC0zNi4xMTMgMi44MTRjLTUuMjg5LjQxNy0xMC4zOTYtMS41MzctMTQuMDQ0LTUuMjExLTE4LjcwOC0zMS4xMS0xMi43MTUtMjAuOTIyLTI2LjU3Ni00NS4wNDktMi45MTgtNS4xNTktMy4xNTMtMTEuNDM4LS41NzMtMTYuNzI3bDYuMjI3LTEyLjc2Ny04LjY3Ni00LjE5NWMtMS43NzItLjg4Ni0xLjU2My0zLjQ2NS4zMTMtNC4wMzlsMzcuMTI5LTExLjgwM2MxLjA5NC0uMzM5IDIuMjQxLjE4MiAyLjY1OCAxLjI3N2wxNS41NTUgMzcuMzg5Yy43NTYgMS44NzYtMS4xOTggMy43LTIuOTk2IDIuNzg4bC04LjIzNC00LjAxMy0xMy4yMSAyNy4wMTljLS4zNjUuNjc3LS42NTEgMS40MDctLjkzOCAyLjE2M2w0Ni44MjEtMy42NDhDMjQyLjk3NiAzMTYuNTUyIDI0Ni42MjQgMzE5LjY3OSAyNDYuOTYzIDMyMy44MjJ6TTMwMy4zOTkgMjQxLjA5NmwtNDAuMTUxLTUuMjExYy0xLjk4LS4yODctMi42MDYtMi44OTItLjkxMi0zLjk4N2w3LjU4Mi01LjEzMy0xNi43OC0yNC45NjFjLS40MTctLjY1MS0uOTEyLTEuMjc3LTEuNDA3LTEuOTAybC0yMC4yNDUgNDIuMzkyYy0xLjc5OCAzLjc3OC02LjMzMiA1LjM2Ny0xMC4xMDkgMy41N2wtMTcuMTE4LTguMTgxYy0zLjc1Mi0xLjc5OC01LjM2Ny02LjMwNS0zLjU3LTEwLjA4M2wxNS42MzMtMzIuNjk5YzIuMjkzLTQuNzk0IDYuNTQtOC4yMzQgMTEuNTE2LTkuNTM2IDM2LjMyMS0uNjUxIDI0LjQ5Mi0uNTczIDUyLjMxOS0uNDk1IDUuOTE0LjAyNiAxMS40NjQgMi45OTYgMTQuNzczIDcuODY5bDcuOTQ3IDExLjc3NyA3Ljk3My01LjQyYzEuNjQxLTEuMDk0IDMuNzc4LjM2NSAzLjMzNSAyLjI5M2wtOC4zNjQgMzguMDQxQzMwNS41ODcgMjQwLjU0OSAzMDQuNTQ1IDI0MS4yNzkgMzAzLjM5OSAyNDEuMDk2ek0zNTAuODcxIDI5OC41NzRjLTE3LjU4NyAzMS43NjEtMTEuNzc3IDIxLjQ3LTI1Ljc0MiA0NS41NDUtMi45NyA1LjEwNy04LjMxMiA4LjQ0Mi0xNC4yIDguODU5bC0xNC4xNzQuOTkuNzAzIDkuNjE0Yy4xMyAxLjk1NC0yLjE4OSAzLjA3NC0zLjY0OCAxLjc0NmwtMjguNzY1LTI2LjI2NGMtLjgzNC0uNzgyLS45NjQtMi4wMzItLjIzNC0yLjk0NGwyNC41OTYtMzIuMTUyYzEuMjUxLTEuNTg5IDMuODA0LS44MDggMy45MzQgMS4xOThsLjYyNSA5LjExOSAzMC4wMTYtMi4wNThjLjc1Ni0uMDI2IDEuNTM3LS4xMyAyLjM0NS0uMjZsLTI2LjU3Ni0zOC43MThjLTIuMzcxLTMuNDY1LTEuNDg1LTguMTU1IDEuOTI4LTEwLjUyNmwxNS42NTktMTAuNzYxYzMuNDM5LTIuMzQ1IDguMTU1LTEuNDg1IDEwLjUyNiAxLjk4bDIwLjUwNSAyOS44ODVDMzUxLjM2NiAyODguMTc4IDM1Mi4yMjYgMjkzLjU5OCAzNTAuODcxIDI5OC41NzR6Ii8+PGc+PHBhdGggZD0iTTQyMS4xMSAzNDMuMTQxYy0xLjc5OS0uMTY5LTMuMzcxIDEuMTc0LTMuNTI0IDIuOTY0bC0uNzgxIDkuMDQyYy0uMTY1IDEuOTA1IDEuMzM5IDMuNTM3IDMuMjQ3IDMuNTM3IDEuNjc0IDAgMy4wOTctMS4yOCAzLjI0Mi0yLjk3N2wuNzgxLTkuMDQyQzQyNC4yMjkgMzQ0Ljg3NCA0MjIuOTAxIDM0My4yOTUgNDIxLjExIDM0My4xNDF6TTQxOC43OTUgMzY5LjQwNWMtMS43OTYtLjE3LTMuMzcxIDEuMTY5LTMuNTI5IDIuOTU5bC00LjM1MSA0OS41M2MtLjE2NyAxLjkwMSAxLjMzMiAzLjU0MiAzLjI0NyAzLjU0MiAxLjY3MiAwIDMuMDk0LTEuMjc3IDMuMjQyLTIuOTcybDQuMzUxLTQ5LjUzQzQyMS45MTEgMzcxLjE0MyA0MjAuNTg2IDM2OS41NjMgNDE4Ljc5NSAzNjkuNDA1ek00MzAuNTA0IDY1LjQ2NmgtMTEuMzVsLTE3LjI0My0yOC41MTRjLTYuMDA3LTkuOTMxLTE2Ljk0Ni0xNi4xLTI4LjU1MS0xNi4xSDEzOC42MzljLTExLjYwNSAwLTIyLjU0NCA2LjE2OS0yOC41NTEgMTYuMUw5Mi44NDUgNjUuNDY2aC0xMS4zNWMtMTAuMDk2IDAtMTguMzEyIDguMjE1LTE4LjMxMiAxOC4zMTF2MTkuNjY0YzAgMTAuMDk4IDguMjE2IDE4LjMxMiAxOC4zMTIgMTguMzEyaDcuNDkxbDMwLjE3IDM0MS44ODljMS41MzQgMTcuMzUxIDE1LjgyNCAzMC40MzQgMzMuMjM4IDMwLjQzNGg2OS40OTJjNy41MDMgMTAuODExIDE5Ljk5MyAxNy45MTcgMzQuMTI2IDE3LjkxNyAxNC4xMjUgMCAyNi42MDctNy4xMDYgMzQuMTA1LTE3LjkxN2g2OS40ODdjMTcuNDE0IDAgMzEuNzA0LTEzLjA4NCAzMy4yMzgtMzAuNDM0bDMwLjE3LTM0MS44ODloNy40OTFjMTAuMDk2IDAgMTguMzEyLTguMjE1IDE4LjMxMi0xOC4zMTJWODMuNzc3QzQ0OC44MTcgNzMuNjgxIDQ0MC42MDEgNjUuNDY2IDQzMC41MDQgNjUuNDY2ek0xMTUuNjYgNDAuMzIzYzQuODM0LTcuOTkyIDEzLjY0MS0xMi45NTggMjIuOTc5LTEyLjk1OGgyMzQuNzIxYzkuMzM4IDAgMTguMTQ1IDQuOTY2IDIyLjk3OSAxMi45NThsMTUuMTkgMjUuMTIzSDEwMC40N0wxMTUuNjYgNDAuMzIzek0yNTYuMDEzIDUwNS40NzljLTE5LjMwNSAwLTM1LjAwOS0xNS42OTQtMzUuMDA5LTM0Ljk4NHMxNS43MDQtMzQuOTgzIDM1LjAwOS0zNC45ODNjMTkuMjkgMCAzNC45ODQgMTUuNjkzIDM0Ljk4NCAzNC45ODNTMjc1LjMwMiA1MDUuNDc5IDI1Ni4wMTMgNTA1LjQ3OXpNMzg2LjM1NSA0NjMuMDY5Yy0xLjIzNCAxMy45NjMtMTIuNzM1IDI0LjQ5My0yNi43NSAyNC40OTNoLTY1LjgxYzIuMzY1LTUuMjEzIDMuNzE1LTEwLjk4IDMuNzE1LTE3LjA2NyAwLTIyLjg4MS0xOC42MTUtNDEuNDk2LTQxLjQ5OC00MS40OTYtMjIuODk1IDAtNDEuNTIzIDE4LjYxNS00MS41MjMgNDEuNDk2IDAgNi4wODcgMS4zNTEgMTEuODU0IDMuNzE3IDE3LjA2N2gtNjUuODEyYy0xNC4wMTUgMC0yNS41MTYtMTAuNTMtMjYuNzUtMjQuNDkzTDk1LjUyNSAxMjEuNzUzaDMyMC45NDlMMzg2LjM1NSA0NjMuMDY5ek00NDIuMzAzIDEwMy40NDFjMCA2LjUwNi01LjI5MiAxMS43OTktMTEuNzk5IDExLjc5OS00LjM2MiAwIDQzLjU5Ni0uMDI4LTM0OS4wMDggMC02LjUwNiAwLTExLjc5OS01LjI5Mi0xMS43OTktMTEuNzk5VjgzLjc3N2MwLTYuNTA1IDUuMjkyLTExLjc5NyAxMS43OTktMTEuNzk3aDM0OS4wMDhjNi41MDYgMCAxMS43OTkgNS4yOTIgMTEuNzk5IDExLjc5N1YxMDMuNDQxek04Ny4xOTggNDAuODA3YzEuNTIxLjkyMiAzLjUzMS40NTQgNC40NzMtMS4wOTlsNS4wODEtOC4zODljLjkzMS0xLjUzOC40NC0zLjU0MS0xLjA5OS00LjQ3My0xLjUzNC0uOTMxLTMuNTM5LS40NDEtNC40NzMgMS4wOTlsLTUuMDgxIDguMzg5Qzg1LjE2OCAzNy44NzIgODUuNjU5IDM5Ljg3NSA4Ny4xOTggNDAuODA3ek0xMDcuMzA3IDE4LjMwN2M4Ljc0My03LjYgMTkuODc1LTExLjc4NiAzMS4zNDUtMTEuNzg2aDE5LjQzN2MxLjc5OSAwIDMuMjU3LTEuNDU4IDMuMjU3LTMuMjU3cy0xLjQ1OC0zLjI1Ny0zLjI1Ny0zLjI1N2gtMTkuNDM3Yy0xMy4wNCAwLTI1LjY4OSA0Ljc1My0zNS42MiAxMy4zODQtMS4zNTYgMS4xNzktMS41MDEgMy4yMzctLjMyMSA0LjU5NEMxMDMuODg5IDE5LjM0MiAxMDUuOTQzIDE5LjQ4OCAxMDcuMzA3IDE4LjMwN3oiLz48cGF0aCBkPSJNMjU2LjAwNSA0NTAuNzI5Yy0xMC45MDYgMC0xOS43NzggOC44NjctMTkuNzc4IDE5Ljc2NyAwIDEwLjkgOC44NzMgMTkuNzY4IDE5Ljc3OCAxOS43NjggMTAuOSAwIDE5Ljc2OC04Ljg2NyAxOS43NjgtMTkuNzY4QzI3NS43NzMgNDU5LjU5NiAyNjYuOTA2IDQ1MC43MjkgMjU2LjAwNSA0NTAuNzI5ek0yNTYuMDA1IDQ4My43NWMtNy4zMTMgMC0xMy4yNjQtNS45NDYtMTMuMjY0LTEzLjI1NCAwLTcuMzA4IDUuOTUxLTEzLjI1MyAxMy4yNjQtMTMuMjUzIDcuMzA4IDAgMTMuMjU0IDUuOTQ1IDEzLjI1NCAxMy4yNTNDMjY5LjI1OSA0NzcuODAzIDI2My4zMTMgNDgzLjc1IDI1Ni4wMDUgNDgzLjc1ek0yMDIuODU0IDI0MC42MmwxNy4xMzkgOC4xOThjNS4zOTYgMi41NTYgMTEuODY1LjI1MiAxNC40MTktNS4xMThsMTcuODQ3LTM3LjM1NiAxMy4xMzQgMTkuNTQtNC44NiAzLjI4NmMtNC4xNTQgMi43NC0yLjczNiA5LjIxNSAyLjI5OCA5LjkzNmw0MC4wNzMgNS4yMjFjMi44MTQuNDQ1IDUuNDcxLTEuMzk3IDYuMTA0LTQuMTkxbDguMzY0LTM4LjA0N2MxLjA2NS00Ljc5MS00LjI3Mi04LjQzNS04LjM1MS01LjY4M2wtNS4yNzIgMy41NzUtNi4xMTQtOS4wODRjLTMuOTE4LTUuNzY4LTEwLjQ0LTkuMjQzLTE3LjQ2My05LjI5Mi0uMjY1LS4wMDEtNTAuNjY2LS4xMjQtNTMuMjMuNjI2LTUuOTU5IDEuNTk0LTEwLjg5NSA1LjY5OC0xMy41NTIgMTEuMjY5bC0xNS42MzMgMzIuN0MxOTUuMTkzIDIzMS41OSAxOTcuNDggMjM4LjA1OSAyMDIuODU0IDI0MC42MnpNMjgwLjE0MiAxODguMTE5YzQuODY1LjAzNCA5LjM4OSAyLjQ0MSAxMi4wOTYgNi40MjZsNy45MzQgMTEuNzg3Yy45OSAxLjQ3MiAzLjAxIDEuOTA0IDQuNTMyLjg3N2w1LjczLTMuODg5LTcuNTcgMzQuNDM1LTM2LjM4My00Ljc0MyA1LjI1NC0zLjU1MmMxLjQ4Ni0xLjAwNiAxLjg4LTMuMDI1Ljg3OC00LjUxNS0uMTc5LS4yNjItMTguNjc1LTI3LjQ4NC0xOC40NjMtMjcuMjIzLTEuNjQxLTIuMTU0LTUtNS45OTctMTAuMTgzLTkuNDAzQzI1OS42MDggMTg4LjAyNCAyNTcuMjAxIDE4OC4wNTIgMjgwLjE0MiAxODguMTE5ek0yMDMuNjM4IDIyOS4wMDVsMTUuNjMxLTMyLjY5OGMxLjc0My0zLjY1NSA0LjkwNi02LjM5NiA4Ljc0My03LjYwNSAxMC4zMiAyLjAzIDE2LjgyOSA4LjA3IDE5Ljg5MyAxMS42NWwtMTkuMzcxIDQwLjU0NmMtMS4wMTUgMi4xNDEtMy42MDMgMy4wNTEtNS43NCAyLjAzOWwtMTcuMTMyLTguMTk0QzIwMy41MjMgMjMzLjcyNSAyMDIuNjE3IDIzMS4xNDggMjAzLjYzOCAyMjkuMDA1ek0yOTkuODMzIDI2MC4wMzRjLTQuOTA2IDMuMzkzLTYuMTUgMTAuMTQzLTIuNzc2IDE1LjA0NWwyMy40MjcgMzQuMTMxLTIzLjQ4OCAxLjYwNy0uNDE1LTUuODU0Yy0uMy00Ljk1NS02LjYwNi02Ljk5LTkuNzUzLTIuOTc3bC0yNC41NjIgMzIuMDk2Yy0xLjc3MyAyLjIwMi0xLjUyNCA1LjQzOS41OCA3LjM4bDI4Ljc2NSAyNi4yNjVjMy42MDMgMy4zMSA5LjQ0LjUzOCA5LjA5OS00LjM5MmwtLjQ2MS02LjM1MSAxMC45MjMtLjc1NmM2Ljk1NC0uNTA4IDEzLjIyNC00LjQxOCAxNi43NzgtMTAuNDc2LjE2OC0uMjg5IDI1LjQ1Ny00My44NjggMjYuMDc2LTQ2LjQxMyAxLjU5OC01Ljk1NS41MTEtMTIuMjgyLTIuOTg1LTE3LjM2OGwtMjAuNTAzLTI5Ljg5MWMtMy4zODctNC45MTMtMTAuMTM1LTYuMTY5LTE1LjAzNS0yLjc5NEwyOTkuODMzIDI2MC4wMzR6TTMyMi4zMjYgMzQyLjQ3MWMtMi40NjMgNC4xOTYtNi44MDkgNi45MTEtMTEuNjEzIDcuMjYybC0xNC4xNzMuOTc4Yy0xLjguMTI0LTMuMTUzIDEuNjg0LTMuMDI1IDMuNDg1bC41MDEgNi45MDgtMjYuMDM1LTIzLjc3MyAyMi4zLTI5LjEzOC40NDggNi4zMjdjLjEyNSAxLjc5IDEuNjc0IDMuMTI2IDMuNDcxIDMuMDE5LjI3My0uMDIxIDMzLjA3OC0yLjQyMiAzMi44MTMtMi4zNzggMi42ODctLjM0NyA3LjY5Mi0xLjMzNSAxMy4yMzEtNC4xMjFDMzMyLjc0MiAzMjQuNjIgMzMzLjgwOSAzMjIuNzE5IDMyMi4zMjYgMzQyLjQ3MXpNMzI1LjE3MSAyNTUuNzcybDIwLjUwMSAyOS44ODdjMi4yOTUgMy4zMzcgMy4wODYgNy40NDUgMi4yMTYgMTEuMzcxLTYuOTEzIDcuOTE4LTE1LjQwNCAxMC41NC0yMC4wMzUgMTEuNDA2bC0yNS40MjktMzcuMDQ3Yy0xLjM0My0xLjk1My0uODQ1LTQuNjQ0IDEuMTA0LTUuOTkxbDE1LjY2NC0xMC43NEMzMjEuMTQyIDI1My4zMTcgMzIzLjgyNiAyNTMuODE5IDMyNS4xNzEgMjU1Ljc3MnpNMTYwLjMgMjcyLjY3Nmw1LjczIDIuNzc3LTQuODA5IDkuODM5Yy0zLjAzNiA2LjI3OC0yLjc4NCAxMy42NjIuNjg0IDE5Ljc2Ny4xNjcuMjkyIDI1LjI0NyA0My45NiAyNy4xNiA0NS43ODkgNC40NzQgNC40NzcgMTAuNTY1IDYuNTc3IDE2LjUzMSA2LjA5OGwzNi4xMzktMi44MWM1Ljk0OS0uNDczIDEwLjQwNC01LjY4OSA5LjkzNi0xMS42MjNsLTEuNDY4LTE4Ljk0NWMtLjQ5MS01Ljk0Ni01LjcxLTEwLjM5OC0xMS42NDYtOS45MjdsLTQxLjI3MSAzLjIyMyAxMC4zNTMtMjEuMTQ0IDUuMjc3IDIuNTY2YzQuNDU1IDIuMjMgOS4zNDctMi4yNDEgNy40NTUtNi45NTlsLTE1LjUxNi0zNy4zMTdjLTEuMDItMi42MzUtMy45NTctNC4wMzgtNi42ODItMy4xODhsLTM3LjEzMSAxMS43ODFDMTU2LjM3MSAyNjQuMDY5IDE1NS44NjcgMjcwLjUxIDE2MC4zIDI3Mi42NzZ6TTIzOS4wNzIgMzIwLjEzNGMyLjM2Ni0uMjA2IDQuNDQzIDEuNTkyIDQuNjM5IDMuOTUybDEuNDY4IDE4LjkzNmMuMTg2IDIuMzU5LTEuNTkgNC40MzItMy45NTQgNC42MjFsLTM2LjEzNCAyLjgxYy00LjA0My4zMjYtNy45OTItMS4wNS0xMC45NTYtMy43NjctMy4zOTktOS45NS0xLjQyNy0xOC42MS4xNC0yMy4wNTNMMjM5LjA3MiAzMjAuMTM0ek0xOTkuMTg3IDI1Ny4zMzNsMTQuMDg0IDMzLjg4MS01LjcwMi0yLjc3M2MtMS42MTMtLjc4OS0zLjU2LS4xMTctNC4zNTEgMS40OTYtLjEyOC4yNjYtMTQuNDUgMjkuODY2LTE0LjM0NiAyOS42MDItMS4wNDMgMi41LTIuNjkyIDcuMzI5LTMuMDQ4IDEzLjUyMS04LjA4NS0xMy40MTMtNi44NzktMTEuMzgyLTE4LjI2Mi0zMS4yMzItMi40MDItNC4yMjgtMi41OC05LjM1LS40ODMtMTMuNjg3bDYuMjQyLTEyLjc2NGMuNzktMS42MjIuMTE5LTMuNTc0LTEuNTA2LTQuMzYybC02LjIzNC0zLjAxOUwxOTkuMTg3IDI1Ny4zMzN6Ii8+PC9nPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 620.4930675436298,
        height: 620.4930675436294,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#a1d51c": "rgba(118,144,103,1)",
          "#f8664f": "rgba(175,124,114,1)"
        }
      },
      {
        id: "Gv-wkC41z1",
        type: "text",
        x: 209.5296939807552,
        y: 58.00000000000004,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "What materials are compostable?",
        placeholder: "",
        fontSize: 122,
        fontFamily: "Sue Ellen Francisco",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 733,
        height: 244.00000000000006,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.0000000000000002,
        letterSpacing: 0
      },
      {
        id: "vFnk2j167g",
        type: "text",
        x: 596.0299407448965,
        y: 371.99999999999966,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "peels of all uncooked vegetables and fruits",
        placeholder: "",
        fontSize: 61,
        fontFamily: "Sue Ellen Francisco",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "justify",
        width: 410,
        height: 146.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "PWNQ3TJroE",
        type: "text",
        x: 596.0299407448965,
        y: 538,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "teabags, tea leaves, and coffee grounds",
        placeholder: "",
        fontSize: 61,
        fontFamily: "Sue Ellen Francisco",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "left",
        width: 410,
        height: 146.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "XNzfyqu4yT",
        type: "text",
        x: 596.0299407248965,
        y: 700,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "egg shells",
        placeholder: "",
        fontSize: 61,
        fontFamily: "Sue Ellen Francisco",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "justify",
        width: 410,
        height: 73.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "oKRQ7sxQNf",
        type: "text",
        x: 596.0299407448967,
        y: 800,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "dead flowers, dead leaves, and lawn mowings",
        placeholder: "",
        fontSize: 61,
        fontFamily: "Sue Ellen Francisco",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "left",
        width: 410,
        height: 219.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "SnD2eGIU1L",
        type: "svg",
        x: 510.64102317770994,
        y: 415.84102317770964,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 58.71795364457998,
        height: 58.71795364457996,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(221,192,136,1)"
        }
      },
      {
        id: "gIK7IQ4RMI",
        type: "svg",
        x: 517.3117403361753,
        y: 569.8410231777096,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 58.71795364457998,
        height: 58.71795364457996,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(221,192,136,1)"
        }
      },
      {
        id: "0meAu_pLuU",
        type: "svg",
        x: 517.3117403361753,
        y: 707.2410231777101,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 58.71795364457998,
        height: 58.71795364457996,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(221,192,136,1)"
        }
      },
      {
        id: "IS8CewNqFu",
        type: "svg",
        x: 517.3117403361753,
        y: 868,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 58.71795364457998,
        height: 58.71795364457996,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(221,192,136,1)"
        }
      },
      {
        id: "6oXvjFNlL3",
        type: "svg",
        x: -164.40224312986163,
        y: -185.80448625972258,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 390.175268176838,
        height: 390.17526817683824,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(229,201,174,1)"
        }
      },
      {
        id: "qpM1lxoNKY",
        type: "svg",
        x: 801.0299407348966,
        y: 964.1955137402774,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 390.175268176838,
        height: 390.17526817683824,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(229,201,174,1)"
        }
      }
    ],
    background: "rgba(250,234,220,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_101429.png?v=1740458696"
  },
  {
    id: "kjIr7GrVoo",
    elements: [
      {
        id: "OkEvLcB6At",
        type: "svg",
        x: 703.7945199657279,
        y: 1627.5844987383239,
        rotation: -126.03859721429089,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ3LjUgNDcuNSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDcuNSA0Ny41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgdmVyc2lvbj0iMS4xIiBpZD0ic3ZnMiI+PGRlZnMgaWQ9ImRlZnM2Ij48Y2xpcFBhdGggaWQ9ImNsaXBQYXRoMTYiIGNsaXBQYXRoVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBpZD0icGF0aDE4IiBkPSJNIDAsMzggMzgsMzggMzgsMCAwLDAgMCwzOCBaIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMS4yNSwwLDAsLTEuMjUsMCw0Ny41KSIgaWQ9ImcxMCI+PGcgaWQ9ImcxMiI+PGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXBQYXRoMTYpIiBpZD0iZzE0Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNiwyNSkiIGlkPSJnMjAiPjxwYXRoIGlkPSJwYXRoMjIiIHN0eWxlPSJmaWxsOiNiZGRkZjQ7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiIGQ9Im0gMCwwIGMgMCwzLjg2NiAtMy4xMzQsNyAtNyw3IC0xLjE2NywwIC0yLjI2NSwtMC4yOSAtMy4yMzIsLTAuNzk0IC0yLjA4MiwyLjgyNyAtNS40MjUsNC42NjkgLTkuMjA2LDQuNjY5IC01LjEzMiwwIC05LjQ3NCwtMy4zOCAtMTAuOTIyLC04LjAzNiBDIC0zMy4wMTgsMi4yMjIgLTM1LC0wLjE1NSAtMzUsLTMgYyAwLC0yLjk3OSAyLjE3NCwtNS40NDUgNS4wMjEsLTUuOTEzIDAuMjE2LC0zLjk0OSAzLjQ3NywtNy4wODcgNy40NzksLTcuMDg3IDIuMTc2LDAgNC4xMywwLjkzMyA1LjUsMi40MTMgMS4zNywtMS40OCAzLjMyMywtMi40MTMgNS41LC0yLjQxMyA0LjE0MywwIDcuNSwzLjM1NyA3LjUsNy41IDAsMC43MSAtMC4xMDUsMS4zOTQgLTAuMjg5LDIuMDQ1IEMgLTEuNzcsLTUuMzk2IDAsLTIuOTA1IDAsMCIvPjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4LDYpIiBpZD0iZzI0Ij48cGF0aCBpZD0icGF0aDI2IiBzdHlsZT0iZmlsbDojYmRkZGY0O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIiBkPSJtIDAsMCBjIDAsLTEuNjU3IC0xLjM0MywtMyAtMywtMyAtMS42NTcsMCAtMywxLjM0MyAtMywzIDAsMS42NTcgMS4zNDMsMyAzLDMgMS42NTcsMCAzLC0xLjM0MyAzLC0zIi8+PC9nPjwvZz48L2c+PC9nPgoJCgk8bWV0YWRhdGE+CgkJPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpyZGZzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzAxL3JkZi1zY2hlbWEjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgoJCQk8cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJCYWxsb29uLCBCdWJibGUsIENvbWljLCBUaG91Z2h0IiBkYzpkZXNjcmlwdGlvbj0iQmFsbG9vbiwgQnViYmxlLCBDb21pYywgVGhvdWdodCIgZGM6cHVibGlzaGVyPSJJY29uc2NvdXQiIGRjOmRhdGU9IjIwMTYtMTItMTQiIGRjOmZvcm1hdD0iaW1hZ2Uvc3ZnK3htbCIgZGM6bGFuZ3VhZ2U9ImVuIj4KCQkJCTxkYzpjcmVhdG9yPgoJCQkJCTxyZGY6QmFnPgoJCQkJCQk8cmRmOmxpPlR3aXR0ZXIgRW1vamk8L3JkZjpsaT4KCQkJCQk8L3JkZjpCYWc+CgkJCQk8L2RjOmNyZWF0b3I+CgkJCTwvcmRmOkRlc2NyaXB0aW9uPgoJCTwvcmRmOlJERj4KICAgIDwvbWV0YWRhdGE+PC9zdmc+Cg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 1883.9928708875138,
        height: 1883.9928708875145,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#bdddf4": "rgba(255,85,9,1)"
        }
      },
      {
        id: "lr4Pfsrnnn",
        type: "image",
        x: 953.1481900941665,
        y: 293.5096829647263,
        rotation: 90,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        width: 550.8642534588885,
        height: 826.2963801883328,
        src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/photo-1555939594-58d7cb561ad1.jpg?v=1740468494",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        cornerRadius: 0,
        flipX: false,
        flipY: false,
        clipSrc: "",
        borderColor: "rgba(255,255,255,1)",
        borderSize: 15
      },
      {
        id: "244yfcIEdQ",
        type: "text",
        x: 165.14819009416647,
        y: 144.08163569966322,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "FOOD DELIVERY",
        placeholder: "",
        fontSize: 89,
        fontFamily: "Fredoka One",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 788,
        height: 106.8,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "BEsaAVWRC_",
        type: "text",
        x: 329.14819009416664,
        y: 877.832266662743,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
        placeholder: "",
        fontSize: 41,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "right",
        width: 624,
        height: 98.39999999999999,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "JhS8bgvMpU",
        type: "svg",
        x: 58.85168191676393,
        y: 719.8149693867088,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 249.11793407381325,
        height: 249.11793407381322,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "EWyqfwGkNy",
        type: "text",
        x: 72.91064895367053,
        y: 766.8322666627429,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "50%OFF",
        placeholder: "",
        fontSize: 89,
        fontFamily: "Fredoka One",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 221,
        height: 160.20000000000005,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 0.9000000000000002,
        letterSpacing: 0
      }
    ],
    background: "rgba(0,0,0,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_111734.png?v=1740462474"
  },
  {
    id: "CAmIMtHDLs",
    elements: [
      {
        id: "HzgGpZS1sr",
        type: "svg",
        x: 560.8717844433703,
        y: -221.47786686762066,
        rotation: 16.693343670315716,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 911.1147172695369,
        height: 1058.1103401516193,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "H41Pmtm5Ub",
        type: "svg",
        x: 663.4076461579264,
        y: -0.4531127868296494,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDUxMiA1MTIiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjZDFkZmU4IiBkPSJNMzgxLjk2Myw1MTEuMjQ3Yy0yLjU2My0xLjUxOS0zLjQwNS00LjgyMy0xLjg5LTcuMzg0YzM2LjEyNi02MC45NiwxOC4yNjMtMTQ1LjE3OCwxOC4wNzktMTQ2LjAyMw0KCQkJYy0wLjYzNy0yLjkwOCwxLjIwNi01Ljc4MSw0LjExMS02LjQxOWMyLjg5NS0wLjYyNyw1Ljc4NCwxLjIwMyw2LjQxNiw0LjExM2MwLjc5NCwzLjYxNCwxOC45MzcsODkuMjQ4LTE5LjMzMSwxNTMuODI0DQoJCQlDMzg3LjgyNSw1MTEuOTMxLDM4NC41MTIsNTEyLjc1NSwzODEuOTYzLDUxMS4yNDd6Ii8+PHBhdGggZmlsbD0iI2Y3Yzk0YiIgZD0iTTQxOS4wNDIsMzQxLjU2OGwxNC44MDIsMTkuNjcxYzIuNjczLDMuNTUyLDAuMTM4LDguNjMtNC4zMDcsOC42M2gtNDcuNTkNCgkJCWMtNC40NDcsMC02Ljk4MS01LjA4Mi00LjMwNC04LjYzNGwxNC43ODktMTkuNjJjLTUwLjkxNC03LjUyMi05MC4yNjMtNTcuNjM2LTkwLjI2My0xMTguNDIzDQoJCQljMC02NS45NTgsNDYuMzU0LTExOS4zNjQsMTAzLjUyLTExOS4zNjRjNTcuMjE0LDAsMTAzLjYxNCw1My40MDUsMTAzLjYxNCwxMTkuMzY0DQoJCQlDNTA5LjMwNSwyODMuOTMyLDQ2OS45NTYsMzM0LjA0Niw0MTkuMDQyLDM0MS41Njh6Ii8+PHBhdGggZmlsbD0iI2QxZGZlOCIgZD0iTTgyLjQ4OSw1MTEuMjQ3Yy0yLjU2My0xLjUxOS0zLjQwNS00LjgyMy0xLjg5LTcuMzg0YzM2LjEyMS02MC45NiwxOC4yNjMtMTQ1LjE4MSwxOC4wNzktMTQ2LjAyMw0KCQkJYy0wLjYzNy0yLjkwOCwxLjIwNi01Ljc4MSw0LjExMS02LjQxOWMyLjg5NS0wLjYyNyw1Ljc4NCwxLjIwMyw2LjQxNiw0LjExM2MwLjc5NCwzLjYxNCwxOC45MzEsODkuMjQ4LTE5LjMzMSwxNTMuODI0DQoJCQlDODguMzUxLDUxMS45MzEsODUuMDM5LDUxMi43NTUsODIuNDg5LDUxMS4yNDd6Ii8+PHBhdGggZmlsbD0iI2JhZDg0ZSIgZD0iTTExOS41NjcsMzQxLjU2OGwxNC44MDIsMTkuNjcxYzIuNjczLDMuNTUyLDAuMTM4LDguNjMtNC4zMDcsOC42M0g4Mi40NzMNCgkJCWMtNC40NDcsMC02Ljk4MS01LjA4Mi00LjMwNC04LjYzNGwxNC43ODktMTkuNjJjLTUwLjkxNC03LjUyMS05MC4yNjMtNTcuNjM2LTkwLjI2My0xMTguNDIzDQoJCQljMC02NS45NTgsNDYuMzU0LTExOS4zNjQsMTAzLjUyLTExOS4zNjRjNTcuMjE0LDAsMTAzLjYxNCw1My40MDUsMTAzLjYxNCwxMTkuMzY0DQoJCQlDMjA5LjgzLDI4My45MzIsMTcwLjQ4MSwzMzQuMDQ2LDExOS41NjcsMzQxLjU2OHoiLz48cGF0aCBmaWxsPSIjZDFkZmU4IiBkPSJNMTg1Ljg4LDUwOS42NzRjLTEuNjk1LTIuNDQ4LTEuMDc5LTUuODA1LDEuMzY4LTcuNDk3DQoJCQljOTEuOTE2LTYzLjUyOSw2MS4xNDctMjA5LjY3OCw2MC44MjctMjExLjE0N2MtMC42MzctMi45MDgsMS4yMDYtNS43ODEsNC4xMTEtNi40MTljMi44ODktMC42MjksNS43ODQsMS4yMDMsNi40MTYsNC4xMTMNCgkJCWMxLjM3OSw2LjI4NiwzMi41NzksMTU0LjcyNC02NS4yMjcsMjIyLjMyMUMxOTAuOTM0LDUxMi43MzMsMTg3LjU2Niw1MTIuMTI3LDE4NS44OCw1MDkuNjc0eiIvPjxwYXRoIGZpbGw9IiNlMjg4N2QiIGQ9Ik0yNzEuMjUyLDI3Mi41NDVsMTcuOTIxLDIzLjgxNWMyLjY3MywzLjU1MiwwLjEzOCw4LjYzLTQuMzA3LDguNjNoLTU3LjcyMQ0KCQkJYy00LjQ0NywwLTYuOTgxLTUuMDgyLTQuMzA0LTguNjM0bDE3LjkwNy0yMy43NThjLTU4LjM2OC04LjYyNC0xMDMuNDc4LTY2LjA3NS0xMDMuNDc4LTEzNS43Ng0KCQkJQzEzNy4yNjksNjEuMjI0LDE5MC40MDksMCwyNTUuOTQ1LDBjNjUuNTksMCwxMTguNzg0LDYxLjIyNCwxMTguNzg0LDEzNi44MzlDMzc0LjczLDIwNi40NzEsMzI5LjYyLDI2My45MjMsMjcxLjI1MiwyNzIuNTQ1eiIvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 416.5923538420735,
        height: 416.5923538420736,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "Hd3g7AexI2",
        type: "svg",
        x: -110.85570082163657,
        y: 817.1365772734481,
        rotation: -35.20438531919837,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDYwIDYwIiB2aWV3Qm94PSIwIDAgNjAgNjAiPjxwYXRoIGZpbGw9IiNFNEU3RTciIGQ9Ik01MC44OTM0MzY0LDE5LjE2NzI1MTZjLTAuMjE4NzMwOSwwLTAuNDMxNzY2NSwwLjAzNzQ0NTEtMC42Mzc3NzU0LDAuMTA1NTE2NHY5LjYxNTcxMTIKCQljMC4yMDYwMDg5LDAuMDY4MDY5NSwwLjQxOTA0NDUsMC4xMDU1MTQ1LDAuNjM3Nzc1NCwwLjEwNTUxNDVDNTIuNjA5MDMxNywyOC45OTM5OTM4LDU0LDI2Ljc5NDIxNjIsNTQsMjQuMDgwNjIzNgoJCVM1Mi42MDkwMzE3LDE5LjE2NzI1MTYsNTAuODkzNDM2NCwxOS4xNjcyNTE2eiIvPjxwYXRoIGZpbGw9IiNCRjM5MkIiIGQ9Ik0yMS41NTcyODUzLDM2LjYwNzI1NGMtMC4wODU2MDU2LTAuNDE4NDIyNy0wLjQ1MzgzNjQtMC43MTg4NDU0LTAuODgwODg5OS0wLjcxODg0NTRoLTEuNjAzOTE0MwoJCQlsMC4zNTg1MzIsNC4zMDI3MzgyaDEuNzgwODIyOGMwLjU1NzMyOTIsMCwwLjk3NDUwNDUtMC41MTEyMzQzLDAuODYyNzM1Ny0xLjA1NzI2NjJMMjEuNTU3Mjg1MywzNi42MDcyNTR6Ii8+PHBhdGggZmlsbD0iI0U0RTdFNyIgZD0iTTIyLjE0OTQ5OTkgNTAuMTYzODI2Yy4xMTY2NjMuNjQxNTEzOC0uMzc4OTk5NyAxLjIzOTI0MjYtMS4wMzUxMDY3IDEuMjM5MjQyNmgtNC4xNjk3ODg0Yy0uNDk1NzUwNCAwLS45MzMxMjQ1LS4zNDk4OTkzLTEuMDIwNjAwMy0uODQ1NTYybC0zLjE0OTI3NjctMTYuNDMxNDExNy0uMjkxNTIzOS0xLjU2MDA0MzNoNi4yODM4NzA3bC4zMDYxMTggMS41NjAwNDMzTDIyLjE0OTQ5OTkgNTAuMTYzODI2ek02LjU1NjM1MTcgMTkuMjk0MTQ5NEM2LjIyNDk2MTMgMTkuMzk5OTU1NyA2IDE5LjcwNzg1MzMgNiAyMC4wNTU3OTU3djguMDY0MjQ5YzAgLjM0Nzk0MjQuMjI0OTYxMy42NTU4Mzk5LjU1NjM1MTcuNzYxNjQ2M2wyLjE4MDAyMjIuNjk1OTcyNFYxOC41OTgxNzVMNi41NTYzNTE3IDE5LjI5NDE0OTR6TTQ5LjQyODI1MzIgOS40Mjc5ODcxdjI5LjMxOTg2NjJjLS43NzI2ODIyLS4zNzkwODU1LTEuNTg5MTQxOC0uNzcyNjc4NC0yLjQ3ODU3NjctMS4xODA5NTQtNS4xNzU3OTI3LTIuMzc2NTEwNi0xMi40OTQ4NjE2LTUuMDQ0NjI4MS0yMy4wOTQyODIyLTYuMTM4MTExMS0uODMxMDU2Ni0uMDcyODc5OC0xLjY3NjcwNjMtLjE2MDM1NjUtMi41NTE0NTY1LS4yMTg2NDMyVjE2Ljk2NTY5NDRjLjg2MDE1NTEtLjA1ODI4NjcgMS43MjAzOTk5LS4xNDU3NjE1IDIuNTM2ODYzMy0uMjMzMjM2M2guMDE0NTkzMWMxMC41OTk0MjA1LTEuMDc4ODg3OSAxNy45MTg0ODk1LTMuNzQ3MDA3NCAyMy4wOTQyODIyLTYuMTIzNTE1MUM0Ny44MzkxMTEzIDEwLjIwMDY2NzQgNDguNjU1NTcxIDkuODA3MDc0NSA0OS40MjgyNTMyIDkuNDI3OTg3MXoiLz48cGF0aCBmaWxsPSIjQ0NEMEQyIiBkPSJNNDkuNDI4MjUzMiw5LjQyNzk4NzF2MjkuMzE5ODY2MmMtMC43NzI2ODIyLTAuMzc5MDg1NS0xLjU4OTE0MTgtMC43NzI2Nzg0LTIuNDc4NTc2Ny0xLjE4MDk1NFYxMC42MDg5NDMKCQkJQzQ3LjgzOTExMTMsMTAuMjAwNjY3NCw0OC42NTU1NzEsOS44MDcwNzQ1LDQ5LjQyODI1MzIsOS40Mjc5ODcxeiIvPjxwYXRoIGZpbGw9IiNFMjU3NEQiIGQ9Ik00OS40MzU1NTA3LDguNTk2OTI5NmMtMC44MDUyNTIxLDAtMS40NTc5NzczLDAuNjUyNzI1Mi0xLjQ1Nzk3NzMsMS40NTc5NzYzdjI4LjA2NjAyODYKCQkJYzAsMC44MDUyNTIxLDAuNjUyNzI1MiwxLjQ1Nzk3NzMsMS40NTc5NzczLDEuNDU3OTc3M3MxLjQ1Nzk3NzMtMC42NTI3MjUyLDEuNDU3OTc3My0xLjQ1Nzk3NzNWMTAuMDU0OTA1OQoJCQlDNTAuODkzNTI4LDkuMjQ5NjU0OCw1MC4yNDA4MDI4LDguNTk2OTI5Niw0OS40MzU1NTA3LDguNTk2OTI5NnoiLz48cGF0aCBmaWxsPSIjQ0NEMEQyIiBkPSJNMjQuMzk0ODM4MywxOC41MTExNDY1djExLjE1MzU0NzNjMCwwLjY1NjEwNjktMC4yMDQxMzc4LDEuMjY4NDMyNi0wLjUzOTQ0NCwxLjc2NDA5MzQKCQkJYy0wLjgzMTA1NjYtMC4wNzI4Nzk4LTEuNjc2NzA2My0wLjE2MDM1NjUtMi41NTE0NTY1LTAuMjE4NjQzMlYxNi45NjU2OTQ0CgkJCWMwLjg2MDE1NTEtMC4wNTgyODY3LDEuNzIwMzk5OS0wLjE0NTc2MTUsMi41MzY4NjMzLTAuMjMzMjM2M2gwLjAxNDU5MzEKCQkJQzI0LjE5MDcwMDUsMTcuMjQyNzEzOSwyNC4zOTQ4MzgzLDE3Ljg1NTAzOTYsMjQuMzk0ODM4MywxOC41MTExNDY1eiIvPjxwYXRoIGZpbGw9IiNFMjU3NEQiIGQ9Ik0yMS4xODcyNzQ5LDE2LjMyMDE3NzFIMTAuMjUyNDU4NmMtMS4yMDc4MzE0LDAtMi4xODY5NjQsMC45NzkxMzM2LTIuMTg2OTY0LDIuMTg2OTY0djExLjE2MTU1ODIKCQkJYzAsMS4yMDc4MzA0LDAuOTc5MTMyNywyLjE4Njk2MjEsMi4xODY5NjQsMi4xODY5NjIxaDEwLjkzNDgxNjRjMS4yMDc4MzA0LDAsMi4xODY5NjQtMC45NzkxMzE3LDIuMTg2OTY0LTIuMTg2OTYyMVYxOC41MDcxNDExCgkJCUMyMy4zNzQyMzksMTcuMjk5MzEwNywyMi4zOTUxMDU0LDE2LjMyMDE3NzEsMjEuMTg3Mjc0OSwxNi4zMjAxNzcxeiIvPjxwYXRoIGZpbGw9IiMyQjQxNEQiIGQ9Ik02LjM0MDI4OTEgMjAuMjY5MzI1M0g2LjAwMDAyOTZ2LjY0NDUzN2guMzQwMjU5NmMuMTc4MDY0OCAwIC4zMjIzMTM4LS4xNDQzMzY3LjMyMjMxMzgtLjMyMjMxMzNDNi42NjI2MDI5IDIwLjQxMzU3NDIgNi41MTgzNTM5IDIwLjI2OTMyNTMgNi4zNDAyODkxIDIwLjI2OTMyNTN6TTYuNjk4NDk0NCAyMi4wMTc0ODg1SDYuMDAwMDI5NnYuNjQ0NTM3aC42OTg0NjQ5Yy4xNzgwNjQ4IDAgLjMyMjMxMzgtLjE0NDI0OS4zMjIzMTM4LS4zMjIyMjM3QzcuMDIwODA4MiAyMi4xNjE4MjUyIDYuODc2NTU5MyAyMi4wMTc0ODg1IDYuNjk4NDk0NCAyMi4wMTc0ODg1ek03LjEwMzQ1MTcgMjMuNzY1NjQ5OEg2LjAwMDAyOTZ2LjY0NDUzODloMS4xMDM0MjIyYy4xNzgwNjQzIDAgLjMyMjMxMzgtLjE0NDI0OS4zMjIzMTM4LS4zMjIyMjM3QzcuNDI1NzY1NSAyMy45MDk5ODg0IDcuMjgxNTE2MSAyMy43NjU2NDk4IDcuMTAzNDUxNyAyMy43NjU2NDk4ek02LjY5ODQ5NDQgMjUuNTEzODEzSDYuMDAwMDI5NnYuNjQ0NTM4OWguNjk4NDY0OWMuMTc4MDY0OCAwIC4zMjIzMTM4LS4xNDQyNDkuMzIyMzEzOC0uMzIyMjIzN0M3LjAyMDgwODIgMjUuNjU4MTUxNiA2Ljg3NjU1OTMgMjUuNTEzODEzIDYuNjk4NDk0NCAyNS41MTM4MTN6TTYuMzQwMjg5MSAyNy4yNjE5NzYySDYuMDAwMDI5NnYuNjQ0NTM4OWguMzQwMjU5NmMuMTc4MDY0OCAwIC4zMjIzMTM4LS4xNDQyNDkuMzIyMzEzOC0uMzIyMjIzN0M2LjY2MjYwMjkgMjcuNDA2MzE0OCA2LjUxODM1MzkgMjcuMjYxOTc2MiA2LjM0MDI4OTEgMjcuMjYxOTc2MnoiLz48cG9seWdvbiBmaWxsPSIjQ0NEMEQyIiBwb2ludHM9IjE5LjA3MyAzNC4xMjYgMTIuNzc1IDM0LjEyNiAxMi40ODMgMzIuNTY2IDE4Ljc2NyAzMi41NjYiLz48cGF0aCBmaWxsPSIjRTRFN0U3IiBkPSJNMjAuMzMwMjM0NSwzMC4xOTc4MjA3aC04LjczNDc3MjdjLTAuMjkwMDExNCwwLTAuNTA3MzE5NSwwLjI2NTUzOTItMC40NTAwMTEzLDAuNTQ5ODU0MwoJCQlsMC40MDA4MDA3LDEuOTg3NDUxNmMwLjA0MzI0ODIsMC4yMTQxOTUzLDAuMjMxNDU3NywwLjM2ODMyMDUsMC40NTAwOTk5LDAuMzY4MzIwNWg3LjkzMjk5MjkKCQkJYzAuMjE4NjQzMiwwLDAuNDA2ODUwOC0wLjE1NDEyNTIsMC40NTAwOTk5LTAuMzY4MzIwNWwwLjQwMDgwMDctMS45ODc0NTE2CgkJCUMyMC44Mzc1NTMsMzAuNDYzMzU5OCwyMC42MjAyNDUsMzAuMTk3ODIwNywyMC4zMzAyMzQ1LDMwLjE5NzgyMDd6Ii8+PGNpcmNsZSBjeD0iMTIuODUzIiBjeT0iMzEuNjUxIiByPSIuNjgzIiBmaWxsPSIjNDc1RjZDIi8+PGNpcmNsZSBjeD0iMTkuMDcyIiBjeT0iMzEuNjUxIiByPSIuNjgzIiBmaWxsPSIjNDc1RjZDIi8+PHBhdGggZmlsbD0iI0NDRDBEMiIgZD0iTTIwLjczOTYwNjkgNDIuNzI4MDk2aC0yLjM3NjUwODdjLS4yNjI0MjQ1IDAtLjQ2NjU2MjMtLjIwNDEzNTktLjQ2NjU2MjMtLjQ2NjU2MDQgMC0uMjQ3ODMzMy4yMDQxMzc4LS40NTE5NjkxLjQ2NjU2MjMtLjQ1MTk2OTFoMi4yMDE1NTkxTDIwLjczOTYwNjkgNDIuNzI4MDk2ek0yMS4wODk1MDYxIDQ0LjU2NTE2MjdoLTIuNDA1Njk1Yy0uMjYyNDI0NSAwLS40NjY0NzQ1LS4yMDQxMzk3LS40NjY0NzQ1LS40NTE5NjkxIDAtLjI0NzgzMzMuMjA0MDUwMS0uNDUxOTY5MS40NjY0NzQ1LS40NTE5NjkxaDIuMjMwNzQ1M0wyMS4wODk1MDYxIDQ0LjU2NTE2Mjd6TTIxLjQzOTQwNTQgNDYuNDE2ODIwNWgtMi40NDkzODg1Yy0uMjQ3ODI5NCAwLS40NTE5NjcyLS4yMDQxMzk3LS40NTE5NjcyLS40NTE5NjkxIDAtLjI2MjQyODMuMjA0MTM3OC0uNDY2NTY0Mi40NTE5NjcyLS40NjY1NjQyaDIuMjc0NDM4OUwyMS40Mzk0MDU0IDQ2LjQxNjgyMDV6TTIxLjc3NDgwMTMgNDguMjUzODgzNGgtMi40NjM5ODE2Yy0uMjQ3OTIxIDAtLjQ1MTk2OTEtLjIwNDEzOTctLjQ1MTk2OTEtLjQ1MTk2OTEgMC0uMjQ3OTIxLjIwNDA0ODItLjQ1MjA2MDcuNDUxOTY5MS0uNDUyMDYwN2gyLjMwMzUzNTVMMjEuNzc0ODAxMyA0OC4yNTM4ODM0ek0yMi4xMjQ3MDA1IDUwLjEwNTQ0OTdoLTIuNDkzMTY5OGMtLjI0NzgzMTMgMC0uNDUxOTY5MS0uMjA0MTM1OS0uNDUxOTY5MS0uNDUxOTY5MSAwLS4yNjI0MjQ1LjIwNDEzNzgtLjQ2NjU2MDQuNDUxOTY5MS0uNDY2NTYwNGgyLjMxODIyMDFMMjIuMTI0NzAwNSA1MC4xMDU0NDk3eiIvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 480.7268855050434,
        height: 480.7268855050434,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#E2574D": "rgba(246,190,6,1)",
          "#BF392B": "rgba(245,123,35,1)"
        }
      },
      {
        id: "QK5d6SRyyB",
        type: "text",
        x: 368.9707728706107,
        y: 363.8482765049396,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "GRAND OPENING",
        placeholder: "",
        fontSize: 121.45042186983422,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(246,190,6,1)",
        align: "center",
        width: 688.4677825851878,
        height: 291.48101248760213,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "wzChgNA0WW",
        type: "text",
        x: 389.7889619830815,
        y: 655.3292889925416,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "COMING SOON YOU ARE INVITED",
        placeholder: "",
        fontSize: 35.935078017351785,
        fontFamily: "Montserrat",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 646.8314043602456,
        height: 43.12209362082214,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(80,227,194,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_121855.png?v=1740466145"
  },
  {
    id: "6IgpbAyNUu",
    elements: [
      {
        id: "ziV2bgM4SN",
        type: "svg",
        x: -124.95927800312879,
        y: 270.74221320929144,
        rotation: -11.636603281184208,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGcgZGF0YS1uYW1lPSJDYW5jZXIgUmliYm9uIj48cGF0aCBmaWxsPSIjNjhjN2QzIiBkPSJNNywzMVYyN0wzLDI2bDEzLjM3LTkuMTNBOC4zMiw4LjMyLDAsMCwwLDIwLDEwYTMsMywwLDAsMC0zLTNIMTZWMWgyYTgsOCwwLDAsMSw4LDgsMTYsMTYsMCwwLDEtNi43OCwxMy4zOVoiLz48cGF0aCBmaWxsPSIjMzBhY2MyIiBkPSJNMTYsMjQuNjZsLTEuNzMsMS4yMmEzMC44NiwzMC44NiwwLDAsMS01LjE4LTRsMS42OC0xLjE1QzEyLDIxLjksMTIuOCwyMi40LDE2LDI0LjY2WiIvPjxwYXRoIGZpbGw9IiM2OGM3ZDMiIGQ9Ik0yNSwzMVYyN2w0LTFMMTUuNjMsMTYuODdBOC4zMiw4LjMyLDAsMCwxLDEyLDEwYTMsMywwLDAsMSwzLTNoMVYxSDE0QTgsOCwwLDAsMCw2LDlhMTYsMTYsMCwwLDAsNi43OCwxMy4zOVoiLz48L2c+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 742.6720990699916,
        height: 742.6720990699918,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#68c7d3": "rgba(246,126,126,1)",
          "#30acc2": "rgba(221,105,105,1)"
        }
      },
      {
        id: "YTFePzzRvq",
        type: "text",
        x: 381.55497378781297,
        y: 202.65683170326315,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "OCTOBER",
        placeholder: "",
        fontSize: 116,
        fontFamily: "Oswald",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(39,37,37,1)",
        align: "center",
        width: 781,
        height: 139.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "nvm4iV2xej",
        type: "text",
        x: 527.7754403292535,
        y: 341.85683170326314,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "BREAST CANCER",
        placeholder: "",
        fontSize: 51,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(221,105,105,1)",
        align: "center",
        width: 506,
        height: 61.199999999999996,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "_zmO4hTwbv",
        type: "text",
        x: 510.77544030925344,
        y: 424.8097735341585,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "AWARENESS MONTH",
        placeholder: "",
        fontSize: 44,
        fontFamily: "Oswald",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(39,37,37,1)",
        align: "center",
        width: 540,
        height: 52.8,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0.2
      },
      {
        id: "cnwbmLP0aW",
        type: "text",
        x: 372.39484096665825,
        y: 114.73022535331941,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "early detection save lives",
        placeholder: "",
        fontSize: 60,
        fontFamily: "Dancing Script",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(246,126,126,1)",
        align: "center",
        width: 742,
        height: 72,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "GG3_8YFkSe",
        type: "svg",
        x: -23.928804819607844,
        y: 1015.4434391657283,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1119.1165951940777,
        height: 64.55656083427102,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(221,105,105,1)"
        }
      },
      {
        id: "usaUE3csZ-",
        type: "text",
        x: 240.77544030925355,
        y: 1028.5217195828636,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "www.website.com",
        placeholder: "",
        fontSize: 32,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(39,37,37,1)",
        align: "center",
        width: 540,
        height: 38.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(248,248,248,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_121606.png?v=1740466040"
  },
  {
    id: "1Ly7vV0zEo",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_132806.png?v=1740470329",
    elements: [
      {
        id: "WdmCHqnyoT",
        type: "image",
        x: 151.36359968644442,
        y: 116.70502449891444,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 790.4435323344286,
        height: 846.5899510021711,
        src: "https://images.unsplash.com/photo-1564485377539-4af72d1f6a2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwxMXx8TU9ERUx8ZW58MHx8fHwxNjIyNDQ4OTI4&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 0.7131406038765034,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "Rpe-NviDa3",
        type: "text",
        x: -1.3170731707280225,
        y: 40.23170731707441,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "TO -\nDAY",
        placeholder: "",
        fontSize: 73.46589693208504,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(253,252,252,1)",
        align: "center",
        width: 317.372674808267,
        height: 117.54543509133612,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 0.8000000000000003,
        letterSpacing: 0
      },
      {
        id: "AYDysWwzd_",
        type: "text",
        x: 495.21951217512515,
        y: 742.2585890073036,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: true,
        shadowBlur: 41,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "FLASH SALE",
        placeholder: "",
        fontSize: 75,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(253,248,248,1)",
        align: "center",
        width: 537.1646347279577,
        height: 90,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "XcdMdrjKCc",
        type: "text",
        x: 496.34161504682584,
        y: 791.7594388927466,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: true,
        shadowBlur: 41,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "FLASH SALE",
        placeholder: "",
        fontSize: 75,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(246,242,242,1)",
        align: "center",
        width: 537.1646347279577,
        height: 90,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "iU-qQCrhlc",
        type: "text",
        x: 507.7769837713025,
        y: 837.8923800414751,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: true,
        shadowBlur: 41,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "FLASH SALE",
        placeholder: "",
        fontSize: 77,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(250,246,246,1)",
        align: "center",
        width: 532.6800305391126,
        height: 92.39999999999999,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "nHpH9jsvGW",
        type: "text",
        x: 24.120163739341077,
        y: 816.813773307515,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "UP TO",
        placeholder: "",
        fontSize: 52.48097958082666,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,244,244,1)",
        align: "center",
        width: 226.71783179756812,
        height: 62.97717549699199,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "M-Xjb6RRoi",
        type: "text",
        x: -175.17073170731135,
        y: 848.302361056011,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "25%",
        placeholder: "",
        fontSize: 196.2169225061087,
        fontFamily: "Abril Fatface",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 789.0423433728405,
        height: 235.4603070073304,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "Jx72c0I9tc",
        type: "svg",
        x: 1011.7222392669506,
        y: 3.6795814328005783,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 4.438106591328893,
        height: 346.3835994895575,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "cubZXhIDhk",
        type: "text",
        x: 733.0050929329999,
        y: 71.08918538290979,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "www.shop.com",
        placeholder: "",
        fontSize: 28.846532596671054,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 219.4095412333541,
        height: 34.61583911600526,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(235,144,12,1)"
  },
  {
    id: "i6orjdfgna",
    name: "Fashion Template",
    background: "rgba(25,35,71,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_121546.png?v=1740466040",
    elements: [
      {
        id: "g0pkpGnlJd",
        type: "text",
        x: 123.49999999999997,
        y: 408,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Timmy Stays Up Late",
        placeholder: "",
        fontSize: 110,
        fontFamily: "Fredoka One",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,231,28,1)",
        align: "center",
        width: 833,
        height: 264,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "Z6EV4X4DLQ",
        type: "text",
        x: 269.99999998,
        y: 735.9502396865132,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Visit www.reallygreatsite.com today to order a copy.",
        placeholder: "",
        fontSize: 35,
        fontFamily: "Lato",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 540,
        height: 84,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "d2wSog7uKX",
        type: "text",
        x: 322.49999999999983,
        y: 280.4636900308075,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "RUFUS STEWART",
        placeholder: "",
        fontSize: 45,
        fontFamily: "Lato",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 435,
        height: 54,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "e6lGR7f8_l",
        type: "svg",
        x: 641.7282985934936,
        y: 27.055488880598503,
        rotation: -16.237076088301688,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PGcgZGF0YS1uYW1lPSJMYXllciAxIj48cGF0aCBmaWxsPSIjZGIxOTM1IiBkPSJNMTQsMjIuMzJhMS41NywxLjU3LDAsMCwwLDIuNjQsMS41NSwxLjM4LDEuMzgsMCwwLDAsLjM4LS42MiwxLjYsMS42LDAsMCwwLTEuMDUtMiwxLjU4LDEuNTgsMCwwLDAtMS4yMS4xMkExLjUzLDEuNTMsMCwwLDAsMTQsMjIuMzJaIi8+PHBhdGggZmlsbD0iI2RiMTkzNSIgZD0iTTE0LDIyLjMyYTEuNTcsMS41NywwLDAsMCwyLjY0LDEuNTUsMS4zOCwxLjM4LDAsMCwwLC4zOC0uNjIsMS42LDEuNiwwLDAsMC0xLjA1LTIsMS41OCwxLjU4LDAsMCwwLTEuMjEuMTJBMS41MywxLjUzLDAsMCwwLDE0LDIyLjMyWiIvPjxwYXRoIGZpbGw9IiMyMzFmMjAiIGQ9Ik0xNS40OCAyNC44N2EyLjE1IDIuMTUgMCAwIDEtLjYxLS4wOSAyLjA3IDIuMDcgMCAwIDEtMS4zNy0yLjYxaDBhMi4wNiAyLjA2IDAgMCAxIDEtMS4yMyAyLjEgMi4xIDAgMCAxIDEuNTktLjE2IDIuMTQgMi4xNCAwIDAgMSAxLjIzIDEgMi4xIDIuMSAwIDAgMSAuMTUgMS41OSAxLjkzIDEuOTMgMCAwIDEtLjUxLjgzQTIgMiAwIDAgMSAxNS40OCAyNC44N3ptMC0zLjE4YTEuMTcgMS4xNyAwIDAgMC0uNTEuMTMgMS4xMiAxLjEyIDAgMCAwLS41My42NGgwYTEuMTMgMS4xMyAwIDAgMCAuMDguODMgMSAxIDAgMCAwIC42My41MyAxLjA1IDEuMDUgMCAwIDAgMS4wOS0uMjkuOTIuOTIgMCAwIDAgLjI3LS40MyAxIDEgMCAwIDAtLjA4LS44MyAxLjEgMS4xIDAgMCAwLTEtLjU4ek0xNCAyMi4zMmgwek0xMi44OCA0My4yM2EuNTEuNTEgMCAwIDEtLjM2LS4xNS41LjUgMCAwIDEgMC0uN0wxOC4yIDM2LjdhLjUuNSAwIDAgMSAuNzEgMCAuNTEuNTEgMCAwIDEgMCAuNzFsLTUuNjggNS42N0EuNS41IDAgMCAxIDEyLjg4IDQzLjIzek0xMy40IDQ5LjIzYS40OS40OSAwIDAgMS0uMzUtLjE1LjUuNSAwIDAgMSAwLS43MWw1LjY4LTUuNjhhLjUuNSAwIDAgMSAuNyAwIC41LjUgMCAwIDEgMCAuNzFsLTUuNjggNS42OEEuNDcuNDcgMCAwIDEgMTMuNCA0OS4yM3oiLz48cGF0aCBmaWxsPSIjZGIxOTM1IiBkPSJNNTEsNDUuNzZjLS42MS43MS0yLC44My00LjIxLjIxLS41Ny0uMTctMS4xOC0uMzctMS44MS0uNjJhMS41OSwxLjU5LDAsMCwwLTEuMTEtMS43NCwxLjU3LDEuNTcsMCwwLDAtMS42OC41QTczLjE0LDczLjE0LDAsMCwxLDMyLDM3LjgxYy0yLjE4LTEuNTgtNC4zNi0zLjI5LTYuNDQtNS4wOWE4MC40MSw4MC40MSwwLDAsMS02LTUuNjdjLTEuMDctMS4xMi0yLTIuMTktMi44NS0zLjE4YTEuMzgsMS4zOCwwLDAsMCwuMzgtLjYyLDEuNiwxLjYsMCwwLDAtMS4wNS0yLDEuNTgsMS41OCwwLDAsMC0xLjIxLjEyYy0zLjQ0LTUtMi43Mi03LjY1LDIuNDktNi4xOWEyNi4xMSwyNi4xMSwwLDAsMSw0LDEuNTcsNTQuMTIsNTQuMTIsMCwwLDEsNC44OCwyLjY2LDk2LDk2LDAsMCwxLDE4LjQsMTQuNjlsLjEzLjE0QzUwLjE1LDQwLDUyLjM0LDQ0LjI0LDUxLDQ1Ljc2WiIvPjxwYXRoIGZpbGw9IiNkYjE5MzUiIGQ9Ik01MSw0NS43NmMtLjYxLjcxLTIsLjgzLTQuMjEuMjEtLjU3LS4xNy0xLjE4LS4zNy0xLjgxLS42MmExLjU5LDEuNTksMCwwLDAtMS4xMS0xLjc0LDEuNTcsMS41NywwLDAsMC0xLjY4LjVBNzMuMTQsNzMuMTQsMCwwLDEsMzIsMzcuODFjLTIuMTgtMS41OC00LjM2LTMuMjktNi40NC01LjA5YTgwLjQxLDgwLjQxLDAsMCwxLTYtNS42N2MtMS4wNy0xLjEyLTItMi4xOS0yLjg1LTMuMThhMS4zOCwxLjM4LDAsMCwwLC4zOC0uNjIsMS42LDEuNiwwLDAsMC0xLjA1LTIsMS41OCwxLjU4LDAsMCwwLTEuMjEuMTJjLTMuNDQtNS0yLjcyLTcuNjUsMi40OS02LjE5YTI2LjExLDI2LjExLDAsMCwxLDQsMS41N0MxNS44NiwxNy4zMiw5LjQ0LDIxLjM5LDUxLDQ1Ljc2WiIvPjxwYXRoIGZpbGw9IiMxNzU0ZGQiIGQ9Ik00Ni4yNSwzMC4yMmExMS44NSwxMS44NSwwLDAsMS0xLjc5LDMuNTdsLS4zNi0uMzdhOTYuNjUsOTYuNjUsMCwwLDAtMTcuNzItMTRBMTEuODIsMTEuODIsMCwwLDEsMzIuOTMsMTVhMTEuOCwxMS44LDAsMCwxLDUuNDUuMzZoMEExMS44NywxMS44NywwLDAsMSw0Ni4yNSwzMC4yMloiLz48cGF0aCBmaWxsPSIjMTc1NGRkIiBkPSJNNDYuMjUgMzAuMjJhMTEuODUgMTEuODUgMCAwIDEtMS43OSAzLjU3bC0uMzYtLjM3YzMuOTEtOC4zNi0xLjM4LTE0LjYyLTUuNjgtMThBMTEuODcgMTEuODcgMCAwIDEgNDYuMjUgMzAuMjJ6TTM2Ljc4IDQ0LjY4Yy03LTUuMS0xNC4wNi0xMC42My0yMC43Ny0xNi40M0EzOC4xOCAzOC4xOCAwIDAgMCAzNi43OCA0NC42OHoiLz48cGF0aCBmaWxsPSIjMTc1NGRkIiBkPSJNMzYuNzgsNDQuNjhjLTctNS4xLTE0LjA2LTEwLjYzLTIwLjc3LTE2LjQzQTM4LjE4LDM4LjE4LDAsMCwwLDM2Ljc4LDQ0LjY4WiIvPjxwYXRoIGZpbGw9IiMyMzFmMjAiIGQ9Ik00OC40OSw0NC4zNGEuNDguNDgsMCwwLDEtLjM2LS4xNkM0Ny45NCw0NCwyOC43LDIzLjkyLDE1LjQsMThhLjUuNSwwLDEsMSwuNC0uOTFjMTMuNDgsNiwzMi44NiwyNi4yMywzMy4wNSwyNi40M2EuNS41LDAsMCwxLDAsLjcxQS41Mi41MiwwLDAsMSw0OC40OSw0NC4zNFoiLz48cGF0aCBmaWxsPSIjZGIxOTM1IiBkPSJNNDEuODcsNDQuNjdhMS41OSwxLjU5LDAsMCwwLDMsLjkzLDEuMjMsMS4yMywwLDAsMCwuMDUtLjI1LDEuNTgsMS41OCwwLDAsMC0yLjc4LTEuMjRBMS41MywxLjUzLDAsMCwwLDQxLjg3LDQ0LjY3WiIvPjxwYXRoIGZpbGw9IiNkYjE5MzUiIGQ9Ik00MS44Nyw0NC42N2ExLjU5LDEuNTksMCwwLDAsMywuOTMsMS4yMywxLjIzLDAsMCwwLC4wNS0uMjUsMS41OCwxLjU4LDAsMCwwLTIuNzgtMS4yNEExLjUzLDEuNTMsMCwwLDAsNDEuODcsNDQuNjdaIi8+PHBhdGggZmlsbD0iIzIzMWYyMCIgZD0iTTQzLjQgNDcuMjFhMi4yMSAyLjIxIDAgMCAxLS42Mi0uMDkgMi4xMyAyLjEzIDAgMCAxLTEuMjMtMSAyLjA1IDIuMDUgMCAwIDEtLjE1LTEuNTloMEEyLjA3IDIuMDcgMCAwIDEgNDQgNDMuMTRhMi4wNyAyLjA3IDAgMCAxIDEuNDYgMi4yNyAyLjM2IDIuMzYgMCAwIDEtLjA3LjMzIDIuMDggMi4wOCAwIDAgMS0xIDEuMjNBMiAyIDAgMCAxIDQzLjQgNDcuMjF6bS0xLTIuNGExLjA4IDEuMDggMCAwIDAgLjczIDEuMzUgMS4wOCAxLjA4IDAgMCAwIDEuMzUtLjcxIDEuMjkgMS4yOSAwIDAgMCAwLS4xOSAxLjA5IDEuMDkgMCAwIDAtLjc2LTEuMTcgMS4xMiAxLjEyIDAgMCAwLTEuMzYuNzJ6TTI5LjYxIDE5LjQ0YS41MS41MSAwIDAgMS0uNDItLjIzLjUuNSAwIDAgMSAuMTUtLjY5IDExLjgxIDExLjgxIDAgMCAxIDExLjE5LTEgLjUuNSAwIDEgMS0uNDQuODkgMTEgMTEgMCAwIDAtMTAuMjEgMUEuNDUuNDUgMCAwIDEgMjkuNjEgMTkuNDR6TTIwLjQ1IDQ5Ljg2YS41LjUgMCAwIDEtLjM1LS4xNS41MS41MSAwIDAgMSAwLS43MWw1LjY4LTUuNjhhLjUuNSAwIDEgMSAuNzEuNzFsLTUuNjggNS42OEEuNTEuNTEgMCAwIDEgMjAuNDUgNDkuODZ6TTM3IDQ1LjE4bC0uMTYgMGEzOC44NCAzOC44NCAwIDAgMS0yMS0xNi42NS40OS40OSAwIDAgMSAuMTEtLjY0LjUuNSAwIDAgMSAuNjUgMEMyMy4wNyAzMy40OCAzMCAzOSAzNy4zMSA0NC4yOGEuNS41IDAgMCAxLS4yOS45ek0xOC43NSAzMS4wNWEzNy44OCAzNy44OCAwIDAgMCAxNSAxMS44NUMyOC41NiAzOS4wNSAyMy41NCAzNS4wNyAxOC43NSAzMS4wNXoiLz48cGF0aCBmaWxsPSIjMjMxZjIwIiBkPSJNNDQuOTEsMzQuNzVhLjU2LjU2LDAsMCwxLS4zMi0uMTEsMS4yOCwxLjI4LDAsMCwxLS4yLS4yMmwtLjI3LS4yNmE5NS42LDk1LjYsMCwwLDAtMTgtMTQuMzEuNTEuNTEsMCwwLDEtLjIzLS4zMy41Mi41MiwwLDAsMSwuMDgtLjQsMTIuMzgsMTIuMzgsMCwwLDEsMjAuODUsMS42LDEyLjI5LDEyLjI5LDAsMCwxLC45LDkuNDNoMGExMi4xOSwxMi4xOSwwLDAsMS0yLjQzLDQuNDJBLjQ5LjQ5LDAsMCwxLDQ0LjkxLDM0Ljc1Wk0yNy4xMiwxOS4yOGE5Ny41NSw5Ny41NSwwLDAsMSwxNy43LDE0LjE2bC4wNi4wNmExMS4yNiwxMS4yNiwwLDAsMCwxLjg4LTMuNjRoMEExMS4zNywxMS4zNywwLDAsMCwyNy4xMiwxOS4yOFoiLz48cGF0aCBmaWxsPSIjMjMxZjIwIiBkPSJNNDkuMjMsNDYuODdhOS44Nyw5Ljg3LDAsMCwxLTIuNTktLjQyYy0uNTktLjE3LTEuMjItLjM5LTEuODYtLjY0YS41LjUsMCwwLDEtLjMxLS41MywxLjA5LDEuMDksMCwwLDAtLjc2LTEuMTksMSwxLDAsMCwwLTEuMTQuMzQuNTEuNTEsMCwwLDEtLjYxLjEzLDcyLjUxLDcyLjUxLDAsMCwxLTEwLjI5LTYuMzRjLTIuMjctMS42NS00LjQ1LTMuMzctNi40OC01LjEyYTc5LjQxLDc5LjQxLDAsMCwxLTYuMDctNS43MWMtMS4xMy0xLjE4LTIuMDctMi4yMy0yLjg4LTMuMjFhLjQ5LjQ5LDAsMCwxLDAtLjY3LDEsMSwwLDAsMCwuMjUtLjQxLDEuMDksMS4wOSwwLDAsMC0uNzItMS4zNiwxLjE0LDEuMTQsMCwwLDAtLjgzLjA4LjUuNSwwLDAsMS0uNjQtLjE1Yy0yLjA5LTMuMDUtMi43LTUuMjItMS44Mi02LjQ2Ljc0LTEsMi4zNy0xLjIsNC44NS0uNWEzOS4yMywzOS4yMywwLDAsMSw5LDQuMjlBOTUuNjgsOTUuNjgsMCwwLDEsNDQuOSwzMy43N2wuMTQuMTVjNS4zMyw1LjU4LDcuNzIsOS45Miw2LjUzLDExLjlBMi41LDIuNSwwLDAsMSw0OS4yMyw0Ni44N1pNNDUuNDgsNDVjLjQ5LjE4LDEsLjM1LDEuNDQuNDgsMiwuNTcsMy4zOC41LDMuOC0uMTkuNjgtMS4xMy0uNi00LjYxLTYuNDItMTAuN2wtLjEzLS4xNWE5NC45NCw5NC45NCwwLDAsMC0xOC4yOS0xNC42LDM4LjU4LDM4LjU4LDAsMCwwLTguNzgtNC4xOGMtMi0uNTUtMy4zMS0uNTEtMy43Ni4xM3MwLDIuNjIsMS42LDVhMi4wOCwyLjA4LDAsMCwxLDEuMTYsMCwyLjExLDIuMTEsMCwwLDEsMS4yMywxLDIuMDYsMi4wNiwwLDAsMSwuMTYsMS41OSwyLDIsMCwwLDEtLjIyLjQ3Yy43My44NywxLjU5LDEuODIsMi41NywyLjg0YTgxLjQ5LDgxLjQ5LDAsMCwwLDYsNS42NGMyLDEuNzQsNC4xNywzLjQ0LDYuNDEsNS4wN2E3NS42LDc1LjYsMCwwLDAsOS44Myw2LjFBMiwyLDAsMCwxLDQ0LDQzLjE0LDIuMDcsMi4wNywwLDAsMSw0NS40OCw0NVoiLz48L2c+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 396.77051674141217,
        height: 396.7705167414131,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#1754dd": "rgba(221,161,23,1)"
        }
      },
      {
        id: "AqaghzscuO",
        type: "svg",
        x: -42.61632012431829,
        y: 694.7508206312837,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTUzMy4xNzggLTEwOTMuNzQyKSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNjg5LjA3MyAxMjEzLjE0NCkiPjxwYXRoIGZpbGw9IiNmYmZiZmIiIGQ9Im0gODQ4LjMzMywtNjkuNzU0ODkyIGEgMjguMDI1ODg3LDI4LjAyNTg4NyAwIDAgMSAyOC4wMjU4OSwtMjguMDI1ODg1IDI4LjAyNTg4NywyOC4wMjU4ODcgMCAwIDEgMjguMDI1ODgsMjguMDI1ODg2IGwgLTI4LjAyNTg4LDEwZS03IHoiLz48cGF0aCBmaWxsPSIjZjNmM2Y1IiBkPSJtIDg1NS4zMzMsLTY5Ljc1NDg5MSBhIDIxLjAyNTg4NywyMS4wMjU4ODcgMCAwIDEgMjEuMDI1ODksLTIxLjAyNTg4NiAyMS4wMjU4ODcsMjEuMDI1ODg3IDAgMCAxIDIxLjAyNTg4LDIxLjAyNTg4NiBsIC0yMS4wMjU4OCwxMGUtNyB6Ii8+PHBhdGggZmlsbD0iI2U4ZThlYyIgZD0ibSA4NTkuOTI5MTksLTY5Ljc1NDg5MSBhIDE2LjQyOTY5MywxNi40Mjk2OTMgMCAwIDEgMTYuNDI5NywtMTYuNDI5NjkzIDE2LjQyOTY5MywxNi40Mjk2OTMgMCAwIDEgMTYuNDI5NjksMTYuNDI5NjkzIGwgLTE2LjQyOTY5LDEwZS03IHoiLz48cGF0aCBmaWxsPSIjZGZkZmU1IiBkPSJtIDg2NS4wNTU3MiwtNjkuNzU0ODkxIGEgMTEuMzAzMTcsMTEuMzAzMTcgMCAwIDEgMTEuMzAzMTcsLTExLjMwMzE3IDExLjMwMzE3LDExLjMwMzE3IDAgMCAxIDExLjMwMzE3LDExLjMwMzE3IGwgLTExLjMwMzE3LDEwZS03IHoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMxMjE0MWEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTg1Mi41ODQ4LTcwLjI5MjMxNWw0My41MDM5MiAwTTg5OC43OTkxLTcwLjI5MjMxNWwyLjA2NDExIDBNODQ4LjMzMy03MC4yOTIzMTVsNS43MDQ1MSAwIi8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTZlNmU2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik04NjUuNjE2OTctNjguMjI0OTI1bDE5LjczNDczIDBNODY4LjE3ODczLTY2LjIwMjQ4NWw1LjI2MzAxIDBNODc1LjkwODk2LTY2LjIwMjQ4NWw3LjA2MDc1IDBNODcwLjg2MDYxLTY0LjEyNTM0NWw1LjExNjA5IDAiLz48cGF0aCBmaWxsPSIjZmMwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0YiIgZD0iTTg3NS40MTU1NC05OC43MTg3OGMtLjE3MjYyLjAwMy0uMzEwMzcuMTQ0ODEtLjMwNzY3LjMxNzQyIDAgLjIxNjcxLS4wOTI2LjMxNDk5LS4zMDc2NS4zMTQ5OS0uNDIyNzMtLjAwNi0uNDIyNzMuNjMxMTMgMCAuNjI1MDkuMjA3MDcgMCAuMzA3NjUuMDU3My4zMDc2NS4zMDE1NS0uMDA2LjQyMjY2LjYzMTA3LjQyMjY2LjYyNTA5IDAgMC0uMjIxNzcuMTAzNzctLjMwMTU1LjMwODg4LS4zMDE1NS40MjI3My4wMDYuNDIyNzMtLjYzMTEzIDAtLjYyNTA5LS4yNzg2OSAwLS4zMDg4OC0uMTU5NDQtLjMwODg4LS4zMTQ5OS4wMDItLjE3NjQ0LS4xNDA5OC0uMzIwMTgtLjMxNzQyLS4zMTc0MnpNODYxLjgxNjY5LTk1LjQ2MjEzNGMtLjIzNjkyLjAwNC0uNDI1OTguMTk4NzUtLjQyMjI3LjQzNTY3IDAgLjI5NzQyLS4xMjcwOS40MzIzMS0uNDIyMjUuNDMyMzEtLjU4MDE4LS4wMDgtLjU4MDE4Ljg2NjIxIDAgLjg1NzkyLjI4NDIgMCAuNDIyMjUuMDc4Ny40MjIyNS40MTM4OC0uMDA4LjU4MDA5Ljg2NjEzLjU4MDA5Ljg1NzkyIDAgMC0uMzA0MzguMTQyNDItLjQxMzg4LjQyMzkzLS40MTM4OC41ODAxOS4wMDkuNTgwMTktLjg2NjIxIDAtLjg1NzkyLS4zODI0OSAwLS40MjM5My0uMjE4ODQtLjQyMzkzLS40MzIzMS4wMDMtLjI0MjE3LS4xOTM0OS0uNDM5NDYtLjQzNTY1LS40MzU2N3oiIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48cGF0aCBmaWxsPSIjMTIxNDFhIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0YiIgZD0ibSA4NTkuMjE4MzksLTg3LjU5ODE4NCBjIC0wLjEzMDA3LDAuMDAyIC0wLjIzMzg3LDAuMTA5MTIgLTAuMjMxODMsMC4yMzkxOCAwLDAuMTYzMjkgLTAuMDY5OCwwLjIzNzM0IC0wLjIzMTgxLDAuMjM3MzQgLTAuMzE4NTMsLTAuMDA1IC0wLjMxODUzLDAuNDc1NTUgMCwwLjQ3MSAwLjE1NjAyLDAgMC4yMzE4MSwwLjA0MzIgMC4yMzE4MSwwLjIyNzIyIC0wLjAwNSwwLjMxODQ4IDAuNDc1NTEsMC4zMTg0OCAwLjQ3MSwwIDAsLTAuMTY3MSAwLjA3ODIsLTAuMjI3MjIgMC4yMzI3NCwtMC4yMjcyMiAwLjMxODUzLDAuMDA1IDAuMzE4NTMsLTAuNDc1NTUgMCwtMC40NzEgLTAuMjA5OTksMCAtMC4yMzI3NCwtMC4xMjAxNCAtMC4yMzI3NCwtMC4yMzczNCAwLjAwMiwtMC4xMzI5NSAtMC4xMDYyMywtMC4yNDEyNiAtMC4yMzkxNywtMC4yMzkxOCB6IiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PHBhdGggZmlsbD0iI2ZmOGUwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtdHJhbnNmb3JtOm5vbmU7YmxvY2stcHJvZ3Jlc3Npb246dGIiIGQ9Im0gODYxLjQ4MDIyLC0xMDcuNTg3OTUgYyAtMC4xNzI2MiwwLjAwMyAtMC4zMTAzNywwLjE0NDgxIC0wLjMwNzY3LDAuMzE3NDMgMCwwLjIxNjcgLTAuMDkyNiwwLjMxNDk4IC0wLjMwNzY1LDAuMzE0OTggLTAuNDIyNzMsLTAuMDA2IC0wLjQyMjczLDAuNjMxMTMgMCwwLjYyNTA5IDAuMjA3MDcsMCAwLjMwNzY1LDAuMDU3MyAwLjMwNzY1LDAuMzAxNTYgLTAuMDA2LDAuNDIyNjYgMC42MzEwNywwLjQyMjY2IDAuNjI1MDksMCAwLC0wLjIyMTc3IDAuMTAzNzcsLTAuMzAxNTYgMC4zMDg4OCwtMC4zMDE1NiAwLjQyMjczLDAuMDA2IDAuNDIyNzMsLTAuNjMxMTMgMCwtMC42MjUwOSAtMC4yNzg2OSwwIC0wLjMwODg4LC0wLjE1OTQ0IC0wLjMwODg4LC0wLjMxNDk4IDAuMDAyLC0wLjE3NjQ0IC0wLjE0MDk4LC0wLjMyMDE5IC0wLjMxNzQyLC0wLjMxNzQzIHoiIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48cGF0aCBmaWxsPSIjMTIxNDFhIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0YiIgZD0ibSA4ODEuMjE2MjUsLTEwOC4xOTc0IGMgLTAuMTMwMDcsMC4wMDIgLTAuMjMzODcsMC4xMDkxMiAtMC4yMzE4MywwLjIzOTE4IDAsMC4xNjMyOSAtMC4wNjk4LDAuMjM3MzQgLTAuMjMxODIsMC4yMzczNCAtMC4zMTg1MiwtMC4wMDUgLTAuMzE4NTIsMC40NzU1NSAwLDAuNDcxIDAuMTU2MDMsMCAwLjIzMTgyLDAuMDQzMiAwLjIzMTgyLDAuMjI3MjIgLTAuMDA1LDAuMzE4NDggMC40NzU1MSwwLjMxODQ4IDAuNDcxLDAgMCwtMC4xNjcxIDAuMDc4MiwtMC4yMjcyMiAwLjIzMjc0LC0wLjIyNzIyIDAuMzE4NTMsMC4wMDUgMC4zMTg1MywtMC40NzU1NSAwLC0wLjQ3MSAtMC4yMDk5OSwwIC0wLjIzMjc0LC0wLjEyMDE0IC0wLjIzMjc0LC0wLjIzNzM0IDAuMDAyLC0wLjEzMjk0IC0wLjEwNjIzLC0wLjI0MTI2IC0wLjIzOTE3LC0wLjIzOTE4IHoiIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48cGF0aCBmaWxsPSIjZmY4ZTAwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0YiIgZD0ibSA4OTAuNTUzOCwtMTAyLjAxMzMyIGMgLTAuMTcyNjIsMC4wMDMgLTAuMzEwMzcsMC4xNDQ4MSAtMC4zMDc2NywwLjMxNzQzIDAsMC4yMTY3IC0wLjA5MjYsMC4zMTQ5OCAtMC4zMDc2NSwwLjMxNDk4IC0wLjQyMjczLC0wLjAwNiAtMC40MjI3MywwLjYzMTEzIDAsMC42MjUwOSAwLjIwNzA3LDAgMC4zMDc2NSwwLjA1NzMgMC4zMDc2NSwwLjMwMTU2IC0wLjAwNiwwLjQyMjY2IDAuNjMxMDcsMC40MjI2NiAwLjYyNTA5LDAgMCwtMC4yMjE3NyAwLjEwMzc3LC0wLjMwMTU2IDAuMzA4ODgsLTAuMzAxNTYgMC40MjI3MywwLjAwNiAwLjQyMjczLC0wLjYzMTEzIDAsLTAuNjI1MDkgLTAuMjc4NjksMCAtMC4zMDg4OCwtMC4xNTk0NCAtMC4zMDg4OCwtMC4zMTQ5OCAwLjAwMiwtMC4xNzY0NCAtMC4xNDA5OCwtMC4zMjAxOSAtMC4zMTc0MiwtMC4zMTc0MyB6IiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PHBhdGggZmlsbD0iIzEyMTQxYSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtdHJhbnNmb3JtOm5vbmU7YmxvY2stcHJvZ3Jlc3Npb246dGIiIGQ9Im0gODg3LjkzODM1LC05NC4wMzg0MzkgYyAtMC4xMzAwNywwLjAwMiAtMC4yMzM4NiwwLjEwOTEyIC0wLjIzMTgzLDAuMjM5MTggMCwwLjE2MzI5IC0wLjA2OTgsMC4yMzczNSAtMC4yMzE4MSwwLjIzNzM1IC0wLjMxODUzLC0wLjAwNSAtMC4zMTg1MywwLjQ3NTU1IDAsMC40NzA5OSAwLjE1NjAzLDAgMC4yMzE4MSwwLjA0MzIgMC4yMzE4MSwwLjIyNzIzIC0wLjAwNSwwLjMxODQ3IDAuNDc1NTEsMC4zMTg0NyAwLjQ3MSwwIDAsLTAuMTY3MTEgMC4wNzgyLC0wLjIyNzIzIDAuMjMyNzQsLTAuMjI3MjMgMC4zMTg1MywwLjAwNSAwLjMxODUzLC0wLjQ3NTU1IDAsLTAuNDcwOTkgLTAuMjA5OTksMCAtMC4yMzI3NCwtMC4xMjAxNCAtMC4yMzI3NCwtMC4yMzczNSAwLjAwMiwtMC4xMzI5NCAtMC4xMDYyMiwtMC4yNDEyNiAtMC4yMzkxNywtMC4yMzkxOCB6IiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PHBhdGggZmlsbD0iI2ZmOGUwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtdHJhbnNmb3JtOm5vbmU7YmxvY2stcHJvZ3Jlc3Npb246dGIiIGQ9Im0gODg3LjYwNDc2LC04Ni4yMDE0MzYgYyAtMC4yMzY5MiwwLjAwNCAtMC40MjU5NywwLjE5ODc1IC0wLjQyMjI3LDAuNDM1NjYgMCwwLjI5NzQzIC0wLjEyNzA5LDAuNDMyMzEgLTAuNDIyMjQsMC40MzIzMSAtMC41ODAxOSwtMC4wMDggLTAuNTgwMTksMC44NjYyMSAwLDAuODU3OTIgMC4yODQyLDAgMC40MjIyNCwwLjA3ODcgMC40MjIyNCwwLjQxMzg4IC0wLjAwOCwwLjU4MDEgMC44NjYxMywwLjU4MDEgMC44NTc5MiwwIDAsLTAuMzA0MzcgMC4xNDI0MywtMC40MTM4OCAwLjQyMzk0LC0wLjQxMzg4IDAuNTgwMTgsMC4wMDkgMC41ODAxOCwtMC44NjYyIDAsLTAuODU3OTIgLTAuMzgyNSwwIC0wLjQyMzk0LC0wLjIxODgzIC0wLjQyMzk0LC0wLjQzMjMxIDAuMDAzLC0wLjI0MjE2IC0wLjE5MzQ5LC0wLjQzOTQ1IC0wLjQzNTY1LC0wLjQzNTY2IHoiIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48cGF0aCBmaWxsPSIjZmMwIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0YiIgZD0ibSA4NjMuNzQyOTcsLTEwMi4xMDk0IGMgLTAuMTcyNjIsMC4wMDMgLTAuMzEwMzcsMC4xNDQ4MSAtMC4zMDc2NywwLjMxNzQzIDAsMC4yMTY3IC0wLjA5MjYsMC4zMTQ5OCAtMC4zMDc2NSwwLjMxNDk4IC0wLjQyMjczLC0wLjAwNiAtMC40MjI3MywwLjYzMTEzIDAsMC42MjUwOSAwLjIwNzA3LDAgMC4zMDc2NSwwLjA1NzMgMC4zMDc2NSwwLjMwMTU1IC0wLjAwNiwwLjQyMjY2IDAuNjMxMDcsMC40MjI2NiAwLjYyNTA5LDAgMCwtMC4yMjE3NiAwLjEwMzc3LC0wLjMwMTU1IDAuMzA4ODgsLTAuMzAxNTUgMC40MjI3MywwLjAwNiAwLjQyMjczLC0wLjYzMTEzIDAsLTAuNjI1MDkgLTAuMjc4NjksMCAtMC4zMDg4OCwtMC4xNTk0NCAtMC4zMDg4OCwtMC4zMTQ5OCAwLjAwMiwtMC4xNzY0NCAtMC4xNDA5OCwtMC4zMjAxOSAtMC4zMTc0MiwtMC4zMTc0MyB6IiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PHBhdGggZmlsbD0iIzEyMTQxYSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtdHJhbnNmb3JtOm5vbmU7YmxvY2stcHJvZ3Jlc3Npb246dGIiIGQ9Im0gODcxLjQxNjI3LC0xMTEuMTc4NjkgYyAtMC4xMzM0MSwwLjAwMiAtMC4yMzk4OCwwLjExMTkyIC0wLjIzNzc5LDAuMjQ1MzMgMCwwLjE2NzQ4IC0wLjA3MTYsMC4yNDM0NCAtMC4yMzc3NywwLjI0MzQ0IC0wLjMyNjcyLC0wLjAwNSAtMC4zMjY3MiwwLjQ4Nzc4IDAsMC40ODMxMSAwLjE2MDAzLDAgMC4yMzc3NywwLjA0NDMgMC4yMzc3NywwLjIzMzA2IC0wLjAwNCwwLjMyNjY2IDAuNDg3NzQsMC4zMjY2NiAwLjQ4MzExLDAgMCwtMC4xNzEzOSAwLjA4MDMsLTAuMjMzMDYgMC4yMzg3MiwtMC4yMzMwNiAwLjMyNjcyLDAuMDA1IDAuMzI2NzIsLTAuNDg3NzggMCwtMC40ODMxMSAtMC4yMTUzOCwwIC0wLjIzODcyLC0wLjEyMzIyIC0wLjIzODcyLC0wLjI0MzQ0IDEwZS00LC0wLjEzNjM3IC0wLjEwODk5LC0wLjI0NzQ3IC0wLjI0NTMyLC0wLjI0NTMzIHoiIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48L2c+PHBhdGggZmlsbD0iIzBjZiIgZD0ibSAxNTYzLjUwMDEsMTEyMy4zNzc4IGMgLTUuNTIyNywwIC05Ljk5OTksNC42OTk1IC05Ljk5OTksMTAuNDk5NyAwLDEuMzY0OSAwLjI2LDIuNzE1NCAwLjc1NDUsMy45NzgyIDEuNTM5MywtMy45Mzg0IDUuMTkxLC02LjUxMTIgOS4yNDU0LC02LjUxMjcgNC4wNTcyLDAgNy43MDg5LDIuNTgwMSA5LjI0NTQsNi41MjE0IDAuNDk3MiwtMS4yNjU3IDAuNzUzMSwtMi42MTkxIDAuNzU0NSwtMy45ODY5IDAsLTUuODAwMiAtNC40NzU4LC0xMC40OTk3IC05Ljk5OTksLTEwLjQ5OTcgeiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Im0gMTU2My43MTg4LDExMjMuMzYyMiBjIDAuMjUwNywwIDAuNTAzOSwwLjAxMiAwLjc1LDAuMDMxIC01LjE3NTcsMC40MDAyIC05LjI1LDQuOTMxOCAtOS4yNSwxMC40Njg3IDdlLTQsMC43MTc2IDAuMDgsMS40NTcyIDAuMjE4OCwyLjE1NjMgLTAuMzY3LDAuNTc2OSAtMC43MTIsMS4xODUxIC0wLjk2ODgsMS44NDM3IC0wLjQ5NzIsLTEuMjY1NyAtMC43NDg2LC0yLjYzMjIgLTAuNzUsLTQgMCwtNS44MDAyIDQuNDc1OSwtMTAuNSAxMCwtMTAuNSB6Ii8+PHBhdGggZmlsbD0iIzAwNTVkNCIgZD0ibSAxNTY1LjIxODgsMTEzMS4zMzEgYyAzLjM3NjksMCA2LjQ1MDksMS44MTU0IDguMjgxMiw0LjY4NzUgLTAuMTI2MSwwLjYyMjkgLTAuMjk5NCwxLjI1MTggLTAuNTMxMiwxLjg0MzcgLTEuNDQzMSwtMy42OTIyIC00Ljc1MjUsLTYuMjAxNyAtOC41LC02LjUgMC4yNSwtMC4wMiAwLjQ5NjQsLTAuMDMxIDAuNzUsLTAuMDMxIHoiLz48cGF0aCBmaWxsPSIjMDA1NWQ0IiBkPSJtIDE1NjMuNSwxMTIzLjM2MjIgYyAtMC4yNTA3LDAgLTAuNTAzOSwwLjAxMiAtMC43NSwwLjAzMSA1LjE3NTcsMC40MDAyIDkuMjUsNC45MzE4IDkuMjUsMTAuNDY4NyAtN2UtNCwwLjcxNzYgLTAuMDgsMS40NTcyIC0wLjIxODgsMi4xNTYzIDAuMzY3LDAuNTc2OSAwLjcxMiwxLjE4NTEgMC45Njg4LDEuODQzNyAwLjQ5NzIsLTEuMjY1NyAwLjc0ODYsLTIuNjMyMiAwLjc1LC00IDAsLTUuODAwMiAtNC40NzU5LC0xMC41IC0xMCwtMTAuNSB6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0ibSAxNTYyLDExMzEuMzMxIGMgLTMuMzc2OSwwIC02LjQ1MDksMS44MTU0IC04LjI4MTIsNC42ODc1IDAuMTI2MSwwLjYyMjkgMC4yOTk0LDEuMjUxOCAwLjUzMTIsMS44NDM3IDEuNDQzMSwtMy42OTIyIDQuNzUyNSwtNi4yMDE3IDguNSwtNi41IC0wLjI1LC0wLjAyIC0wLjQ5NjQsLTAuMDMxIC0wLjc1LC0wLjAzMSB6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTIxNDFhIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAwIiBkPSJtIDE1NjMuNTAwMSwxMTIzLjM3NzggYyAtNS41MjI3LDAgLTkuOTk5OSw0LjY5OTUgLTkuOTk5OSwxMC40OTk3IDAsMS4zNjQ5IDAuMjYsMi43MTU0IDAuNzU0NSwzLjk3ODIgMS41MzkzLC0zLjkzODQgNS4xOTEsLTYuNTExMiA5LjI0NTQsLTYuNTEyNyA0LjA1NzIsMCA3LjcwODksMi41ODAxIDkuMjQ1NCw2LjUyMTQgMC40OTcyLC0xLjI2NTcgMC43NTMxLC0yLjYxOTEgMC43NTQ1LC0zLjk4NjkgMCwtNS44MDAyIC00LjQ3NTgsLTEwLjQ5OTcgLTkuOTk5OSwtMTAuNDk5NyB6Ii8+PHBhdGggZmlsbD0iIzBjZiIgZD0ibSAxNTYzLjg1MzEsMTEwNi44NiBjIC00LjQ1ODksMy45MzA1IC03LjM1MSw5LjM3NTEgLTcuMzUzMSwxNS4wNzEgMC4wMTIsMy41NzkzIDEuMDg2OSw3LjI1NjQgMi45OTYxLDEwLjM3MjIgMS4yOTA1LC0wLjUyNzkgMi42MDcsLTAuOTU3MyA0LjAwMzksLTAuOTYwMiAxLjQwNTMsMCAyLjc5NjcsMC4yNzQ1IDQuMDkyOCwwLjgwNDUgMS45MDI5LC0zLjExODcgMi45MDQ0LC02LjYzNzIgMi45MDcyLC0xMC4yMTY1IC0wLjAxMSwtNS42OTgxIC0yLjE3NzYsLTExLjE0NDkgLTYuNjQ2OSwtMTUuMDcxIHoiLz48cGF0aCBmaWxsPSIjMDBlN2ZmIiBkPSJtIDE1NjMuOTA3MiwxMTA2Ljg2IGMgLTIuMzMwNSwzLjY4MDUgLTQuMjYyNyw5LjU2MjYgLTQuMjYzMiwxNS4yNTg1IDAsMy41NzkzIDIuOTIwNCw3LjA2ODkgMy4zMjk1LDEwLjE4NDcgMC4yNzY1LC0wLjUyNzkgMC41NTg3LC0wLjk1NzMgMC44NTgsLTAuOTYwMiAwLjMwMTEsMCAwLjU5OTMsMC4yNzQ1IDAuODc3LDAuODA0NSAwLjQwNzgsLTMuMTE4NyAtMi4wNjUxLC02LjQ0OTcgLTIuMDY0NSwtMTAuMDI5IDAsLTUuNjk4MSAtMC4wOTIsLTExLjU4MjQgMS4yNjMyLC0xNS4yNTg1IHoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJtIDE1NjMuODk1OCwxMTA2Ljg2MjIgYyAtNS44Njg1LDguNTM4OCAtNS4zNDk2LDE2LjE3MjkgLTEuODk1OCwyNC41IDAuMjc2LC0wLjE2OTMgMC41NTI2LC0wLjMzMDUgMC44MzMzLC0wLjQ2ODggLTMuNzI1NCwtNy42MTk5IC0zLjQwMzYsLTE2LjczMDMgMS4xNjY3LC0yMy41MzEyIC0wLjE2MTMsLTAuMjM1NiAwLjA2NywtMC4yNzQyIC0wLjEwNDIsLTAuNSB6Ii8+PHBhdGggZmlsbD0iIzAwNTVkNCIgZD0ibSAxNTY0LDExMDcuMzYyMiBjIDQuNDU5LDMuOTMwNSA2LjY1NDMsOC44NjY2IDYuNjU2MywxNC41NjI1IC0wLjAxMiwzLjU3OTMgLTEuMDkwOCw3LjI1OTEgLTMsMTAuMzc1IC0wLjY3MSwtMS42NDc4IC00LjY1NjMsLTEuNSAtNi42NTYzLC0wLjUwMDUgMTEuNTA4LC01LjI3NzcgOC4yMDI0LC0xOC44NzYgMi42ODkxLC0yNC4zNjg0IDAuMjQxOSwtMC4yMzU2IDAuMDU0LDAuMTU2NyAwLjMxMDksLTAuMDY5IHogbSAtMS44NDM3LDIzLjk2ODggYyAwLjIwMTIsNGUtNCAwLjM5NTYsMC4wNDYgMC41OTM4LDAuMDYyIC0xLjA5NzksMC4wOTEgLTAuMTY3OSwtMC4yMjk1IC0xLjE4NzYsMC4xODc2IC0wLjA4MSwtMC4xMzI2IC0wLjE0MTEsLTAuMjcyMyAtMC4yMTg3LC0wLjQwNjMgMC45MTc0LC0wLjI0OCAtMC4xNDMzLDAuMTU2MiAwLjgxMjUsMC4xNTYyIHoiLz48cGF0aCBmaWxsPSIjZmMwIiBkPSJtIDU4Ljg2Myw1MjQuMDk5IGMgMCwtMi43NiAyLjI0OSwtNS4wMDIgNS4wMTUsLTUuMDAyIDIuNzY3LDAgNC45ODUsMi4yNDEgNC45ODUsNS4wMDIgMCwyLjc1OSAtMi4yMTgsNC45OTggLTQuOTg1LDQuOTk4IC0yLjc2NSwwIC01LjAxNSwtMi4yNCAtNS4wMTUsLTQuOTk4IGwgMCwwIHoiIHRyYW5zZm9ybT0ibWF0cml4KC43MjY3OCAwIDAgLjcyNzE1IDE1MTcuMjE4IDczNy4wODMpIi8+PHBhdGggZmlsbD0iI2ZmZiIgZD0ibSAxNTYzLjg0MzgsMTEwNi44NjIyIGMgLTQuNDU5LDMuOTMwNSAtNy4zNDE4LDkuMzY2NiAtNy4zNDM4LDE1LjA2MjUgMC4wMTIsMy41NzkzIDEuMDkwOCw3LjI1OTEgMywxMC4zNzUgMC40MTM5LC0wLjE2OTMgMC44MjksLTAuMzMwNSAxLjI1LC0wLjQ2ODcgLTEuNzM5NiwtMy4wMTU0IC0yLjczOSwtNi41MDAxIC0yLjc1LC05LjkwNjMgMCwtNS4zNjgzIDEuOTcxNCwtMTAuNjk3OCA2LC0xNC41NjI1IC0wLjI0MTksLTAuMjM1NiAwLjEwMDgsLTAuMjc0MiAtMC4xNTYyLC0wLjUgeiIvPjxwYXRoIGZpbGw9IiNmZjhlMDAiIGQ9Im0gMTU2NC41MDIzLDExMTQuNjYxMSBjIDEuOTQxOCwwLjUyMDMgMy4xMTI5LDIuNTA5MyAyLjU5MzQsNC40NDc4IC0wLjUxOSwxLjkzNzEgLTIuNTI4NywzLjA3NTMgLTQuNDY5OCwyLjU1NTIgLTAuMjY2MSwtMC4wNzEgLTAuNDk2OCwtMC4xNzA0IC0wLjczMDMsLTAuMjkzMSAxLjY2NDQsMC4wNjggMy4yMTI4LC0xLjAwMzEgMy42NjA3LC0yLjY3NDkgMC40NDgzLC0xLjY3MyAtMC4zNTY5LC0zLjM3MzUgLTEuODMyOCwtNC4xNDY5IDAuMjYzNSwwLjAxMSAwLjUxMjksMC4wNCAwLjc3OSwwLjExMTQgeiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzEyMTQxYSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAwIiBkPSJtIDE1NTguMjU5OCwxMTI5Ljk1NTUgYyAwLjU5NzUsLTAuMjYxNyAxLjIwOTksLTAuNDc2NCAxLjgzMTYsLTAuNjQ0MiBtIDEuMjc3NCwtMC4yOTU0IGMgMC4yMTc1LC0wLjA0IC0wLjIxODksMC4wMjkgMCwwIG0gMS40NjY0LC0wLjEzNzIgYyAxLjk5MDgsLTAuMDk5IDMuOTk5MSwwLjI2IDUuODY0LDEuMDc3MyIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzEyMTQxYSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAwIiBkPSJtIDE1NTYuNSwxMTIxLjkzMSBjIDAuMDEyLDMuNTc5MyAxLjA0MjcsNy4xNzkgMi45NTE5LDEwLjI5NDkgMS4yOTA1LC0wLjUyNzkgMi42NTEyLC0wLjg4IDQuMDQ4MSwtMC44ODI5IDEuNDA1MywwIDIuNzk2NywwLjI3NDUgNC4wOTI4LDAuODA0NSAxLjkwMjksLTMuMTE4NyAyLjkwNDQsLTYuNjM3MiAyLjkwNzIsLTEwLjIxNjUgLTAuMDExLC01LjY5ODEgLTIuMTc3NiwtMTEuMTQ0OSAtNi42NDY5LC0xNS4wNzEgLTMuNDMsMy4wMjM1IC01LjkzMjgsNi45NDI5IC02LjkwNjIsMTEuMTgzNSBtIC0wLjMxNzUsMS42ODM3IGMgLTAuMDMzLDAuMTY2OSAtMC4wNjMsMC4zMzQzIC0wLjA5MSwwLjUwMjEiLz48cGF0aCBmaWxsPSIjYWRiNWI5IiBkPSJtIDE1NTEuNDM1NywxMzYuNTgwNjcgYyAwLjY0ODIsLTEuNDk4MiAyLjE0NSwtMi42MTU4NiAzLjc0NCwtMi4yODcyOCAwLjIzNzIsMC45NjYwOSAwLjYwNzgsMS41MzIyOCAxLjAyMDcsMS45NzE0MSAtMS4yMjU0LC0xLjIyNTM4IC0xLjIyNTQsLTMuMjEyMTIgMCwtNC40Mzc1IDEuMDA0MiwtMS4wMDQyMiAyLjU1NzcsLTEuMjA4NzQgMy43ODc2LC0wLjQ5ODY1IGwgMC4wMSwxLjY2MjE1IDAsLTUuNzQ1MiBjIDEuMDIwMSwtMC4zODM4MSAyLjA3NzQsLTAuMzIyMTcgMy4xNTYzLDAgbCAwLDcuNTI2NSAwLjAxLC0zLjU1MjM1IGMgMS4yMjk5LC0wLjcxMDA5IDIuOTE2LC0wLjQ4MzQ3IDMuOTIwMiwwLjUyMDc1IDEuMjI1NCwxLjIyNTM4IDEuMjI1NCwzLjIxMjEyIDAsNC40Mzc1IDAuNTcxMywtMC41MjQxNSAwLjY2OTEsLTEuMjIxMzUgMS4wNTQxLC0xLjkxNTg2IDEuNTk5LC0wLjMyODU4IDMuNDU5MywwLjYzNTA0IDQuMTA3NSwyLjEzMzI0IGwgMCwwIGMgLTAuMzkxLC0xLjQ2MTUyIDAuMjQ4MSwtMy4wMDM0OCAxLjU1ODMsLTMuNzU5OTMgMS41OTkzLC0wLjkyMzM1IDMuNjQ0MywtMC4zNzU0IDQuNTY3NiwxLjIyMzkgMC45MjM0LDEuNTk5MjkgMC4zNzU0LDMuNjk5MTkgLTEuMjIzOSw0LjYyMjU0IGwgLTM2LjY2ODEsMCBjIC0xLjY3OTgsLTIuODUzNDQgLTAuNzI4MywtNi45Mzc0OCAyLjEyNTEsLTguNjE3MjggMi44NTM0LC0xLjY3OTggNi41Mjg0LC0wLjcyODM3IDguMjA4MiwyLjEyNTA3IDAuODE1MSwxLjM4NDczIDEuMDQwMywzLjAzODcyIDAuNjI1MSw0LjU5MDk5IHoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEuNjggMTAwNC4zNjIpIi8+PHBhdGggZmlsbD0iIzZjNzg3ZSIgc3R5bGU9ImxpbmUtaGVpZ2h0Om5vcm1hbDstaW5rc2NhcGUtZm9udC1zcGVjaWZpY2F0aW9uOlNhbnM7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0YjttYXJrZXI6bm9uZSIgZD0ibSAxNTYzLjkzNzUsMTEzMS44MzEgYyAtMC4xOTE5LDAgLTAuMzc2NCwwLjAyNCAtMC41NjI1LDAuMDYyIDAuMTYyOCwwLjAzMiAwLjMzMTUsMC4wODUgMC41LDAuMTI1IGwgMCwzLjUgMCwwLjA2MiAwLDMuNTYyNSBjIDAsMC4yNTk0IDAuMjQwNSwwLjUgMC41LDAuNSAwLjI1OTUsMCAwLjQ5NjMsLTAuMjQwNiAwLjUsLTAuNSBsIDAsLTMuMTU2MyBjIDAuMDUzLC0wLjAyNCAwLjEwMTYsLTAuMDQyIDAuMTU2MywtMC4wNjIgbCAwLC0wLjM0MzcgMCwtMC4wNjIgMCwtMy41IGMgLTAuMzc3LC0wLjA5IC0wLjczNTYsLTAuMTc3NSAtMS4wOTM4LC0wLjE4NzUgeiBtIC0xNi4xMjUsMi4wNjI1IGMgLTAuMTM1NywwIC0wLjI3MDYsMC4wMTcgLTAuNDA2MiwwLjAzMSAzLjYwMDYsMS4wMzYxIDQuOTY1NSwzLjQgNS4yMTY5LDcuMDY2OCAwLjE5OTQsMCAwLjQyNywwLjMzNjQgMC41MDE4LDAuMTUxNSAzZS00LC0wLjAxIDNlLTQsLTAuMDIxIDAsLTAuMDMxIDAuMDU5LC0wLjEzNDIgMC4xNDUxLC0wLjI1MSAwLjIxODcsLTAuMzc1IDAuMzU4NCwtMS40MDUgMC4xNDI3LC0yLjg3MzkgLTAuNTkzNywtNC4xMjUgLTEuMDYwNiwtMS44MDE3IC0yLjk4NzQsLTIuNzgxIC00LjkzNzUsLTIuNzE4NyB6IG0gMTkuNDA2MiwxLjg0MzcgYyAtMC4xOTA2LC0xMGUtNSAtMC43NjU4LC0wLjE0NDkgLTAuOTUzLC0wLjEwOTkgMi4wMzAyLDAuNTQ0IDIuNjM2NSwyLjYyMjMgMi4wMDc4LDQuOTY4OCAwLjEyNTUsLTAuMTI1NiAwLjYyOTIsMC4wMjkgMC43MjY1LC0wLjEwOTQgLTAuMDIsLTAuMTE0NCAtNGUtNCwtMC4yMTg0IDAuMDk0LC0wLjMxMjUgMC4wODEsLTAuMDgxIDAuMTUwNywtMC4xNjI0IDAuMjE4OCwtMC4yNSAwLjA4OSwtMC4yMDA3IDAuMTYsLTAuNDEyNCAwLjIxODgsLTAuNjI1IDAuMDIyLC0wLjA1MiAwLjA3MSwtMC4xMDU1IDAuMDk0LC0wLjE1NjIgMC4wMywwIDAuMDYzLDAgMC4wOTQsMCAwLjMwMzcsLTAuOTEyMSAwLjEwNjgsLTEuOTU1OCAtMC42MjUsLTIuNjg3NSAtMC40ODM3LC0wLjQ4MzggLTEuMTg2MiwtMC43MTggLTEuODc1OSwtMC43MTgzIHogbSAtNi45OTcyLC0wLjA3MiBjIC0wLjE5NTQsLTVlLTQgLTAuNDA0NCwwLjAyIC0wLjU5MzcsMC4wNjIgMS4xNzQxLDAuMjI5MiAxLjA5MDksMC41MTA4IDEuMDkwOSwxLjYzNDQgMCwwLjI1OTQgMC4yNDA2LDAuNSAwLjUsMC41IDAuMjU5NSwwIDAuNDk2NCwtMC4yNDA2IDAuNSwtMC41IGwgMCwtMS4zNDM3IGMgLTAuMzI1OSwtMC4xMjU5IC0xLjE2MDMsLTAuMzUyNSAtMS40OTcyLC0wLjM1MzIgeiBtIDE3LjI3ODUsMS4zODQ0IGMgLTAuMDg2LDAuMDExIC0wLjE2NDIsMC4wNDMgLTAuMjUsMC4wNjIgMC43NzM3LDAuMTUwMSAxLjQ3NzQsMC42MDEgMS45MDYzLDEuMzQzOCAwLjc2NTcsMS4zMjYzIDAuMzEwMiwzLjA2MTggLTAuOTY4OCwzLjg3NSBsIDEuMTU2MiwwIGMgMS4yNzksLTAuODEzMiAxLjczNDYsLTIuNTQ4NyAwLjk2ODgsLTMuODc1IC0wLjU5MTEsLTEuMDI0IC0xLjcxNTQsLTEuNTQ3MSAtMi44MTI1LC0xLjQwNjMgeiBtIC02LjIwMzEsMS44NTExIGMgLTAuMTY1NSwtMC4wMSAtMC42NDQxLDAuMDQ5IC0wLjgwNDcsMC4wNzEgLTAuMDEsMC4wMTkgLTAuMzY5NiwwLjA5IC0wLjM4MjYsMC4xMDg5IDEuMzY3LDAuMTM2IDMuMDA3NywxLjE1MjggMy4zOTg1LDEuOTkyMiAwLjYxMzMsMC40MzE0IDAuMjM2LC0wLjI5NTkgMC40Mjk0LC0wLjQzMDIgLTAuMDEsLTAuMDIxIDAsLTAuMDQyIDAsLTAuMDYyIC0wLjAxLC0wLjAxIDAuMDEsLTAuMDI0IDAsLTAuMDMxIC0wLjU2NDcsLTAuODM0OSAtMS42MTc5LC0xLjYxMTggLTIuNjQwNiwtMS42NDg0IHogbSAtMTQuNDg0NCwwLjI3MzQgYyAtMC4yMTIyLDAuMDE2IC0wLjQyMjgsMC4wNTcgLTAuNjI1LDAuMTI1IDAuMTU0MywwLjYwMDIgMC43NzQyLDEuMzkyMyAxLjM5NDUsMS43MzA1IDAuNTc5OCwwLjIwNzIgMC4wNTUsLTAuMjk3MSAwLjI2MTcsLTAuNTQzMiAwLC0wLjAxIDAsLTAuMDI0IDAsLTAuMDMxIC0wLjA4MywtMC4xMzA0IC0wLjE1NDYsLTAuMjY3NyAtMC4yMTg3LC0wLjQwNjMgLTAuMjE5LC0wLjI2ODEgLTAuNDAyNCwtMC41NjEyIC0wLjUsLTAuODc1IC0wLjEwMzIsLTAuMDEgLTAuMjEwNSwtMC4wMSAtMC4zMTI1LDAgeiIgY29sb3I9IiMwMDAiIGZvbnQtZmFtaWx5PSJTYW5zIiBmb250LXdlaWdodD0iNDAwIiBvdmVyZmxvdz0idmlzaWJsZSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Im0gMTU2My4yMjE5LDExMzEuMzQ0MSBjIC0wLjUyNjcsLTAuMDEgLTEuMDIxMywwLjA4OSAtMS41MzEzLDAuMjgxMiBsIDAsMy42ODc1IGMgMC40NjMxLDAuMDMzIC0wLjMzNzksMi4yOTQ5IDAuMDg0LDIuNTM4NyAxLjA5MTYsLTEuODkwOCAwLjk1OSwtNC4xNDYgMC45NTksLTYuMjI2MiAwLjI1NSwtMC4wOTYgMC44MjIxLC0wLjE3NTUgMS4wODE1LC0wLjIxODcgLTAuMTk0MSwtMC4wMjUgLTAuNDAxNSwtMC4wNiAtMC41OTM3LC0wLjA2MiB6IG0gLTE2LjA5MzgsMi4wNjI1IGMgLTAuOTY2MiwwLjAzMyAtMS45NTIxLDAuMzE4OCAtMi44NDM4LDAuODQzNyAtMi44NTMzLDEuNjc5OCAtMy44MDQ3LDUuNzQwNCAtMi4xMjUsOC41OTM4IGwgMS4zNzUsMCBjIC0xLjY3OTcsLTIuODUzNCAtMC43MjgzLC02LjkxNCAyLjEyNSwtOC41OTM4IDAuNzQyOCwtMC40MzcyIDEuNTM5NCwtMC42ODc2IDIuMzQzOCwtMC43ODEyIC0wLjI5NzUsLTAuMDM1IC0wLjU3MzgsLTAuMDczIC0wLjg3NSwtMC4wNjIgeiBtIDE5LjI1LDEuNzgxMiBjIC0wLjA1MiwxMGUtNCAtMC4xMDQsMC4wMjggLTAuMTU2MiwwLjAzMSBsIDAsMC4zNzUgYyAwLjI4ODMsLTAuMTY2NCAwLjYxMzYsLTAuMjQ2OSAwLjkzNzQsLTAuMzEyNSAtMC4yNjQ4LC0wLjA1OCAtMC41MTA1LC0wLjEgLTAuNzgxMiwtMC4wOTQgeiBtIC02LjE4NzUsMC4wOTQgYyAtMC44NDM3LC0wLjAyNSAtMS42ODQ5LDAuMjc4NyAtMi4zMTI1LDAuOTA2MyAtMC42ODkzLDAuNjg5MyAtMC45NjEyLDEuNjMxMiAtMC44NzUsMi41MzEyIDAuMzk1MSwtMC4wOTYgMC41NjExLDEuNjMxOCAwLjk4NDQsMS43MTg4IDAsLTIuNzUxNiAwLjE5MzMsLTQuMDU3IDIuNzk2OCwtNS4wNjI1IC0wLjE5ODIsLTAuMDQ1IC0wLjM5MjcsLTAuMDg4IC0wLjU5MzcsLTAuMDk0IHogbSAxNy40NzQ4LDEuNTkwNyBjIC0wLjY0MjQsLTAuMDQ1IC0xLjMwNjUsMC4wOTEgLTEuOTA2MiwwLjQzNzUgLTAuODQ1NSwwLjQ4ODEgLTEuMzcyNCwxLjMwOTEgLTEuNTYyNiwyLjIxODcgLTAuMTYzMiwwLjYyIDAuMTE0NSwwLjc2NzkgMC4yMDMxLDEuNDUzMSAwLjI5MDcsLTIuMzMwNyAxLjM1OTUsLTMuNjcxOCAzLjczNDUsLTQuMDE1NiAtMC4xNDk5LC0wLjAzMiAtMC4zMTU2LC0wLjA4MyAtMC40Njg4LC0wLjA5NCB6IG0gLTIxLjM4MTEsMS43NTMxIGMgLTAuNTYyOSwwLjAxIC0zLjI3MjgsMS40Njg0IC0yLjg5MDYsMi43MzQ0IDEuMDk3OSwtMS4xMTI2IDEuNzg3MiwtMS44Nzk4IDMuNjQwNywtMi4wNjI1IC0wLjAxLC0wLjAzNCAtMC4xNzkzLC0wLjYwNjEgLTAuMTg3MywtMC42NDA2IC0wLjE5OTksLTAuMDQxIC0wLjM2NzMsLTAuMDMzIC0wLjU2MjYsLTAuMDMxIHoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMxMjE0MWEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibSAxNTQzLjczODgsMTI5LjM0NjE3IGMgMi42MzA1LC0wLjg4NTY5IDUuNjEwNCwwLjE1NjQzIDcuMDc0NSwyLjY0MzUxIDAuODE1MSwxLjM4NDczIDEuMDQwMywzLjAzODcyIDAuNjI1MSw0LjU5MDk5IGwgMCwwIGMgMC42NDgyLC0xLjQ5ODIgMi4xNDUsLTIuNjE1ODYgMy43NDQsLTIuMjg3MjggMC4yMzcyLDAuOTY2MDkgMC42MDc4LDEuNTMyMjggMS4wMjA3LDEuOTcxNDEgLTEuMjI1NCwtMS4yMjUzOCAtMS4yMjU0LC0zLjIxMjEyIDAsLTQuNDM3NSAxLjAwNDIsLTEuMDA0MjIgMi41NTc3LC0xLjIwODc0IDMuNzg3NiwtMC40OTg2NSBsIDAuMDEsMS42NjIxNSAwLC01Ljc0NTIgYyAxLjAyMDEsLTAuMzgzODEgMi4wNzc0LC0wLjMyMjE3IDMuMTU2MywwIGwgMCw3LjUyNjUgMC4wMSwtMy41NTIzNSBjIDEuMjI5OSwtMC43MTAwOSAyLjkxNiwtMC40ODM0NyAzLjkyMDIsMC41MjA3NSAxLjIyNTQsMS4yMjUzOCAxLjIyNTQsMy4yMTIxMiAwLDQuNDM3NSAwLjU3MTMsLTAuNTI0MTUgMC42NjkxLC0xLjIyMTM1IDEuMDU0MSwtMS45MTU4NiAxLjU5OSwtMC4zMjg1OCAzLjQ1OTMsMC42MzUwNCA0LjEwNzUsMi4xMzMyNCBsIDAsMCBjIC0wLjIyNjcsLTAuODQ3MzQgLTAuMTA1MSwtMS43MjE3MyAwLjI5MDIsLTIuNDU0NCBtIDEuMjY4MSwtMS4zMDU1MyBjIDEuNTk5MywtMC45MjMzNiAzLjY0NDMsLTAuMzc1NCA0LjU2NzYsMS4yMjM5IDAuOTIzNCwxLjU5OTI5IDAuMzc1NCwzLjY5OTE5IC0xLjIyMzksNC42MjI1NCBsIC0zNi42NjgxLDAgYyAtMS4xOTk1LC0yLjAzNzYzIC0xLjA1NzMsLTQuNzAyNzggMC4xNjExLC02LjY3MTg2IG0gMS4wNjc2LC0xLjI1NDcyIGMgMC4xMjQ5LC0wLjE0MzYgMC4yNTY4LC0wLjI4MTIxIDAuMzk1NSwtMC40MTIxMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMS42OCAxMDA0LjM2MikiLz48cGF0aCBmaWxsPSIjYWRiNWI5IiBzdHJva2U9IiM2Yzc4N2UiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibSAxNTQ0LjU1NjcsMTM0LjQ2ODc1IGEgMi45NzQ1OTA1LDIuOTc0NTkwNSAwIDAgMSAyLjk3NDYsLTIuOTc0NTkgMi45NzQ1OTA1LDIuOTc0NTkwNSAwIDAgMSAyLjk3NDUsMi45NzQ1OSIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM4MTIuMjc1IDYzNy41MikiLz48cGF0aCBmaWxsPSIjYWRiNWI5IiBzdHJva2U9IiM2Yzc4N2UiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjMwNCIgZD0iTSAxNTQ2LjA2MjUsMTM0LjQ2ODc1IEEgMS40Njg3NSwxLjQ2ODc1IDAgMCAxIDE1NDcuNTMxMywxMzMgMS40Njg3NSwxLjQ2ODc1IDAgMCAxIDE1NDksMTM0LjQ2ODc1IiB0cmFuc2Zvcm09Im1hdHJpeCgtLjcwNDAzIC0uMzE5ODUgLS4zMjgyOSAuNjg1OTMgMjcxMC44NiAxNTQyLjU4MSkiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiM2Yzc4N2UiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibSAxNTYzLjE4NDYsMTEzNy4yMTUgMCwyLjgyODQiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJtIDE1NjQuNTkyOCwxMTE0LjY4NTMgYyAtMS45NDE4LC0wLjUyMDMgLTMuOTUwNSwwLjYxNjcgLTQuNDY5OSwyLjU1NTIgLTAuNTE5LDEuOTM3MiAwLjY1MjMsMy45Mjc3IDIuNTkzNCw0LjQ0NzggMC4yNjYxLDAuMDcxIDAuNTE1NSwwLjEwMDkgMC43NzksMC4xMTE2IC0xLjQ3NTYsLTAuNzczIC0yLjg1NTQsLTIuNDc1IC0yLjQwNzQsLTQuMTQ2OSAwLjU3OTEsLTIuMTYxMiAyLjU3MDQsLTIuNzQzIDQuMjM1MywtMi42NzQ5IC0wLjIzMzYsLTAuMTIyNSAtMC40NjQzLC0wLjIyMTUgLTAuNzMwNCwtMC4yOTI4IHoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMxMjE0MWEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjM0LjE3OCIgc3Ryb2tlLXdpZHRoPSIxLjM3NiIgZD0ibSA2OC44NjMsNTI0LjA5OSBjIDAsMi43NTkgLTIuMjE4LDQuOTk4IC00Ljk4NSw0Ljk5OCAtMi43NjUsMCAtNS4wMTUsLTIuMjQgLTUuMDE1LC00Ljk5OCBsIDAsMCBjIDAsLTIuNzYgMi4yNDksLTUuMDAyIDUuMDE1LC01LjAwMiAxLjYwOTk2OSwwIDMuMDM0MDc2LDAuNzU4NjggMy45NDM1NiwxLjkzNzAzIiB0cmFuc2Zvcm09Im1hdHJpeCguNzI2NzggMCAwIC43MjcxNSAxNTE3LjIxOCA3MzcuMDgzKSIvPjwvZz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 518.6163201243182,
        height: 518.6163201243187,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "VSJKl9dg3C",
        type: "svg",
        x: 757.4999999999998,
        y: 832.2606869745051,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZmlsbD0iIzdjYzlmMiIgZD0iTTU4LjcwNTEsMjAuNDM4cS4wMTQ1LS4yMDIyLjAxNDYtLjQwMjhhNS41OTMzLDUuNTkzMywwLDAsMC01LjI0NTYtNS41ODA2QTEwLjE3LDEwLjE3LDAsMCwwLDM1LjA0MiwxMy4xODc1YTguMDMwOSw4LjAzMDksMCwwLDAtLjkwMTktLjA1MjcsOC4xNDU4LDguMTQ1OCwwLDAsMC02LjMxMiwyLjk2NDMsMSwxLDAsMCwwLC44NDcyLDEuNjMyOGMuMTA1NS0uMDA3OC4yMTgzLS4wMDczLjMyNDctLjAwNjhhMTMuMDMzNCwxMy4wMzM0LDAsMCwxLDExLjgzOTQsNy42NDMxLDEsMSwwLDAsMCwxLjExNDcuNTY1OSwxMC4wMTc4LDEwLjAxNzgsMCwwLDEsOS42MjYsMy4yNzEuOTk5NC45OTk0LDAsMCwwLC43Ni4zNWg3Ljk1YTEsMSwwLDAsMCwuODYzMy0uNDk1MUE2LjIwMTksNi4yMDE5LDAsMCwwLDYyLDI1LjkzNTEsNi4yNzg4LDYuMjc4OCwwLDAsMCw1OC43MDUxLDIwLjQzOFoiLz48cGF0aCBmaWxsPSIjOWNkNWYyIiBkPSJNNTUuOTc3MSwzNC45OEExMi4wMDYsMTIuMDA2LDAsMCwwLDQ0LDIzLjcyNTFhMTIuMTg1OCwxMi4xODU4LDAsMCwwLTEuNjc5Mi4xMTYyQTE1LjAzODMsMTUuMDM4MywwLDAsMCwyOSwxNS43MjUxYy0uMTU0MywwLS4zMjA4LjAwMS0uNDI3Mi4wMWExNC45MjYzLDE0LjkyNjMsMCwwLDAtMTMuNzExNSw5Ljk5MDdBOC4wMSw4LjAxLDAsMCwwLDcsMzMuNzI1MWE3LjkxLDcuOTEsMCwwLDAsLjA1MzcuOTE2QTkuMDY0NCw5LjA2NDQsMCwwLDAsMiw0Mi43MjUxYTguODcyOSw4Ljg3MjksMCwwLDAsMS4yMTg4LDQuNTA3OC45OTkxLjk5OTEsMCwwLDAsLjg2MTMuNDkyMkgxNS4zNmExLDEsMCwwLDAsLjk4NzgtLjg0NDIsNy43NDc3LDcuNzQ3NywwLDAsMSwxNS4zMDQ2LDAsMSwxLDAsMCwwLC45ODc4Ljg0NDJoMjcuMWEuOTk5MS45OTkxLDAsMCwwLC44MTk0LS40MjY4QTcuOTQyLDcuOTQyLDAsMCwwLDYyLDQyLjcyNTEsOC4wMyw4LjAzLDAsMCwwLDU1Ljk3NzEsMzQuOThaIi8+PHBhdGggZmlsbD0iI2IyZWJmMiIgZD0iTTMzLjczNjgsNDcuNjFhMTAuMjc1MiwxMC4yNzUyLDAsMCwwLS4xMDg5LTEuMDQwNiw5Ljc0NzgsOS43NDc4LDAsMCwwLTE5LjI1NjMuMDAyNSwxMC4zNTMxLDEwLjM1MzEsMCwwLDAtLjEwODQsMS4wMzgxQTcuOTcxMiw3Ljk3MTIsMCwwLDAsOSw1NS4xMDVhMSwxLDAsMCwwLDEsMUgzOGExLDEsMCwwLDAsMS0xQTcuOTcxMiw3Ljk3MTIsMCwwLDAsMzMuNzM2OCw0Ny42MVoiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 428.75118223067403,
        height: 428.7511822306741,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#b2ebf2": "rgba(221,244,246,1)",
          "#9cd5f2": "rgba(184,215,233,1)",
          "#7cc9f2": "rgba(194,203,207,1)"
        }
      },
      {
        id: "m8MJQwPPq_",
        type: "svg",
        x: 441.7099903699209,
        y: 884.3124281891705,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZmlsbD0iIzdjYzlmMiIgZD0iTTU4LjcwNTEsMjAuNDM4cS4wMTQ1LS4yMDIyLjAxNDYtLjQwMjhhNS41OTMzLDUuNTkzMywwLDAsMC01LjI0NTYtNS41ODA2QTEwLjE3LDEwLjE3LDAsMCwwLDM1LjA0MiwxMy4xODc1YTguMDMwOSw4LjAzMDksMCwwLDAtLjkwMTktLjA1MjcsOC4xNDU4LDguMTQ1OCwwLDAsMC02LjMxMiwyLjk2NDMsMSwxLDAsMCwwLC44NDcyLDEuNjMyOGMuMTA1NS0uMDA3OC4yMTgzLS4wMDczLjMyNDctLjAwNjhhMTMuMDMzNCwxMy4wMzM0LDAsMCwxLDExLjgzOTQsNy42NDMxLDEsMSwwLDAsMCwxLjExNDcuNTY1OSwxMC4wMTc4LDEwLjAxNzgsMCwwLDEsOS42MjYsMy4yNzEuOTk5NC45OTk0LDAsMCwwLC43Ni4zNWg3Ljk1YTEsMSwwLDAsMCwuODYzMy0uNDk1MUE2LjIwMTksNi4yMDE5LDAsMCwwLDYyLDI1LjkzNTEsNi4yNzg4LDYuMjc4OCwwLDAsMCw1OC43MDUxLDIwLjQzOFoiLz48cGF0aCBmaWxsPSIjOWNkNWYyIiBkPSJNNTUuOTc3MSwzNC45OEExMi4wMDYsMTIuMDA2LDAsMCwwLDQ0LDIzLjcyNTFhMTIuMTg1OCwxMi4xODU4LDAsMCwwLTEuNjc5Mi4xMTYyQTE1LjAzODMsMTUuMDM4MywwLDAsMCwyOSwxNS43MjUxYy0uMTU0MywwLS4zMjA4LjAwMS0uNDI3Mi4wMWExNC45MjYzLDE0LjkyNjMsMCwwLDAtMTMuNzExNSw5Ljk5MDdBOC4wMSw4LjAxLDAsMCwwLDcsMzMuNzI1MWE3LjkxLDcuOTEsMCwwLDAsLjA1MzcuOTE2QTkuMDY0NCw5LjA2NDQsMCwwLDAsMiw0Mi43MjUxYTguODcyOSw4Ljg3MjksMCwwLDAsMS4yMTg4LDQuNTA3OC45OTkxLjk5OTEsMCwwLDAsLjg2MTMuNDkyMkgxNS4zNmExLDEsMCwwLDAsLjk4NzgtLjg0NDIsNy43NDc3LDcuNzQ3NywwLDAsMSwxNS4zMDQ2LDAsMSwxLDAsMCwwLC45ODc4Ljg0NDJoMjcuMWEuOTk5MS45OTkxLDAsMCwwLC44MTk0LS40MjY4QTcuOTQyLDcuOTQyLDAsMCwwLDYyLDQyLjcyNTEsOC4wMyw4LjAzLDAsMCwwLDU1Ljk3NzEsMzQuOThaIi8+PHBhdGggZmlsbD0iI2IyZWJmMiIgZD0iTTMzLjczNjgsNDcuNjFhMTAuMjc1MiwxMC4yNzUyLDAsMCwwLS4xMDg5LTEuMDQwNiw5Ljc0NzgsOS43NDc4LDAsMCwwLTE5LjI1NjMuMDAyNSwxMC4zNTMxLDEwLjM1MzEsMCwwLDAtLjEwODQsMS4wMzgxQTcuOTcxMiw3Ljk3MTIsMCwwLDAsOSw1NS4xMDVhMSwxLDAsMCwwLDEsMUgzOGExLDEsMCwwLDAsMS0xQTcuOTcxMiw3Ljk3MTIsMCwwLDAsMzMuNzM2OCw0Ny42MVoiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 428.75118223067403,
        height: 428.7511822306741,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#b2ebf2": "rgba(221,244,246,1)",
          "#9cd5f2": "rgba(184,215,233,1)",
          "#7cc9f2": "rgba(194,203,207,1)"
        }
      },
      {
        id: "tSVs29doS1",
        type: "svg",
        x: 65.53285008353865,
        y: 63.60001585226766,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJMYXllcl8xIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyMCAyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48bGluZWFyR3JhZGllbnQgaWQ9IlhNTElEXzI1XyIgeDE9IjMuMDYzIiB4Mj0iMTYuOTM3IiB5MT0iMTEiIHkyPSIxMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmYzgwYiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2U4OTMxOCIvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggaWQ9IlhNTElEXzI2N18iIGZpbGw9InVybCgjWE1MSURfMjVfKSIgZD0iTTEwLjQsNC43bDEuOCwzLjZjMC4xLDAuMSwwLjIsMC4yLDAuNCwwLjNsMy45LDAuNmMwLjQsMC4xLDAuNiwwLjYsMC4zLDAuOWwtMi44LDIuOCAgIGMtMC4xLDAuMS0wLjIsMC4zLTAuMSwwLjRsMC43LDMuOWMwLjEsMC40LTAuNCwwLjctMC43LDAuNWwtMy41LTEuOGMtMC4xLTAuMS0wLjMtMC4xLTAuNSwwbC0zLjUsMS44Yy0wLjQsMC4yLTAuOC0wLjEtMC43LTAuNSAgIGwwLjctMy45YzAtMC4yLDAtMC4zLTAuMS0wLjRMMy4yLDkuOUMyLjksOS42LDMuMSw5LjEsMy41LDkuMWwzLjktMC42YzAuMiwwLDAuMy0wLjEsMC40LTAuM2wxLjgtMy42QzkuNyw0LjMsMTAuMyw0LjMsMTAuNCw0Ljd6Ii8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 57.967149916461246,
        height: 57.967149916461246,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "hHPLfuUvEW",
        type: "svg",
        x: 798.5293076488879,
        y: 855.3288532309399,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJMYXllcl8xIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyMCAyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48bGluZWFyR3JhZGllbnQgaWQ9IlhNTElEXzI1XyIgeDE9IjMuMDYzIiB4Mj0iMTYuOTM3IiB5MT0iMTEiIHkyPSIxMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmYzgwYiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2U4OTMxOCIvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggaWQ9IlhNTElEXzI2N18iIGZpbGw9InVybCgjWE1MSURfMjVfKSIgZD0iTTEwLjQsNC43bDEuOCwzLjZjMC4xLDAuMSwwLjIsMC4yLDAuNCwwLjNsMy45LDAuNmMwLjQsMC4xLDAuNiwwLjYsMC4zLDAuOWwtMi44LDIuOCAgIGMtMC4xLDAuMS0wLjIsMC4zLTAuMSwwLjRsMC43LDMuOWMwLjEsMC40LTAuNCwwLjctMC43LDAuNWwtMy41LTEuOGMtMC4xLTAuMS0wLjMtMC4xLTAuNSwwbC0zLjUsMS44Yy0wLjQsMC4yLTAuOC0wLjEtMC43LTAuNSAgIGwwLjctMy45YzAtMC4yLDAtMC4zLTAuMS0wLjRMMy4yLDkuOUMyLjksOS42LDMuMSw5LjEsMy41LDkuMWwzLjktMC42YzAuMiwwLDAuMy0wLjEsMC40LTAuM2wxLjgtMy42QzkuNyw0LjMsMTAuMyw0LjMsMTAuNCw0Ljd6Ii8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 57.967149916461246,
        height: 57.967149916461246,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "ispgJmIbI5",
        type: "svg",
        x: 406.2646259542871,
        y: 162.056755619006,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik0yMiwxMC4xYzAuMS0wLjUtMC4zLTEuMS0wLjgtMS4xbC01LjctMC44TDEyLjksM2MtMC4xLTAuMi0wLjItMC4zLTAuNC0wLjRDMTIsMi4zLDExLjQsMi41LDExLjEsM0w4LjYsOC4yTDIuOSw5CglDMi42LDksMi40LDkuMSwyLjMsOS4zYy0wLjQsMC40LTAuNCwxLDAsMS40bDQuMSw0bC0xLDUuN2MwLDAuMiwwLDAuNCwwLjEsMC42YzAuMywwLjUsMC45LDAuNywxLjQsMC40bDUuMS0yLjdsNS4xLDIuNwoJYzAuMSwwLjEsMC4zLDAuMSwwLjUsMC4xbDAsMGMwLjEsMCwwLjEsMCwwLjIsMGMwLjUtMC4xLDAuOS0wLjYsMC44LTEuMmwtMS01LjdsNC4xLTRDMjEuOSwxMC41LDIyLDEwLjMsMjIsMTAuMXoiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 46.67028111451165,
        height: 46.67028111451171,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(255,255,255,1)"
        }
      },
      {
        id: "J7T1lxhpE9",
        type: "svg",
        x: 956.5,
        y: 571.1114681854398,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik0yMiwxMC4xYzAuMS0wLjUtMC4zLTEuMS0wLjgtMS4xbC01LjctMC44TDEyLjksM2MtMC4xLTAuMi0wLjItMC4zLTAuNC0wLjRDMTIsMi4zLDExLjQsMi41LDExLjEsM0w4LjYsOC4yTDIuOSw5CglDMi42LDksMi40LDkuMSwyLjMsOS4zYy0wLjQsMC40LTAuNCwxLDAsMS40bDQuMSw0bC0xLDUuN2MwLDAuMiwwLDAuNCwwLjEsMC42YzAuMywwLjUsMC45LDAuNywxLjQsMC40bDUuMS0yLjdsNS4xLDIuNwoJYzAuMSwwLjEsMC4zLDAuMSwwLjUsMC4xbDAsMGMwLjEsMCwwLjEsMCwwLjIsMGMwLjUtMC4xLDAuOS0wLjYsMC44LTEuMmwtMS01LjdsNC4xLTRDMjEuOSwxMC41LDIyLDEwLjMsMjIsMTAuMXoiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 46.67028111451165,
        height: 46.67028111451171,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(255,255,255,1)"
        }
      },
      {
        id: "RzEHdD4vbo",
        type: "svg",
        x: 86.01611767535367,
        y: 482.2271053715901,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 28.714897688310234,
        height: 28.714897688310245,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "owu-WsJKsY",
        type: "svg",
        x: 487.1022836464091,
        y: 884.3124281891697,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 26.381598678237566,
        height: 26.38159867823767,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "7t9v1SKsDf",
        type: "svg",
        x: 627.2394078359815,
        y: 92.5835908104981,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 28.84617364927522,
        height: 28.84617364927526,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(246,228,4,1)"
        }
      }
    ]
  },
  {
    id: "j90qjaklsgn",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_132751.png?v=1740470329",
    elements: [
      {
        id: "PKg19x6235",
        type: "image",
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: true,
        blurRadius: 5,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 1080,
        height: 1080,
        src: "https://images.unsplash.com/photo-1595516200271-74e1976b2cfb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZhY2V8ZW58MHx8fHwxNjIyNTAyNDg0&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0.11666666666666667,
        cropWidth: 1,
        cropHeight: 0.6666666666666666,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "v0QV4X_BF3",
        type: "svg",
        x: -2.637362637359395,
        y: -2.6373626373627275,
        rotation: 0,
        opacity: 0.4699999999999999,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1083.175151862506,
        height: 1083.175151862506,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(185,159,146,1)"
        }
      },
      {
        id: "cQlPSGgCKG",
        type: "image",
        x: 193.78285543191032,
        y: 118.3371166967634,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 692.4342891361794,
        height: 846.5009184689791,
        src: "https://images.unsplash.com/flagged/photo-1563692040599-7e7d379d37b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwyfHxwb2xhcm9pZHxlbnwwfHx8fDE2MjI1MDI3NDQ&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9990153752934936,
        cropHeight: 0.9999999999999994,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "9z1cCTugU2",
        type: "image",
        x: 234.1428571428641,
        y: 164.49450549450827,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0.14,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 613.5941529871689,
        height: 632.2936329431278,
        src: "https://images.unsplash.com/photo-1595516200271-74e1976b2cfb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw3fHxza2luY2FyZXxlbnwwfHx8fDE2MjI1MDI0NDQ&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0.11234567901234568,
        cropWidth: 0.9999999999999986,
        cropHeight: 0.6869835486153435,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "Vx1uDxO_VH",
        type: "text",
        x: 230.89185528099972,
        y: 830.3692382986342,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Skincare 101",
        placeholder: "",
        fontSize: 91.2765505020553,
        fontFamily: "Covered By Your Grace",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,0.84)",
        align: "center",
        width: 616.1167160257882,
        height: 109.53186060246635,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "white"
  },
  {
    id: "2L3Pe4hjAm",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_124458.png?v=1740467714",
    elements: [
      {
        id: "9mCNMmdGQ8",
        type: "text",
        x: 126.2399638459637,
        y: 206.85077887016297,
        rotation: -6.1019833510947405,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(80,227,194,1)",
        align: "center",
        width: 803,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "JlnBrtw3iu",
        type: "text",
        x: 116.26356564175,
        y: 193.83752530279173,
        rotation: -6.1019833510947405,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,53,67,1)",
        align: "center",
        width: 803,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "69M2ULcfKe",
        type: "text",
        x: 136.36352433089633,
        y: 381.6353869449783,
        rotation: -0.9825022515014415,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,53,67,1)",
        align: "center",
        width: 804,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "K8d2cdmDda",
        type: "text",
        x: 127.58813521420379,
        y: 367.78382257887296,
        rotation: -0.9825022515014415,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(80,227,194,1)",
        align: "center",
        width: 804,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "4PibToyYzZ",
        type: "text",
        x: 138.82159207172242,
        y: 535.4046887605119,
        rotation: 0.6434182987016046,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(80,227,194,1)",
        align: "center",
        width: 804,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "Zp-HbFYskB",
        type: "text",
        x: 130.4427584192871,
        y: 521.3097096486945,
        rotation: 0.6434182987016046,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,53,67,1)",
        align: "center",
        width: 804,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "h3eAvBjYAi",
        type: "text",
        x: 109.52372421743357,
        y: 783.5829195471317,
        rotation: -7.593651693468105,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,53,67,1)",
        align: "center",
        width: 806,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "Fdgz7I2C7D",
        type: "text",
        x: 99.21195121543701,
        y: 770.8337773370454,
        rotation: -7.593651693468105,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "VIBES",
        placeholder: "",
        fontSize: 158,
        fontFamily: "Seymour One",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(80,227,194,1)",
        align: "center",
        width: 806,
        height: 189.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "4jQ_bZhE1I",
        type: "svg",
        x: 67.12737617675646,
        y: 283.05645557389096,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjIiIGNsaXAtcnVsZT0iZXZlbm9kZCIgdmlld0JveD0iMCAwIDUwMCA1MDAiPjxwYXRoIGZpbGw9IiNmZmQ2MDAiIGQ9Ik0yNTAsMjVMMjczLjk1OCw5OC43MzVMMzE5LjUyOSwzNi4wMTJMMzE5LjUyOSwxMTMuNTQyTDM4Mi4yNTIsNjcuOTcxTDM1OC4yOTQsMTQxLjcwNkw0MzIuMDI5LDExNy43NDhMMzg2LjQ1OCwxODAuNDcxTDQ2My45ODgsMTgwLjQ3MUw0MDEuMjY1LDIyNi4wNDJMNDc1LDI1MEw0MDEuMjY1LDI3My45NThMNDYzLjk4OCwzMTkuNTI5TDM4Ni40NTgsMzE5LjUyOUw0MzIuMDI5LDM4Mi4yNTJMMzU4LjI5NCwzNTguMjk0TDM4Mi4yNTIsNDMyLjAyOUwzMTkuNTI5LDM4Ni40NThMMzE5LjUyOSw0NjMuOTg4TDI3My45NTgsNDAxLjI2NUwyNTAsNDc1TDIyNi4wNDIsNDAxLjI2NUwxODAuNDcxLDQ2My45ODhMMTgwLjQ3MSwzODYuNDU4TDExNy43NDgsNDMyLjAyOUwxNDEuNzA2LDM1OC4yOTRMNjcuOTcxLDM4Mi4yNTJMMTEzLjU0MiwzMTkuNTI5TDM2LjAxMiwzMTkuNTI5TDk4LjczNSwyNzMuOTU4TDI1LDI1MEw5OC43MzUsMjI2LjA0MkwzNi4wMTIsMTgwLjQ3MUwxMTMuNTQyLDE4MC40NzFMNjcuOTcxLDExNy43NDhMMTQxLjcwNiwxNDEuNzA2TDExNy43NDgsNjcuOTcxTDE4MC40NzEsMTEzLjU0MkwxODAuNDcxLDM2LjAxMkwyMjYuMDQyLDk4LjczNUwyNTAsMjVaIi8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 84.79269608135388,
        height: 84.79269608135392,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#ffd600": "rgba(255,255,255,1)"
        }
      },
      {
        id: "yLA-HQiN16",
        type: "svg",
        x: 923.1984712781691,
        y: 485.33320969924745,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjIiIGNsaXAtcnVsZT0iZXZlbm9kZCIgdmlld0JveD0iMCAwIDUwMCA1MDAiPjxwYXRoIGZpbGw9IiNmZmQ2MDAiIGQ9Ik0yNTAsMjVMMjczLjk1OCw5OC43MzVMMzE5LjUyOSwzNi4wMTJMMzE5LjUyOSwxMTMuNTQyTDM4Mi4yNTIsNjcuOTcxTDM1OC4yOTQsMTQxLjcwNkw0MzIuMDI5LDExNy43NDhMMzg2LjQ1OCwxODAuNDcxTDQ2My45ODgsMTgwLjQ3MUw0MDEuMjY1LDIyNi4wNDJMNDc1LDI1MEw0MDEuMjY1LDI3My45NThMNDYzLjk4OCwzMTkuNTI5TDM4Ni40NTgsMzE5LjUyOUw0MzIuMDI5LDM4Mi4yNTJMMzU4LjI5NCwzNTguMjk0TDM4Mi4yNTIsNDMyLjAyOUwzMTkuNTI5LDM4Ni40NThMMzE5LjUyOSw0NjMuOTg4TDI3My45NTgsNDAxLjI2NUwyNTAsNDc1TDIyNi4wNDIsNDAxLjI2NUwxODAuNDcxLDQ2My45ODhMMTgwLjQ3MSwzODYuNDU4TDExNy43NDgsNDMyLjAyOUwxNDEuNzA2LDM1OC4yOTRMNjcuOTcxLDM4Mi4yNTJMMTEzLjU0MiwzMTkuNTI5TDM2LjAxMiwzMTkuNTI5TDk4LjczNSwyNzMuOTU4TDI1LDI1MEw5OC43MzUsMjI2LjA0MkwzNi4wMTIsMTgwLjQ3MUwxMTMuNTQyLDE4MC40NzFMNjcuOTcxLDExNy43NDhMMTQxLjcwNiwxNDEuNzA2TDExNy43NDgsNjcuOTcxTDE4MC40NzEsMTEzLjU0MkwxODAuNDcxLDM2LjAxMkwyMjYuMDQyLDk4LjczNUwyNTAsMjVaIi8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 68.98781803257312,
        height: 68.9878180325731,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#ffd600": "rgba(255,255,255,1)"
        }
      },
      {
        id: "Ikws0VzGuY",
        type: "svg",
        x: 85.91729115791033,
        y: 677.5299502559852,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjIiIGNsaXAtcnVsZT0iZXZlbm9kZCIgdmlld0JveD0iMCAwIDUwMCA1MDAiPjxwYXRoIGZpbGw9IiNmZmQ2MDAiIGQ9Ik0yNTAsMjVMMjczLjk1OCw5OC43MzVMMzE5LjUyOSwzNi4wMTJMMzE5LjUyOSwxMTMuNTQyTDM4Mi4yNTIsNjcuOTcxTDM1OC4yOTQsMTQxLjcwNkw0MzIuMDI5LDExNy43NDhMMzg2LjQ1OCwxODAuNDcxTDQ2My45ODgsMTgwLjQ3MUw0MDEuMjY1LDIyNi4wNDJMNDc1LDI1MEw0MDEuMjY1LDI3My45NThMNDYzLjk4OCwzMTkuNTI5TDM4Ni40NTgsMzE5LjUyOUw0MzIuMDI5LDM4Mi4yNTJMMzU4LjI5NCwzNTguMjk0TDM4Mi4yNTIsNDMyLjAyOUwzMTkuNTI5LDM4Ni40NThMMzE5LjUyOSw0NjMuOTg4TDI3My45NTgsNDAxLjI2NUwyNTAsNDc1TDIyNi4wNDIsNDAxLjI2NUwxODAuNDcxLDQ2My45ODhMMTgwLjQ3MSwzODYuNDU4TDExNy43NDgsNDMyLjAyOUwxNDEuNzA2LDM1OC4yOTRMNjcuOTcxLDM4Mi4yNTJMMTEzLjU0MiwzMTkuNTI5TDM2LjAxMiwzMTkuNTI5TDk4LjczNSwyNzMuOTU4TDI1LDI1MEw5OC43MzUsMjI2LjA0MkwzNi4wMTIsMTgwLjQ3MUwxMTMuNTQyLDE4MC40NzFMNjcuOTcxLDExNy43NDhMMTQxLjcwNiwxNDEuNzA2TDExNy43NDgsNjcuOTcxTDE4MC40NzEsMTEzLjU0MkwxODAuNDcxLDM2LjAxMkwyMjYuMDQyLDk4LjczNUwyNTAsMjVaIi8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 66.40593703758618,
        height: 66.4059370375862,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#ffd600": "rgba(255,255,255,1)"
        }
      },
      {
        id: "W3cd_3T4XR",
        type: "svg",
        x: 897.1730809107125,
        y: 841.5741267603842,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLW1pdGVybGltaXQ9IjIiIGNsaXAtcnVsZT0iZXZlbm9kZCIgdmlld0JveD0iMCAwIDUwMCA1MDAiPjxwYXRoIGZpbGw9IiNmZmQ2MDAiIGQ9Ik0yNTAsMjVMMjczLjk1OCw5OC43MzVMMzE5LjUyOSwzNi4wMTJMMzE5LjUyOSwxMTMuNTQyTDM4Mi4yNTIsNjcuOTcxTDM1OC4yOTQsMTQxLjcwNkw0MzIuMDI5LDExNy43NDhMMzg2LjQ1OCwxODAuNDcxTDQ2My45ODgsMTgwLjQ3MUw0MDEuMjY1LDIyNi4wNDJMNDc1LDI1MEw0MDEuMjY1LDI3My45NThMNDYzLjk4OCwzMTkuNTI5TDM4Ni40NTgsMzE5LjUyOUw0MzIuMDI5LDM4Mi4yNTJMMzU4LjI5NCwzNTguMjk0TDM4Mi4yNTIsNDMyLjAyOUwzMTkuNTI5LDM4Ni40NThMMzE5LjUyOSw0NjMuOTg4TDI3My45NTgsNDAxLjI2NUwyNTAsNDc1TDIyNi4wNDIsNDAxLjI2NUwxODAuNDcxLDQ2My45ODhMMTgwLjQ3MSwzODYuNDU4TDExNy43NDgsNDMyLjAyOUwxNDEuNzA2LDM1OC4yOTRMNjcuOTcxLDM4Mi4yNTJMMTEzLjU0MiwzMTkuNTI5TDM2LjAxMiwzMTkuNTI5TDk4LjczNSwyNzMuOTU4TDI1LDI1MEw5OC43MzUsMjI2LjA0MkwzNi4wMTIsMTgwLjQ3MUwxMTMuNTQyLDE4MC40NzFMNjcuOTcxLDExNy43NDhMMTQxLjcwNiwxNDEuNzA2TDExNy43NDgsNjcuOTcxTDE4MC40NzEsMTEzLjU0MkwxODAuNDcxLDM2LjAxMkwyMjYuMDQyLDk4LjczNUwyNTAsMjVaIi8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 78.80078492343102,
        height: 78.80078492343105,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#ffd600": "rgba(255,255,255,1)"
        }
      }
    ],
    background: "rgba(235,181,56,1)"
  },
  {
    id: "cA0Kxl8hly",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-24_160107.png?v=1740393125",
    elements: [
      {
        id: "wUiLA7qycV",
        type: "svg",
        x: -105.31936687750184,
        y: -116.87578193575993,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgdmlld0JveD0iMCAwIDM2IDM2Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIC0xMDE2LjM2MikiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE2OS45NDYgLTIpIj48Y2lyY2xlIHN0eWxlPSJpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiIGN4PSItMTUxLjk0NiIgY3k9IjEwMzYuMzYyIiByPSIxNiIgZmlsbD0iI2U5ZWRlZCIgY29sb3I9IiMwMDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PGNpcmNsZSBzdHlsZT0iaXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsIiBjeD0iLTE2NC45NDYiIGN5PSIxMDM0LjM2MiIgcj0iMSIgZmlsbD0iI2U0ZThlOCIgY29sb3I9IiMwMDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PGNpcmNsZSBjeD0iLTE2Mi45NDYiIGN5PSIxMDQzLjM2MiIgcj0iMSIgZmlsbD0iI2U0ZThlOCIgY29sb3I9IiMwMDAiIG92ZXJmbG93PSJ2aXNpYmxlIiBzdHlsZT0iaXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsIi8+PGNpcmNsZSBzdHlsZT0iaXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsIiBjeD0iLTE1NS40NDYiIGN5PSIxMDI0Ljg2MiIgcj0iMS41IiBmaWxsPSIjZTRlOGU4IiBjb2xvcj0iIzAwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48Y2lyY2xlIGN4PSItMTUxLjk0NiIgY3k9IjEwMzYuMzYyIiByPSIyIiBmaWxsPSIjZTRlOGU4IiBjb2xvcj0iIzAwMCIgb3ZlcmZsb3c9InZpc2libGUiIHN0eWxlPSJpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48Y2lyY2xlIGN4PSItMTUyLjQ0NiIgY3k9IjEwNDYuODYyIiByPSIxLjUiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxjaXJjbGUgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIgY3g9Ii0xNTYuOTQ2IiBjeT0iMTAzMi4zNjIiIHI9IjEiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIvPjxjaXJjbGUgY3g9Ii0xNDQuOTQ2IiBjeT0iMTAzMS4zNjIiIHI9IjEiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxjaXJjbGUgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIgY3g9Ii0xNDMuOTQ2IiBjeT0iMTA0NC4zNjIiIHI9IjEiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIvPjxjaXJjbGUgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIgY3g9Ii0xNDEuNDQ2IiBjeT0iMTAzNy44NjIiIHI9IjEuNSIgZmlsbD0iI2U0ZThlOCIgY29sb3I9IiMwMDAiIG92ZXJmbG93PSJ2aXNpYmxlIi8+PGNpcmNsZSBjeD0iLTEzOS40NDYiIGN5PSIxMDQzLjg2MiIgcj0iLjUiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxjaXJjbGUgY3g9Ii0xMzcuNDQ2IiBjeT0iMTAzNC44NjIiIHI9Ii41IiBmaWxsPSIjZTRlOGU4IiBjb2xvcj0iIzAwMCIgb3ZlcmZsb3c9InZpc2libGUiIHN0eWxlPSJpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48Y2lyY2xlIGN4PSItMTYxLjQ0NiIgY3k9IjEwNDYuODYyIiByPSIuNSIgZmlsbD0iI2U0ZThlOCIgY29sb3I9IiMwMDAiIG92ZXJmbG93PSJ2aXNpYmxlIiBzdHlsZT0iaXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsIi8+PGNpcmNsZSBjeD0iLTE2NS40NDYiIGN5PSIxMDMxLjg2MiIgcj0iLjUiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxjaXJjbGUgY3g9Ii0xNDkuNDQ2IiBjeT0iMTA0OS44NjIiIHI9Ii41IiBmaWxsPSIjZTRlOGU4IiBjb2xvcj0iIzAwMCIgb3ZlcmZsb3c9InZpc2libGUiIHN0eWxlPSJpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48Y2lyY2xlIGN4PSItMTQ1LjQ0NiIgY3k9IjEwMjMuODYyIiByPSIuNSIgZmlsbD0iI2U0ZThlOCIgY29sb3I9IiMwMDAiIG92ZXJmbG93PSJ2aXNpYmxlIiBzdHlsZT0iaXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsIi8+PGNpcmNsZSBjeD0iLTE0My40NDYiIGN5PSIxMDI4Ljg2MiIgcj0iLjUiIGZpbGw9IiNlNGU4ZTgiIGNvbG9yPSIjMDAwIiBvdmVyZmxvdz0idmlzaWJsZSIgc3R5bGU9Imlzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxwYXRoIGZpbGw9IiNjOGQyZDIiIHN0eWxlPSJpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiIGQ9Ik0tMTUxLjk0NTU0IDEwMzQuMzYyMmExLjk5OTk4MjggMS45OTk5ODI4IDAgMCAwLS41MDM5LjA2NCAxLjk5OTk4MjggMS45OTk5ODI4IDAgMCAxIDEuNTAzOSAxLjkzNTUgMS45OTk5ODI4IDEuOTk5OTgyOCAwIDAgMS0xLjQ5NjA5IDEuOTM1NSAxLjk5OTk4MjggMS45OTk5ODI4IDAgMCAwIC40OTYwOS4wNjQgMS45OTk5ODI4IDEuOTk5OTgyOCAwIDAgMCAyLTIgMS45OTk5ODI4IDEuOTk5OTgyOCAwIDAgMC0yLTJ6TS0xNTUuNDQ1NTcgMTAyMy4zNjNhMS40OTk5ODcxIDEuNDk5OTg3MSAwIDAgMC0uMzc3OTMuMDQ4IDEuNDk5OTg3MSAxLjQ5OTk4NzEgMCAwIDEgMS4xMjc5MyAxLjQ1MTUgMS40OTk5ODcxIDEuNDk5OTg3MSAwIDAgMS0xLjEyMjA3IDEuNDUxNyAxLjQ5OTk4NzEgMS40OTk5ODcxIDAgMCAwIC4zNzIwNy4wNDggMS40OTk5ODcxIDEuNDk5OTg3MSAwIDAgMCAxLjUtMS41IDEuNDk5OTg3MSAxLjQ5OTk4NzEgMCAwIDAtMS41LTEuNXpNLTE1Ni45NDU1NSAxMDMxLjM2MjdhLjk5OTk5MTQuOTk5OTkxNCAwIDAgMC0uMjUxOTYuMDMyLjk5OTk5MTQuOTk5OTkxNCAwIDAgMSAuNzUxOTYuOTY3OC45OTk5OTE0Ljk5OTk5MTQgMCAwIDEtLjc0ODA1Ljk2NzcuOTk5OTkxNC45OTk5OTE0IDAgMCAwIC4yNDgwNS4wMzIuOTk5OTkxNC45OTk5OTE0IDAgMCAwIDEtMSAuOTk5OTkxNC45OTk5OTE0IDAgMCAwLTEtMXpNLTE2NS40NDU1NyAxMDMxLjM2MjJhLjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwLS4xMjU5Ny4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDEgLjM3NTk3LjQ4MzkuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDEtLjM3NDAyLjQ4MzkuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjEyNDAyLjAxNi40OTk5OTMzOS40OTk5OTMzOSAwIDAgMCAuNS0uNS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uNS0uNDk5OXpNLTE2NC45NDU1NSAxMDMzLjM2MjdhLjk5OTk5MTQuOTk5OTkxNCAwIDAgMC0uMjUxOTYuMDMyLjk5OTk5MTQuOTk5OTkxNCAwIDAgMSAuNzUxOTYuOTY3OC45OTk5OTE0Ljk5OTk5MTQgMCAwIDEtLjc0ODA1Ljk2NzcuOTk5OTkxNC45OTk5OTE0IDAgMCAwIC4yNDgwNS4wMzIuOTk5OTkxNC45OTk5OTE0IDAgMCAwIDEtMSAuOTk5OTkxNC45OTk5OTE0IDAgMCAwLTEtMXpNLTE2Mi45NDU1NSAxMDQyLjM2MjdhLjk5OTk5MTQuOTk5OTkxNCAwIDAgMC0uMjUxOTYuMDMyLjk5OTk5MTQuOTk5OTkxNCAwIDAgMSAuNzUxOTYuOTY3OC45OTk5OTE0Ljk5OTk5MTQgMCAwIDEtLjc0ODA1Ljk2NzcuOTk5OTkxNC45OTk5OTE0IDAgMCAwIC4yNDgwNS4wMzIuOTk5OTkxNC45OTk5OTE0IDAgMCAwIDEtMSAuOTk5OTkxNC45OTk5OTE0IDAgMCAwLTEtMXpNLTE0My45NDU1NSAxMDQzLjM2MjdhLjk5OTk5MTQuOTk5OTkxNCAwIDAgMC0uMjUxOTYuMDMyLjk5OTk5MTQuOTk5OTkxNCAwIDAgMSAuNzUxOTYuOTY3OC45OTk5OTE0Ljk5OTk5MTQgMCAwIDEtLjc0ODA1Ljk2NzcuOTk5OTkxNC45OTk5OTE0IDAgMCAwIC4yNDgwNS4wMzIuOTk5OTkxNC45OTk5OTE0IDAgMCAwIDEtMSAuOTk5OTkxNC45OTk5OTE0IDAgMCAwLTEtMXpNLTE0NC45NDU1MyAxMDMwLjM2MjdhLjk5OTk5MTQuOTk5OTkxNCAwIDAgMC0uMjUxOTYuMDMyLjk5OTk5MTQuOTk5OTkxNCAwIDAgMSAuNzUxOTYuOTY3OC45OTk5OTE0Ljk5OTk5MTQgMCAwIDEtLjc0ODA1Ljk2NzcuOTk5OTkxNC45OTk5OTE0IDAgMCAwIC4yNDgwNS4wMzIuOTk5OTkxNC45OTk5OTE0IDAgMCAwIDEtMSAuOTk5OTkxNC45OTk5OTE0IDAgMCAwLTEtMXpNLTE1Mi40NDU1NyAxMDQ1LjM2M2ExLjQ5OTk4NzEgMS40OTk5ODcxIDAgMCAwLS4zNzc5My4wNDggMS40OTk5ODcxIDEuNDk5OTg3MSAwIDAgMSAxLjEyNzkzIDEuNDUxNSAxLjQ5OTk4NzEgMS40OTk5ODcxIDAgMCAxLTEuMTIyMDcgMS40NTE3IDEuNDk5OTg3MSAxLjQ5OTk4NzEgMCAwIDAgLjM3MjA3LjA0OCAxLjQ5OTk4NzEgMS40OTk5ODcxIDAgMCAwIDEuNS0xLjUgMS40OTk5ODcxIDEuNDk5OTg3MSAwIDAgMC0xLjUtMS41ek0tMTQxLjQ0NTU0IDEwMzYuMzYzYTEuNDk5OTg3MSAxLjQ5OTk4NzEgMCAwIDAtLjM3NzkzLjA0OCAxLjQ5OTk4NzEgMS40OTk5ODcxIDAgMCAxIDEuMTI3OTMgMS40NTE1IDEuNDk5OTg3MSAxLjQ5OTk4NzEgMCAwIDEtMS4xMjIwNyAxLjQ1MTcgMS40OTk5ODcxIDEuNDk5OTg3MSAwIDAgMCAuMzcyMDcuMDQ4IDEuNDk5OTg3MSAxLjQ5OTk4NzEgMCAwIDAgMS41LTEuNSAxLjQ5OTk4NzEgMS40OTk5ODcxIDAgMCAwLTEuNS0xLjV6TS0xNjEuNDQ1NTUgMTA0Ni4zNjIzYS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uMTI1OTguMDE2LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxIC4zNzU5OC40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxLS4zNzQwMi40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwIC4xMjQwMi4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjUtLjUuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAtLjUtLjQ5OTl6TS0xNDkuNDQ1NTUgMTA0OS4zNjI0YS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uMTI1OTguMDE2LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxIC4zNzU5OC40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxLS4zNzQwMi40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwIC4xMjQwMi4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjUtLjUuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAtLjUtLjQ5OTl6TS0xMzkuNDQ1NTUgMTA0My4zNjIzYS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uMTI1OTguMDE2LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxIC4zNzU5OC40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxLS4zNzQwMi40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwIC4xMjQwMi4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjUtLjUuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAtLjUtLjQ5OTl6TS0xMzcuNDQ1NTUgMTAzNC4zNjIzYS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uMTI1OTcuMDE2LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxIC4zNzU5Ny40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxLS4zNzQwMi40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwIC4xMjQwMi4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjUtLjUuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAtLjUtLjQ5OTl6TS0xNDMuNDQ1NTcgMTAyOC4zNjIzYS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uMTI1OTcuMDE2LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxIC4zNzU5Ny40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxLS4zNzQwMi40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwIC4xMjQwMi4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjUtLjUuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAtLjUtLjQ5OTl6TS0xNDUuNDQ1NTcgMTAyMy4zNjIzYS40OTk5OTMzOS40OTk5OTMzOSAwIDAgMC0uMTI1OTcuMDE2LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxIC4zNzU5Ny40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAxLS4zNzQwMi40ODM5LjQ5OTk5MzM5LjQ5OTk5MzM5IDAgMCAwIC4xMjQwMi4wMTYuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAgLjUtLjUuNDk5OTkzMzkuNDk5OTkzMzkgMCAwIDAtLjUtLjQ5OTl6IiBjb2xvcj0iIzAwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48cGF0aCBmaWxsPSIjYWFiNGIyIiBmaWxsLW9wYWNpdHk9Ii4yNDMiIHN0eWxlPSJpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiIGQ9Im0gLTE1MS45NDU1NCwxMDIwLjM2MjIgYSAxNiwxNiAwIDAgMCAtMS45ODI0MiwwLjE0MjYgMTYsMTYgMCAwIDEgMTMuOTgyNDIsMTUuODU3NCAxNiwxNiAwIDAgMSAtMTQuMDE3NTcsMTUuODU3NCAxNiwxNiAwIDAgMCAyLjAxNzU3LDAuMTQyNiAxNiwxNiAwIDAgMCAxNi4wMDAwMSwtMTYgMTYsMTYgMCAwIDAgLTE2LjAwMDAxLC0xNiB6IiBjb2xvcj0iIzAwMCIgb3ZlcmZsb3c9InZpc2libGUiLz48L2c+PHBhdGggZmlsbD0iI2U5ZWRlZCIgc3R5bGU9ImxpbmUtaGVpZ2h0Om5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDA7dGV4dC10cmFuc2Zvcm06bm9uZTtibG9jay1wcm9ncmVzc2lvbjp0Yjtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiIGQ9Im0gMTcuOTg4NjI3LDEwMTcuMzcgYyAtMC41NTYwMiwwLjAxIC0xLjExMTIyLDAuMDM4IC0xLjY2NDA2LDAuMDk4IC0wLjE0MzQsMC4wMTYgLTAuMjg2NzIsMC4wMzQgLTAuNDI5NjgsMC4wNTMgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIC0wLjAwMiwwIGMgMCwwIC0wLjAwMiwwIC0wLjAwMiwwIGwgLTAuMDExNywwIGMgLTguNDg1ODEwNywxLjA2NjYgLTE0Ljg3MDU1MTUsOC4yOTE3IC0xNC44ODA4NjE0NSwxNi44NDU3IDAuMDA4LDguNTQ2OSA2LjM4MDcyMDc1LDE1Ljc3MyAxNC44NTkzODE0NSwxNi44NDk2IGwgMC4wMDIsMCBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgMC4wMTc2LDAgYyAwLjQyMzg5LDAuMDUyIDAuODUwNzgsMC4wODggMS4yNzczNCwwLjEwNzQgMC4yNzIxNywwLjAyIDAuNTQzNTcsMC4wMzQgMC44MTY0MSwwLjA0MSBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgMC4wMzUxLDAgYyAwLjQ3OTQ5LDAgMC45NTgxMSwtMC4wMjggMS40MzU1NSwtMC4wNzIgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIDAuMDAyLDAgYyAwLjI4ODI5LC0wLjAyNyAwLjU3NDgsLTAuMDYyIDAuODYxMzMsLTAuMTAzNSBsIDAuMDE3NiwwIGMgMC4yNjU1NiwtMC4wMzQgMC41MzEyOSwtMC4wNzYgMC43OTQ5MiwtMC4xMjMgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIDAuMDE1NiwwIGMgMC4yNzUxNywtMC4wNTQgMC41NTAwOSwtMC4xMTQyIDAuODIyMjYsLTAuMTgxNyBsIDAuMDE5NSwwIGMgMC4yNjM1LC0wLjA2MSAwLjUyNjgxLC0wLjEyNzkgMC43ODcxMSwtMC4yMDExIGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAxOTUsLTAuMDEgYyAwLjI3MzczLC0wLjA4MyAwLjU0NTI5LC0wLjE3NDMgMC44MTQ0NiwtMC4yNzE1IGwgMC4wMTk1LC0wLjAxIGMgMC4yNTM1LC0wLjA4NiAwLjUwNDc0LC0wLjE3NTggMC43NTM5LC0wLjI3MzUgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIDAuMDIxNSwtMC4wMSBjIDAuMjY2MzQsLTAuMTExNiAwLjUyODc1LC0wLjIzMDQgMC43ODkwNiwtMC4zNTU0IGwgMC4wMDIsMCBjIDAuMjQwNSwtMC4xMDg5IDAuNDc5NjksLTAuMjIxOCAwLjcxNDg1LC0wLjM0MTggYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIDAuMDE5NSwtMC4wMSBjIDAuMjU5NzIsLTAuMTQgMC41MTU1LC0wLjI4ODEgMC43Njc1OCwtMC40NDE0IDAuMjM0NTIsLTAuMTM2MiAwLjQ2NTYxLC0wLjI3NjcgMC42OTMzNiwtMC40MjM5IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAxOTUsLTAuMDEyIGMgMC4yMjExMywtMC4xNTAxIDAuNDM4NTQsLTAuMzA2NCAwLjY1MjM0LC0wLjQ2NjggbCAwLjAxNzYsLTAuMDE0IGMgMC4yMzM1NCwtMC4xNjgzIDAuNDYyOCwtMC4zNDE1IDAuNjg3NSwtMC41MjE0IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAxNzYsLTAuMDE2IGMgMC4yMDM3OSwtMC4xNzEyIDAuNDA0MDgsLTAuMzQ2OCAwLjU5OTYxLC0wLjUyNzQgbCAwLjAwNCwwIGMgMC4yMTQ0OCwtMC4xODkyIDAuNDI0MjYsLTAuMzg0MiAwLjYyODkxLC0wLjU4NCBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgMC4wMTU2LC0wLjAxOCBjIDAuMTk1NiwtMC4yMDAzIDAuMzg2NzgxLC0wLjQwNTQgMC41NzIyNjEsLTAuNjE1MiBsIDAuMDExNywtMC4wMTQgYyAwLjE4MTg4LC0wLjE5NjggMC4zNTg4NywtMC4zOTgzIDAuNTMxMjUsLTAuNjAzNSBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgMC4wMTU2LC0wLjAxOCBjIDAuMTc5OTMsLTAuMjI0NyAwLjM1MzIxLC0wLjQ1MzkgMC41MjE0OSwtMC42ODc1IGwgMC4wMTM3LC0wLjAxOCBjIDAuMTYwNDQsLTAuMjEzOCAwLjMxNjYxLC0wLjQzMTMgMC40NjY4LC0wLjY1MjQgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIDAuMDExNywtMC4wMiBjIDAuMTQ3MjQsLTAuMjI3OCAwLjI4NzY1LC0wLjQ1ODggMC40MjM4MiwtMC42OTMzIDAuMTUzMjksLTAuMjUyMSAwLjMwMTQ1LC0wLjUwOTkgMC40NDE0MSwtMC43Njk2IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAxLC0wLjAxOCBjIDAuMTE2ODEsLTAuMjI4OSAwLjIyNzY2LC0wLjQ2MTMgMC4zMzM5OCwtMC42OTUzIGwgMC4wMDgsLTAuMDIgYyAwLjEyNTQ0LC0wLjI2MTEgMC4yNDU1LC0wLjUyNTcgMC4zNTc0MiwtMC43OTI5IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAxLC0wLjAxOSBjIDAuMDk3OCwtMC4yNDkyIDAuMTg3NTYsLTAuNTAwMyAwLjI3MzQ0LC0wLjc1MzkgbCAwLjAwOCwtMC4wMjEgYyAwLjA5NzEsLTAuMjY5MiAwLjE4ODA2LC0wLjU0MDggMC4yNzE0OCwtMC44MTQ1IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAwNiwtMC4wMTkgYyAwLjA3MzIsLTAuMjYwMyAwLjE0MDQ0LC0wLjUyMzYgMC4yMDExOCwtMC43ODcxIGwgMC4wMDYsLTAuMDIgYyAwLjA2NzQsLTAuMjcyMiAwLjEyNzc3LC0wLjU0NzEgMC4xODE2NCwtMC44MjIzIGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLjAwNCwtMC4wMTYgYyAwLjA0NywtMC4yNjM2IDAuMDg4NiwtMC41Mjk0IDAuMTIzMDUsLTAuNzk0OSBsIDAuMDAyLC0wLjAxOCBjIDAuMDQxOCwtMC4yODY1IDAuMDc2NCwtMC41NzMgMC4xMDM1MiwtMC44NjEzIDAuMDQ0NSwtMC40Nzc0IDAuMDY4MywtMC45NTYxIDAuMDcyMywtMS40MzU2IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAwLC0wLjAxOCBjIC0wLjAwNCwtMC40ODAxIC0wLjAyNzcsLTAuOTU5MyAtMC4wNzIzLC0xLjQzNzUgLTAuMDI3MSwtMC4yODgzIC0wLjA2MTcsLTAuNTc0OCAtMC4xMDM1MiwtMC44NjEzIGwgLTAuMDAyLC0wLjAxOCBjIC0wLjAzNDUsLTAuMjY1NiAtMC4wNzYxLC0wLjUzMTMgLTAuMTIzMDUsLTAuNzk0OSBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgLTAuMDA0LC0wLjAxOCBjIC0wLjA1NCwtMC4yNzMxIC0wLjExNDMzLC0wLjU0NDQgLTAuMTgxNjQsLTAuODE0NSBsIC0wLjAwNiwtMC4wMiBjIC0wLjA2MTIsLTAuMjY3NyAtMC4xMjksLTAuNTMyNSAtMC4yMDMxMywtMC43OTY5IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMDYsLTAuMDIyIGMgLTAuMDgxMywtMC4yNjc0IC0wLjE2OTMsLTAuNTMxNyAtMC4yNjM2NywtMC43OTQ5IC0wLjA4OTYsLTAuMjY1OSAtMC4xODY0LC0wLjUyNzkgLTAuMjg5MDYsLTAuNzg5IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMDgsLTAuMDIyIGMgLTAuMTExNCwtMC4yNjUxIC0wLjIzMDc2LC0wLjUyOCAtMC4zNTU0NiwtMC43ODcxIC0wLjEwOTI0LC0wLjI0MTMgLTAuMjIzMzYsLTAuNDgwOSAtMC4zNDM3NSwtMC43MTY4IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMSwtMC4wMiBjIC0wLjEzOTk2LC0wLjI1OTcgLTAuMjg4MTIsLTAuNTE1NiAtMC40NDE0MSwtMC43Njc2IC0wLjEzNjE3LC0wLjIzNDYgLTAuMjc2NTgsLTAuNDY1NyAtMC40MjM4MiwtMC42OTM0IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMTE3LC0wLjAxOSBjIC0wLjE1MDE5LC0wLjIyMTIgLTAuMzA2MzYsLTAuNDM4NSAtMC40NjY4LC0wLjY1MjMgbCAtMC4wMTM3LC0wLjAxOCBjIC0wLjE2ODI4LC0wLjIzMzUgLTAuMzQxNTYsLTAuNDYyNyAtMC41MjE0OSwtMC42ODc1IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMTU2LC0wLjAxOCBjIC0wLjE3MTIsLTAuMjAzOCAtMC4zNDY3NywtMC40MDQxIC0wLjUyNzM0LC0wLjU5OTYgbCAtMC4wMDQsMCBjIC0wLjE4OTIyLC0wLjIxNDUgLTAuMzg0MTgxLC0wLjQyNDIgLTAuNTgzOTgxLC0wLjYyODkgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIC0wLjAxNTYsLTAuMDE2IGMgLTAuMTk2NCwtMC4xOTE5IC0wLjM5ODA1LC0wLjM4MDMgLTAuNjAzNTIsLTAuNTYyNSBsIC0wLjAxNTYsLTAuMDE2IGMgLTAuMjA2MTUsLTAuMTg5NCAtMC40MTc1NywtMC4zNzM5IC0wLjYzMjgxLC0wLjU1MjggYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIC0wLjAxMzcsLTAuMDEyIGMgLTAuMjEwMDUsLTAuMTY4MSAtMC40MjQ3OCwtMC4zMzAyIC0wLjY0MjU3LC0wLjQ4ODIgbCAtMC4wMTc2LC0wLjAxNCBjIC0wLjIyMzgsLTAuMTY5MiAtMC40NTE3LC0wLjMzMjMgLTAuNjgzNTksLTAuNDkwMyBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgLTAuMDE5NSwtMC4wMTQgYyAtMC4yMjY2MiwtMC4xNDYyIC0wLjQ1ODA4LC0wLjI4NjcgLTAuNjkxNCwtMC40MjE5IGwgLTAuMDA2LDAgYyAtMC4yNTAxNCwtMC4xNTE5IC0wLjUwNDA3LC0wLjI5ODYgLTAuNzYxNzIsLTAuNDM3NSBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgLTAuMDE5NSwtMC4wMSBjIC0wLjIyODkzLC0wLjExNjggLTAuNDYxMzMsLTAuMjI3NiAtMC42OTUzMSwtMC4zMzM5IGwgLTAuMDE5NSwtMC4wMSBjIC0wLjI2MTA3LC0wLjEyNTQgLTAuNTIzODcsLTAuMjQ1NiAtMC43OTEwMSwtMC4zNTc1IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMjE1LC0wLjAxIGMgLTAuMjQ5MTYsLTAuMDk4IC0wLjUwMDQsLTAuMTg3NiAtMC43NTM5LC0wLjI3MzQgbCAtMC4wMTk1LC0wLjAxIGMgLTAuMjY5MTcsLTAuMDk3IC0wLjU0MDczLC0wLjE4ODEgLTAuODE0NDYsLTAuMjcxNSBhIDEuMDAwMTAwMSwxLjAwMDEwMDEgMCAwIDAgLTAuMDE5NSwtMC4wMTIgYyAtMC4yNjAzLC0wLjA3MyAtMC41MjM2MSwtMC4xNDA0IC0wLjc4NzExLC0wLjIwMTIgbCAtMC4wMTk1LDAgYyAtMC4yNzA3OCwtMC4wNjcgLTAuNTQyNjMsLTAuMTI3NyAtMC44MTY0LC0wLjE4MTYgYSAxLjAwMDEwMDEsMS4wMDAxMDAxIDAgMCAwIC0wLjAxOTUsMCBjIC0wLjI3ODEyLC0wLjA0OSAtMC41NTc2OCwtMC4wOSAtMC44Mzc4OSwtMC4xMjUgbCAtMC4wMjM0LDAgYyAtMC4yNTk3OCwtMC4wMzggLTAuNTE5OTksLTAuMDcgLTAuNzgxMjUsLTAuMDk2IGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMDgsMCBjIC0wLjQ4NzA5LC0wLjA0NSAtMC45NzU2NiwtMC4wNjkgLTEuNDY0ODQsLTAuMDcyIGEgMS4wMDAxMDAxLDEuMDAwMTAwMSAwIDAgMCAtMC4wMTU2LDAgbCAwLC0wLjAxMiB6IG0gMC4wMSwxIGEgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAxLjM3ODkxLDAuMDY4IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC43NTc4MSwwLjA5NCAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuODEwNTUsMC4xMjExIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC43ODcxMSwwLjE3NTggMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjc1NzgxMSwwLjE5MzMgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjc4NTE1LDAuMjYxNyAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuNzI4NTIsMC4yNjU3IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC43NjM2NywwLjM0MzcgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjY3MzgzLDAuMzI0MiAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuNzIyNjYsMC40MTQxIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC42Njc5NywwLjQwODIgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjY2MDE1LDAuNDc0NiAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuNjIxMDksMC40NzI3IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC42MDkzOCwwLjUzMzIgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjU4MjAzLDAuNTQxIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC41NTI3NCwwLjU5NTcgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjUxMTcxMSwwLjU4MDEgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjUwMzkxLDAuNjY0IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC40NTExNywwLjYzMDkgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjQxMDE2LDAuNjY5OSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuNDE0MDYsMC43MjI3IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC4zMjQyMiwwLjY3MzggMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjM0Mzc1LDAuNzYxNyAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuMjcxNDgsMC43NDQyIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC4yNTM5MSwwLjc2NTYgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjE5NTMxLDAuNzY5NSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDAuMTc1NzgsMC43ODUyIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC4xMTcxOSwwLjc2MzYgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjA5OTYsMC44MjgyIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC4wNjg0LDEuMzUzNSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjA2ODQsMS4zNTE2IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuMDk5NiwwLjgyODEgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC4xMTcxOSwwLjc2MzcgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC4xNzU3OCwwLjc5MSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjE5MzM2LDAuNzU3OCAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjI2MTcxLDAuNzg1MSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjI2NTYzLDAuNzI4NiAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjM0Mzc1LDAuNzYzNiAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjMyNDIyLDAuNjczOSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjQxNDA2LDAuNzIyNiAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjQxMDE2LDAuNjY5OSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjQ1MTE3LDAuNjMwOSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjUwMzkxLDAuNjY0MSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIC0wLjUxMTcxMSwwLjU4IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuNTUyNzQsMC41OTU3IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuNTk1NywwLjU1MjggMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC41ODAwOCwwLjUxMTcgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC42NjQwNiwwLjUwMzkgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC42MzA4NiwwLjQ1MTIgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC42Njk5MiwwLjQxMDEgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC43MjI2NiwwLjQxNDEgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC42NzM4MywwLjMyNDIgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC43NjM2NywwLjM0MzggMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC43Mjg1MiwwLjI2NTYgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC43ODUxNSwwLjI2MTcgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC43NTc4MTEsMC4xOTM0IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuNzkxMDIsMC4xNzU3IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuNzYzNjcsMC4xMTcyIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuODI4MTMsMC4xIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTEuMzUxNTYsMC4wNjggMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMC43Njk1MywtMC4wMzkgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAtMS4yMzA0NywtMC4xMDE1IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTAuMDEzNywwIDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgLTEzLjk4NjMzMTQsLTE1Ljg1NzUgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAxNC4wMTc1ODE0LC0xNS44NTc0IDE2LjAwMDAwMiwxNi4wMDAwMDIgMCAwIDEgMC4wMTE3LDAgMTYuMDAwMDAyLDE2LjAwMDAwMiAwIDAgMSAwLjQwNDI5LC0wLjA0OSAxNi4wMDAwMDIsMTYuMDAwMDAyIDAgMCAxIDEuNTY2NDEsLTAuMDkyIHoiIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiIHdoaXRlLXNwYWNlPSJub3JtYWwiLz48L2c+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 543.8938897391947,
        height: 543.8938897391946,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "BZWMIvvQgh",
        type: "svg",
        x: 612.1391010334872,
        y: 82.50425430553659,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: true,
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDY0IDY0Ij48ZyBkYXRhLW5hbWU9Ikljb24gMTEiPjxwYXRoIGZpbGw9IiNkZGQiIGQ9Ik05LjMxLDEwLjQ3UzI0LjQ0LDEyLjgsMzAuMjUsMGMwLDAsNS44MiwxNCwyMi4xMSwxMC40NywwLDAtNC42NSwxNi4yOSwxMC40OCwyMi4xMSwwLDAtMTUuMTMsMi4zMy0xMC40OCwyMSwwLDAtMTUuMTItNS44Mi0yMi4xMSwxMC40NywwLDAtMi4zMi0xNS4xMy0yMi4xLTEwLjQ3LDAsMCw5LjMtMTYuMjktOC4xNS0yMUMwLDMyLjU4LDEyLjgsMjQuNDQsOS4zMSwxMC40N1oiLz48cGF0aCBmaWxsPSIjZjRmNGY0IiBkPSJNMTksMTkuOTFTMjcuNTYsMjEuMjMsMzAuODQsMTRhMTAuNzQsMTAuNzQsMCwwLDAsMTIuNDgsNS45MXMtMi42Miw5LjIsNS45MiwxMi40OGMwLDAtOC41NCwxLjMyLTUuOTIsMTEuODMsMCwwLTguNTQtMy4yOS0xMi40OCw1LjkxLDAsMC0xLjMxLTguNTQtMTIuNDgtNS45MSwwLDAsNS4yNi05LjItNC42LTExLjgzQzEzLjc2LDMyLjM5LDIxLDI3Ljc5LDE5LDE5LjkxWiIvPjxsaW5lIHgxPSIxLjUiIHgyPSI2MiIgeTE9IjMyLjAxIiB5Mj0iMzIuMDEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2Utd2lkdGg9IjIiLz48bGluZSB4MT0iMzAuNTkiIHgyPSIzMC41OSIgeTE9IjEiIHkyPSI2MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI1MS45OCIgeDI9IjguMDIiIHkxPSIxMC40OCIgeTI9IjUzLjUyIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTEyLjUsMTNzMTMsMiwxOC05YzAsMCw1LDEyLDE5LDksMCwwLTQsMTQsOSwxOSwwLDAtMTMsMi05LDE4LDAsMC0xMy01LTE5LDksMCwwLTItMTMtMTktOSwwLDAsOC0xNC03LTE4QzQuNSwzMiwxNS41LDI1LDEyLjUsMTNaIi8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE3LjQzLDE3LjY4UzI3LjA4LDE5LjE2LDMwLjc5LDExYTEyLjEyLDEyLjEyLDAsMCwwLDE0LjA5LDYuNjhzLTMsMTAuMzgsNi42NywxNC4wOWMwLDAtOS42NCwxLjQ4LTYuNjcsMTMuMzUsMCwwLTkuNjQtMy43MS0xNC4wOSw2LjY4LDAsMC0xLjQ5LTkuNjUtMTQuMS02LjY4LDAsMCw1Ljk0LTEwLjM4LTUuMTktMTMuMzVDMTEuNSwzMS43NywxOS42NiwyNi41OCwxNy40MywxNy42OFoiLz48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIiBkPSJNMjEuNDEsMjIuMzlzNi4zNCwxLDguNzktNC4zOWE4LDgsMCwwLDAsOS4yNyw0LjM5cy0xLjk1LDYuODQsNC40LDkuMjhjMCwwLTYuMzUsMS00LjQsOC43OSwwLDAtNi4zNC0yLjQ0LTkuMjcsNC40LDAsMC0xLTYuMzUtOS4yOC00LjQsMCwwLDMuOS02LjgzLTMuNDItOC43OUMxNy41LDMxLjY3LDIyLjg3LDI4LjI1LDIxLjQxLDIyLjM5WiIvPjxsaW5lIHgxPSI5IiB4Mj0iNTMiIHkxPSIxMCIgeTI9IjUzIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128,
        height: 128,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "99K-ff5xEh",
        type: "svg",
        x: 577.004580001725,
        y: 317.3124289504679,
        rotation: -28.374496923230403,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: true,
        shadowBlur: 25,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDUxMiA1MTIiPjxwYXRoIGZpbGw9IiNkZWRlZGUiIGQ9Ik01MDQuNSwyNTMuOTJjLS43LDMuNTctNi4xNTk5MSwyOS4wOC0zMC43MSw0Mi43Mjk5MkE2MC42MzM2OSw2MC42MzM2OSwwLDAsMSw0MzQuNjIwMTIsMzAzLjI5YTU4LjU1NzY4LDU4LjU1NzY4LDAsMCwxLTkuNzAwMi0yLjM2MDExcS4wMywzLjg4NTEzLS4yOSw3LjcwMDA3Yy0yLjMwOTgxLDI3LjctMTguMTk5OTUsNTEuNy00MS41ODk4NCw2Mi4wOS0yMC4zODAxMyw5LjA2MDA2LTM5LjkyLDQuODgtNTAuMjcsMS4zNmE2OS42ODkzNCw2OS42ODkzNCwwLDAsMS02Ljk3LTIuNzc5OTFxLjk0NDgyLDMuODM5OTEsMS42MDk4Niw3LjMyYzQuNDQwMDcsMjMuMzA5OTMtLjI0LDM1LjQ5LTYuMjQsNDIuMzZDMzA4LjczLDQzMy4yMywyODYuNTgwMDgsNDI5LjM3LDI4Mi43NSw0NDEuNzZjLTMuMTg5OTQsMTAuMjksMTEuMDEsMTYuMzQsMTAuMSwzMS4xMS0uODUsMTMuNjgtMTQuMzcsMzAuMTkwMDYtMzMuMjMsMzEuNTM5OTFDMjM5LjY2OTkyLDUwNS44NCwyMjQuMTc5OTMsNDg5LjU5LDIyMS42MSw0NzUuN2MtMi43Nzk5MS0xNC45OSwxMC41NTk5My0yMS40Niw2LjczMDEtMzMuMjhDMjIzLjI4LDQyNi44MjAwNywxOTcuNjg5OTQsNDMwLjgzLDE4Ni4yLDQxMy40NWMtNC4xMzk4OS02LjI2LTcuNjU5OTEtMTcuMTItMi4yMi0zNi45OS42Mi0yLjI3LDEuMzUwMS00LjY0OTksMi4yMi03LjE1OTkxYTY5LjE1NjA5LDY5LjE1NjA5LDAsMCwxLTYuOTgsMi43Nzk5MWMtMTAuMzUsMy41Mi0yOS44ODk4OSw3LjcwMDA3LTUwLjI2LTEuMzYtMjMuNDQ5OTUtMTAuNDE5OTItMzkuMzYtMzQuNTEtNDEuNi02Mi4zcS0uMzE1LTMuNzA1LS4yNzk5MS03LjQ5YTU0LjYwODg2LDU0LjYwODg2LDAsMCwxLTcuMjUsMS45MjAwNUE2MC45NDk4OCw2MC45NDk4OCwwLDAsMSwzOC4yMSwyOTYuNjQ5OUMxMy42NTk5MSwyODMsOC4yLDI1Ny40OSw3LjUsMjUzLjkyYzMwLjAxLTI1Ljc0LDQxLjMxMDA2LTUwLjQ4LDQ2LjA3MDA3LTY4LjM3LDguMzM5ODQtMzEuMzUtMTAuMDItOTAuMzQsMjguNTk5ODUtMTA1Ljc3LDIxLjgwMDA1LTguNzIsMzEuMTIwMTIsOC44MSw0Ni43NCwxOS4wN0MxNDIsMTA3LjQ2LDE2Ny40NiwxMTQuMzgsMTgwLjM0MDA5LDEwMS43NywxOTEuODcsOTAuNDcsMTc5LjAxLDczLjYzLDE4Ni40MTk5Miw1MS43MywxOTQuNjUsMjcuNDQsMjI0LjM1LDcuMjEsMjU2LDcuNWMyOC41OTAwOS4yNyw1Ni4xNjk5MiwxNy4yNiw2NS45NSwzOS44OCw5Ljc3LDIyLjYxLTIuNTIsNDAuOTEsMTAuODYwMTEsNTMuMDgsMTIuNTEsMTEuMzgsMzQuNjc5OTMsNS43NSwzNi4yNyw1LjMzLDIyLjUyLTYuMDMsMzIuOTctMzYuMTcsNTkuNzItMjYuMzksMzkuODQ5ODUsMTQuNTcsMjEuMjQsNzQuNjMsMjkuNjI5ODgsMTA2LjE1QzQ2My4xODk5NCwyMDMuNDQsNDc0LjQ5LDIyOC4xOCw1MDQuNSwyNTMuOTJaIi8+PHBhdGggZmlsbD0iI2NlY2VjZSIgZD0iTTU3LjA4MDA4IDMwMC45Mjk5M2MtLjc3MjM0LjI2NzM0LTIuMzg2MjMuNzk5NTYtNC42NTg4MiAxLjM1MDU5cTIuMzg0NzguNTk5ODUgNC42OTIuOThDNTcuMDk4MTQgMzAyLjQ4NDM4IDU3LjA3Mzg1IDMwMS43MTAyMSA1Ny4wODAwOCAzMDAuOTI5OTN6TTI5MS45NSA0Ny4zOGM5Ljc3IDIyLjYxLTIuNTIgNDAuOTEgMTAuODYwMTEgNTMuMDggMTIuNTEgMTEuMzggMzQuNjc5OTMgNS43NSAzNi4yNyA1LjMzLjU4NzE2LS4xNTcyMyAxLjE2NDMtLjMzNDQ3IDEuNzM1NTktLjUyMzMyYTI0Ljc4NDUxIDI0Ljc4NDUxIDAgMCAxLTguMDA1NjEtNC44MDY3QzMxOS40Mjk5MyA4OC4yOSAzMzEuNzIgNjkuOTkgMzIxLjk1IDQ3LjM4IDMxMi4xNjk5MiAyNC43NiAyODQuNTkwMDkgNy43NyAyNTYgNy41YTc1Ljg2NzMgNzUuODY3MyAwIDAgMC0xNS42ODUzIDEuNTI0NDFDMjYzLjM5NSAxMy42Nzk1NyAyODMuODIxNTMgMjguNTggMjkxLjk1IDQ3LjM4ek00MTIuOTI0MzIgMjk3LjA1MzQ3Yy0uNDM5MjEtLjEwNTM1LTEuNzc1ODgtLjQwODMzLTMuNjg5LS45MjIyNGE0Ny4xODMzMSA0Ny4xODMzMSAwIDAgMS02LjY4NjI4LTIuMDc1MDhjLTEuNTUxNzYtLjcxNDg0LTQuMzQzMjYtMi40NTE3OC02LjY4Ni03LjE0NzIxcS0uNjE2NzEgMTAuODYwNTMtMS4yMzMxNiAyMS43MjEwNmMtMi4zMDk4MSAyNy43LTE4LjE5OTk1IDUxLjctNDEuNTg5ODQgNjIuMDlhNjIuNjM4MDYgNjIuNjM4MDYgMCAwIDEtMTEuMzg0IDMuODA1M2MxMC44NTYzMiAyLjMxNDcgMjUuODc0NTEgMy4wODk0OCA0MS4zODQtMy44MDUzIDIzLjM4OTg5LTEwLjM5IDM5LjI4LTM0LjM5IDQxLjU4OTg0LTYyLjA5LjE0Ny0xLjc3NTc1LjIxOS0zLjU3MDQzLjI1NDg5LTUuMzcyMTlDNDE5LjI4MTI1IDI5OS4xNjggNDE1LjQ0MTY1IDI5Ny42NTc3MSA0MTIuOTI0MzIgMjk3LjA1MzQ3ek00NTguNDI5OTMgMTg1LjU1Yy04LjM4OTg5LTMxLjUyIDEwLjIyLTkxLjU4LTI5LjYyOTg4LTEwNi4xNS05Ljk5NTM2LTMuNjU0MzUtMTcuNzE0MzYtMS43MzQxMy0yNC42MzgxOCAyLjQxODIyIDMyLjc1MzY2IDE3Ljg3ODIzIDE2LjI4MjQ3IDczLjczMTIgMjQuMjY4MDYgMTAzLjczMTgxIDQuNzYgMTcuODkgMTYuMDYwMDYgNDIuNjMgNDYuMDcwMDcgNjguMzctLjcgMy41Ny02LjE1OTkxIDI5LjA4LTMwLjcxIDQyLjcyOTkyYTU4LjQ3NDIyIDU4LjQ3NDIyIDAgMCAxLTE0LjIxNjA3IDUuNjI2ODNjMS40MzM4NC4zNDkzNyAzLjEyNTI1LjcwNzQgNS4wNDYxNSAxLjAxMzMxQTYwLjYzMzY5IDYwLjYzMzY5IDAgMCAwIDQ3My43OSAyOTYuNjQ5OUM0OTguMzQwMDkgMjgzIDUwMy44MDAwNSAyNTcuNDkgNTA0LjUgMjUzLjkyIDQ3NC40OSAyMjguMTggNDYzLjE4OTk0IDIwMy40NCA0NTguNDI5OTMgMTg1LjU1ek05OC45MDk5MSA5OC44NWMxMS4yNjA3NCA3LjQwNjczIDMxLjY2OTA3IDEzLjU1MDUzIDQ1LjM1NDc0IDcuMDk4NjlBNjIuNTM4IDYyLjUzOCAwIDAgMSAxMjguOTA5OTEgOTguODVDMTEzLjI5IDg4LjU5IDEwMy45NyA3MS4wNiA4Mi4xNjk5MiA3OS43OGEzOS4wOTY1OSAzOS4wOTY1OSAwIDAgMC00LjYzNSAyLjIxNTQ1Qzg0LjY3MzU4IDg2LjU2NTczIDkwLjk4MSA5My42NDE4NSA5OC45MDk5MSA5OC44NXpNMzI3LjMxNzc1IDM3Ni4xNzE4OEEzMC43Njg0IDMwLjc2ODQgMCAwIDEgMzEyLjkwMSAzNjkuNDg2Yy0xMC40NjE1NS04Ljg0MDctMTAuOTQ0MzMtMjEuNzk5MzEtMTAuOTkxNDUtMjQuMDMzNDVBODIuNzMyMTggODIuNzMyMTggMCAwIDAgMzAyLjE3MyAzNjcuNTk2Yy45OTYgNi42Nzg0NiAyLjA1MDkxIDcuOTUxOSAyLjY0NTc2IDE0LjMyMjM4LjQ4ODc3IDUuMjM0NzUgMS4yNzIzMyAxMy42MjU2Mi0yLjA1NTE4IDIyLjAyMDM5LTEuMTM1IDIuODYzNC0zLjY4NjI4IDguMDkzMzgtMTEuNTkzNjMgMTUuMDQxMjYtMTkuMjY5NDEgMTYuOTMxLTM1LjM0IDEyLjg0NDczLTM4LjQxOTkyIDIyLjc4LTMuMTg5OTQgMTAuMjkgMTEuMDEgMTYuMzQgMTAuMSAzMS4xMS0uNjQ1MzkgMTAuMzg3MzItOC41OTk4NiAyMi4zOTk0MS0yMC42NDU4OCAyOC4xNzQ0M2EzNC4zMzg4MSAzNC4zMzg4MSAwIDAgMCAxNy40MTU5IDMuMzY1NDhjMTguODYtMS4zNDk4NSAzMi4zOC0xNy44NTk4NiAzMy4yMy0zMS41Mzk5MS45MS0xNC43Ny0xMy4yODk5Mi0yMC44Mi0xMC4xLTMxLjExIDMuNzk4NDYtMTIuMjUzMTcgMjUuOTE3NzItOC4zMTM2IDM4LjQxOTkyLTIyLjc4QzMzMS4xODg0OCA0MDcuMzg3MzMgMzMwLjA3NjkgMzg5Ljc5NTQxIDMyNy4zMTc3NSAzNzYuMTcxODh6Ii8+PGVsbGlwc2UgY3g9IjIzMi41IiBjeT0iNTgiIGZpbGw9IiM0YTRmNjAiIHJ4PSIxOC42MzEiIHJ5PSIxMy40OTIiIHRyYW5zZm9ybT0icm90YXRlKC01My41NyAyMzIuNSA1OCkiLz48cGF0aCBmaWxsPSIjM2IzZjRkIiBkPSJNMjQzLjgwMjczLDQzLjE5MmMtMi44OTgwNy0yLjI3OTkxLTYuNzYzNjctMi43MTc2Ni0xMC42ODU3OS0xLjU5MzM5YTkuOTQxNTMsOS45NDE1MywwLDAsMSwzLjAwMDQ5LDEuNTkzMzljNS44NTc3OSw0LjYwODIxLDUuNTQ2LDE0Ljk3MzYzLS42OTYyOSwyMy4xNTE5MWEyMi4yNjgsMjIuMjY4LDAsMCwxLTExLjIyMzM5LDguMDU3NWM1LjgzMTA2LDEuOTY1NDUsMTMuNjM3NDYtMS4xNTE1NSwxOC45MDg3LTguMDU3NUMyNDkuMzQ4NzUsNTguMTY1NTksMjQ5LjY2MDUyLDQ3LjgwMDE3LDI0My44MDI3Myw0My4xOTJaIi8+PGVsbGlwc2UgY3g9IjI4My41IiBjeT0iNTgiIGZpbGw9IiM0YTRmNjAiIHJ4PSIxMy40OTIiIHJ5PSIxOC42MzEiIHRyYW5zZm9ybT0icm90YXRlKC0zNi40MyAyODMuNSA1OCkiLz48cGF0aCBmaWxsPSIjM2IzZjRkIiBkPSJNMjk0LjEwNjQ1LDQ5LjY1NjEzYy01LjM4MDEzLTcuMDQ4NzEtMTMuNDA0My0xMC4xNTgyMS0xOS4yNzAyNy03LjkzNjE2YTIyLjQyOTczLDIyLjQyOTczLDAsMCwxLDEwLjgzNTQ1LDcuOTM2MTZjNi4yNDIzMSw4LjE3ODIyLDYuNTU0MDgsMTguNTQzNy42OTYyOSwyMy4xNTE4NUE5LjkxOSw5LjkxOSwwLDAsMSwyODMuNzI5LDc0LjI4YzQuMDU0MiwxLjI2NzgyLDguMDgwMDguODgzMTIsMTEuMDczNzMtMS40NzJDMzAwLjY2MDUyLDY4LjE5OTgzLDMwMC4zNDg3NSw1Ny44MzQzNSwyOTQuMTA2NDUsNDkuNjU2MTNaIi8+PGVsbGlwc2UgY3g9IjI1NiIgY3k9IjExMiIgZmlsbD0iIzRhNGY2MCIgcng9IjE2IiByeT0iMjUiLz48cGF0aCBmaWxsPSIjM2IzZjRkIiBkPSJNMjU2LDg3YTExLjA4Mjg1LDExLjA4Mjg1LDAsMCwwLTUuNzg5NjcsMS42OTQ2NGM1Ljk3Mzc1LDMuNjI2LDEwLjIxMDMyLDEyLjY4OTc2LDEwLjIxMDMyLDIzLjMwNTM2cy00LjIzNjU3LDE5LjY3OTM4LTEwLjIxMDMyLDIzLjMwNTM2QTExLjA4Mjg1LDExLjA4Mjg1LDAsMCwwLDI1NiwxMzdjOC44MzY1NSwwLDE2LTExLjE5Mjg3LDE2LTI1UzI2NC44MzY1NSw4NywyNTYsODdaIi8+PHBhdGggZmlsbD0iI2NlY2VjZSIgZD0iTTEzNi4zMzAwOCAyNjQuMDNhNzQuMjg3OTEgNzQuMjg3OTEgMCAwIDEtMTYuNDUwMDggMjUuNjRBNzIuNjc5NjEgNzIuNjc5NjEgMCAwIDEgODkuMjQgMzA4LjExYTcuMTc1IDcuMTc1IDAgMCAxLTEuODguMzA5OTNxLS4zMTUtMy43MDUtLjI3OTkxLTcuNDlhNTQuNjA4ODYgNTQuNjA4ODYgMCAwIDEtNy4yNSAxLjkyMDA1IDcuNTAyNjUgNy41MDI2NSAwIDAgMSA1LjA4OTg0LTkuMTFBNTcuNjc1OSA1Ny42NzU5IDAgMCAwIDEwOS4yMiAyNzkuMTNhNTkuMjgwMjcgNTkuMjgwMjcgMCAwIDAgMTMuMDkwMDktMjAuNDMgNy40OTk0OSA3LjQ5OTQ5IDAgMSAxIDE0LjAyIDUuMzN6TTIyNS43NyAzMzYuMDcwMDdhNzMuNzIzODQgNzMuNzIzODQgMCAwIDEtMzYuMjUgMzkuOTUgNy40MTcxNiA3LjQxNzE2IDAgMCAxLTMuMzIwMDcuNzggNy4yMDEyMiA3LjIwMTIyIDAgMCAxLTIuMjItLjM0MDA5Yy42Mi0yLjI3IDEuMzUwMS00LjY0OTkgMi4yMi03LjE1OTkxYTY5LjE1NjA5IDY5LjE1NjA5IDAgMCAxLTYuOTggMi43Nzk5MSA3LjUxMDkzIDcuNTEwOTMgMCAwIDEgMy42NS05LjUgNTguNzIwNTMgNTguNzIwNTMgMCAwIDAgMjguODgtMzEuODUgNy41MDEyOSA3LjUwMTI5IDAgMCAxIDE0LjAyIDUuMzQwMDl6TTMzMi43NyAzNzIuMDhhNjkuNjg5MzQgNjkuNjg5MzQgMCAwIDEtNi45Ny0yLjc3OTkxcS45NDQ4MiAzLjgzOTkxIDEuNjA5ODYgNy4zMmE3LjI4OTA4IDcuMjg5MDggMCAwIDEtMS42MDk4Ni4xOCA3LjQ2OTIgNy40NjkyIDAgMCAxLTMuNzktMS4wNCA3Ni4wNTEyNSA3Ni4wNTEyNSAwIDAgMS0zMi40OC0zOC4xNiA3LjQ5OTUzIDcuNDk5NTMgMCAxIDEgMTMuOTctNS40NiA2MS4xMjY1NCA2MS4xMjY1NCAwIDAgMCAyNi4xIDMwLjY5QTcuNTAyMTMgNy41MDIxMyAwIDAgMSAzMzIuNzcgMzcyLjA4ek00MzQuNjIwMTIgMzAzLjI5YTU4LjU1NzY4IDU4LjU1NzY4IDAgMCAxLTkuNzAwMi0yLjM2MDExcS4wMyAzLjg4NTEzLS4yOSA3LjcwMDA3YTcyLjc3MjY4IDcyLjc3MjY4IDAgMCAxLTQ2LjU3OTgzLTQzLjkyIDcuNDk5NDkgNy40OTk0OSAwIDAgMSAxNC4wMi01LjMzIDU5LjMzMTU4IDU5LjMzMTU4IDAgMCAwIDEzLjA4OTg0IDIwLjQzMDA2QTU3Ljc4ODczIDU3Ljc4ODczIDAgMCAwIDQyOS40NyAyOTQuNDI5OTMgNy41MDI4MSA3LjUwMjgxIDAgMCAxIDQzNC42MjAxMiAzMDMuMjl6Ii8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 425.7348985907359,
        height: 425.7348985907368,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#dedede": "rgba(255,255,255,1)"
        }
      },
      {
        id: "okOpNKu7NG",
        type: "svg",
        x: 759.7717807016528,
        y: 526.2627194908043,
        rotation: 35.01567688225585,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: true,
        shadowBlur: 21,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDUxMiA1MTIiPjxwYXRoIGZpbGw9IiNkZWRlZGUiIGQ9Ik01MDQuNSwyNTMuOTJjLS43LDMuNTctNi4xNTk5MSwyOS4wOC0zMC43MSw0Mi43Mjk5MkE2MC42MzM2OSw2MC42MzM2OSwwLDAsMSw0MzQuNjIwMTIsMzAzLjI5YTU4LjU1NzY4LDU4LjU1NzY4LDAsMCwxLTkuNzAwMi0yLjM2MDExcS4wMywzLjg4NTEzLS4yOSw3LjcwMDA3Yy0yLjMwOTgxLDI3LjctMTguMTk5OTUsNTEuNy00MS41ODk4NCw2Mi4wOS0yMC4zODAxMyw5LjA2MDA2LTM5LjkyLDQuODgtNTAuMjcsMS4zNmE2OS42ODkzNCw2OS42ODkzNCwwLDAsMS02Ljk3LTIuNzc5OTFxLjk0NDgyLDMuODM5OTEsMS42MDk4Niw3LjMyYzQuNDQwMDcsMjMuMzA5OTMtLjI0LDM1LjQ5LTYuMjQsNDIuMzZDMzA4LjczLDQzMy4yMywyODYuNTgwMDgsNDI5LjM3LDI4Mi43NSw0NDEuNzZjLTMuMTg5OTQsMTAuMjksMTEuMDEsMTYuMzQsMTAuMSwzMS4xMS0uODUsMTMuNjgtMTQuMzcsMzAuMTkwMDYtMzMuMjMsMzEuNTM5OTFDMjM5LjY2OTkyLDUwNS44NCwyMjQuMTc5OTMsNDg5LjU5LDIyMS42MSw0NzUuN2MtMi43Nzk5MS0xNC45OSwxMC41NTk5My0yMS40Niw2LjczMDEtMzMuMjhDMjIzLjI4LDQyNi44MjAwNywxOTcuNjg5OTQsNDMwLjgzLDE4Ni4yLDQxMy40NWMtNC4xMzk4OS02LjI2LTcuNjU5OTEtMTcuMTItMi4yMi0zNi45OS42Mi0yLjI3LDEuMzUwMS00LjY0OTksMi4yMi03LjE1OTkxYTY5LjE1NjA5LDY5LjE1NjA5LDAsMCwxLTYuOTgsMi43Nzk5MWMtMTAuMzUsMy41Mi0yOS44ODk4OSw3LjcwMDA3LTUwLjI2LTEuMzYtMjMuNDQ5OTUtMTAuNDE5OTItMzkuMzYtMzQuNTEtNDEuNi02Mi4zcS0uMzE1LTMuNzA1LS4yNzk5MS03LjQ5YTU0LjYwODg2LDU0LjYwODg2LDAsMCwxLTcuMjUsMS45MjAwNUE2MC45NDk4OCw2MC45NDk4OCwwLDAsMSwzOC4yMSwyOTYuNjQ5OUMxMy42NTk5MSwyODMsOC4yLDI1Ny40OSw3LjUsMjUzLjkyYzMwLjAxLTI1Ljc0LDQxLjMxMDA2LTUwLjQ4LDQ2LjA3MDA3LTY4LjM3LDguMzM5ODQtMzEuMzUtMTAuMDItOTAuMzQsMjguNTk5ODUtMTA1Ljc3LDIxLjgwMDA1LTguNzIsMzEuMTIwMTIsOC44MSw0Ni43NCwxOS4wN0MxNDIsMTA3LjQ2LDE2Ny40NiwxMTQuMzgsMTgwLjM0MDA5LDEwMS43NywxOTEuODcsOTAuNDcsMTc5LjAxLDczLjYzLDE4Ni40MTk5Miw1MS43MywxOTQuNjUsMjcuNDQsMjI0LjM1LDcuMjEsMjU2LDcuNWMyOC41OTAwOS4yNyw1Ni4xNjk5MiwxNy4yNiw2NS45NSwzOS44OCw5Ljc3LDIyLjYxLTIuNTIsNDAuOTEsMTAuODYwMTEsNTMuMDgsMTIuNTEsMTEuMzgsMzQuNjc5OTMsNS43NSwzNi4yNyw1LjMzLDIyLjUyLTYuMDMsMzIuOTctMzYuMTcsNTkuNzItMjYuMzksMzkuODQ5ODUsMTQuNTcsMjEuMjQsNzQuNjMsMjkuNjI5ODgsMTA2LjE1QzQ2My4xODk5NCwyMDMuNDQsNDc0LjQ5LDIyOC4xOCw1MDQuNSwyNTMuOTJaIi8+PHBhdGggZmlsbD0iI2NlY2VjZSIgZD0iTTU3LjA4MDA4IDMwMC45Mjk5M2MtLjc3MjM0LjI2NzM0LTIuMzg2MjMuNzk5NTYtNC42NTg4MiAxLjM1MDU5cTIuMzg0NzguNTk5ODUgNC42OTIuOThDNTcuMDk4MTQgMzAyLjQ4NDM4IDU3LjA3Mzg1IDMwMS43MTAyMSA1Ny4wODAwOCAzMDAuOTI5OTN6TTI5MS45NSA0Ny4zOGM5Ljc3IDIyLjYxLTIuNTIgNDAuOTEgMTAuODYwMTEgNTMuMDggMTIuNTEgMTEuMzggMzQuNjc5OTMgNS43NSAzNi4yNyA1LjMzLjU4NzE2LS4xNTcyMyAxLjE2NDMtLjMzNDQ3IDEuNzM1NTktLjUyMzMyYTI0Ljc4NDUxIDI0Ljc4NDUxIDAgMCAxLTguMDA1NjEtNC44MDY3QzMxOS40Mjk5MyA4OC4yOSAzMzEuNzIgNjkuOTkgMzIxLjk1IDQ3LjM4IDMxMi4xNjk5MiAyNC43NiAyODQuNTkwMDkgNy43NyAyNTYgNy41YTc1Ljg2NzMgNzUuODY3MyAwIDAgMC0xNS42ODUzIDEuNTI0NDFDMjYzLjM5NSAxMy42Nzk1NyAyODMuODIxNTMgMjguNTggMjkxLjk1IDQ3LjM4ek00MTIuOTI0MzIgMjk3LjA1MzQ3Yy0uNDM5MjEtLjEwNTM1LTEuNzc1ODgtLjQwODMzLTMuNjg5LS45MjIyNGE0Ny4xODMzMSA0Ny4xODMzMSAwIDAgMS02LjY4NjI4LTIuMDc1MDhjLTEuNTUxNzYtLjcxNDg0LTQuMzQzMjYtMi40NTE3OC02LjY4Ni03LjE0NzIxcS0uNjE2NzEgMTAuODYwNTMtMS4yMzMxNiAyMS43MjEwNmMtMi4zMDk4MSAyNy43LTE4LjE5OTk1IDUxLjctNDEuNTg5ODQgNjIuMDlhNjIuNjM4MDYgNjIuNjM4MDYgMCAwIDEtMTEuMzg0IDMuODA1M2MxMC44NTYzMiAyLjMxNDcgMjUuODc0NTEgMy4wODk0OCA0MS4zODQtMy44MDUzIDIzLjM4OTg5LTEwLjM5IDM5LjI4LTM0LjM5IDQxLjU4OTg0LTYyLjA5LjE0Ny0xLjc3NTc1LjIxOS0zLjU3MDQzLjI1NDg5LTUuMzcyMTlDNDE5LjI4MTI1IDI5OS4xNjggNDE1LjQ0MTY1IDI5Ny42NTc3MSA0MTIuOTI0MzIgMjk3LjA1MzQ3ek00NTguNDI5OTMgMTg1LjU1Yy04LjM4OTg5LTMxLjUyIDEwLjIyLTkxLjU4LTI5LjYyOTg4LTEwNi4xNS05Ljk5NTM2LTMuNjU0MzUtMTcuNzE0MzYtMS43MzQxMy0yNC42MzgxOCAyLjQxODIyIDMyLjc1MzY2IDE3Ljg3ODIzIDE2LjI4MjQ3IDczLjczMTIgMjQuMjY4MDYgMTAzLjczMTgxIDQuNzYgMTcuODkgMTYuMDYwMDYgNDIuNjMgNDYuMDcwMDcgNjguMzctLjcgMy41Ny02LjE1OTkxIDI5LjA4LTMwLjcxIDQyLjcyOTkyYTU4LjQ3NDIyIDU4LjQ3NDIyIDAgMCAxLTE0LjIxNjA3IDUuNjI2ODNjMS40MzM4NC4zNDkzNyAzLjEyNTI1LjcwNzQgNS4wNDYxNSAxLjAxMzMxQTYwLjYzMzY5IDYwLjYzMzY5IDAgMCAwIDQ3My43OSAyOTYuNjQ5OUM0OTguMzQwMDkgMjgzIDUwMy44MDAwNSAyNTcuNDkgNTA0LjUgMjUzLjkyIDQ3NC40OSAyMjguMTggNDYzLjE4OTk0IDIwMy40NCA0NTguNDI5OTMgMTg1LjU1ek05OC45MDk5MSA5OC44NWMxMS4yNjA3NCA3LjQwNjczIDMxLjY2OTA3IDEzLjU1MDUzIDQ1LjM1NDc0IDcuMDk4NjlBNjIuNTM4IDYyLjUzOCAwIDAgMSAxMjguOTA5OTEgOTguODVDMTEzLjI5IDg4LjU5IDEwMy45NyA3MS4wNiA4Mi4xNjk5MiA3OS43OGEzOS4wOTY1OSAzOS4wOTY1OSAwIDAgMC00LjYzNSAyLjIxNTQ1Qzg0LjY3MzU4IDg2LjU2NTczIDkwLjk4MSA5My42NDE4NSA5OC45MDk5MSA5OC44NXpNMzI3LjMxNzc1IDM3Ni4xNzE4OEEzMC43Njg0IDMwLjc2ODQgMCAwIDEgMzEyLjkwMSAzNjkuNDg2Yy0xMC40NjE1NS04Ljg0MDctMTAuOTQ0MzMtMjEuNzk5MzEtMTAuOTkxNDUtMjQuMDMzNDVBODIuNzMyMTggODIuNzMyMTggMCAwIDAgMzAyLjE3MyAzNjcuNTk2Yy45OTYgNi42Nzg0NiAyLjA1MDkxIDcuOTUxOSAyLjY0NTc2IDE0LjMyMjM4LjQ4ODc3IDUuMjM0NzUgMS4yNzIzMyAxMy42MjU2Mi0yLjA1NTE4IDIyLjAyMDM5LTEuMTM1IDIuODYzNC0zLjY4NjI4IDguMDkzMzgtMTEuNTkzNjMgMTUuMDQxMjYtMTkuMjY5NDEgMTYuOTMxLTM1LjM0IDEyLjg0NDczLTM4LjQxOTkyIDIyLjc4LTMuMTg5OTQgMTAuMjkgMTEuMDEgMTYuMzQgMTAuMSAzMS4xMS0uNjQ1MzkgMTAuMzg3MzItOC41OTk4NiAyMi4zOTk0MS0yMC42NDU4OCAyOC4xNzQ0M2EzNC4zMzg4MSAzNC4zMzg4MSAwIDAgMCAxNy40MTU5IDMuMzY1NDhjMTguODYtMS4zNDk4NSAzMi4zOC0xNy44NTk4NiAzMy4yMy0zMS41Mzk5MS45MS0xNC43Ny0xMy4yODk5Mi0yMC44Mi0xMC4xLTMxLjExIDMuNzk4NDYtMTIuMjUzMTcgMjUuOTE3NzItOC4zMTM2IDM4LjQxOTkyLTIyLjc4QzMzMS4xODg0OCA0MDcuMzg3MzMgMzMwLjA3NjkgMzg5Ljc5NTQxIDMyNy4zMTc3NSAzNzYuMTcxODh6Ii8+PGVsbGlwc2UgY3g9IjIzMi41IiBjeT0iNTgiIGZpbGw9IiM0YTRmNjAiIHJ4PSIxOC42MzEiIHJ5PSIxMy40OTIiIHRyYW5zZm9ybT0icm90YXRlKC01My41NyAyMzIuNSA1OCkiLz48cGF0aCBmaWxsPSIjM2IzZjRkIiBkPSJNMjQzLjgwMjczLDQzLjE5MmMtMi44OTgwNy0yLjI3OTkxLTYuNzYzNjctMi43MTc2Ni0xMC42ODU3OS0xLjU5MzM5YTkuOTQxNTMsOS45NDE1MywwLDAsMSwzLjAwMDQ5LDEuNTkzMzljNS44NTc3OSw0LjYwODIxLDUuNTQ2LDE0Ljk3MzYzLS42OTYyOSwyMy4xNTE5MWEyMi4yNjgsMjIuMjY4LDAsMCwxLTExLjIyMzM5LDguMDU3NWM1LjgzMTA2LDEuOTY1NDUsMTMuNjM3NDYtMS4xNTE1NSwxOC45MDg3LTguMDU3NUMyNDkuMzQ4NzUsNTguMTY1NTksMjQ5LjY2MDUyLDQ3LjgwMDE3LDI0My44MDI3Myw0My4xOTJaIi8+PGVsbGlwc2UgY3g9IjI4My41IiBjeT0iNTgiIGZpbGw9IiM0YTRmNjAiIHJ4PSIxMy40OTIiIHJ5PSIxOC42MzEiIHRyYW5zZm9ybT0icm90YXRlKC0zNi40MyAyODMuNSA1OCkiLz48cGF0aCBmaWxsPSIjM2IzZjRkIiBkPSJNMjk0LjEwNjQ1LDQ5LjY1NjEzYy01LjM4MDEzLTcuMDQ4NzEtMTMuNDA0My0xMC4xNTgyMS0xOS4yNzAyNy03LjkzNjE2YTIyLjQyOTczLDIyLjQyOTczLDAsMCwxLDEwLjgzNTQ1LDcuOTM2MTZjNi4yNDIzMSw4LjE3ODIyLDYuNTU0MDgsMTguNTQzNy42OTYyOSwyMy4xNTE4NUE5LjkxOSw5LjkxOSwwLDAsMSwyODMuNzI5LDc0LjI4YzQuMDU0MiwxLjI2NzgyLDguMDgwMDguODgzMTIsMTEuMDczNzMtMS40NzJDMzAwLjY2MDUyLDY4LjE5OTgzLDMwMC4zNDg3NSw1Ny44MzQzNSwyOTQuMTA2NDUsNDkuNjU2MTNaIi8+PGVsbGlwc2UgY3g9IjI1NiIgY3k9IjExMiIgZmlsbD0iIzRhNGY2MCIgcng9IjE2IiByeT0iMjUiLz48cGF0aCBmaWxsPSIjM2IzZjRkIiBkPSJNMjU2LDg3YTExLjA4Mjg1LDExLjA4Mjg1LDAsMCwwLTUuNzg5NjcsMS42OTQ2NGM1Ljk3Mzc1LDMuNjI2LDEwLjIxMDMyLDEyLjY4OTc2LDEwLjIxMDMyLDIzLjMwNTM2cy00LjIzNjU3LDE5LjY3OTM4LTEwLjIxMDMyLDIzLjMwNTM2QTExLjA4Mjg1LDExLjA4Mjg1LDAsMCwwLDI1NiwxMzdjOC44MzY1NSwwLDE2LTExLjE5Mjg3LDE2LTI1UzI2NC44MzY1NSw4NywyNTYsODdaIi8+PHBhdGggZmlsbD0iI2NlY2VjZSIgZD0iTTEzNi4zMzAwOCAyNjQuMDNhNzQuMjg3OTEgNzQuMjg3OTEgMCAwIDEtMTYuNDUwMDggMjUuNjRBNzIuNjc5NjEgNzIuNjc5NjEgMCAwIDEgODkuMjQgMzA4LjExYTcuMTc1IDcuMTc1IDAgMCAxLTEuODguMzA5OTNxLS4zMTUtMy43MDUtLjI3OTkxLTcuNDlhNTQuNjA4ODYgNTQuNjA4ODYgMCAwIDEtNy4yNSAxLjkyMDA1IDcuNTAyNjUgNy41MDI2NSAwIDAgMSA1LjA4OTg0LTkuMTFBNTcuNjc1OSA1Ny42NzU5IDAgMCAwIDEwOS4yMiAyNzkuMTNhNTkuMjgwMjcgNTkuMjgwMjcgMCAwIDAgMTMuMDkwMDktMjAuNDMgNy40OTk0OSA3LjQ5OTQ5IDAgMSAxIDE0LjAyIDUuMzN6TTIyNS43NyAzMzYuMDcwMDdhNzMuNzIzODQgNzMuNzIzODQgMCAwIDEtMzYuMjUgMzkuOTUgNy40MTcxNiA3LjQxNzE2IDAgMCAxLTMuMzIwMDcuNzggNy4yMDEyMiA3LjIwMTIyIDAgMCAxLTIuMjItLjM0MDA5Yy42Mi0yLjI3IDEuMzUwMS00LjY0OTkgMi4yMi03LjE1OTkxYTY5LjE1NjA5IDY5LjE1NjA5IDAgMCAxLTYuOTggMi43Nzk5MSA3LjUxMDkzIDcuNTEwOTMgMCAwIDEgMy42NS05LjUgNTguNzIwNTMgNTguNzIwNTMgMCAwIDAgMjguODgtMzEuODUgNy41MDEyOSA3LjUwMTI5IDAgMCAxIDE0LjAyIDUuMzQwMDl6TTMzMi43NyAzNzIuMDhhNjkuNjg5MzQgNjkuNjg5MzQgMCAwIDEtNi45Ny0yLjc3OTkxcS45NDQ4MiAzLjgzOTkxIDEuNjA5ODYgNy4zMmE3LjI4OTA4IDcuMjg5MDggMCAwIDEtMS42MDk4Ni4xOCA3LjQ2OTIgNy40NjkyIDAgMCAxLTMuNzktMS4wNCA3Ni4wNTEyNSA3Ni4wNTEyNSAwIDAgMS0zMi40OC0zOC4xNiA3LjQ5OTUzIDcuNDk5NTMgMCAxIDEgMTMuOTctNS40NiA2MS4xMjY1NCA2MS4xMjY1NCAwIDAgMCAyNi4xIDMwLjY5QTcuNTAyMTMgNy41MDIxMyAwIDAgMSAzMzIuNzcgMzcyLjA4ek00MzQuNjIwMTIgMzAzLjI5YTU4LjU1NzY4IDU4LjU1NzY4IDAgMCAxLTkuNzAwMi0yLjM2MDExcS4wMyAzLjg4NTEzLS4yOSA3LjcwMDA3YTcyLjc3MjY4IDcyLjc3MjY4IDAgMCAxLTQ2LjU3OTgzLTQzLjkyIDcuNDk5NDkgNy40OTk0OSAwIDAgMSAxNC4wMi01LjMzIDU5LjMzMTU4IDU5LjMzMTU4IDAgMCAwIDEzLjA4OTg0IDIwLjQzMDA2QTU3Ljc4ODczIDU3Ljc4ODczIDAgMCAwIDQyOS40NyAyOTQuNDI5OTMgNy41MDI4MSA3LjUwMjgxIDAgMCAxIDQzNC42MjAxMiAzMDMuMjl6Ii8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 425.7348985907359,
        height: 425.7348985907368,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#dedede": "rgba(255,255,255,1)"
        }
      },
      {
        id: "al7ieaIp67",
        type: "text",
        x: 20.110715327271066,
        y: 262.91462622179984,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "FREAKY FRIDAY PARTY",
        placeholder: "",
        fontSize: 161,
        fontFamily: "Butcherman",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 700,
        height: 579.6,
        strokeWidth: 5,
        stroke: "rgba(255,255,255,1)",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "9qOOL0X8dD",
        type: "text",
        x: 93.02838566621386,
        y: 842.5146262218,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "10.31.2020 | 9:00 PM\nBijou resort\nNo costume, No entry",
        placeholder: "",
        fontSize: 37,
        fontFamily: "Quicksand",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "black",
        align: "left",
        width: 504,
        height: 133.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "_Vwg6wHCUj",
        type: "text",
        x: 93.02838566620991,
        y: 186.5042543055366,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "READY FOR HALLOWEEN?",
        placeholder: "",
        fontSize: 40,
        fontFamily: "Quicksand",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "black",
        align: "left",
        width: 1137,
        height: 48,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(250,116,32,1)"
  },
  {
    id: "WIw0uPslYy",
    elements: [
      {
        id: "DHR1fOEx7F",
        type: "svg",
        x: -32.09845131860976,
        y: 31833964978659067e-31,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1144.1969026372205,
        height: 535.7090977591724,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(245,190,102,1)"
        }
      },
      {
        id: "yzp5iCe7P0",
        type: "svg",
        x: 92.60805777115212,
        y: 440.04878048780495,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 769.0243902438998,
        height: 534.5853658536579,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(216,155,59,1)"
        }
      },
      {
        id: "wPViWYEyQz",
        type: "image",
        x: 994.1992135740122,
        y: 309.7906514948504,
        rotation: 89.99999999999949,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        width: 602.0865685326492,
        height: 860.9837930016885,
        src: "https://images.unsplash.com/photo-1600184430626-1dd6087315d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw3fHx3YWZmbGV8ZW58MHx8fHwxNjM1NTkwMjc3&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 38834951456290234e-20,
        cropWidth: 1,
        cropHeight: 0.9996116504854371,
        cornerRadius: 0,
        flipX: false,
        flipY: false,
        clipSrc: "",
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "4MkzwRMNqV",
        type: "text",
        x: 39.00000000000057,
        y: 164.47893912348854,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "Waiting for a waffle o'clock",
        placeholder: "",
        fontSize: 66,
        fontFamily: "Libre Baskerville",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(189,130,36,1)",
        align: "center",
        width: 1002,
        height: 79.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "BAgdNcgp9x",
        type: "svg",
        x: 930.1992135740174,
        y: 752.121951219512,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iIzIwMEUzMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTEwLjIxMzUzNTQsMC40NDEzMjk4OTQgTDEyLjUzMDE5MDcsNS4wOTY2ODg3MSBDMTIuNjQzNzcwOSw1LjMzMDY3MTYgMTIuODY3MzIyOSw1LjQ5NDIzNzE1IDEzLjEyNzQ1MzQsNS41MzM2ODU5OSBMMTguMzEyNzc5NSw2LjI4MjgyNDE5IEMxOC41MjMyMDEzLDYuMzExNTEzNTggMTguNzEzMjcxLDYuNDIxODY1OSAxOC44NDA3MjY1LDYuNTg5MzQ0MzEgQzE4Ljk2ODE4MjEsNi43NTY4MjI3MiAxOS4wMjI0NTg0LDYuOTY3NTQ0NCAxOC45OTE0ODcxLDcuMTc0NjU1MzggQzE4Ljk2NTQzMzYsNy4zNDQ5MDQwMSAxOC44ODI2NjA1LDcuNTAxNzc2NjIgMTguNzU2MjAxOCw3LjYyMDU3MDk4IEwxNS4wMDA2ODY0LDExLjI1OTI0MjIgQzE0LjgxMDg3NjUsMTEuNDM4NTY1NyAxNC43MjU3ODAzLDExLjcwMDIxODcgMTQuNzc0NDUwNSwxMS45NTQ4NzA2IEwxNS42NzkzOTQsMTcuMDgyODk5OSBDMTUuNzQ0ODc3NCwxNy41MDU0MzU1IDE1LjQ1NTIxNDcsMTcuOTAxOTE1NCAxNS4wMjc4MzQ3LDE3Ljk3NDczMTEgQzE0Ljg1MTYwODksMTguMDAxOTM2IDE0LjY3MTE2NDIsMTcuOTczODU3NiAxNC41MTIwMTY5LDE3Ljg5NDQ2NjMgTDkuODg3NzU1NzUsMTUuNDc3NjAzOCBDOS42NTY3NTcyMSwxNS4zNTIyNDg1IDkuMzc2NzAwNjQsMTUuMzUyMjQ4NSA5LjE0NTcwMjEsMTUuNDc3NjAzOCBMNC40OTQyOTI2NiwxNy45MTIzMDI5IEM0LjEwNDA0NDIsMTguMTA5NjUyMSAzLjYyNTMwNzU3LDE3Ljk2Mjk1OCAzLjQxNzQwOTkzLDE3LjU4MjMyNTQgQzMuMzM2MzUxODQsMTcuNDI4ODUyMyAzLjMwNzc4NDM4LDE3LjI1MzY3NDggMy4zMzU5NjUwMiwxNy4wODI4OTk5IEw0LjI0MDkwODQ5LDExLjk1NDg3MDYgQzQuMjg0Njc4NjUsMTEuNzAwNTQwNSA0LjIwMDMwNTYzLDExLjQ0MTExMSA0LjAxNDY3MjYyLDExLjI1OTI0MjIgTDAuMjMyMDA4OTEsNy42MjA1NzA5OCBDLTAuMDc3MzM2MzAzNCw3LjMxMTUwMzEyIC0wLjA3NzMzNjMwMzQsNi44MTQ4NDk4NSAwLjIzMjAwODkxLDYuNTA1NzgxOTkgQzAuMzU4MjU5MTQ4LDYuMzkwNTgzNCAwLjUxNTIxNjY0OCw2LjMxMzI0MTc3IDAuNjg0NDgwNjQ2LDYuMjgyODI0MTkgTDUuODY5ODA2NzMsNS41MzM2ODU5OSBDNi4xMjg3MDgzNyw1LjQ5MTM2MTQxIDYuMzUxMDUxNTEsNS4zMjg2ODAzMiA2LjQ2NzA2OTQzLDUuMDk2Njg4NzEgTDguNzgzNzI0NzEsMC40NDEzMjk4OTQgQzguODc1MjYyMTMsMC4yNTI1Njg2NCA5LjA0MDI2OTEyLDAuMTA4MjM2NjI4IDkuMjQxMzE3OTQsMC4wNDEwNzE5ODA4IEM5LjQ0MjM2Njc3LC0wLjAyNjA5MjY2NjcgOS42NjI0MTc4MywtMC4wMTAzOTc1MDE5IDkuODUxNTU4MDEsMC4wODQ1OTc0MTc5IEMxMC4wMDc2MDgzLDAuMTYyNTkwNjkgMTAuMTM0Mzk1NCwwLjI4NzU0MDcyNCAxMC4yMTM1MzU0LDAuNDQxMzI5ODk0IFoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuNSAzKSIvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128,
        height: 128,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#200E32": "rgba(255,255,255,1)"
        }
      },
      {
        id: "mIYW6wl4XS",
        type: "svg",
        x: 43.72341686100141,
        y: 391.16413957765434,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iIzIwMEUzMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTEwLjIxMzUzNTQsMC40NDEzMjk4OTQgTDEyLjUzMDE5MDcsNS4wOTY2ODg3MSBDMTIuNjQzNzcwOSw1LjMzMDY3MTYgMTIuODY3MzIyOSw1LjQ5NDIzNzE1IDEzLjEyNzQ1MzQsNS41MzM2ODU5OSBMMTguMzEyNzc5NSw2LjI4MjgyNDE5IEMxOC41MjMyMDEzLDYuMzExNTEzNTggMTguNzEzMjcxLDYuNDIxODY1OSAxOC44NDA3MjY1LDYuNTg5MzQ0MzEgQzE4Ljk2ODE4MjEsNi43NTY4MjI3MiAxOS4wMjI0NTg0LDYuOTY3NTQ0NCAxOC45OTE0ODcxLDcuMTc0NjU1MzggQzE4Ljk2NTQzMzYsNy4zNDQ5MDQwMSAxOC44ODI2NjA1LDcuNTAxNzc2NjIgMTguNzU2MjAxOCw3LjYyMDU3MDk4IEwxNS4wMDA2ODY0LDExLjI1OTI0MjIgQzE0LjgxMDg3NjUsMTEuNDM4NTY1NyAxNC43MjU3ODAzLDExLjcwMDIxODcgMTQuNzc0NDUwNSwxMS45NTQ4NzA2IEwxNS42NzkzOTQsMTcuMDgyODk5OSBDMTUuNzQ0ODc3NCwxNy41MDU0MzU1IDE1LjQ1NTIxNDcsMTcuOTAxOTE1NCAxNS4wMjc4MzQ3LDE3Ljk3NDczMTEgQzE0Ljg1MTYwODksMTguMDAxOTM2IDE0LjY3MTE2NDIsMTcuOTczODU3NiAxNC41MTIwMTY5LDE3Ljg5NDQ2NjMgTDkuODg3NzU1NzUsMTUuNDc3NjAzOCBDOS42NTY3NTcyMSwxNS4zNTIyNDg1IDkuMzc2NzAwNjQsMTUuMzUyMjQ4NSA5LjE0NTcwMjEsMTUuNDc3NjAzOCBMNC40OTQyOTI2NiwxNy45MTIzMDI5IEM0LjEwNDA0NDIsMTguMTA5NjUyMSAzLjYyNTMwNzU3LDE3Ljk2Mjk1OCAzLjQxNzQwOTkzLDE3LjU4MjMyNTQgQzMuMzM2MzUxODQsMTcuNDI4ODUyMyAzLjMwNzc4NDM4LDE3LjI1MzY3NDggMy4zMzU5NjUwMiwxNy4wODI4OTk5IEw0LjI0MDkwODQ5LDExLjk1NDg3MDYgQzQuMjg0Njc4NjUsMTEuNzAwNTQwNSA0LjIwMDMwNTYzLDExLjQ0MTExMSA0LjAxNDY3MjYyLDExLjI1OTI0MjIgTDAuMjMyMDA4OTEsNy42MjA1NzA5OCBDLTAuMDc3MzM2MzAzNCw3LjMxMTUwMzEyIC0wLjA3NzMzNjMwMzQsNi44MTQ4NDk4NSAwLjIzMjAwODkxLDYuNTA1NzgxOTkgQzAuMzU4MjU5MTQ4LDYuMzkwNTgzNCAwLjUxNTIxNjY0OCw2LjMxMzI0MTc3IDAuNjg0NDgwNjQ2LDYuMjgyODI0MTkgTDUuODY5ODA2NzMsNS41MzM2ODU5OSBDNi4xMjg3MDgzNyw1LjQ5MTM2MTQxIDYuMzUxMDUxNTEsNS4zMjg2ODAzMiA2LjQ2NzA2OTQzLDUuMDk2Njg4NzEgTDguNzgzNzI0NzEsMC40NDEzMjk4OTQgQzguODc1MjYyMTMsMC4yNTI1Njg2NCA5LjA0MDI2OTEyLDAuMTA4MjM2NjI4IDkuMjQxMzE3OTQsMC4wNDEwNzE5ODA4IEM5LjQ0MjM2Njc3LC0wLjAyNjA5MjY2NjcgOS42NjI0MTc4MywtMC4wMTAzOTc1MDE5IDkuODUxNTU4MDEsMC4wODQ1OTc0MTc5IEMxMC4wMDc2MDgzLDAuMTYyNTkwNjkgMTAuMTM0Mzk1NCwwLjI4NzU0MDcyNCAxMC4yMTM1MzU0LDAuNDQxMzI5ODk0IFoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuNSAzKSIvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 97.76928182030144,
        height: 97.76928182030143,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#200E32": "rgba(255,255,255,1)"
        }
      }
    ],
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-24_151244.png?v=1740395487",
    background: "rgba(245,234,187,1)"
  },
  {
    id: "9QA0S9HLt_",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-24_164856.png?v=1740395959",
    elements: [
      {
        id: "9XJcb0aBUx",
        type: "text",
        x: 94.00000000000013,
        y: 255.98902625981088,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "THANKS GIVING DINNER",
        placeholder: "",
        fontSize: 146,
        fontFamily: "Belleza",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(166,204,195,1)",
        align: "justify",
        width: 986,
        height: 500,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.1000000000000003,
        letterSpacing: 0
      },
      {
        id: "8pyBmKEs9l",
        type: "text",
        x: 94.00000000000006,
        y: 184.14344927545997,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "YOU ARE INVITED!",
        placeholder: "",
        fontSize: 47,
        fontFamily: "Belleza",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "justify",
        width: 630,
        height: 56.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "3_gwnlFwA4",
        type: "text",
        x: 105.42749069329032,
        y: 761.2022806214372,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        text: "November 26, 2020 | 7:00 PM\nNapolitani Residence",
        placeholder: "",
        fontSize: 43,
        fontFamily: "Belleza",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "justify",
        width: 576,
        height: 103.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "6dTG-ljpmY",
        type: "svg",
        x: 831.5234683537086,
        y: 450.00364014199135,
        rotation: 18.156303905333573,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ3LjUgNDcuNSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDcuNSA0Ny41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgdmVyc2lvbj0iMS4xIiBpZD0ic3ZnMiI+PGRlZnMgaWQ9ImRlZnM2Ij48Y2xpcFBhdGggaWQ9ImNsaXBQYXRoMTYiIGNsaXBQYXRoVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBpZD0icGF0aDE4IiBkPSJNIDAsMzggMzgsMzggMzgsMCAwLDAgMCwzOCBaIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMS4yNSwwLDAsLTEuMjUsMCw0Ny41KSIgaWQ9ImcxMCI+PGcgaWQ9ImcxMiI+PGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXBQYXRoMTYpIiBpZD0iZzE0Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNywxNi4wODMpIiBpZD0iZzIwIj48cGF0aCBpZD0icGF0aDIyIiBzdHlsZT0iZmlsbDojZGQyZTQ0O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIiBkPSJNIDAsMCBDIDAsMC42ODcgLTIuODk1LDAuNSAtMy4xMjUsMSAtMy4zNTUsMS41IDAuMDgzLDUuNTg0IC0wLjQxNyw2LjUgLTAuOTE3LDcuNDE3IC01LjUwMyw1LjMzNCAtNS43OTIsNS43OTIgLTYuMDgsNi4yNSAtNS41LDkuMjkyIC02LDkuNjY3IGMgLTAuNSwwLjM3NSAtNS4yNSwtNC45MTYgLTUuOTE3LC00LjI5MiAtMC42NjYsMC42MjUgMS41NDIsMTAuNSAxLjA4NiwxMC42OTkgLTAuNDU2LDAuMTk4IC0zLjQxOSwtMS4zNjYgLTMuNzkzLC0xLjI4MiAtMC4zNzQsMC4wODMgLTIuNjk0LDYuMTI1IC0zLjM3Niw2LjEyNSAtMC42ODIsMCAtMy4wMDIsLTYuMDQyIC0zLjM3NiwtNi4xMjUgLTAuMzc0LC0wLjA4NCAtMy4zMzcsMS40OCAtMy43OTMsMS4yODIgQyAtMjUuNjI1LDE1Ljg3NSAtMjMuNDE3LDYgLTI0LjA4Myw1LjM3NSAtMjQuNzUsNC43NTEgLTI5LjUsMTAuMDQyIC0zMCw5LjY2NyAtMzAuNSw5LjI5MiAtMjkuOTIsNi4yNSAtMzAuMjA4LDUuNzkyIC0zMC40OTcsNS4zMzQgLTM1LjA4Myw3LjQxNyAtMzUuNTgzLDYuNSAtMzYuMDgzLDUuNTg0IC0zMi42NDUsMS41IC0zMi44NzUsMSAtMzMuMTA1LDAuNSAtMzYsMC42ODcgLTM2LDAgYyAwLC0wLjY4NyA4LjQzOCwtNS4yMzUgOSwtNS43NzEgMC41NjIsLTAuNTM1IC0yLjkxNCwtMi44MDEgLTIuNDE3LC0zLjIyOSAwLjU3NiwtMC40OTYgMy44NCwwLjgzIDEwLjQxNywwLjk1NyBsIDAsLTYuMDQgYyAwLC0wLjU1MyAwLjQ0OCwtMSAxLC0xIDAuNTUzLDAgMSwwLjQ0NyAxLDEgbCAwLDYuMDQgQyAtMTAuNDIzLC04LjE3IC03LjE1OSwtOS40OTYgLTYuNTgzLC05IC02LjA4NywtOC41NzIgLTkuNTYzLC02LjMwNiAtOSwtNS43NzEgLTguNDM4LC01LjIzNSAwLC0wLjY4NyAwLDAiLz48L2c+PC9nPjwvZz48L2c+CgkKCTxtZXRhZGF0YT4KCQk8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnJkZnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDEvcmRmLXNjaGVtYSMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CgkJCTxyZGY6RGVzY3JpcHRpb24gYWJvdXQ9Imh0dHBzOi8vaWNvbnNjb3V0LmNvbS9sZWdhbCNsaWNlbnNlcyIgZGM6dGl0bGU9Ik1hcGxlLCBMZWFmLCBGYWxsaW5nLCBOYXR1cmUiIGRjOmRlc2NyaXB0aW9uPSJNYXBsZSwgTGVhZiwgRmFsbGluZywgTmF0dXJlIiBkYzpwdWJsaXNoZXI9Ikljb25zY291dCIgZGM6ZGF0ZT0iMjAxNi0xMi0xNCIgZGM6Zm9ybWF0PSJpbWFnZS9zdmcreG1sIiBkYzpsYW5ndWFnZT0iZW4iPgoJCQkJPGRjOmNyZWF0b3I+CgkJCQkJPHJkZjpCYWc+CgkJCQkJCTxyZGY6bGk+VHdpdHRlciBFbW9qaTwvcmRmOmxpPgoJCQkJCTwvcmRmOkJhZz4KCQkJCTwvZGM6Y3JlYXRvcj4KCQkJPC9yZGY6RGVzY3JpcHRpb24+CgkJPC9yZGY6UkRGPgogICAgPC9tZXRhZGF0YT48L3N2Zz4K",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 345.057446432359,
        height: 345.0574464323581,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(221, 46, 68)": "rgba(233,50,12,1)"
        }
      },
      {
        id: "8yenf3vmrI",
        type: "svg",
        x: 724.0000000200007,
        y: 131.95648106365235,
        rotation: -45.00000000000003,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ3LjUgNDcuNSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDcuNSA0Ny41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgdmVyc2lvbj0iMS4xIiBpZD0ic3ZnMiI+PGRlZnMgaWQ9ImRlZnM2Ij48Y2xpcFBhdGggaWQ9ImNsaXBQYXRoMTYiIGNsaXBQYXRoVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBpZD0icGF0aDE4IiBkPSJNIDAsMzggMzgsMzggMzgsMCAwLDAgMCwzOCBaIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMS4yNSwwLDAsLTEuMjUsMCw0Ny41KSIgaWQ9ImcxMCI+PGcgaWQ9ImcxMiI+PGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXBQYXRoMTYpIiBpZD0iZzE0Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNywxNi4wODMpIiBpZD0iZzIwIj48cGF0aCBpZD0icGF0aDIyIiBzdHlsZT0iZmlsbDojZGQyZTQ0O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIiBkPSJNIDAsMCBDIDAsMC42ODcgLTIuODk1LDAuNSAtMy4xMjUsMSAtMy4zNTUsMS41IDAuMDgzLDUuNTg0IC0wLjQxNyw2LjUgLTAuOTE3LDcuNDE3IC01LjUwMyw1LjMzNCAtNS43OTIsNS43OTIgLTYuMDgsNi4yNSAtNS41LDkuMjkyIC02LDkuNjY3IGMgLTAuNSwwLjM3NSAtNS4yNSwtNC45MTYgLTUuOTE3LC00LjI5MiAtMC42NjYsMC42MjUgMS41NDIsMTAuNSAxLjA4NiwxMC42OTkgLTAuNDU2LDAuMTk4IC0zLjQxOSwtMS4zNjYgLTMuNzkzLC0xLjI4MiAtMC4zNzQsMC4wODMgLTIuNjk0LDYuMTI1IC0zLjM3Niw2LjEyNSAtMC42ODIsMCAtMy4wMDIsLTYuMDQyIC0zLjM3NiwtNi4xMjUgLTAuMzc0LC0wLjA4NCAtMy4zMzcsMS40OCAtMy43OTMsMS4yODIgQyAtMjUuNjI1LDE1Ljg3NSAtMjMuNDE3LDYgLTI0LjA4Myw1LjM3NSAtMjQuNzUsNC43NTEgLTI5LjUsMTAuMDQyIC0zMCw5LjY2NyAtMzAuNSw5LjI5MiAtMjkuOTIsNi4yNSAtMzAuMjA4LDUuNzkyIC0zMC40OTcsNS4zMzQgLTM1LjA4Myw3LjQxNyAtMzUuNTgzLDYuNSAtMzYuMDgzLDUuNTg0IC0zMi42NDUsMS41IC0zMi44NzUsMSAtMzMuMTA1LDAuNSAtMzYsMC42ODcgLTM2LDAgYyAwLC0wLjY4NyA4LjQzOCwtNS4yMzUgOSwtNS43NzEgMC41NjIsLTAuNTM1IC0yLjkxNCwtMi44MDEgLTIuNDE3LC0zLjIyOSAwLjU3NiwtMC40OTYgMy44NCwwLjgzIDEwLjQxNywwLjk1NyBsIDAsLTYuMDQgYyAwLC0wLjU1MyAwLjQ0OCwtMSAxLC0xIDAuNTUzLDAgMSwwLjQ0NyAxLDEgbCAwLDYuMDQgQyAtMTAuNDIzLC04LjE3IC03LjE1OSwtOS40OTYgLTYuNTgzLC05IC02LjA4NywtOC41NzIgLTkuNTYzLC02LjMwNiAtOSwtNS43NzEgLTguNDM4LC01LjIzNSAwLC0wLjY4NyAwLDAiLz48L2c+PC9nPjwvZz48L2c+CgkKCTxtZXRhZGF0YT4KCQk8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnJkZnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDEvcmRmLXNjaGVtYSMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CgkJCTxyZGY6RGVzY3JpcHRpb24gYWJvdXQ9Imh0dHBzOi8vaWNvbnNjb3V0LmNvbS9sZWdhbCNsaWNlbnNlcyIgZGM6dGl0bGU9Ik1hcGxlLCBMZWFmLCBGYWxsaW5nLCBOYXR1cmUiIGRjOmRlc2NyaXB0aW9uPSJNYXBsZSwgTGVhZiwgRmFsbGluZywgTmF0dXJlIiBkYzpwdWJsaXNoZXI9Ikljb25zY291dCIgZGM6ZGF0ZT0iMjAxNi0xMi0xNCIgZGM6Zm9ybWF0PSJpbWFnZS9zdmcreG1sIiBkYzpsYW5ndWFnZT0iZW4iPgoJCQkJPGRjOmNyZWF0b3I+CgkJCQkJPHJkZjpCYWc+CgkJCQkJCTxyZGY6bGk+VHdpdHRlciBFbW9qaTwvcmRmOmxpPgoJCQkJCTwvcmRmOkJhZz4KCQkJCTwvZGM6Y3JlYXRvcj4KCQkJPC9yZGY6RGVzY3JpcHRpb24+CgkJPC9yZGY6UkRGPgogICAgPC9tZXRhZGF0YT48L3N2Zz4K",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 301.46408925558353,
        height: 301.4640892555831,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(221, 46, 68)": "rgba(127,40,22,1)"
        }
      },
      {
        id: "zkJMgiufT-",
        type: "svg",
        x: 656.1716172720231,
        y: 240.54344927545998,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xOTIgLTc5MikiPjxwYXRoIGZpbGw9IiNGRkMwOTAiIGQ9Ik02LjM4NTI1Mzc3LDkuMTE2Njk5MTUgQzE0LjY5ODczMDgsMTEuOTc5NDkyMSAxMC42NTQzNTkxLDEzLjk1Mjg2NDUgMTcuNzUxNDY0NywyMi4yNzUzOTA2IEMxNS4zMjA1NzYsMTcuMjg4NzYwMiAyMS43MDcwMzA1LDE1LjI1OTc2NTYgMjIuODI0MjE4Niw2LjkwNjczODIxIEMyNC45NzI2NTU1LDcuNTgxMDU0NjIgMjQuNjgxMTUxNiw5LjU1NzEyODg5IDI1LjIwNDU4OTEsMTMuMTA5ODYzMyBDMjguMTkyMzgyMSw2LjkwNjczODI3IDM4LjA2Njg5NTcsNS44MTQ5NDEzOSA0MC4xNjk0MzQ4LDAuMjc1ODc4ODk1IEM0NS4xOTUzMTM3LDkuNjc3NzM0MzYgNDIuNDI2MjcwNywyMS4zNTAwOTc2IDQyLjQyNjI3MDcsMjEuMzUwMDk3NiBDNDIuNDI2MjcwNywyMS4zNTAwOTc2IDQ1LjgxNTkxOTEsMjAuODI2NjYwMSA0OC43NzU4ODA3LDE5LjcxODI2MTYgQzQ3Ljg1NDk4MTYsMjcuNTQ4NzcwOSAzNi45MjY5MjY2LDMyLjc3NjQ1ODQgMzUuODQwMzMzMiwzNC43OTEwMTU2IEM0MS44NzA2MDY2LDMyLjU2Nzg3MTEgNDQuMDkxMDU1OSwzNi43OTQ5MjQ2IDU0LjA5Mzc1MTIsMzIuMTg4NDc2NiBDNDguNzc1ODgwMSw1MC40NDIzODI4IDIzLjY2MzYyOTgsNTkuNjk2NzQ0NyAxNS42MjA2MDUyLDUyLjE4MzU5MzcgQy0xMC41NjczODMsNDQuMTg0MDgyIDUuNDMwNjYzOSwyMS4wMjUzOTA2IDYuMzg1MjUzNzcsOS4xMTY2OTkxNSBaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMDYgODAxKSIvPjxnIGZpbGw9IiM1NTUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTEzNS42MDQsNzE3LjA5IEMxMzYuMTYzLDcxNi4xOTUgMTM2Ljg2Myw3MTUuNDA0IDEzNy42NTgsNzE0LjY4OSBDMTM5LjYyMyw3MTIuOTIzIDE0Mi4xNyw3MTEuNjE2IDE0NC41MDIsNzEwLjI3NiBDMTQ2LjkzOCw3MDguODc3IDE0OS4xNTUsNzA3LjQ2NyAxNTAuMDEzLDcwNS4yNDUgTDE1MC40ODIsNzA0LjAwOCBMMTUxLjEwNiw3MDUuMTc1IEMxNTIuOTEzLDcwOC42MTMgMTUzLjYxNyw3MTIuMjcyIDE1My43NjgsNzE1LjU2MSBDMTUzLjk4Niw3MjAuMzI4IDE1My4wNDQsNzI0LjMwOSAxNTIuNjcyLDcyNS42NzIgQzE1My4yNzMsNzI1Ljc0NiAxNTQuMzc5LDcyNS44MjQgMTU1LjY3Miw3MjUuNjM3IEMxNTYuNzA4LDcyNS40ODggMTU3Ljg2NSw3MjUuMTcgMTU4Ljk3OSw3MjQuNTQ0IEwxNTkuNjA1LDcyNC4xODggTDE1OS41OTMsNzI0LjkwOSBDMTU5LjU3Myw3MjUuODM2IDE1OS40NTcsNzI2LjY4NyAxNTkuMjc1LDcyNy40NzUgQzE1OC43NzIsNzI5LjY1NiAxNTcuNzExLDczMS4zNDggMTU2LjM3OCw3MzIuNzMxIEMxNTQuMTgzLDczNS4wMDggMTUxLjI2OSw3MzYuNDMxIDE0OS4xNTYsNzM3LjgzNSBDMTQ4Ljc1Niw3MzguMTAxIDE0OC4zODUsNzM4LjM2MyAxNDguMDYsNzM4LjYzMiBDMTQ4LjQyNiw3MzguNTIxIDE0OC43NzUsNzM4LjQzMiAxNDkuMTEsNzM4LjM2MiBDMTUxLjEwNiw3MzcuOTQzIDE1Mi41NzIsNzM4LjE1MSAxNTQuMDQzLDczOC4zODkgQzE1NS41MDEsNzM4LjYyNiAxNTYuOTY2LDczOC45MSAxNTkuMDcsNzM4LjU2MiBDMTYwLjQ2NSw3MzguMzMyIDE2Mi4xMzgsNzM3LjgzIDE2NC4yNjksNzM2Ljg3IEwxNjUuMzY4LDczNi4zNjQgTDE2NS4wMyw3MzcuNTI2IEMxNjIuNTkxLDc0NS42NzQgMTU2LjI2NSw3NTIuMDA3IDE0OS4yNyw3NTUuOTI0IEMxNDcuODA1LDc1Ni43NDQgMTQ2LjMxNCw3NTcuNDYzIDE0NC44MjIsNzU4LjA3MSBDMTM3LjI2MSw3NjEuMTU0IDEyOS42NzQsNzYxLjMgMTI1Ljc3NSw3NTcuODE0IEMxMTUuNTQzLDc1NC43ODcgMTExLjE0Miw3NTAuMTQyIDEwOS43NjYsNzQ0LjkyNyBDMTA5LjMyMiw3NDMuMjQ3IDEwOS4xODgsNzQxLjUgMTA5LjI5OCw3MzkuNzIzIEMxMDkuNDUxLDczNy4yNDQgMTEwLjA3LDczNC43MDUgMTEwLjg4LDczMi4xODkgQzExMy4wMTMsNzI1LjU1NiAxMTYuNTQzLDcxOS4wOTEgMTE2LjUwMiw3MTQuMzA3IEwxMTYuNDksNzEzLjc5NyBMMTE2LjkzNCw3MTQuMDQ4IEMxMTkuMTg2LDcxNS4xNzQgMTIwLjY5MSw3MTYuNDY0IDEyMS43NjUsNzE3LjgxOCBDMTIyLjE0Niw3MTguMjk4IDEyMi40OCw3MTguNzgyIDEyMi43NDksNzE5LjI4NCBDMTIzLjQyMSw3MjAuNTQxIDEyMy43NTYsNzIxLjg0OSAxMjQuMDU2LDcyMy4xMSBDMTI0LjU5OSw3MjUuMzkxIDEyNC44NzEsNzI3LjU3OSAxMjYuMzU3LDcyOS4zMjcgQzEyNi4zMzUsNzI3LjM4NiAxMjYuNTQ0LDcyNS44NDUgMTI2LjksNzI0LjU1MyBDMTI3LjE4NSw3MjMuNTIyIDEyNy41NjksNzIyLjY1MiAxMjcuOTk0LDcyMS44NTkgQzEyOS42MjMsNzE4LjgyMyAxMzIuMDY2LDcxNy4wNjYgMTMyLjcwNSw3MTIuMDIgTDEzMi43ODgsNzExLjM5NiBMMTMzLjM4OSw3MTEuNTg0IEMxMzQuMDIxLDcxMS43NzcgMTM0LjQzOSw3MTIuMTg4IDEzNC43MjQsNzEyLjczNyBDMTM1LjExOSw3MTMuNSAxMzUuMjIyLDcxNC41NzYgMTM1LjM0OCw3MTUuNjI2IEMxMzUuNDA5LDcxNi4xNDEgMTM1LjQ2OSw3MTYuNjUyIDEzNS42MDQsNzE3LjA5IFogTTE1MC41ODUsNzA2LjgxMiBDMTUwLjA3Miw3MDcuNjYgMTQ5LjM4LDcwOC40MSAxNDguNTY0LDcwOS4wOTUgQzE0Ny4wMjIsNzEwLjM4OCAxNDUuMDMzLDcxMS40NjEgMTQzLjA0Myw3MTIuNTgyIEMxNDAuMjcyLDcxNC4xNDQgMTM3LjQ4NCw3MTUuNzk0IDEzNi4xMzYsNzE4LjU0NiBMMTM1Ljc2NSw3MTkuMzE3IEwxMzUuMTgzLDcxOC42OSBDMTM0LjcxNSw3MTguMTc4IDEzNC40Nyw3MTcuNDM3IDEzNC4zMzgsNzE2LjYwOCBDMTM0LjE5LDcxNS42NzQgMTM0LjE3NSw3MTQuNjIxIDEzMy45NTQsNzEzLjc3MyBDMTMzLjg3Nyw3MTMuNDc2IDEzMy43NzcsNzEzLjIwMyAxMzMuNjE4LDcxMi45ODkgQzEzMi43NDMsNzE3LjU2NiAxMzAuMzczLDcxOS4zMTQgMTI4Ljc5LDcyMi4yODUgQzEyOC4zOTksNzIzLjAyIDEyOC4wNzEsNzIzLjgzOSAxMjcuODI3LDcyNC43OTkgQzEyNy40NDUsNzI2LjMwMSAxMjcuMjg2LDcyOC4xNTQgMTI3LjQ4Nyw3MzAuNjA5IEwxMjcuNTc1LDczMS44MjggTDEyNi42MTQsNzMxLjA3NCBDMTI0LjQzMiw3MjkuMzk3IDEyMy43NzQsNzI3LjE3NiAxMjMuMTc0LDcyNC43NTkgQzEyMi44MTEsNzIzLjI5NSAxMjIuNDU4LDcyMS43NjEgMTIxLjczNiw3MjAuMjQ3IEMxMjEuNjUyLDcyMC4wNzEgMTIxLjU2LDcxOS44OTcgMTIxLjQ3LDcxOS43MTggQzEyMS4yNjgsNzE5LjMxOSAxMjEuMDYyLDcxOC45MDkgMTIwLjgwNCw3MTguNTA3IEMxMTkuOTk0LDcxNy4yNDkgMTE4LjgzMiw3MTYuMDE1IDExNy4wODcsNzE0LjgzOCBDMTE3LjAyMSw3MTkuNjE2IDExMy44NzYsNzI2LjAyMiAxMTEuOTY5LDczMi41MjQgQzExMS4yNTQsNzM0Ljk2MiAxMTAuNzI2LDczNy40MTMgMTEwLjYwMSw3MzkuNzk3IEMxMTAuNTE1LDc0MS40MzkgMTEwLjYxNyw3NDMuMDQ5IDExMS4wMTMsNzQ0LjYwNCBDMTEyLjI3Niw3NDkuNTU3IDExNi40NzQsNzUzLjg5NiAxMjYuMTcxLDc1Ni44ODggTDEyNi4zNjgsNzU3LjAwMSBDMTMwLjAwMSw3NjAuNDM5IDEzNy4yODUsNzYwLjI3OCAxNDQuNTQyLDc1Ny4zNzcgQzE0Ni4wMDgsNzU2Ljc5IDE0Ny40NzMsNzU2LjA4OCAxNDguOTAzLDc1NS4yNzQgQzE1NS4zMzUsNzUxLjYxMyAxNjEuMTIyLDc0NS43NyAxNjMuNjExLDczOC4zNzYgQzE2MS44OTgsNzM5LjEwNiAxNjAuNDg3LDczOS41MjMgMTU5LjI3NCw3MzkuNzQyIEMxNTcuMDA5LDc0MC4xNTEgMTU1LjQyMyw3MzkuODggMTUzLjg0Nyw3MzkuNjQzIEMxNTIuNTEyLDczOS40NDIgMTUxLjE4Nyw3MzkuMjc4IDE0OS4zNzcsNzM5LjY1IEMxNDguNTM3LDczOS44MjMgMTQ3LjU5LDc0MC4xMDEgMTQ2LjQ5MSw3NDAuNTUzIEwxNDUuMTY1LDc0MS4xMTMgTDE0NS42NTUsNzM5Ljc2IEMxNDYuMDY5LDczOC42NiAxNDcuMTIxLDczNy43MzkgMTQ4LjUyNCw3MzYuODU3IEMxNTAuNjIxLDczNS41NCAxNTMuNTE5LDczNC4yNDcgMTU1LjcxNSw3MzIuMDc2IEMxNTYuOTc0LDczMC44MzEgMTU4LjAxMiw3MjkuMjk3IDE1OC40OTEsNzI3LjI5MSBDMTU4LjYxNyw3MjYuNzU5IDE1OC43MDEsNzI2LjE5NSAxNTguNzQyLDcyNS41OTUgQzE1Ny43NCw3MjYuMDczIDE1Ni43MjYsNzI2LjM0MiAxNTUuOCw3MjYuNDg2IEMxNTMuNjcxLDcyNi44MTggMTUyLjAwNCw3MjYuNDgyIDE1Mi4wMDQsNzI2LjQ4MiBMMTUxLjUxNCw3MjYuMzgxIEwxNTEuNjY0LDcyNS45MDQgQzE1MS42NjQsNzI1LjkwNCAxNTMuMDU5LDcyMS4zMzIgMTUyLjcxNiw3MTUuNjE2IEMxNTIuNTQ4LDcxMi44MjIgMTUxLjk2Myw3MDkuNzUxIDE1MC41ODUsNzA2LjgxMiBaIi8+PHBhdGggZD0iTTE0NS41NTksNzE3LjgyMiBDMTM2LjkzNSw3MzAuMjcyIDEzMS40NTksNzQxLjEzNCAxMjguMDIzLDc0OS44OTIgQzEyNi4yOCw3NTQuMzM4IDEyNS4wMzcsNzU4LjIzNyAxMjQuMjA5LDc2MS41MzIgQzEyMy43NjEsNzYzLjMxNiAxMjMuNDQsNzY0LjkyNCAxMjMuMTk5LDc2Ni4zMzkgQzEyMi4zODMsNzcxLjExOSAxMjIuNDgzLDc3My43MDggMTIyLjQ4Myw3NzMuNzA4IEMxMjIuNDgzLDc3My45NzggMTIyLjcwMiw3NzQuMTk3IDEyMi45NzIsNzc0LjE5NyBDMTIzLjI0Miw3NzQuMTk3IDEyMy40NjEsNzczLjk3OCAxMjMuNDYxLDc3My43MDggQzEyMy40NjEsNzczLjcwOCAxMjMuNTYzLDc3MS4yMDUgMTI0LjU0MSw3NjYuNTk2IEMxMjQuODMzLDc2NS4yMTYgMTI1LjIwNSw3NjMuNjUgMTI1LjY2LDc2MS45MDEgQzEyNi4wNzQsNzYwLjMwNiAxMjYuNTUsNzU4LjU1OCAxMjcuMTMyLDc1Ni42NjkgQzEyOC4yMTQsNzUzLjE2MyAxMjkuNjMsNzQ5LjE3IDEzMS41MDksNzQ0Ljc0MiBDMTM0Ljc2Myw3MzcuMDc3IDEzOS4zOCw3MjguMTA5IDE0NS45NzQsNzE4LjEwMyBDMTQ2LjA1MSw3MTcuOTg4IDE0Ni4wMjEsNzE3LjgzMiAxNDUuOTA2LDcxNy43NTUgQzE0NS43OTIsNzE3LjY3OCAxNDUuNjM2LDcxNy43MDggMTQ1LjU1OSw3MTcuODIyIFoiLz48cGF0aCBkPSJNMTI5LjIsNzQ5LjE1OSBDMTMwLjAyNiw3NDkuMjU4IDEzMy4zMDIsNzQ5LjU5OCAxMzcuNTM4LDc0OS40MDIgQzE0MC4xMiw3NDkuMjgyIDE0My4wNTcsNzQ4Ljk2OSAxNDYuMDE4LDc0OC4yNjYgQzE0OS42MzMsNzQ3LjQwNyAxNTMuMjg0LDc0NS45NzkgMTU2LjM1Nyw3NDMuNjE3IEMxNTYuNDMxLDc0My41NTggMTU2LjU0LDc0My41NyAxNTYuNTk5LDc0My42NDUgQzE1Ni42NTgsNzQzLjcxOSAxNTYuNjQ2LDc0My44MjggMTU2LjU3MSw3NDMuODg3IEMxNTIuNzI0LDc0Ny4wMzkgMTQ3LjksNzQ4LjczMyAxNDMuMzU1LDc0OS41OTcgQzE0MC43ODEsNzUwLjA4NiAxMzguMjk3LDc1MC4zMDggMTM2LjEzNiw3NTAuMzg1IEMxMzEuODcyLDc1MC41MzYgMTI4Ljg2Myw3NTAuMTI0IDEyOC44NjMsNzUwLjEyNCBMMTI4LjY2MSw3NTAuMDk3IEwxMjguNTM2LDc0OS45MzYgQzEyOC41MzYsNzQ5LjkzNiAxMjYuNzQ1LDc0Ny42MjkgMTI0Ljc3OSw3NDMuOTg5IEMxMjMuNzg4LDc0Mi4xNTQgMTIyLjc1NCw3MzkuOTgxIDEyMS44ODEsNzM3LjU5OCBDMTIwLjM0Niw3MzMuNDEzIDExOS4zMDksNzI4LjU4NCAxMTkuODQ1LDcyMy44MTkgQzExOS44NTQsNzIzLjcyNCAxMTkuOTM5LDcyMy42NTUgMTIwLjAzMyw3MjMuNjY0IEMxMjAuMTI4LDcyMy42NzMgMTIwLjE5OCw3MjMuNzU3IDEyMC4xODgsNzIzLjg1MiBDMTE5Ljg4Myw3MjcuNTc5IDEyMC41NjMsNzMxLjMxIDEyMS42Niw3MzQuNzI4IEMxMjIuNTYyLDczNy41MzggMTIzLjc1Miw3NDAuMTMxIDEyNC45MTksNzQyLjMzNCBDMTI2LjgzOSw3NDUuOTU1IDEyOC43MDksNzQ4LjUwOSAxMjkuMiw3NDkuMTU5IFoiLz48cGF0aCBkPSJNMTM1Ljc1MSw3MzQuMjI4IEMxMzYuMTI1LDczNC4yNjYgMTM3LjM3OCw3MzQuMzYyIDEzOS4yNzIsNzM0LjE4OCBDMTQwLjc0Myw3MzQuMDUzIDE0Mi41OTMsNzMzLjc1OSAxNDQuNzIyLDczMy4xNDEgQzE0Ny4yMzEsNzMyLjQxNCAxNTAuMTI2LDczMS4yNTcgMTUzLjIzMiw3MjkuMzY2IEMxNTMuMzEyLDcyOS4zMTQgMTUzLjQxOSw3MjkuMzM3IDE1My40NzEsNzI5LjQxNyBDMTUzLjUyMiw3MjkuNDk3IDE1My40OTksNzI5LjYwNCAxNTMuNDE5LDcyOS42NTYgQzE1MC4zNTksNzMxLjczNCAxNDcuNDg0LDczMy4wNzcgMTQ0Ljk2NCw3MzMuOTE3IEMxNDIuNzkxLDczNC42NDEgMTQwLjg4Niw3MzQuOTk5IDEzOS4zNyw3MzUuMTYzIEMxMzYuOTM2LDczNS40MjUgMTM1LjQ5LDczNS4xOTEgMTM1LjQ5LDczNS4xOTEgTDEzNS4zODEsNzM1LjE3NSBMMTM1LjI4OSw3MzUuMTE0IEMxMzUuMjg5LDczNS4xMTQgMTMzLjIwNCw3MzMuNzYxIDEzMi40MTksNzI5LjMwMyBDMTMyLjAyMyw3MjcuMDUzIDEzMS45NjksNzIzLjk4OCAxMzIuNjk3LDcxOS44NzMgQzEzMi43MTEsNzE5Ljc3OSAxMzIuNzk5LDcxOS43MTQgMTMyLjg5Myw3MTkuNzI4IEMxMzIuOTg3LDcxOS43NDMgMTMzLjA1Miw3MTkuODMxIDEzMy4wMzgsNzE5LjkyNSBDMTMyLjUyMiw3MjMuOTc4IDEzMi43MzEsNzI2Ljk2NSAxMzMuMjA0LDcyOS4xNDggQzEzMy45NDksNzMyLjU4MSAxMzUuMzksNzMzLjkzNSAxMzUuNzUxLDczNC4yMjggWiIvPjwvZz48L2c+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 322.73468156567213,
        height: 322.7346815656716,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FFC090": "rgba(54,97,88,1)",
          "#555": "rgba(166,204,195,1)"
        }
      },
      {
        id: "-oiI6JyQvo",
        type: "svg",
        x: 640.5759929421636,
        y: 977.3532427361299,
        rotation: -50.9464159146607,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        selectable: true,
        alwaysOnTop: false,
        showInExport: true,
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xOTIgLTc5MikiPjxwYXRoIGZpbGw9IiNGRkMwOTAiIGQ9Ik02LjM4NTI1Mzc3LDkuMTE2Njk5MTUgQzE0LjY5ODczMDgsMTEuOTc5NDkyMSAxMC42NTQzNTkxLDEzLjk1Mjg2NDUgMTcuNzUxNDY0NywyMi4yNzUzOTA2IEMxNS4zMjA1NzYsMTcuMjg4NzYwMiAyMS43MDcwMzA1LDE1LjI1OTc2NTYgMjIuODI0MjE4Niw2LjkwNjczODIxIEMyNC45NzI2NTU1LDcuNTgxMDU0NjIgMjQuNjgxMTUxNiw5LjU1NzEyODg5IDI1LjIwNDU4OTEsMTMuMTA5ODYzMyBDMjguMTkyMzgyMSw2LjkwNjczODI3IDM4LjA2Njg5NTcsNS44MTQ5NDEzOSA0MC4xNjk0MzQ4LDAuMjc1ODc4ODk1IEM0NS4xOTUzMTM3LDkuNjc3NzM0MzYgNDIuNDI2MjcwNywyMS4zNTAwOTc2IDQyLjQyNjI3MDcsMjEuMzUwMDk3NiBDNDIuNDI2MjcwNywyMS4zNTAwOTc2IDQ1LjgxNTkxOTEsMjAuODI2NjYwMSA0OC43NzU4ODA3LDE5LjcxODI2MTYgQzQ3Ljg1NDk4MTYsMjcuNTQ4NzcwOSAzNi45MjY5MjY2LDMyLjc3NjQ1ODQgMzUuODQwMzMzMiwzNC43OTEwMTU2IEM0MS44NzA2MDY2LDMyLjU2Nzg3MTEgNDQuMDkxMDU1OSwzNi43OTQ5MjQ2IDU0LjA5Mzc1MTIsMzIuMTg4NDc2NiBDNDguNzc1ODgwMSw1MC40NDIzODI4IDIzLjY2MzYyOTgsNTkuNjk2NzQ0NyAxNS42MjA2MDUyLDUyLjE4MzU5MzcgQy0xMC41NjczODMsNDQuMTg0MDgyIDUuNDMwNjYzOSwyMS4wMjUzOTA2IDYuMzg1MjUzNzcsOS4xMTY2OTkxNSBaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMDYgODAxKSIvPjxnIGZpbGw9IiM1NTUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTEzNS42MDQsNzE3LjA5IEMxMzYuMTYzLDcxNi4xOTUgMTM2Ljg2Myw3MTUuNDA0IDEzNy42NTgsNzE0LjY4OSBDMTM5LjYyMyw3MTIuOTIzIDE0Mi4xNyw3MTEuNjE2IDE0NC41MDIsNzEwLjI3NiBDMTQ2LjkzOCw3MDguODc3IDE0OS4xNTUsNzA3LjQ2NyAxNTAuMDEzLDcwNS4yNDUgTDE1MC40ODIsNzA0LjAwOCBMMTUxLjEwNiw3MDUuMTc1IEMxNTIuOTEzLDcwOC42MTMgMTUzLjYxNyw3MTIuMjcyIDE1My43NjgsNzE1LjU2MSBDMTUzLjk4Niw3MjAuMzI4IDE1My4wNDQsNzI0LjMwOSAxNTIuNjcyLDcyNS42NzIgQzE1My4yNzMsNzI1Ljc0NiAxNTQuMzc5LDcyNS44MjQgMTU1LjY3Miw3MjUuNjM3IEMxNTYuNzA4LDcyNS40ODggMTU3Ljg2NSw3MjUuMTcgMTU4Ljk3OSw3MjQuNTQ0IEwxNTkuNjA1LDcyNC4xODggTDE1OS41OTMsNzI0LjkwOSBDMTU5LjU3Myw3MjUuODM2IDE1OS40NTcsNzI2LjY4NyAxNTkuMjc1LDcyNy40NzUgQzE1OC43NzIsNzI5LjY1NiAxNTcuNzExLDczMS4zNDggMTU2LjM3OCw3MzIuNzMxIEMxNTQuMTgzLDczNS4wMDggMTUxLjI2OSw3MzYuNDMxIDE0OS4xNTYsNzM3LjgzNSBDMTQ4Ljc1Niw3MzguMTAxIDE0OC4zODUsNzM4LjM2MyAxNDguMDYsNzM4LjYzMiBDMTQ4LjQyNiw3MzguNTIxIDE0OC43NzUsNzM4LjQzMiAxNDkuMTEsNzM4LjM2MiBDMTUxLjEwNiw3MzcuOTQzIDE1Mi41NzIsNzM4LjE1MSAxNTQuMDQzLDczOC4zODkgQzE1NS41MDEsNzM4LjYyNiAxNTYuOTY2LDczOC45MSAxNTkuMDcsNzM4LjU2MiBDMTYwLjQ2NSw3MzguMzMyIDE2Mi4xMzgsNzM3LjgzIDE2NC4yNjksNzM2Ljg3IEwxNjUuMzY4LDczNi4zNjQgTDE2NS4wMyw3MzcuNTI2IEMxNjIuNTkxLDc0NS42NzQgMTU2LjI2NSw3NTIuMDA3IDE0OS4yNyw3NTUuOTI0IEMxNDcuODA1LDc1Ni43NDQgMTQ2LjMxNCw3NTcuNDYzIDE0NC44MjIsNzU4LjA3MSBDMTM3LjI2MSw3NjEuMTU0IDEyOS42NzQsNzYxLjMgMTI1Ljc3NSw3NTcuODE0IEMxMTUuNTQzLDc1NC43ODcgMTExLjE0Miw3NTAuMTQyIDEwOS43NjYsNzQ0LjkyNyBDMTA5LjMyMiw3NDMuMjQ3IDEwOS4xODgsNzQxLjUgMTA5LjI5OCw3MzkuNzIzIEMxMDkuNDUxLDczNy4yNDQgMTEwLjA3LDczNC43MDUgMTEwLjg4LDczMi4xODkgQzExMy4wMTMsNzI1LjU1NiAxMTYuNTQzLDcxOS4wOTEgMTE2LjUwMiw3MTQuMzA3IEwxMTYuNDksNzEzLjc5NyBMMTE2LjkzNCw3MTQuMDQ4IEMxMTkuMTg2LDcxNS4xNzQgMTIwLjY5MSw3MTYuNDY0IDEyMS43NjUsNzE3LjgxOCBDMTIyLjE0Niw3MTguMjk4IDEyMi40OCw3MTguNzgyIDEyMi43NDksNzE5LjI4NCBDMTIzLjQyMSw3MjAuNTQxIDEyMy43NTYsNzIxLjg0OSAxMjQuMDU2LDcyMy4xMSBDMTI0LjU5OSw3MjUuMzkxIDEyNC44NzEsNzI3LjU3OSAxMjYuMzU3LDcyOS4zMjcgQzEyNi4zMzUsNzI3LjM4NiAxMjYuNTQ0LDcyNS44NDUgMTI2LjksNzI0LjU1MyBDMTI3LjE4NSw3MjMuNTIyIDEyNy41NjksNzIyLjY1MiAxMjcuOTk0LDcyMS44NTkgQzEyOS42MjMsNzE4LjgyMyAxMzIuMDY2LDcxNy4wNjYgMTMyLjcwNSw3MTIuMDIgTDEzMi43ODgsNzExLjM5NiBMMTMzLjM4OSw3MTEuNTg0IEMxMzQuMDIxLDcxMS43NzcgMTM0LjQzOSw3MTIuMTg4IDEzNC43MjQsNzEyLjczNyBDMTM1LjExOSw3MTMuNSAxMzUuMjIyLDcxNC41NzYgMTM1LjM0OCw3MTUuNjI2IEMxMzUuNDA5LDcxNi4xNDEgMTM1LjQ2OSw3MTYuNjUyIDEzNS42MDQsNzE3LjA5IFogTTE1MC41ODUsNzA2LjgxMiBDMTUwLjA3Miw3MDcuNjYgMTQ5LjM4LDcwOC40MSAxNDguNTY0LDcwOS4wOTUgQzE0Ny4wMjIsNzEwLjM4OCAxNDUuMDMzLDcxMS40NjEgMTQzLjA0Myw3MTIuNTgyIEMxNDAuMjcyLDcxNC4xNDQgMTM3LjQ4NCw3MTUuNzk0IDEzNi4xMzYsNzE4LjU0NiBMMTM1Ljc2NSw3MTkuMzE3IEwxMzUuMTgzLDcxOC42OSBDMTM0LjcxNSw3MTguMTc4IDEzNC40Nyw3MTcuNDM3IDEzNC4zMzgsNzE2LjYwOCBDMTM0LjE5LDcxNS42NzQgMTM0LjE3NSw3MTQuNjIxIDEzMy45NTQsNzEzLjc3MyBDMTMzLjg3Nyw3MTMuNDc2IDEzMy43NzcsNzEzLjIwMyAxMzMuNjE4LDcxMi45ODkgQzEzMi43NDMsNzE3LjU2NiAxMzAuMzczLDcxOS4zMTQgMTI4Ljc5LDcyMi4yODUgQzEyOC4zOTksNzIzLjAyIDEyOC4wNzEsNzIzLjgzOSAxMjcuODI3LDcyNC43OTkgQzEyNy40NDUsNzI2LjMwMSAxMjcuMjg2LDcyOC4xNTQgMTI3LjQ4Nyw3MzAuNjA5IEwxMjcuNTc1LDczMS44MjggTDEyNi42MTQsNzMxLjA3NCBDMTI0LjQzMiw3MjkuMzk3IDEyMy43NzQsNzI3LjE3NiAxMjMuMTc0LDcyNC43NTkgQzEyMi44MTEsNzIzLjI5NSAxMjIuNDU4LDcyMS43NjEgMTIxLjczNiw3MjAuMjQ3IEMxMjEuNjUyLDcyMC4wNzEgMTIxLjU2LDcxOS44OTcgMTIxLjQ3LDcxOS43MTggQzEyMS4yNjgsNzE5LjMxOSAxMjEuMDYyLDcxOC45MDkgMTIwLjgwNCw3MTguNTA3IEMxMTkuOTk0LDcxNy4yNDkgMTE4LjgzMiw3MTYuMDE1IDExNy4wODcsNzE0LjgzOCBDMTE3LjAyMSw3MTkuNjE2IDExMy44NzYsNzI2LjAyMiAxMTEuOTY5LDczMi41MjQgQzExMS4yNTQsNzM0Ljk2MiAxMTAuNzI2LDczNy40MTMgMTEwLjYwMSw3MzkuNzk3IEMxMTAuNTE1LDc0MS40MzkgMTEwLjYxNyw3NDMuMDQ5IDExMS4wMTMsNzQ0LjYwNCBDMTEyLjI3Niw3NDkuNTU3IDExNi40NzQsNzUzLjg5NiAxMjYuMTcxLDc1Ni44ODggTDEyNi4zNjgsNzU3LjAwMSBDMTMwLjAwMSw3NjAuNDM5IDEzNy4yODUsNzYwLjI3OCAxNDQuNTQyLDc1Ny4zNzcgQzE0Ni4wMDgsNzU2Ljc5IDE0Ny40NzMsNzU2LjA4OCAxNDguOTAzLDc1NS4yNzQgQzE1NS4zMzUsNzUxLjYxMyAxNjEuMTIyLDc0NS43NyAxNjMuNjExLDczOC4zNzYgQzE2MS44OTgsNzM5LjEwNiAxNjAuNDg3LDczOS41MjMgMTU5LjI3NCw3MzkuNzQyIEMxNTcuMDA5LDc0MC4xNTEgMTU1LjQyMyw3MzkuODggMTUzLjg0Nyw3MzkuNjQzIEMxNTIuNTEyLDczOS40NDIgMTUxLjE4Nyw3MzkuMjc4IDE0OS4zNzcsNzM5LjY1IEMxNDguNTM3LDczOS44MjMgMTQ3LjU5LDc0MC4xMDEgMTQ2LjQ5MSw3NDAuNTUzIEwxNDUuMTY1LDc0MS4xMTMgTDE0NS42NTUsNzM5Ljc2IEMxNDYuMDY5LDczOC42NiAxNDcuMTIxLDczNy43MzkgMTQ4LjUyNCw3MzYuODU3IEMxNTAuNjIxLDczNS41NCAxNTMuNTE5LDczNC4yNDcgMTU1LjcxNSw3MzIuMDc2IEMxNTYuOTc0LDczMC44MzEgMTU4LjAxMiw3MjkuMjk3IDE1OC40OTEsNzI3LjI5MSBDMTU4LjYxNyw3MjYuNzU5IDE1OC43MDEsNzI2LjE5NSAxNTguNzQyLDcyNS41OTUgQzE1Ny43NCw3MjYuMDczIDE1Ni43MjYsNzI2LjM0MiAxNTUuOCw3MjYuNDg2IEMxNTMuNjcxLDcyNi44MTggMTUyLjAwNCw3MjYuNDgyIDE1Mi4wMDQsNzI2LjQ4MiBMMTUxLjUxNCw3MjYuMzgxIEwxNTEuNjY0LDcyNS45MDQgQzE1MS42NjQsNzI1LjkwNCAxNTMuMDU5LDcyMS4zMzIgMTUyLjcxNiw3MTUuNjE2IEMxNTIuNTQ4LDcxMi44MjIgMTUxLjk2Myw3MDkuNzUxIDE1MC41ODUsNzA2LjgxMiBaIi8+PHBhdGggZD0iTTE0NS41NTksNzE3LjgyMiBDMTM2LjkzNSw3MzAuMjcyIDEzMS40NTksNzQxLjEzNCAxMjguMDIzLDc0OS44OTIgQzEyNi4yOCw3NTQuMzM4IDEyNS4wMzcsNzU4LjIzNyAxMjQuMjA5LDc2MS41MzIgQzEyMy43NjEsNzYzLjMxNiAxMjMuNDQsNzY0LjkyNCAxMjMuMTk5LDc2Ni4zMzkgQzEyMi4zODMsNzcxLjExOSAxMjIuNDgzLDc3My43MDggMTIyLjQ4Myw3NzMuNzA4IEMxMjIuNDgzLDc3My45NzggMTIyLjcwMiw3NzQuMTk3IDEyMi45NzIsNzc0LjE5NyBDMTIzLjI0Miw3NzQuMTk3IDEyMy40NjEsNzczLjk3OCAxMjMuNDYxLDc3My43MDggQzEyMy40NjEsNzczLjcwOCAxMjMuNTYzLDc3MS4yMDUgMTI0LjU0MSw3NjYuNTk2IEMxMjQuODMzLDc2NS4yMTYgMTI1LjIwNSw3NjMuNjUgMTI1LjY2LDc2MS45MDEgQzEyNi4wNzQsNzYwLjMwNiAxMjYuNTUsNzU4LjU1OCAxMjcuMTMyLDc1Ni42NjkgQzEyOC4yMTQsNzUzLjE2MyAxMjkuNjMsNzQ5LjE3IDEzMS41MDksNzQ0Ljc0MiBDMTM0Ljc2Myw3MzcuMDc3IDEzOS4zOCw3MjguMTA5IDE0NS45NzQsNzE4LjEwMyBDMTQ2LjA1MSw3MTcuOTg4IDE0Ni4wMjEsNzE3LjgzMiAxNDUuOTA2LDcxNy43NTUgQzE0NS43OTIsNzE3LjY3OCAxNDUuNjM2LDcxNy43MDggMTQ1LjU1OSw3MTcuODIyIFoiLz48cGF0aCBkPSJNMTI5LjIsNzQ5LjE1OSBDMTMwLjAyNiw3NDkuMjU4IDEzMy4zMDIsNzQ5LjU5OCAxMzcuNTM4LDc0OS40MDIgQzE0MC4xMiw3NDkuMjgyIDE0My4wNTcsNzQ4Ljk2OSAxNDYuMDE4LDc0OC4yNjYgQzE0OS42MzMsNzQ3LjQwNyAxNTMuMjg0LDc0NS45NzkgMTU2LjM1Nyw3NDMuNjE3IEMxNTYuNDMxLDc0My41NTggMTU2LjU0LDc0My41NyAxNTYuNTk5LDc0My42NDUgQzE1Ni42NTgsNzQzLjcxOSAxNTYuNjQ2LDc0My44MjggMTU2LjU3MSw3NDMuODg3IEMxNTIuNzI0LDc0Ny4wMzkgMTQ3LjksNzQ4LjczMyAxNDMuMzU1LDc0OS41OTcgQzE0MC43ODEsNzUwLjA4NiAxMzguMjk3LDc1MC4zMDggMTM2LjEzNiw3NTAuMzg1IEMxMzEuODcyLDc1MC41MzYgMTI4Ljg2Myw3NTAuMTI0IDEyOC44NjMsNzUwLjEyNCBMMTI4LjY2MSw3NTAuMDk3IEwxMjguNTM2LDc0OS45MzYgQzEyOC41MzYsNzQ5LjkzNiAxMjYuNzQ1LDc0Ny42MjkgMTI0Ljc3OSw3NDMuOTg5IEMxMjMuNzg4LDc0Mi4xNTQgMTIyLjc1NCw3MzkuOTgxIDEyMS44ODEsNzM3LjU5OCBDMTIwLjM0Niw3MzMuNDEzIDExOS4zMDksNzI4LjU4NCAxMTkuODQ1LDcyMy44MTkgQzExOS44NTQsNzIzLjcyNCAxMTkuOTM5LDcyMy42NTUgMTIwLjAzMyw3MjMuNjY0IEMxMjAuMTI4LDcyMy42NzMgMTIwLjE5OCw3MjMuNzU3IDEyMC4xODgsNzIzLjg1MiBDMTE5Ljg4Myw3MjcuNTc5IDEyMC41NjMsNzMxLjMxIDEyMS42Niw3MzQuNzI4IEMxMjIuNTYyLDczNy41MzggMTIzLjc1Miw3NDAuMTMxIDEyNC45MTksNzQyLjMzNCBDMTI2LjgzOSw3NDUuOTU1IDEyOC43MDksNzQ4LjUwOSAxMjkuMiw3NDkuMTU5IFoiLz48cGF0aCBkPSJNMTM1Ljc1MSw3MzQuMjI4IEMxMzYuMTI1LDczNC4yNjYgMTM3LjM3OCw3MzQuMzYyIDEzOS4yNzIsNzM0LjE4OCBDMTQwLjc0Myw3MzQuMDUzIDE0Mi41OTMsNzMzLjc1OSAxNDQuNzIyLDczMy4xNDEgQzE0Ny4yMzEsNzMyLjQxNCAxNTAuMTI2LDczMS4yNTcgMTUzLjIzMiw3MjkuMzY2IEMxNTMuMzEyLDcyOS4zMTQgMTUzLjQxOSw3MjkuMzM3IDE1My40NzEsNzI5LjQxNyBDMTUzLjUyMiw3MjkuNDk3IDE1My40OTksNzI5LjYwNCAxNTMuNDE5LDcyOS42NTYgQzE1MC4zNTksNzMxLjczNCAxNDcuNDg0LDczMy4wNzcgMTQ0Ljk2NCw3MzMuOTE3IEMxNDIuNzkxLDczNC42NDEgMTQwLjg4Niw3MzQuOTk5IDEzOS4zNyw3MzUuMTYzIEMxMzYuOTM2LDczNS40MjUgMTM1LjQ5LDczNS4xOTEgMTM1LjQ5LDczNS4xOTEgTDEzNS4zODEsNzM1LjE3NSBMMTM1LjI4OSw3MzUuMTE0IEMxMzUuMjg5LDczNS4xMTQgMTMzLjIwNCw3MzMuNzYxIDEzMi40MTksNzI5LjMwMyBDMTMyLjAyMyw3MjcuMDUzIDEzMS45NjksNzIzLjk4OCAxMzIuNjk3LDcxOS44NzMgQzEzMi43MTEsNzE5Ljc3OSAxMzIuNzk5LDcxOS43MTQgMTMyLjg5Myw3MTkuNzI4IEMxMzIuOTg3LDcxOS43NDMgMTMzLjA1Miw3MTkuODMxIDEzMy4wMzgsNzE5LjkyNSBDMTMyLjUyMiw3MjMuOTc4IDEzMi43MzEsNzI2Ljk2NSAxMzMuMjA0LDcyOS4xNDggQzEzMy45NDksNzMyLjU4MSAxMzUuMzksNzMzLjkzNSAxMzUuNzUxLDczNC4yMjggWiIvPjwvZz48L2c+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 322.73468156567213,
        height: 322.7346815656716,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FFC090": "rgba(124,53,38,1)",
          "#555": "rgba(255,255,255,1)"
        }
      }
    ],
    background: "rgba(168,69,27,1)"
  },
  {
    id: "xe1pKi8Sko",
    elements: [
      {
        id: "Zar8LgN4M5",
        type: "svg",
        x: 384.9146031500779,
        y: 438.6807587129837,
        rotation: -22.27909553213837,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 574.7088485012861,
        height: 773.6885014366777,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "O18PNLRYtY",
        type: "image",
        x: 433.5377863020942,
        y: 456.7384979336896,
        rotation: -22.27909553213837,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 498.7359009214497,
        height: 600,
        src: "https://images.unsplash.com/photo-1592548766284-2b1cce3eaa99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw3fHxsb2JzdGVyfGVufDB8fHx8MTYzMDk5NjgyNA&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 0.8020276849149457,
        cornerRadius: 0,
        flipX: false,
        flipY: false,
        clipSrc: "",
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "ccQSQIK_8z",
        type: "text",
        x: -11.924537189842809,
        y: 221.40881087339125,
        rotation: -10.537207860757437,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Did you know?",
        placeholder: "",
        fontSize: 114.99331546808618,
        fontFamily: "Satisfy",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 594.0702688511798,
        height: 275.9839571234068,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "umwAKsguu1",
        type: "text",
        x: 105.91676695127035,
        y: 854.28449337403,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Lobster have clear blood.",
        placeholder: "",
        fontSize: 44.94032695848449,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 307.05518959384125,
        height: 107.85678470036278,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "UIcBb2u9_T",
        type: "svg",
        x: 553.494201085891,
        y: 318.3214238374111,
        rotation: -24.59205503399583,
        opacity: 0.47,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 150,
        height: 97.85986483875044,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(250,236,224,1)"
        }
      },
      {
        id: "UkUzVB-IVM",
        type: "svg",
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 150,
        height: 150,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      }
    ],
    background: "rgba(0,0,0,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_102550.png?v=1740459361"
  },
  {
    id: "Uivqd-3KKc",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_122106.png?v=1740466294",
    elements: [
      {
        id: "nD71orvgZP",
        type: "svg",
        x: 219.47103191792937,
        y: 164.61451504016892,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 613.1975865173841,
        height: 613.1975865173843,
        borderColor: "rgba(248,227,17,1)",
        borderSize: 4,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "7_OHHISxsg",
        type: "text",
        x: 281.6284508460638,
        y: 243.61916330822515,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "SALE",
        placeholder: "",
        fontSize: 147.7968399115801,
        fontFamily: "Monoton",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 488.882748642524,
        height: 177.3562078938961,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "jEIym5evqE",
        type: "text",
        x: 281.6284508460638,
        y: 399.70103252849475,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "SALE",
        placeholder: "",
        fontSize: 147.7968399115801,
        fontFamily: "Monoton",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 488.8827486611148,
        height: 177.3562078938961,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "-rbQKc0xWy",
        type: "text",
        x: 281.6284508274735,
        y: 551.7414240372063,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "SALE",
        placeholder: "",
        fontSize: 147.7968399115801,
        fontFamily: "Monoton",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 488.8827486611148,
        height: 177.3562078938961,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "36n7pCbxbM",
        type: "svg",
        x: 930,
        y: 0,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 150,
        height: 150,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(248,227,17,1)"
        }
      },
      {
        id: "TB2u8cER1K",
        type: "svg",
        x: -11368683772161603e-29,
        y: 929.9999999999999,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 150,
        height: 150,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(248,227,17,1)"
        }
      },
      {
        id: "ueMV7HiG-2",
        type: "svg",
        x: 97.2413793103454,
        y: -186.72413793103445,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 276.85589435051384,
        height: 276.8558943505138,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "a2ctT60KUX",
        type: "svg",
        x: -138.42794717525697,
        y: -112.24137931034481,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 276.85589435051384,
        height: 276.8558943505138,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "9g_3a7dh4T",
        type: "svg",
        x: 900.09793361931,
        y: 853.5462094713806,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 276.85589435051384,
        height: 276.8558943505138,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "fcXMJaFULP",
        type: "svg",
        x: 728.1441056494859,
        y: 1004.9999999999998,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 276.85589435051384,
        height: 276.8558943505138,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "UYEFZh4sHS",
        type: "svg",
        x: 389.99999999999864,
        y: 804.8275862068965,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 359.4827586206894,
        height: 80.17241379310437,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "_hLXuyblM4",
        type: "text",
        x: 299.7413792903433,
        y: 822.7137931034484,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "SHOP NOW",
        placeholder: "",
        fontSize: 40,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(248,227,17,1)",
        align: "center",
        width: 540,
        height: 48,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "luouzBF7IO",
        type: "text",
        x: 128.40000000000077,
        y: 804.8275862068965,
        rotation: -90.0000000000002,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "ONLY THIS WEEK",
        placeholder: "",
        fontSize: 36,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 563.3839555908855,
        height: 43.199999999999996,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "hd_6xyX5sj",
        type: "text",
        x: 878.4979336193107,
        y: 770.0711142808855,
        rotation: -90.0000000000002,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "UP TO 50% OFF",
        placeholder: "",
        fontSize: 36,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 563.3839555908855,
        height: 43.199999999999996,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "OI9M8JCElT",
        type: "text",
        x: 299.74137929034316,
        y: 959.5741566466374,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "WWW.WEBSITE.COM",
        placeholder: "",
        fontSize: 27,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 540,
        height: 32.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "AdmUEFEb9v",
        type: "svg",
        x: 144.34377581923025,
        y: 708.2827420783746,
        rotation: 57.261158624135625,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 4.481102452582128,
        height: 338.61105549354147,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(248,227,17,1)"
        }
      },
      {
        id: "vNyjW_Nve4",
        type: "svg",
        x: 1163.3187112686721,
        y: 577.0572404223907,
        rotation: 57.261158624135625,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 4.481102452582128,
        height: 338.61105549354147,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(248,227,17,1)"
        }
      },
      {
        id: "UvPH3-G2Bk",
        type: "svg",
        x: 710.9400541268546,
        y: -93.4468620267544,
        rotation: 57.261158624135625,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 4.481102452582128,
        height: 338.61105549354147,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(248,227,17,1)"
        }
      },
      {
        id: "AGazt93kGU",
        type: "svg",
        x: 798.1814334371995,
        y: -112.24137931034484,
        rotation: 57.261158624135625,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 4.481102452582128,
        height: 338.61105549354147,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(248,227,17,1)"
        }
      },
      {
        id: "VCG2RFR0zo",
        type: "svg",
        x: 57.941285533391365,
        y: 885.0000000000008,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjgiLz48Y2lyY2xlIGN4PSIxMjgiIGN5PSI2MCIgcj0iOCIvPjxjaXJjbGUgY3g9IjE5NiIgY3k9IjYwIiByPSI4Ii8+PGNpcmNsZSBjeD0iNjAiIGN5PSIxMjgiIHI9IjgiLz48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjgiLz48Y2lyY2xlIGN4PSIxOTYiIGN5PSIxMjgiIHI9IjgiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjE5NiIgcj0iOCIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjE5NiIgcj0iOCIvPjxjaXJjbGUgY3g9IjE5NiIgY3k9IjE5NiIgcj0iOCIvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 140.9174289332147,
        height: 140.917428933215,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "niogOtWADb",
        type: "svg",
        x: 881.2026075089457,
        y: 41.23774348057678,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjgiLz48Y2lyY2xlIGN4PSIxMjgiIGN5PSI2MCIgcj0iOCIvPjxjaXJjbGUgY3g9IjE5NiIgY3k9IjYwIiByPSI4Ii8+PGNpcmNsZSBjeD0iNjAiIGN5PSIxMjgiIHI9IjgiLz48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjgiLz48Y2lyY2xlIGN4PSIxOTYiIGN5PSIxMjgiIHI9IjgiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjE5NiIgcj0iOCIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjE5NiIgcj0iOCIvPjxjaXJjbGUgY3g9IjE5NiIgY3k9IjE5NiIgcj0iOCIvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 140.9174289332147,
        height: 140.917428933215,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "88dgv27suk",
        type: "svg",
        x: 534.2685639273147,
        y: 63.34403265961848,
        rotation: 50.19721205764388,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJMYXllcl8xIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAxNiAxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cG9seWdvbiBwb2ludHM9IjYuMjA3IDE1LjIwNSA0LjA4NiAxMy4wODQgNC43OTMgMTIuMzc3IDYuMjA3IDEzLjc5MSA3LjYyMSAxMi4zNzcgOC4zMjggMTMuMDg0Ii8+PHBvbHlnb24gcG9pbnRzPSI2LjcwNyAxNC41MDIgNS43MDcgMTQuNTAyIDUuNzA3IDQuMjk1IDEwLjcwNyA5LjI5NSAxMC43MDcgMS4wMDIgMTEuNzA3IDEuMDAyIDExLjcwNyAxMS43MDkgNi43MDcgNi43MDkiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128,
        height: 128,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "U6J791DgLT",
        type: "svg",
        x: 790.8717717552572,
        y: 655.0755558578438,
        rotation: 50.19721205764388,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJMYXllcl8xIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAxNiAxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cG9seWdvbiBwb2ludHM9IjYuMjA3IDE1LjIwNSA0LjA4NiAxMy4wODQgNC43OTMgMTIuMzc3IDYuMjA3IDEzLjc5MSA3LjYyMSAxMi4zNzcgOC4zMjggMTMuMDg0Ii8+PHBvbHlnb24gcG9pbnRzPSI2LjcwNyAxNC41MDIgNS43MDcgMTQuNTAyIDUuNzA3IDQuMjk1IDEwLjcwNyA5LjI5NSAxMC43MDcgMS4wMDIgMTEuNzA3IDEuMDAyIDExLjcwNyAxMS43MDkgNi43MDcgNi43MDkiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 81.64981728312013,
        height: 81.64981728312007,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "ImNcqc5TqT",
        type: "svg",
        x: 309.9806999098073,
        y: 777.8121015575532,
        rotation: 135,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyOCIgcj0iOCIvPjxjaXJjbGUgY3g9IjY0IiBjeT0iMTI4IiByPSI4Ii8+PGNpcmNsZSBjeD0iMTkyIiBjeT0iMTI4IiByPSI4Ii8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128,
        height: 128,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      },
      {
        id: "3gVMh-TaE5",
        type: "svg",
        x: 921.6979336193106,
        y: 240.50966799187808,
        rotation: 135,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyOCIgcj0iOCIvPjxjaXJjbGUgY3g9IjY0IiBjeT0iMTI4IiByPSI4Ii8+PGNpcmNsZSBjeD0iMTkyIiBjeT0iMTI4IiByPSI4Ii8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128,
        height: 128,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {}
      }
    ],
    background: "white"
  },
  {
    id: "5U-1DKcb5V",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_122419.png?v=1740466471",
    elements: [
      {
        id: "HduAvJbqdX",
        type: "image",
        x: 121.1148734431282,
        y: 386.636182133537,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 837.7702531137438,
        height: 559.2116439534236,
        src: "https://images.unsplash.com/photo-1619167316217-c1c8f8ac1dff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwyM3x8c2VydW18ZW58MHx8fHwxNjI1OTAxMzg2&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.998751560549314,
        cropHeight: 1,
        flipX: false,
        flipY: false,
        borderColor: "rgba(131,121,176,1)",
        borderSize: 10
      },
      {
        id: "0yLifCjjjd",
        type: "text",
        x: 74.97125803771524,
        y: 92.45652173913047,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "THE SKINCARE ROUTINE",
        placeholder: "",
        fontSize: 77,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(131,121,176,1)",
        align: "center",
        width: 930.0574839245695,
        height: 184.79999999999998,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "OxB5Lnil9x",
        type: "text",
        x: 74.97125801771523,
        y: 277.25652173913045,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "THAT YOU NEED",
        placeholder: "",
        fontSize: 77,
        fontFamily: "Archivo Black",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 930.0574839245695,
        height: 92.39999999999999,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "kGnsu27oeE",
        type: "text",
        x: 203.086956501739,
        y: 971.6739130434823,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "www.facial.com",
        placeholder: "",
        fontSize: 35,
        fontFamily: "Raleway",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(131,121,176,1)",
        align: "center",
        width: 673.8260869765222,
        height: 42,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(205,206,251,1)"
  },
  {
    id: "t-4Foso6i_",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_123019.png?v=1740466828",
    elements: [
      {
        id: "y_lCjXAwrW",
        type: "image",
        x: -4.965517241379813,
        y: -12.43128846878866,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 1093.8806653326235,
        height: 1109.4809278450646,
        src: "https://images.unsplash.com/photo-1541870730196-cd1efcbf5649?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwxM3x8Y29mZmVlfGVufDB8fHx8MTYyNTkzNDk5NA&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0.08756080611535788,
        cropWidth: 0.9999999999999998,
        cropHeight: 0.7612246733032195,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "H_b8XUw81L",
        type: "text",
        x: 57.24613182083823,
        y: 190.25390911041222,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "sleep",
        placeholder: "",
        fontSize: 179.41103237859338,
        fontFamily: "Rock Salt",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "left",
        width: 616.8252792666424,
        height: 215.29323885431205,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "Ze_ovmw9ku",
        type: "text",
        x: 57.246131820838315,
        y: 58.964990271679646,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Coffee is a beverage that puts one to",
        placeholder: "",
        fontSize: 49.00016040313295,
        fontFamily: "Quattrocento",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "left",
        width: 573.423794661928,
        height: 117.60038496751908,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "fETZbYtLGx",
        type: "text",
        x: 731.6233415075502,
        y: 756.9649902716689,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "when not",
        placeholder: "",
        fontSize: 59.317259599103174,
        fontFamily: "Quattrocento",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "right",
        width: 274.7895822001811,
        height: 71.1807115189238,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "nisRL8Y3Xy",
        type: "text",
        x: 303.05411280392843,
        y: 828.1457017905926,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "drank",
        placeholder: "",
        fontSize: 181.8670582771288,
        fontFamily: "Rock Salt",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "right",
        width: 703.3588109038036,
        height: 218.24046993255453,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "white"
  },
  {
    id: "7w-VAfjl4A",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_123245.png?v=1740466978",
    elements: [
      {
        id: "rOgOV-Hykh",
        type: "svg",
        x: -374.19482110066724,
        y: -84.16542883261799,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjIgMyA2MiA2MCI+PHBvbHlnb24gcG9pbnRzPSIzMywgMyA2MywgMjYgNTMsIDY2IDEzLCA2NiAzLCAyNiIgZmlsbD0icmdiKDAsIDE2MSwgMjU1KSIgLz48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1289.9418862540786,
        height: 1248.330857665236,
        borderColor: "rgba(255,255,255,1)",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(243,155,9,1)"
        }
      },
      {
        id: "fkZlAiWvHQ",
        type: "image",
        x: 433.08480759902335,
        y: 143.4526847029657,
        rotation: -8.164535818420799,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 514.9441952525011,
        height: 772.4162928787506,
        src: "https://images.unsplash.com/photo-1605749429194-4c7b0da142fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwzNHx8c3dpbXN1aXR8ZW58MHx8fHwxNjIzNzI0Nzc3&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9999999999999998,
        cropHeight: 0.9999999999999983,
        flipX: false,
        flipY: false,
        borderColor: "rgba(255,255,255,1)",
        borderSize: 14
      },
      {
        id: "jYl2MgDKyY",
        type: "text",
        x: 24.643367834216974,
        y: 438.92562970609913,
        rotation: -19.731359456433193,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Vacation",
        placeholder: "",
        fontSize: 174,
        fontFamily: "Alex Brush",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "rgba(53,26,4,1)",
        align: "center",
        width: 540.0000000399999,
        height: 208.79999999999998,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "5e-F8uZys3",
        type: "text",
        x: -75.55327761209665,
        y: 613.8078566868279,
        rotation: -19.731359456433154,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Sale",
        placeholder: "",
        fontSize: 195.51431921506284,
        fontFamily: "Alex Brush",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 651.7143974559555,
        height: 234.6171830580754,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "yZmYGbBZFg",
        type: "svg",
        x: 607.9089255566367,
        y: 101.75016925865242,
        rotation: -10.984676895870425,
        opacity: 0.5599999999999999,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 164.93582057809203,
        height: 72.87028245417856,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(155,155,155,1)"
        }
      },
      {
        id: "OIlu5XGR1j",
        type: "svg",
        x: 1080.8685316455721,
        y: 1279.1137861212583,
        rotation: -163.09413721009378,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxwYXRoIGQ9Ik0zOS43Niw0OC41M2EuODMuODMsMCwwLDAsMS4yNS4xOSwzMi40LDMyLjQsMCwwLDEsNy0zLjEzQTIyLjIyLDIyLjIyLDAsMCwxLDU0LjYsNDQuM2MuNTUsMCwxLjE2LS4xLDEuMzkuNTZzLS4xNywxLS41NiwxLjI2YTM2LjI2LDM2LjI2LDAsMCwxLTIuOTQsMi4xNWMtMS4wOC42Ny0yLjI1LDEuMi0zLjM4LDEuOC0uMjUuMTMtLjQ5LjI5LS45LjUzYTE4LDE4LDAsMCwwLDMuNjksMWMuNDctLjQyLDEtLjg2LDEuNDYtMS4yOWExMi4yNywxMi4yNywwLDAsMSw4LjUxLTMuMiw1Ljc5LDUuNzksMCwwLDEsMS4yNi4xNS44Mi44MiwwLDAsMSwuNSwxLjE4LDQuNjUsNC42NSwwLDAsMS0uNzksMSwxMy44NiwxMy44NiwwLDAsMS0zLjUsMi4zbC0xLjc4Ljg3Yy4yNi4yLjM5LjQuNTcuNDQuNzEuMTksMS40My4zLDIuMTMuNTFhMy4xMSwzLjExLDAsMCwwLDIuNDYtLjI4LDE5LjI3LDE5LjI3LDAsMCwxLDUuMzUtMS43OSwyMywyMywwLDAsMSw3LjYzLDBjLjU5LjA4LDEuMjguMTgsMS40NC45MXMtLjM2LDEuMTItLjg1LDEuNDlhOC45LDguOSwwLDAsMS0yLjk0LDEuNDJjLS43LjIxLTEuNDEuMzUtMi4zNy41OS42My4yMiwxLC40MiwxLjQ4LjUyLDIuMTkuNTIsNC4zOSwxLDYuNTgsMS41MmE0LDQsMCwwLDEsMS4xOS40My43MS43MSwwLDAsMS0uMywxLjMxLDIuNjksMi42OSwwLDAsMS0xLjA4LS4xMWMtMi4xMy0uNDgtNC4yNi0xLTYuNC0xLjQ4LS41MS0uMTEtMS0uMTctMS44OC0uMzEuNDQuNTguNjYuOTIuOTMsMS4yMWExNywxNywwLDAsMSwzLDQuMzdjLjI0LjUuNTQsMSwuMTUsMS41NGExLjQ1LDEuNDUsMCwwLDEtMS42OC4zNiwxMC41OCwxMC41OCwwLDAsMS0xLjcyLS41OSwyMy44OSwyMy44OSwwLDAsMS04LjA2LTYuMTcsMzMsMzMsMCwwLDEtMi0zLDIxLjE4LDIxLjE4LDAsMCwwLTMuOTEtLjgyYy41MS42My44NywxLjExLDEuMjYsMS41NkExNi4xOSwxNi4xOSwwLDAsMSw2MC43Myw2MGExLjI1LDEuMjUsMCwwLDEsMCwxLC44NC44NCwwLDAsMS0xLjEyLjMxLDkuNTgsOS41OCwwLDAsMS0xLjQ3LS43M2MtMS4xNS0uNzktMi4yOS0xLjYtMy40LTIuNDdhOCw4LDAsMCwxLTIuOTMtNC4yOSw0LjEyLDQuMTIsMCwwLDAtLjI1LS41NGMtMi4yNy0uNTgtNC41NS0xLjE0LTctMS42MUE1LjI2LDUuMjYsMCwwLDAsNDYsNTMuNDYsMzYuMjgsMzYuMjgsMCwwLDEsNTAuNzksNTlhMTIuNDYsMTIuNDYsMCwwLDEsMSwxLjc0LDEuMDksMS4wOSwwLDAsMS0uMTcsMS4zNSwxLjE3LDEuMTcsMCwwLDEtMS4zNi4xNkE2Ljg3LDYuODcsMCwwLDEsNDksNjEuNTEsMjQuMzMsMjQuMzMsMCwwLDEsNDAuODYsNTNsLS41NS0uOTVjLTEuMTMtMS45Mi0xLjE0LTEuOTMtMy43Ny0yLjA5YTE0LjE4LDE0LjE4LDAsMCwwLC43MSwxLjI2YzEuNDIsMi4wNSwyLjg3LDQuMDgsNC4yOSw2LjE0LjU4Ljg1LDEuMTMsMS43MywxLjY3LDIuNjFhNi4wNyw2LjA3LDAsMCwxLC41NSwxLjE1LDEuMjMsMS4yMywwLDAsMS0xLjUyLDEuNzIsNS4xNiw1LjE2LDAsMCwxLTItLjkyLDE5LjUsMTkuNSwwLDAsMS01LjgtNy4xOCwxNS4yMywxNS4yMywwLDAsMS0xLTMuODgsOC43MSw4LjcxLDAsMCwwLS4yLTEuMjZjLS4wOS0uMjYtLjMxLS42Mi0uNTMtLjY4YTkuNTEsOS41MSwwLDAsMC0zLjE2LS41NWMuMjUuNS40NC45My42NywxLjMzLDEuNDcsMi41MiwyLjk1LDUsNC40MSw3LjU3LjI3LjQ4LjUsMSwuNzIsMS40OGEuODQuODQsMCwwLDEtLjIsMSwuOTMuOTMsMCwwLDEtMS4xNy4xNyw0Ljc1LDQuNzUsMCwwLDEtLjc4LS40NywxMi43OSwxMi43OSwwLDAsMS0zLjg5LTQuMjksMjMuODksMjMuODksMCwwLDEtMi40Ny02LjI3Yy0uMDktLjQ3LS4yNy0uOTItLjQyLTEuNDRsLTYuNzctMS41OWMtLjg5LS4yMS0xLjc4LS40MS0yLjY2LS42NGEyLjA5LDIuMDksMCwwLDEtLjgxLS4zOC43OS43OSwwLDAsMS0uMjItLjY0YzAtLjE5LjI4LS40OS40NS0uNDlhNi4yMSw2LjIxLDAsMCwxLDEuNjEuMWMyLjIuNDksNC4zOSwxLDYuNTgsMS41My41OS4xNCwxLjE5LjI1LDEuODUuMzlhNi4wNyw2LjA3LDAsMCwwLC43LS41LDI1LjMsMjUuMywwLDAsMSwxMS40LTUuODYsNC42Myw0LjYzLDAsMCwxLC45MS0uMTIuOTMuOTMsMCwwLDEsLjksMS40Nyw2LjM4LDYuMzgsMCwwLDEtMiwyLjA4QzM2LjcyLDQ0LDM1LDQ1LjE1LDMzLjMsNDYuMzJsLS43Ni41MWMuOTQuNjksMS4yMi43MiwxLjg3LjA5QTIzLjY0LDIzLjY0LDAsMCwxLDM5LDQzLjYyLDE3LjcsMTcuNywwLDAsMSw0Ny42Myw0MWE1LDUsMCwwLDEsMS4wOS4wNS44NS44NSwwLDAsMSwuNTMsMS4yOSw0LjMyLDQuMzIsMCwwLDEtLjcyLjgyLDE4LjM0LDE4LjM0LDAsMCwxLTMuODYsMi43M0M0My4wNSw0Ni43MSw0MS40Niw0Ny42LDM5Ljc2LDQ4LjUzWk0zMSw1NC4xOWwuMTUuMzhzLjA2LS4xMi4wNS0uMTMtLjE3LS4xNC0uMjUtLjIxbC0uMTctMS0uMjEsMHYtLjE1bC4yLjFDMzAuNzIsNTMuNTgsMzAuNDQsNTQsMzEsNTQuMTlabTMyLjc2LDJjMSwyLjQxLDUuNzEsNi4xNyw4LjU4LDYuOTRDNzEuMjIsNjAuMTQsNjYuNzMsNTYuNTEsNjMuNzIsNTYuMjNaTTQ1Ljk0LDQzLjA2Yy0yLjA3LS4xMy00LjkzLDEtOC4zOSwzLjMxLS44Mi41NC0uODIuNTQtMS4wNiwxLjIyYTcuNDksNy40OSwwLDAsMCwzLjI5LS45M2MxLjY1LS44OSwzLjMtMS43Nyw0LjkzLTIuNjlBMTEuNTgsMTEuNTgsMCwwLDAsNDUuOTQsNDMuMDZaTTM1LjQsNTEuNjJBOC40Niw4LjQ2LDAsMCwwLDM3LDU2YzEuNSwyLjI5LDMuMTMsMy45Myw0LjQyLDQuNDlBNjUuOTIsNjUuOTIsMCwwLDAsMzUuNCw1MS42MlptMTYuNzItNS4yN2MtLjEyLDAtLjI0LS4wOS0uMzUtLjA3YTM3LjIsMzcuMiwwLDAsMC04LjI1LDIuODFjLS4xMSwwLS4xNS4yNC0uMjQuNEExMi40NiwxMi40NiwwLDAsMCw1Mi4xMiw0Ni4zNVptMjEuOCw2LjczYy0uMDgtLjA3LS4xNi0uMTktLjI1LS4xOWEyMC43NywyMC43NywwLDAsMC03LjkxLjgzYy0uMTcuMDUtLjMuMjQtLjU1LjQ1QzY5LjY1LDU0LjU5LDcyLjY1LDU0LjIsNzMuOTIsNTMuMDhaTTM2LjY1LDQxLjc0Yy0uNzEuMjItMS4yMy4zNS0xLjcxLjU1YTI2LjM0LDI2LjM0LDAsMCwwLTUuMjcsMi44NiwxMS45LDExLjksMCwwLDAtMSwuODgsMi4yMywyLjIzLDAsMCwwLDItLjI1QTE4LjExLDE4LjExLDAsMCwwLDM2LjY1LDQxLjc0Wk00OC40Niw1OC45MmEyNCwyNCwwLDAsMC01Ljc4LTYuMTdBMTYuNzQsMTYuNzQsMCwwLDAsNDguNDYsNTguOTJabTEyLjItMTBhOC44OCw4Ljg4LDAsMCwwLTYuMDksMi42OSw1LjE1LDUuMTUsMCwwLDAsMi0uNDNjMS4yMS0uNTIsMi4zOS0xLjEyLDMuNTctMS43MUM2MC4zMiw0OS4zOCw2MC40NSw0OS4xNSw2MC42Niw0OC45MlpNNTcuNzgsNTguMmExMSwxMSwwLDAsMC00LTQuMDZDNTQuMzIsNTUuNzYsNTUuMjYsNTYuNzYsNTcuNzgsNTguMloiLz48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 402.45252647425696,
        height: 402.4525264742574,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(48,24,4,1)"
        }
      },
      {
        id: "CMcAGm8LXy",
        type: "text",
        x: 101.05408175154115,
        y: 812.4497036738769,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "www.vacation.com",
        placeholder: "",
        fontSize: 32,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 360.3862360354901,
        height: 38.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "TeV3693OUy",
        type: "svg",
        x: 169.58969381805417,
        y: 958.284520109062,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 291.8506239689772,
        height: 70.15695338556178,
        borderColor: "rgba(49,25,4,1)",
        borderSize: 2,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "9AmE0802Z7",
        type: "text",
        x: 133.84397969907513,
        y: 977.7813081176259,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "LEARN MORE",
        placeholder: "",
        fontSize: 33,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 360.3862360354901,
        height: 39.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(223,184,151,1)"
  },
  {
    id: "SUC2lGJBf3",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_123222.png?v=1740466978",
    elements: [
      {
        id: "fZ9I_lbKea",
        type: "svg",
        x: -114.45364705619642,
        y: 497.85365853658527,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1448.2273211889299,
        height: 1448.2273211889299,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(252,163,16,1)"
        }
      },
      {
        id: "zvxkD1ruPa",
        type: "image",
        x: 493.5274077950498,
        y: 39.23226161633049,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 536.5709956667492,
        height: 804.8564935001233,
        src: "https://images.unsplash.com/photo-1493552152660-f915ab47ae9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw4Nnx8cGxhbnRzfGVufDB8fHx8MTYyMzcyODMyNA&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 0.9999999999999991,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "p3jqcPicXX",
        type: "svg",
        x: 940.1091680748584,
        y: -24.658536585365837,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 217.6721622162107,
        height: 217.67216221621052,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,98,0,1)"
        }
      },
      {
        id: "sPua-N621-",
        type: "text",
        x: 95.49531394678749,
        y: 50.341463414634205,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "award winning studio",
        placeholder: "",
        fontSize: 97,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(7,77,52,1)",
        align: "left",
        width: 421.24310640924375,
        height: 291.00000000000006,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.0000000000000002,
        letterSpacing: 0
      },
      {
        id: "5NezcmB_Kf",
        type: "svg",
        x: 50.604672039462194,
        y: 314.8503401433965,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 4.7940806470409525,
        height: 718.9789281492879,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(7,77,52,1)"
        }
      },
      {
        id: "aLK6WoqMfD",
        type: "text",
        x: 39.20171236298267,
        y: 288.50887672876235,
        rotation: -89.99999999999999,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "WEBSITE HERE",
        placeholder: "",
        fontSize: 23,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(245,114,5,1)",
        align: "left",
        width: 268.71660169311275,
        height: 27.599999999999998,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "UC99XbtMen",
        type: "text",
        x: 475.46341463414694,
        y: 909.5055073787369,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        placeholder: "",
        fontSize: 28,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "right",
        width: 548.5279313576546,
        height: 100.8,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "SndMoMq8k2",
        type: "svg",
        x: 343.5274077950496,
        y: 880.9668038969434,
        rotation: -89.99999999999996,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0ibm9uZSIgcG9pbnRzPSIyIDIsIDU4IDU4LCAyIDU4IiBzdHJva2U9InJnYmEoOTgsIDE5NywgMjU1LCAxKSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 150,
        height: 150,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgba(98, 197, 255, 1)": "rgba(255,255,255,1)"
        }
      }
    ],
    background: "rgba(252,246,184,1)"
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_124108.png?v=1740467524",
    id: "bgTJINN1C-",
    elements: [
      {
        id: "BSr_o0DkcY",
        type: "image",
        x: -632.3163020572464,
        y: -13.385395322935445,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 1350.5385069080946,
        height: 945.4244961877072,
        src: "https://images.unsplash.com/photo-1511994714008-b6d68a8b32a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwyNHx8c2FsYWR8ZW58MHx8fHwxNjIzMDMyNzU5&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9523330612184991,
        cropHeight: 1,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "fdf02QOtPt",
        type: "svg",
        x: -514.3719765754477,
        y: 699.4376698795058,
        rotation: -24.963760803149896,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0icmdiKDAsIDE2MSwgMjU1KSIgcG9pbnRzPSIwIDAsIDYwIDYwLCAwIDYwIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1388.686647534149,
        height: 1159.6295347199855,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(184,233,134,1)"
        }
      },
      {
        id: "RdIPRBsJ0U",
        type: "svg",
        x: 1411.8347773060088,
        y: 572.5690700289673,
        rotation: 165.68242607666906,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0icmdiKDAsIDE2MSwgMjU1KSIgcG9pbnRzPSIwIDAsIDYwIDYwLCAwIDYwIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1201.1057707841799,
        height: 1002.9892118550797,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(184,233,134,1)"
        }
      },
      {
        id: "xZJA-BN4Rk",
        type: "text",
        x: 396.9309573044726,
        y: 403.8339621759679,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Healthy",
        placeholder: "",
        fontSize: 141.50638812962544,
        fontFamily: "Dancing Script",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 611.307596855828,
        height: 169.80766575555052,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "zQSnMAaven",
        type: "text",
        x: 601.2382710521358,
        y: 540,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Everyday",
        placeholder: "",
        fontSize: 115,
        fontFamily: "Dancing Script",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "center",
        width: 478.76172894786424,
        height: 138,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "rxJFVqMnbn",
        type: "svg",
        x: 775.9997973733358,
        y: 113.34949198853936,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LnN0MHtmaWxsOiNGQzAwMDA7fSAuc3Qxe2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTQ5LjE2NyAzLjMxOGMtLjU2IDEuNjctMS4yNCA3LjQ0LTEuNDYgOS41Mi0uODEgOS40My0zLjE3IDE1LjEzLTMuMjcgMTUuMzctMS4xMyAyLjc2LTIuNiA1LjM1LTQuMzggNy42Ny00LjI4IDUuNTgtMTAuNzEgOC45Mi0xNy4yMSA4LjkyLS4zNyAwLS43NC0uMDEtMS4xMi0uMDMtNy4zNC0uNDItMTAuODctNC42OC0xMS4wMi00Ljg2LS4wNS0uMDYtLjEtLjEzLS4xNS0uMTktMi41IDIuOTctNC42MSA2LjIzLTUuODMgOS42Mi0uMTQuNDEtLjUzLjY2LS45NC42Ni0uMTEgMC0uMjItLjAyLS4zNC0uMDZhLjk5NC45OTQgMCAwIDEtLjYtMS4yOGMxLjM3LTMuOCAzLjcyLTcuMzggNi40Ny0xMC42Mi02LjgxLTEwLjE4LS43NS0xOS4zNy0uNjgtMTkuNDYgMS4xOC0xLjk2IDIuODMtMy44NiA0Ljg3LTUuNTggNC42Ni0zLjk1IDEwLjczLTYuMyAxNy4wOC02LjYyIDguODgtLjQ0IDE1Ljg4LTMuNjQgMTcuMTktNC4yOC4zNi0uMTcuNzktLjExIDEuMS4xNS4zLjI3LjQxLjY5LjI5IDEuMDd6IiBmaWxsPSIjRkMwMDAwIi8+PG1ldGFkYXRhPjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6cmRmcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wMS9yZGYtc2NoZW1hIyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIj48cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOmRlc2NyaXB0aW9uPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE3LTEyLTAzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5JY29uIFJpdmVyPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 50.013050592405605,
        height: 50.01305059240564,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FC0000": "rgba(65,117,5,1)"
        }
      },
      {
        id: "ASpfU_aMv5",
        type: "svg",
        x: 374.82590659498203,
        y: 26.90409584292908,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LnN0MHtmaWxsOiNGQzAwMDA7fSAuc3Qxe2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTQ5LjE2NyAzLjMxOGMtLjU2IDEuNjctMS4yNCA3LjQ0LTEuNDYgOS41Mi0uODEgOS40My0zLjE3IDE1LjEzLTMuMjcgMTUuMzctMS4xMyAyLjc2LTIuNiA1LjM1LTQuMzggNy42Ny00LjI4IDUuNTgtMTAuNzEgOC45Mi0xNy4yMSA4LjkyLS4zNyAwLS43NC0uMDEtMS4xMi0uMDMtNy4zNC0uNDItMTAuODctNC42OC0xMS4wMi00Ljg2LS4wNS0uMDYtLjEtLjEzLS4xNS0uMTktMi41IDIuOTctNC42MSA2LjIzLTUuODMgOS42Mi0uMTQuNDEtLjUzLjY2LS45NC42Ni0uMTEgMC0uMjItLjAyLS4zNC0uMDZhLjk5NC45OTQgMCAwIDEtLjYtMS4yOGMxLjM3LTMuOCAzLjcyLTcuMzggNi40Ny0xMC42Mi02LjgxLTEwLjE4LS43NS0xOS4zNy0uNjgtMTkuNDYgMS4xOC0xLjk2IDIuODMtMy44NiA0Ljg3LTUuNTggNC42Ni0zLjk1IDEwLjczLTYuMyAxNy4wOC02LjYyIDguODgtLjQ0IDE1Ljg4LTMuNjQgMTcuMTktNC4yOC4zNi0uMTcuNzktLjExIDEuMS4xNS4zLjI3LjQxLjY5LjI5IDEuMDd6IiBmaWxsPSIjRkMwMDAwIi8+PG1ldGFkYXRhPjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6cmRmcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wMS9yZGYtc2NoZW1hIyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIj48cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOmRlc2NyaXB0aW9uPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE3LTEyLTAzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5JY29uIFJpdmVyPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 40.8644413437761,
        height: 40.86444134377631,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FC0000": "rgba(65,117,5,1)"
        }
      },
      {
        id: "fmlVkxeXhf",
        type: "svg",
        x: 69.96134358163725,
        y: 904.0990017776455,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LnN0MHtmaWxsOiNGQzAwMDA7fSAuc3Qxe2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTQ5LjE2NyAzLjMxOGMtLjU2IDEuNjctMS4yNCA3LjQ0LTEuNDYgOS41Mi0uODEgOS40My0zLjE3IDE1LjEzLTMuMjcgMTUuMzctMS4xMyAyLjc2LTIuNiA1LjM1LTQuMzggNy42Ny00LjI4IDUuNTgtMTAuNzEgOC45Mi0xNy4yMSA4LjkyLS4zNyAwLS43NC0uMDEtMS4xMi0uMDMtNy4zNC0uNDItMTAuODctNC42OC0xMS4wMi00Ljg2LS4wNS0uMDYtLjEtLjEzLS4xNS0uMTktMi41IDIuOTctNC42MSA2LjIzLTUuODMgOS42Mi0uMTQuNDEtLjUzLjY2LS45NC42Ni0uMTEgMC0uMjItLjAyLS4zNC0uMDZhLjk5NC45OTQgMCAwIDEtLjYtMS4yOGMxLjM3LTMuOCAzLjcyLTcuMzggNi40Ny0xMC42Mi02LjgxLTEwLjE4LS43NS0xOS4zNy0uNjgtMTkuNDYgMS4xOC0xLjk2IDIuODMtMy44NiA0Ljg3LTUuNTggNC42Ni0zLjk1IDEwLjczLTYuMyAxNy4wOC02LjYyIDguODgtLjQ0IDE1Ljg4LTMuNjQgMTcuMTktNC4yOC4zNi0uMTcuNzktLjExIDEuMS4xNS4zLjI3LjQxLjY5LjI5IDEuMDd6IiBmaWxsPSIjRkMwMDAwIi8+PG1ldGFkYXRhPjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6cmRmcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wMS9yZGYtc2NoZW1hIyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIj48cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOmRlc2NyaXB0aW9uPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE3LTEyLTAzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5JY29uIFJpdmVyPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 44.31702900937199,
        height: 44.31702900937212,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FC0000": "rgba(65,117,5,1)"
        }
      },
      {
        id: "-HM-P54DmX",
        type: "svg",
        x: 658.2677267230147,
        y: 1011.9148476020566,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LnN0MHtmaWxsOiNGQzAwMDA7fSAuc3Qxe2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTQ5LjE2NyAzLjMxOGMtLjU2IDEuNjctMS4yNCA3LjQ0LTEuNDYgOS41Mi0uODEgOS40My0zLjE3IDE1LjEzLTMuMjcgMTUuMzctMS4xMyAyLjc2LTIuNiA1LjM1LTQuMzggNy42Ny00LjI4IDUuNTgtMTAuNzEgOC45Mi0xNy4yMSA4LjkyLS4zNyAwLS43NC0uMDEtMS4xMi0uMDMtNy4zNC0uNDItMTAuODctNC42OC0xMS4wMi00Ljg2LS4wNS0uMDYtLjEtLjEzLS4xNS0uMTktMi41IDIuOTctNC42MSA2LjIzLTUuODMgOS42Mi0uMTQuNDEtLjUzLjY2LS45NC42Ni0uMTEgMC0uMjItLjAyLS4zNC0uMDZhLjk5NC45OTQgMCAwIDEtLjYtMS4yOGMxLjM3LTMuOCAzLjcyLTcuMzggNi40Ny0xMC42Mi02LjgxLTEwLjE4LS43NS0xOS4zNy0uNjgtMTkuNDYgMS4xOC0xLjk2IDIuODMtMy44NiA0Ljg3LTUuNTggNC42Ni0zLjk1IDEwLjczLTYuMyAxNy4wOC02LjYyIDguODgtLjQ0IDE1Ljg4LTMuNjQgMTcuMTktNC4yOC4zNi0uMTcuNzktLjExIDEuMS4xNS4zLjI3LjQxLjY5LjI5IDEuMDd6IiBmaWxsPSIjRkMwMDAwIi8+PG1ldGFkYXRhPjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6cmRmcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wMS9yZGYtc2NoZW1hIyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIj48cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOmRlc2NyaXB0aW9uPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE3LTEyLTAzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5JY29uIFJpdmVyPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 44.31702900937199,
        height: 44.31702900937212,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FC0000": "rgba(65,117,5,1)"
        }
      },
      {
        id: "vZm4RaTQfh",
        type: "svg",
        x: 1035.682970990628,
        y: -13.385395322935437,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+LnN0MHtmaWxsOiNGQzAwMDA7fSAuc3Qxe2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTQ5LjE2NyAzLjMxOGMtLjU2IDEuNjctMS4yNCA3LjQ0LTEuNDYgOS41Mi0uODEgOS40My0zLjE3IDE1LjEzLTMuMjcgMTUuMzctMS4xMyAyLjc2LTIuNiA1LjM1LTQuMzggNy42Ny00LjI4IDUuNTgtMTAuNzEgOC45Mi0xNy4yMSA4LjkyLS4zNyAwLS43NC0uMDEtMS4xMi0uMDMtNy4zNC0uNDItMTAuODctNC42OC0xMS4wMi00Ljg2LS4wNS0uMDYtLjEtLjEzLS4xNS0uMTktMi41IDIuOTctNC42MSA2LjIzLTUuODMgOS42Mi0uMTQuNDEtLjUzLjY2LS45NC42Ni0uMTEgMC0uMjItLjAyLS4zNC0uMDZhLjk5NC45OTQgMCAwIDEtLjYtMS4yOGMxLjM3LTMuOCAzLjcyLTcuMzggNi40Ny0xMC42Mi02LjgxLTEwLjE4LS43NS0xOS4zNy0uNjgtMTkuNDYgMS4xOC0xLjk2IDIuODMtMy44NiA0Ljg3LTUuNTggNC42Ni0zLjk1IDEwLjczLTYuMyAxNy4wOC02LjYyIDguODgtLjQ0IDE1Ljg4LTMuNjQgMTcuMTktNC4yOC4zNi0uMTcuNzktLjExIDEuMS4xNS4zLjI3LjQxLjY5LjI5IDEuMDd6IiBmaWxsPSIjRkMwMDAwIi8+PG1ldGFkYXRhPjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM6cmRmcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wMS9yZGYtc2NoZW1hIyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIj48cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOmRlc2NyaXB0aW9uPSJlY28sbGVhZixuYXR1cmUsZ3JlZW4iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE3LTEyLTAzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5JY29uIFJpdmVyPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 44.31702900937199,
        height: 44.31702900937212,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#FC0000": "rgba(65,117,5,1)"
        }
      },
      {
        id: "Oo8SBLW4Mm",
        type: "svg",
        x: 640.4431535046551,
        y: 868.8717923750705,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 217.83264370992867,
        height: 76.15084390089021,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(240,191,149,1)"
        }
      },
      {
        id: "dCT-paZrFw",
        type: "text",
        x: 642.2378090948621,
        y: 888.5237069397696,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "ORDER NOW",
        placeholder: "",
        fontSize: 30.864138772243727,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "center",
        width: 208.33293672036118,
        height: 37.036966526692474,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "ySk2d9lsb9",
        type: "text",
        x: 490.8083537206665,
        y: 769.2573396919261,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Protein-rich wholesome food for the calorie conscious.",
        placeholder: "",
        fontSize: 28,
        fontFamily: "Roboto",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 544.8746172699616,
        height: 67.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "white"
  },
  {
    id: "qSYX6NpOwE",
    elements: [
      {
        id: "H54gEZDTyg",
        type: "svg",
        x: 7660624689725091e-28,
        y: 576.0064239828705,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1085.4724101590655,
        height: 500.37605041602484,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(112,150,71,1)"
        }
      },
      {
        id: "e9Xl-pVnpg",
        type: "image",
        x: 409.8589799303794,
        y: -175.76017130620932,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 670.1410200696207,
        height: 901.0245385005197,
        src: "https://images.unsplash.com/photo-1615800001716-c53dd05bf4b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwzMHx8Ym9ob3xlbnwwfHx8fDE2MjM3MjkwOTk&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9999999999999998,
        cropHeight: 0.896353166986567,
        flipX: false,
        flipY: false,
        borderColor: "rgba(255,255,255,1)",
        borderSize: 30
      },
      {
        id: "Imrvli3a33",
        type: "svg",
        x: 196.26630217965462,
        y: 196.26630217965317,
        rotation: 180,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0icmdiKDAsIDE2MSwgMjU1KSIgcG9pbnRzPSIwIDAsIDYwIDYwLCAwIDYwIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 196.26630217965314,
        height: 196.26630217965305,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(243,181,126,1)"
        }
      },
      {
        id: "CDh_rdRu0o",
        type: "svg",
        x: 926.0572057113403,
        y: 655.7140262067328,
        rotation: -90.00000000000003,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0icmdiKDAsIDE2MSwgMjU1KSIgcG9pbnRzPSIwIDAsIDYwIDYwLCAwIDYwIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 159.41520444772593,
        height: 159.41520444772587,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(243,181,126,1)"
        }
      },
      {
        id: "TMHuueyHAN",
        type: "svg",
        x: 799.1727543368323,
        y: 788.7065928815641,
        rotation: -90.00000000000001,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0ibm9uZSIgcG9pbnRzPSIyIDIsIDU4IDU4LCAyIDU4IiBzdHJva2U9InJnYmEoOTgsIDE5NywgMjU1LCAxKSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 126.88445137450749,
        height: 126.88445137450752,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgba(98, 197, 255, 1)": "rgba(255,255,255,1)"
        }
      },
      {
        id: "sIWR8d2sKk",
        type: "svg",
        x: 1085.4724101590657,
        y: 1145.8808632074906,
        rotation: 180,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHBvbHlnb24gZmlsbD0icmdiKDAsIDE2MSwgMjU1KSIgcG9pbnRzPSIwIDAsIDYwIDYwLCAwIDYwIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 196.26630217965314,
        height: 196.26630217965305,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(243,181,126,1)"
        }
      },
      {
        id: "hcqn8sibFr",
        type: "text",
        x: 59.5503211991452,
        y: 239.2443494097269,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "greeny\ncollection",
        placeholder: "",
        fontSize: 97.7932807194055,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(66,116,9,1)",
        align: "left",
        width: 557.9618081708206,
        height: 215.14521758269217,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.1000000000000003,
        letterSpacing: 0
      },
      {
        id: "ArXnJQ5Psq",
        type: "svg",
        x: 80.05139186295709,
        y: 614.3149636040121,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik04LjUsMTdjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwxNyw4LjUsMTd6IE0xNS41LDdjMS4xLDAsMi0wLjksMi0ycy0wLjktMi0yLTJzLTIsMC45LTIsMlMxNC40LDcsMTUuNSw3eiBNOC41LDEwYy0xLjEsMC0yLDAuOS0yLDJzMC45LDIsMiwyczItMC45LDItMlM5LjYsMTAsOC41LDEweiBNMTUuNSwxMGMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxMCwxNS41LDEweiBNMTUuNSwxN2MtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxNywxNS41LDE3eiBNOC41LDNjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwzLDguNSwzeiIvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 75.23900642171094,
        height: 75.23900642171097,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(139,87,42,1)"
        }
      },
      {
        id: "EjRrSkwYvw",
        type: "svg",
        x: 128.67665952891036,
        y: 614.0945229958775,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik04LjUsMTdjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwxNyw4LjUsMTd6IE0xNS41LDdjMS4xLDAsMi0wLjksMi0ycy0wLjktMi0yLTJzLTIsMC45LTIsMlMxNC40LDcsMTUuNSw3eiBNOC41LDEwYy0xLjEsMC0yLDAuOS0yLDJzMC45LDIsMiwyczItMC45LDItMlM5LjYsMTAsOC41LDEweiBNMTUuNSwxMGMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxMCwxNS41LDEweiBNMTUuNSwxN2MtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxNywxNS41LDE3eiBNOC41LDNjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwzLDguNSwzeiIvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 75.23900642171094,
        height: 75.23900642171097,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(139,87,42,1)"
        }
      },
      {
        id: "uJ0gtAldYF",
        type: "svg",
        x: 175.30192719486342,
        y: 614.3149636040121,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik04LjUsMTdjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwxNyw4LjUsMTd6IE0xNS41LDdjMS4xLDAsMi0wLjksMi0ycy0wLjktMi0yLTJzLTIsMC45LTIsMlMxNC40LDcsMTUuNSw3eiBNOC41LDEwYy0xLjEsMC0yLDAuOS0yLDJzMC45LDIsMiwyczItMC45LDItMlM5LjYsMTAsOC41LDEweiBNMTUuNSwxMGMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxMCwxNS41LDEweiBNMTUuNSwxN2MtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxNywxNS41LDE3eiBNOC41LDNjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwzLDguNSwzeiIvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 75.23900642171094,
        height: 75.23900642171097,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(139,87,42,1)"
        }
      },
      {
        id: "LbihhmQjGL",
        type: "svg",
        x: 222.92143040571887,
        y: 614.0945229958775,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik04LjUsMTdjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwxNyw4LjUsMTd6IE0xNS41LDdjMS4xLDAsMi0wLjksMi0ycy0wLjktMi0yLTJzLTIsMC45LTIsMlMxNC40LDcsMTUuNSw3eiBNOC41LDEwYy0xLjEsMC0yLDAuOS0yLDJzMC45LDIsMiwyczItMC45LDItMlM5LjYsMTAsOC41LDEweiBNMTUuNSwxMGMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxMCwxNS41LDEweiBNMTUuNSwxN2MtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMnMyLTAuOSwyLTJTMTYuNiwxNywxNS41LDE3eiBNOC41LDNjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzkuNiwzLDguNSwzeiIvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 75.23900642171094,
        height: 75.23900642171097,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(139,87,42,1)"
        }
      },
      {
        id: "I5xMJgKC3w",
        type: "text",
        x: 98.13315108982788,
        y: 881.6190777860934,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore",
        placeholder: "",
        fontSize: 29,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(29,16,3,1)",
        align: "left",
        width: 653.7986092576795,
        height: 104.39999999999999,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "Q0Na3gaHdC",
        type: "svg",
        x: 112.66727194633856,
        y: 774.9009812377171,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 280.6539818836993,
        height: 59.38527484622791,
        borderColor: "rgba(51,27,6,1)",
        borderSize: 2,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(240,176,121,1)"
        }
      },
      {
        id: "MrzoD6TS-V",
        type: "text",
        x: 101.13315108982788,
        y: 786.8063417577862,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "GET 25% OFF",
        placeholder: "",
        fontSize: 33,
        fontFamily: "Alata",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(39,20,3,1)",
        align: "center",
        width: 295.99777767196616,
        height: 39.6,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(248,245,196,1)",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_124047.png?v=1740467524"
  },
  {
    id: "Y6Yw5ueikx",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_124151.png?v=1740467524",
    elements: [
      {
        id: "HRWojOXfLC",
        type: "svg",
        x: 4545842287999012e-27,
        y: 507.3150347614394,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 1097.5996324444384,
        height: 594.4776812249281,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(194,149,109,1)"
        }
      },
      {
        id: "wO0e-PZ8Is",
        type: "text",
        x: 4.435617538107703,
        y: 144.73103323443746,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Free Shipping",
        placeholder: "",
        fontSize: 112,
        fontFamily: "Galada",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(61,29,3,1)",
        align: "center",
        width: 1076.781336852396,
        height: 134.4,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "lQl51W5MsY",
        type: "image",
        x: 140.661419843368,
        y: 427.852898116,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 814.4674994322816,
        height: 543.6570558710482,
        src: "https://images.unsplash.com/photo-1552373438-9be21778554d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw5NHx8c29hcHxlbnwwfHx8fDE2MjMwMzU0OTI&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.999999999999999,
        cropHeight: 0.9998613037447984,
        flipX: false,
        flipY: false,
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "Ic69Uft4tC",
        type: "svg",
        x: -8.95612208381229,
        y: 105.2981978199234,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC05OTIgLTY5MikiPjxnIGZpbGw9IiMwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTkyMi4yMzYsNjQ0LjM2MyBDOTE3LjI1Niw2NDEuOTg5IDkxMS4xMzQsNjM1LjI4MSA5MDguMTE5LDYyNy4xNzYgQzkwNy44ODEsNjI2LjUzNiA5MDcuNjYyLDYyNS44ODggOTA3LjQ2OSw2MjUuMjMxIEM5MDcuMDIsNjIzLjcwMiA5MDYuNjk4LDYyMi4xMzIgOTA2LjUxNiw2MjAuNTQ0IEM5MDUuOTMsNjE1LjQ0NyA5MDYuODEsNjEwLjE2NSA5MDkuOTksNjA1LjMyOCBMOTEwLjIwNyw2MDQuOTg5IEw5MTAuMzM2LDYwNS4zNzEgQzkxMC45ODQsNjA3LjA0NyA5MTEuOTMzLDYwOC40OTcgOTEzLjA0Miw2MDkuODM2IEM5MTMuMTQ5LDYwOS45NjUgOTEzLjI1OSw2MTAuMDkxIDkxMy4zNjUsNjEwLjIyMSBDOTEzLjYxMyw2MTAuNTIyIDkxMy44NTgsNjEwLjgyOCA5MTQuMTE2LDYxMS4xMjQgQzkxNy40ODIsNjE0Ljk4MyA5MjIuMDMxLDYxOC4wNDEgOTI0LjkxOCw2MjIuMDcgQzkyNS43NjMsNjIzLjI1IDkyNi40OCw2MjQuNTA2IDkyNi45NzcsNjI1Ljg5OSBDOTI4LjQwNiw2MjkuOTExIDkyOC4wODEsNjM1LjAzIDkyNC4yNjgsNjQyLjMzOCBDOTI0LjY5Nyw2NDIuMiA5MjUuMjYxLDY0Mi4wMTMgOTI1Ljk0LDY0MS43OTcgQzkzMC44NzQsNjQwLjIyNiA5NDEuNzYsNjM3LjE1OSA5NTAuODE4LDYzOS43MjkgQzk1MS41NDQsNjM5LjkzNSA5NTIuMjU4LDY0MC4xNzkgOTUyLjk1OSw2NDAuNDU2IEM5NTQuMDA4LDY0MC44NzEgOTU1LjAyOCw2NDEuMzY2IDk1Niw2NDEuOTY2IEM5NTkuMzUxLDY0NC4wMzcgOTYyLjE1MSw2NDcuMzE3IDk2My44NjYsNjUyLjMyMSBMOTY0LjA5OSw2NTMuMDI2IEw5NjMuMzY4LDY1Mi44OTEgQzk2MS40NDgsNjUyLjUyNSA5NTkuMzIzLDY1Mi44MjQgOTU2Ljk2MSw2NTMuMjc5IEM5NTIuNjQ3LDY1NC4xMDggOTQ3LjU2Nyw2NTUuNDU2IDk0MS41NSw2NTQuNTg4IEM5MzguMzQ3LDY1NC4xMjYgOTM0Ljg4Niw2NTMuMDI0IDkzMS4xMTMsNjUwLjkwMSBDOTI4LjMzMSw2NDkuMzM2IDkyNS4zNjksNjQ3LjIyNiA5MjIuMjM2LDY0NC4zNjMgWiBNOTEwLjA5NCw2MDUuOTAxIEM5MDcuMzA0LDYxMC41OSA5MDYuNjQsNjE1LjYxNyA5MDcuMzAxLDYyMC40NDYgQzkwNy41MTIsNjIxLjk4MyA5MDcuODYxLDYyMy40OTkgOTA4LjMwOCw2MjQuOTgyIEM5MDguNSw2MjUuNjE5IDkwOC43MDgsNjI2LjI1MiA5MDguOTM1LDYyNi44NzYgQzkxMS44MjYsNjM0LjgyOCA5MTcuNjk5LDY0MS40ODEgOTIyLjUzNyw2NDMuODM2IEw5MjIuNjEyLDY0My44ODcgQzkyNS42OTIsNjQ2Ljc2NCA5MjguNTk2LDY0OC45MTYgOTMxLjM1NSw2NTAuNDcxIEM5MzUuMDU4LDY1Mi41NTcgOTM4LjQ4Miw2NTMuNTg1IDk0MS42MzEsNjU0LjAwMiBDOTQ3LjU3Myw2NTQuNzg5IDk1Mi41Niw2NTMuMzUzIDk1Ni44MDMsNjUyLjQ4MyBDOTU4Ljk4Nyw2NTIuMDM2IDk2MC45OCw2NTEuNzM5IDk2Mi44MDcsNjUxLjkyNiBDOTYxLjIzOSw2NDcuNDQ4IDk1OC43MTcsNjQ0LjQzMSA5NTUuNjgxLDY0Mi40NzIgQzk1NC43NSw2NDEuODcxIDk1My43NzQsNjQxLjM2NSA5NTIuNzU5LDY0MC45NTYgQzk1Mi4wNzgsNjQwLjY4MiA5NTEuMzc5LDY0MC40NTMgOTUwLjY3LDY0MC4yNTkgQzk0MS43Myw2MzcuODAyIDkzMS4wNDEsNjQwLjk5OSA5MjYuMTk4LDY0Mi41OTUgQzkyNS4wMjEsNjQyLjk4NCA5MjQuMTgyLDY0My4yNzkgOTIzLjc5LDY0My4zODUgQzkyMy42MDksNjQzLjQzNCA5MjMuNDg0LDY0My40NDQgOTIzLjQyNCw2NDMuNDQgQzkyMy4yNjcsNjQzLjQyOCA5MjMuMTc1LDY0My4zNTYgOTIzLjExOSw2NDMuMjk3IEM5MjMuMDA4LDY0My4xOCA5MjIuOTE5LDY0MyA5MjMuMDYzLDY0Mi43NiBDOTI3LjI0MSw2MzUuMzE0IDkyNy43NDUsNjMwLjE1NCA5MjYuMzU4LDYyNi4xMTYgQzkyNS44OTcsNjI0Ljc3NSA5MjUuMjM4LDYyMy41NTMgOTI0LjQyNCw2MjIuNDI0IEM5MjEuNTM1LDYxOC40MTYgOTE2Ljg5LDYxNS40ODkgOTEzLjQ2Niw2MTEuNzAxIEM5MTMuMTkzLDYxMS40IDkxMi45MjEsNjExLjA5OCA5MTIuNjcxLDYxMC43NzkgQzkxMi41NjMsNjEwLjY0MiA5MTIuNDYxLDYxMC41IDkxMi4zNjEsNjEwLjM1OCBDOTExLjM5OCw2MDguOTk4IDkxMC42MTQsNjA3LjUzIDkxMC4wOTQsNjA1LjkwMSBaIi8+PHBhdGggZD0iTTk2Mi42NzQgNjAwLjI2N0M5NTkuNzI3IDYwMi40IDk1NC4zNjcgNjAzLjMwNSA5NDguOTI0IDYwNC43NTMgOTQ0LjA2IDYwNi4wNDcgOTM5LjEzMyA2MDcuNzc0IDkzNS43MzkgNjExLjEwMiA5MzIuODIzIDYxMy45NjEgOTMxLjAxNCA2MTcuOTk1IDkzMS4zMzYgNjIzLjkzNCA5MzEuNDMzIDYyNS43MDcgOTMxLjcyNSA2MjcuNjUyIDkzMi4yMzMgNjI5Ljc4OEw5MzIuNTMzIDYzMC4xMzVDOTM0LjgwNCA2MzEuMDM1IDkzOC41NzUgNjMxLjUxNyA5NDIuNzEyIDYzMC45MDkgOTQ3LjI3MSA2MzAuMjM5IDk1Mi4yODEgNjI4LjI1OCA5NTYuMTkgNjI0LjEyNyA5NjAuNjMzIDYxOS40MzIgOTYzLjY2NCA2MTEuOTM5IDk2Mi45NDkgNjAwLjM5N0w5NjIuNjc0IDYwMC4yNjd6TTk2Mi42MTcgNjAwLjczM0M5NTkuNjMgNjAyLjgxMSA5NTQuMzk3IDYwMy44MyA5NDkuMDg1IDYwNS4zMzggOTQ0LjM2OCA2MDYuNjc4IDkzOS41ODggNjA4LjQwNiA5MzYuMzI0IDYxMS42OSA5MzMuNjAxIDYxNC40MyA5MzEuOTY0IDYxOC4yNjMgOTMyLjMxIDYyMy44NzggOTMyLjQxMiA2MjUuNTI3IDkzMi42OCA2MjcuMzI4IDkzMy4xNDMgNjI5LjI5OSA5MzUuMzE4IDYzMC4xMDIgOTM4Ljc4MiA2MzAuNDkgOTQyLjU3NyA2MjkuOTYyIDk0Ni45NyA2MjkuMzUxIDk1MS44MDQgNjI3LjUwNSA5NTUuNjI0IDYyMy41ODMgOTYwLjAwNSA2MTkuMDg0IDk2My4wNDkgNjExLjg4MiA5NjIuNjE3IDYwMC43MzN6TTkyMy4wNjkgNjQzLjkzOEM5MjMuODg0IDY0My45MTIgOTI1LjU4IDY0My44OCA5MjcuODI0IDY0My45NjEgOTMwLjAzIDY0NC4wNDEgOTMyLjc2NiA2NDQuMjMxIDkzNS43MTEgNjQ0LjYyOCA5MzkuODU2IDY0NS4xODUgOTQ0LjQxMSA2NDYuMTYxIDk0OC40OTYgNjQ3Ljc3MyA5NDguNTg1IDY0Ny44MDYgOTQ4LjYzIDY0Ny45MDUgOTQ4LjU5NyA2NDcuOTk0IDk0OC41NjQgNjQ4LjA4NCA5NDguNDY0IDY0OC4xMjkgOTQ4LjM3NSA2NDguMDk1IDk0NC4yNzYgNjQ2LjY0MyA5MzkuNzMyIDY0NS44NjYgOTM1LjYxNSA2NDUuNDMgOTMyLjY4OSA2NDUuMTIgOTI5Ljk3OSA2NDQuOTkgOTI3Ljc5NCA2NDQuOTM3IDkyNC42MzcgNjQ0Ljg2IDkyMi41ODMgNjQ0Ljk0OSA5MjIuNTgzIDY0NC45NDlMOTIyLjAzMSA2NDQuOTc2IDkyMi4wNjQgNjQ0LjQyNEM5MjIuMDY0IDY0NC40MjQgOTIyLjIwNSA2NDIuMjYgOTIxLjkyMyA2MzguOTIzIDkyMS43ODggNjM3LjMyNyA5MjEuNTYgNjM1LjQ2NCA5MjEuMTcxIDYzMy40NCA5MjAuNTQ3IDYzMC4xOTIgOTE5LjUxOSA2MjYuNTMxIDkxNy44IDYyMi44OTkgOTE3Ljc1OCA2MjIuODE0IDkxNy43OTIgNjIyLjcxIDkxNy44NzggNjIyLjY2OCA5MTcuOTYzIDYyMi42MjYgOTE4LjA2NiA2MjIuNjYxIDkxOC4xMDkgNjIyLjc0NiA5MTkuOTc4IDYyNi4zNTkgOTIxLjE1OSA2MzAuMDIzIDkyMS44OTQgNjMzLjI4OSA5MjIuMzUzIDYzNS4zMzMgOTIyLjYzOCA2MzcuMjE5IDkyMi44MTIgNjM4LjgzOCA5MjMuMDcxIDY0MS4yNTcgOTIzLjA4NCA2NDMuMDc5IDkyMy4wNjkgNjQzLjkzOHoiLz48cGF0aCBkPSJNOTA4Ljk5NCw2NjkuNjg2IEM5MDguOTk0LDY2OS42ODYgOTEwLjY0NSw2NjYuNzIyIDkxMy4zMjMsNjYyLjA1NiBDOTE0LjU4NCw2NTkuODU5IDkxNi4wNzUsNjU3LjI4NyA5MTcuNzE1LDY1NC40NjEgQzkyMS42MDcsNjQ3Ljc1NSA5MjYuNDA0LDYzOS42NTkgOTMxLjY2Miw2MzIuMTY3IEM5MzguMDAzLDYyMy4xMyA5NDQuOTEsNjE0LjkxNCA5NTEuMzMsNjEwLjkwNiBDOTUxLjQ5Myw2MTAuODA3IDk1MS41NDUsNjEwLjU5NSA5NTEuNDQ2LDYxMC40MzIgQzk1MS4zNDgsNjEwLjI2OSA5NTEuMTM1LDYxMC4yMTcgOTUwLjk3Myw2MTAuMzE2IEM5NDQuMzY1LDYxNC4yMDcgOTM3LjEyLDYyMi4zMTcgOTMwLjQ4Myw2MzEuMzE5IEM5MjUuMDE4LDYzOC43MzMgOTE5LjksNjQ2LjcwOCA5MTUuOTg1LDY1My40NTcgQzkxNC4zMzcsNjU2LjI5OSA5MTIuOTE0LDY1OC45MjggOTExLjczNCw2NjEuMTg0IEM5MDkuMjIzLDY2NS45OCA5MDcuODE4LDY2OS4wOTUgOTA3LjgxOCw2NjkuMDk1IEM5MDcuNjU1LDY2OS40MTkgOTA3Ljc4Niw2NjkuODE1IDkwOC4xMSw2NjkuOTc4IEM5MDguNDM1LDY3MC4xNDEgOTA4LjgzMSw2NzAuMDEgOTA4Ljk5NCw2NjkuNjg2IFoiLz48L2c+PC9nPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 244.3507253448381,
        height: 244.35072534483842,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(95,47,6,1)",
          "#000": "rgba(95,47,6,1)"
        }
      },
      {
        id: "Z8Xc8dVN74",
        type: "svg",
        x: 82.04202173376274,
        y: 252.37299181689303,
        rotation: 44.99999999999998,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC05OTIgLTY5MikiPjxnIGZpbGw9IiMwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTkyMi4yMzYsNjQ0LjM2MyBDOTE3LjI1Niw2NDEuOTg5IDkxMS4xMzQsNjM1LjI4MSA5MDguMTE5LDYyNy4xNzYgQzkwNy44ODEsNjI2LjUzNiA5MDcuNjYyLDYyNS44ODggOTA3LjQ2OSw2MjUuMjMxIEM5MDcuMDIsNjIzLjcwMiA5MDYuNjk4LDYyMi4xMzIgOTA2LjUxNiw2MjAuNTQ0IEM5MDUuOTMsNjE1LjQ0NyA5MDYuODEsNjEwLjE2NSA5MDkuOTksNjA1LjMyOCBMOTEwLjIwNyw2MDQuOTg5IEw5MTAuMzM2LDYwNS4zNzEgQzkxMC45ODQsNjA3LjA0NyA5MTEuOTMzLDYwOC40OTcgOTEzLjA0Miw2MDkuODM2IEM5MTMuMTQ5LDYwOS45NjUgOTEzLjI1OSw2MTAuMDkxIDkxMy4zNjUsNjEwLjIyMSBDOTEzLjYxMyw2MTAuNTIyIDkxMy44NTgsNjEwLjgyOCA5MTQuMTE2LDYxMS4xMjQgQzkxNy40ODIsNjE0Ljk4MyA5MjIuMDMxLDYxOC4wNDEgOTI0LjkxOCw2MjIuMDcgQzkyNS43NjMsNjIzLjI1IDkyNi40OCw2MjQuNTA2IDkyNi45NzcsNjI1Ljg5OSBDOTI4LjQwNiw2MjkuOTExIDkyOC4wODEsNjM1LjAzIDkyNC4yNjgsNjQyLjMzOCBDOTI0LjY5Nyw2NDIuMiA5MjUuMjYxLDY0Mi4wMTMgOTI1Ljk0LDY0MS43OTcgQzkzMC44NzQsNjQwLjIyNiA5NDEuNzYsNjM3LjE1OSA5NTAuODE4LDYzOS43MjkgQzk1MS41NDQsNjM5LjkzNSA5NTIuMjU4LDY0MC4xNzkgOTUyLjk1OSw2NDAuNDU2IEM5NTQuMDA4LDY0MC44NzEgOTU1LjAyOCw2NDEuMzY2IDk1Niw2NDEuOTY2IEM5NTkuMzUxLDY0NC4wMzcgOTYyLjE1MSw2NDcuMzE3IDk2My44NjYsNjUyLjMyMSBMOTY0LjA5OSw2NTMuMDI2IEw5NjMuMzY4LDY1Mi44OTEgQzk2MS40NDgsNjUyLjUyNSA5NTkuMzIzLDY1Mi44MjQgOTU2Ljk2MSw2NTMuMjc5IEM5NTIuNjQ3LDY1NC4xMDggOTQ3LjU2Nyw2NTUuNDU2IDk0MS41NSw2NTQuNTg4IEM5MzguMzQ3LDY1NC4xMjYgOTM0Ljg4Niw2NTMuMDI0IDkzMS4xMTMsNjUwLjkwMSBDOTI4LjMzMSw2NDkuMzM2IDkyNS4zNjksNjQ3LjIyNiA5MjIuMjM2LDY0NC4zNjMgWiBNOTEwLjA5NCw2MDUuOTAxIEM5MDcuMzA0LDYxMC41OSA5MDYuNjQsNjE1LjYxNyA5MDcuMzAxLDYyMC40NDYgQzkwNy41MTIsNjIxLjk4MyA5MDcuODYxLDYyMy40OTkgOTA4LjMwOCw2MjQuOTgyIEM5MDguNSw2MjUuNjE5IDkwOC43MDgsNjI2LjI1MiA5MDguOTM1LDYyNi44NzYgQzkxMS44MjYsNjM0LjgyOCA5MTcuNjk5LDY0MS40ODEgOTIyLjUzNyw2NDMuODM2IEw5MjIuNjEyLDY0My44ODcgQzkyNS42OTIsNjQ2Ljc2NCA5MjguNTk2LDY0OC45MTYgOTMxLjM1NSw2NTAuNDcxIEM5MzUuMDU4LDY1Mi41NTcgOTM4LjQ4Miw2NTMuNTg1IDk0MS42MzEsNjU0LjAwMiBDOTQ3LjU3Myw2NTQuNzg5IDk1Mi41Niw2NTMuMzUzIDk1Ni44MDMsNjUyLjQ4MyBDOTU4Ljk4Nyw2NTIuMDM2IDk2MC45OCw2NTEuNzM5IDk2Mi44MDcsNjUxLjkyNiBDOTYxLjIzOSw2NDcuNDQ4IDk1OC43MTcsNjQ0LjQzMSA5NTUuNjgxLDY0Mi40NzIgQzk1NC43NSw2NDEuODcxIDk1My43NzQsNjQxLjM2NSA5NTIuNzU5LDY0MC45NTYgQzk1Mi4wNzgsNjQwLjY4MiA5NTEuMzc5LDY0MC40NTMgOTUwLjY3LDY0MC4yNTkgQzk0MS43Myw2MzcuODAyIDkzMS4wNDEsNjQwLjk5OSA5MjYuMTk4LDY0Mi41OTUgQzkyNS4wMjEsNjQyLjk4NCA5MjQuMTgyLDY0My4yNzkgOTIzLjc5LDY0My4zODUgQzkyMy42MDksNjQzLjQzNCA5MjMuNDg0LDY0My40NDQgOTIzLjQyNCw2NDMuNDQgQzkyMy4yNjcsNjQzLjQyOCA5MjMuMTc1LDY0My4zNTYgOTIzLjExOSw2NDMuMjk3IEM5MjMuMDA4LDY0My4xOCA5MjIuOTE5LDY0MyA5MjMuMDYzLDY0Mi43NiBDOTI3LjI0MSw2MzUuMzE0IDkyNy43NDUsNjMwLjE1NCA5MjYuMzU4LDYyNi4xMTYgQzkyNS44OTcsNjI0Ljc3NSA5MjUuMjM4LDYyMy41NTMgOTI0LjQyNCw2MjIuNDI0IEM5MjEuNTM1LDYxOC40MTYgOTE2Ljg5LDYxNS40ODkgOTEzLjQ2Niw2MTEuNzAxIEM5MTMuMTkzLDYxMS40IDkxMi45MjEsNjExLjA5OCA5MTIuNjcxLDYxMC43NzkgQzkxMi41NjMsNjEwLjY0MiA5MTIuNDYxLDYxMC41IDkxMi4zNjEsNjEwLjM1OCBDOTExLjM5OCw2MDguOTk4IDkxMC42MTQsNjA3LjUzIDkxMC4wOTQsNjA1LjkwMSBaIi8+PHBhdGggZD0iTTk2Mi42NzQgNjAwLjI2N0M5NTkuNzI3IDYwMi40IDk1NC4zNjcgNjAzLjMwNSA5NDguOTI0IDYwNC43NTMgOTQ0LjA2IDYwNi4wNDcgOTM5LjEzMyA2MDcuNzc0IDkzNS43MzkgNjExLjEwMiA5MzIuODIzIDYxMy45NjEgOTMxLjAxNCA2MTcuOTk1IDkzMS4zMzYgNjIzLjkzNCA5MzEuNDMzIDYyNS43MDcgOTMxLjcyNSA2MjcuNjUyIDkzMi4yMzMgNjI5Ljc4OEw5MzIuNTMzIDYzMC4xMzVDOTM0LjgwNCA2MzEuMDM1IDkzOC41NzUgNjMxLjUxNyA5NDIuNzEyIDYzMC45MDkgOTQ3LjI3MSA2MzAuMjM5IDk1Mi4yODEgNjI4LjI1OCA5NTYuMTkgNjI0LjEyNyA5NjAuNjMzIDYxOS40MzIgOTYzLjY2NCA2MTEuOTM5IDk2Mi45NDkgNjAwLjM5N0w5NjIuNjc0IDYwMC4yNjd6TTk2Mi42MTcgNjAwLjczM0M5NTkuNjMgNjAyLjgxMSA5NTQuMzk3IDYwMy44MyA5NDkuMDg1IDYwNS4zMzggOTQ0LjM2OCA2MDYuNjc4IDkzOS41ODggNjA4LjQwNiA5MzYuMzI0IDYxMS42OSA5MzMuNjAxIDYxNC40MyA5MzEuOTY0IDYxOC4yNjMgOTMyLjMxIDYyMy44NzggOTMyLjQxMiA2MjUuNTI3IDkzMi42OCA2MjcuMzI4IDkzMy4xNDMgNjI5LjI5OSA5MzUuMzE4IDYzMC4xMDIgOTM4Ljc4MiA2MzAuNDkgOTQyLjU3NyA2MjkuOTYyIDk0Ni45NyA2MjkuMzUxIDk1MS44MDQgNjI3LjUwNSA5NTUuNjI0IDYyMy41ODMgOTYwLjAwNSA2MTkuMDg0IDk2My4wNDkgNjExLjg4MiA5NjIuNjE3IDYwMC43MzN6TTkyMy4wNjkgNjQzLjkzOEM5MjMuODg0IDY0My45MTIgOTI1LjU4IDY0My44OCA5MjcuODI0IDY0My45NjEgOTMwLjAzIDY0NC4wNDEgOTMyLjc2NiA2NDQuMjMxIDkzNS43MTEgNjQ0LjYyOCA5MzkuODU2IDY0NS4xODUgOTQ0LjQxMSA2NDYuMTYxIDk0OC40OTYgNjQ3Ljc3MyA5NDguNTg1IDY0Ny44MDYgOTQ4LjYzIDY0Ny45MDUgOTQ4LjU5NyA2NDcuOTk0IDk0OC41NjQgNjQ4LjA4NCA5NDguNDY0IDY0OC4xMjkgOTQ4LjM3NSA2NDguMDk1IDk0NC4yNzYgNjQ2LjY0MyA5MzkuNzMyIDY0NS44NjYgOTM1LjYxNSA2NDUuNDMgOTMyLjY4OSA2NDUuMTIgOTI5Ljk3OSA2NDQuOTkgOTI3Ljc5NCA2NDQuOTM3IDkyNC42MzcgNjQ0Ljg2IDkyMi41ODMgNjQ0Ljk0OSA5MjIuNTgzIDY0NC45NDlMOTIyLjAzMSA2NDQuOTc2IDkyMi4wNjQgNjQ0LjQyNEM5MjIuMDY0IDY0NC40MjQgOTIyLjIwNSA2NDIuMjYgOTIxLjkyMyA2MzguOTIzIDkyMS43ODggNjM3LjMyNyA5MjEuNTYgNjM1LjQ2NCA5MjEuMTcxIDYzMy40NCA5MjAuNTQ3IDYzMC4xOTIgOTE5LjUxOSA2MjYuNTMxIDkxNy44IDYyMi44OTkgOTE3Ljc1OCA2MjIuODE0IDkxNy43OTIgNjIyLjcxIDkxNy44NzggNjIyLjY2OCA5MTcuOTYzIDYyMi42MjYgOTE4LjA2NiA2MjIuNjYxIDkxOC4xMDkgNjIyLjc0NiA5MTkuOTc4IDYyNi4zNTkgOTIxLjE1OSA2MzAuMDIzIDkyMS44OTQgNjMzLjI4OSA5MjIuMzUzIDYzNS4zMzMgOTIyLjYzOCA2MzcuMjE5IDkyMi44MTIgNjM4LjgzOCA5MjMuMDcxIDY0MS4yNTcgOTIzLjA4NCA2NDMuMDc5IDkyMy4wNjkgNjQzLjkzOHoiLz48cGF0aCBkPSJNOTA4Ljk5NCw2NjkuNjg2IEM5MDguOTk0LDY2OS42ODYgOTEwLjY0NSw2NjYuNzIyIDkxMy4zMjMsNjYyLjA1NiBDOTE0LjU4NCw2NTkuODU5IDkxNi4wNzUsNjU3LjI4NyA5MTcuNzE1LDY1NC40NjEgQzkyMS42MDcsNjQ3Ljc1NSA5MjYuNDA0LDYzOS42NTkgOTMxLjY2Miw2MzIuMTY3IEM5MzguMDAzLDYyMy4xMyA5NDQuOTEsNjE0LjkxNCA5NTEuMzMsNjEwLjkwNiBDOTUxLjQ5Myw2MTAuODA3IDk1MS41NDUsNjEwLjU5NSA5NTEuNDQ2LDYxMC40MzIgQzk1MS4zNDgsNjEwLjI2OSA5NTEuMTM1LDYxMC4yMTcgOTUwLjk3Myw2MTAuMzE2IEM5NDQuMzY1LDYxNC4yMDcgOTM3LjEyLDYyMi4zMTcgOTMwLjQ4Myw2MzEuMzE5IEM5MjUuMDE4LDYzOC43MzMgOTE5LjksNjQ2LjcwOCA5MTUuOTg1LDY1My40NTcgQzkxNC4zMzcsNjU2LjI5OSA5MTIuOTE0LDY1OC45MjggOTExLjczNCw2NjEuMTg0IEM5MDkuMjIzLDY2NS45OCA5MDcuODE4LDY2OS4wOTUgOTA3LjgxOCw2NjkuMDk1IEM5MDcuNjU1LDY2OS40MTkgOTA3Ljc4Niw2NjkuODE1IDkwOC4xMSw2NjkuOTc4IEM5MDguNDM1LDY3MC4xNDEgOTA4LjgzMSw2NzAuMDEgOTA4Ljk5NCw2NjkuNjg2IFoiLz48L2c+PC9nPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128.69080913759277,
        height: 128.6908091375927,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(95,47,6,1)",
          "#000": "rgba(95,47,6,1)"
        }
      },
      {
        id: "1RflOZ8wPz",
        type: "svg",
        x: 19.23873864972839,
        y: 23.124905315633463,
        rotation: -17.863303505488958,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC05OTIgLTY5MikiPjxnIGZpbGw9IiMwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTkyMi4yMzYsNjQ0LjM2MyBDOTE3LjI1Niw2NDEuOTg5IDkxMS4xMzQsNjM1LjI4MSA5MDguMTE5LDYyNy4xNzYgQzkwNy44ODEsNjI2LjUzNiA5MDcuNjYyLDYyNS44ODggOTA3LjQ2OSw2MjUuMjMxIEM5MDcuMDIsNjIzLjcwMiA5MDYuNjk4LDYyMi4xMzIgOTA2LjUxNiw2MjAuNTQ0IEM5MDUuOTMsNjE1LjQ0NyA5MDYuODEsNjEwLjE2NSA5MDkuOTksNjA1LjMyOCBMOTEwLjIwNyw2MDQuOTg5IEw5MTAuMzM2LDYwNS4zNzEgQzkxMC45ODQsNjA3LjA0NyA5MTEuOTMzLDYwOC40OTcgOTEzLjA0Miw2MDkuODM2IEM5MTMuMTQ5LDYwOS45NjUgOTEzLjI1OSw2MTAuMDkxIDkxMy4zNjUsNjEwLjIyMSBDOTEzLjYxMyw2MTAuNTIyIDkxMy44NTgsNjEwLjgyOCA5MTQuMTE2LDYxMS4xMjQgQzkxNy40ODIsNjE0Ljk4MyA5MjIuMDMxLDYxOC4wNDEgOTI0LjkxOCw2MjIuMDcgQzkyNS43NjMsNjIzLjI1IDkyNi40OCw2MjQuNTA2IDkyNi45NzcsNjI1Ljg5OSBDOTI4LjQwNiw2MjkuOTExIDkyOC4wODEsNjM1LjAzIDkyNC4yNjgsNjQyLjMzOCBDOTI0LjY5Nyw2NDIuMiA5MjUuMjYxLDY0Mi4wMTMgOTI1Ljk0LDY0MS43OTcgQzkzMC44NzQsNjQwLjIyNiA5NDEuNzYsNjM3LjE1OSA5NTAuODE4LDYzOS43MjkgQzk1MS41NDQsNjM5LjkzNSA5NTIuMjU4LDY0MC4xNzkgOTUyLjk1OSw2NDAuNDU2IEM5NTQuMDA4LDY0MC44NzEgOTU1LjAyOCw2NDEuMzY2IDk1Niw2NDEuOTY2IEM5NTkuMzUxLDY0NC4wMzcgOTYyLjE1MSw2NDcuMzE3IDk2My44NjYsNjUyLjMyMSBMOTY0LjA5OSw2NTMuMDI2IEw5NjMuMzY4LDY1Mi44OTEgQzk2MS40NDgsNjUyLjUyNSA5NTkuMzIzLDY1Mi44MjQgOTU2Ljk2MSw2NTMuMjc5IEM5NTIuNjQ3LDY1NC4xMDggOTQ3LjU2Nyw2NTUuNDU2IDk0MS41NSw2NTQuNTg4IEM5MzguMzQ3LDY1NC4xMjYgOTM0Ljg4Niw2NTMuMDI0IDkzMS4xMTMsNjUwLjkwMSBDOTI4LjMzMSw2NDkuMzM2IDkyNS4zNjksNjQ3LjIyNiA5MjIuMjM2LDY0NC4zNjMgWiBNOTEwLjA5NCw2MDUuOTAxIEM5MDcuMzA0LDYxMC41OSA5MDYuNjQsNjE1LjYxNyA5MDcuMzAxLDYyMC40NDYgQzkwNy41MTIsNjIxLjk4MyA5MDcuODYxLDYyMy40OTkgOTA4LjMwOCw2MjQuOTgyIEM5MDguNSw2MjUuNjE5IDkwOC43MDgsNjI2LjI1MiA5MDguOTM1LDYyNi44NzYgQzkxMS44MjYsNjM0LjgyOCA5MTcuNjk5LDY0MS40ODEgOTIyLjUzNyw2NDMuODM2IEw5MjIuNjEyLDY0My44ODcgQzkyNS42OTIsNjQ2Ljc2NCA5MjguNTk2LDY0OC45MTYgOTMxLjM1NSw2NTAuNDcxIEM5MzUuMDU4LDY1Mi41NTcgOTM4LjQ4Miw2NTMuNTg1IDk0MS42MzEsNjU0LjAwMiBDOTQ3LjU3Myw2NTQuNzg5IDk1Mi41Niw2NTMuMzUzIDk1Ni44MDMsNjUyLjQ4MyBDOTU4Ljk4Nyw2NTIuMDM2IDk2MC45OCw2NTEuNzM5IDk2Mi44MDcsNjUxLjkyNiBDOTYxLjIzOSw2NDcuNDQ4IDk1OC43MTcsNjQ0LjQzMSA5NTUuNjgxLDY0Mi40NzIgQzk1NC43NSw2NDEuODcxIDk1My43NzQsNjQxLjM2NSA5NTIuNzU5LDY0MC45NTYgQzk1Mi4wNzgsNjQwLjY4MiA5NTEuMzc5LDY0MC40NTMgOTUwLjY3LDY0MC4yNTkgQzk0MS43Myw2MzcuODAyIDkzMS4wNDEsNjQwLjk5OSA5MjYuMTk4LDY0Mi41OTUgQzkyNS4wMjEsNjQyLjk4NCA5MjQuMTgyLDY0My4yNzkgOTIzLjc5LDY0My4zODUgQzkyMy42MDksNjQzLjQzNCA5MjMuNDg0LDY0My40NDQgOTIzLjQyNCw2NDMuNDQgQzkyMy4yNjcsNjQzLjQyOCA5MjMuMTc1LDY0My4zNTYgOTIzLjExOSw2NDMuMjk3IEM5MjMuMDA4LDY0My4xOCA5MjIuOTE5LDY0MyA5MjMuMDYzLDY0Mi43NiBDOTI3LjI0MSw2MzUuMzE0IDkyNy43NDUsNjMwLjE1NCA5MjYuMzU4LDYyNi4xMTYgQzkyNS44OTcsNjI0Ljc3NSA5MjUuMjM4LDYyMy41NTMgOTI0LjQyNCw2MjIuNDI0IEM5MjEuNTM1LDYxOC40MTYgOTE2Ljg5LDYxNS40ODkgOTEzLjQ2Niw2MTEuNzAxIEM5MTMuMTkzLDYxMS40IDkxMi45MjEsNjExLjA5OCA5MTIuNjcxLDYxMC43NzkgQzkxMi41NjMsNjEwLjY0MiA5MTIuNDYxLDYxMC41IDkxMi4zNjEsNjEwLjM1OCBDOTExLjM5OCw2MDguOTk4IDkxMC42MTQsNjA3LjUzIDkxMC4wOTQsNjA1LjkwMSBaIi8+PHBhdGggZD0iTTk2Mi42NzQgNjAwLjI2N0M5NTkuNzI3IDYwMi40IDk1NC4zNjcgNjAzLjMwNSA5NDguOTI0IDYwNC43NTMgOTQ0LjA2IDYwNi4wNDcgOTM5LjEzMyA2MDcuNzc0IDkzNS43MzkgNjExLjEwMiA5MzIuODIzIDYxMy45NjEgOTMxLjAxNCA2MTcuOTk1IDkzMS4zMzYgNjIzLjkzNCA5MzEuNDMzIDYyNS43MDcgOTMxLjcyNSA2MjcuNjUyIDkzMi4yMzMgNjI5Ljc4OEw5MzIuNTMzIDYzMC4xMzVDOTM0LjgwNCA2MzEuMDM1IDkzOC41NzUgNjMxLjUxNyA5NDIuNzEyIDYzMC45MDkgOTQ3LjI3MSA2MzAuMjM5IDk1Mi4yODEgNjI4LjI1OCA5NTYuMTkgNjI0LjEyNyA5NjAuNjMzIDYxOS40MzIgOTYzLjY2NCA2MTEuOTM5IDk2Mi45NDkgNjAwLjM5N0w5NjIuNjc0IDYwMC4yNjd6TTk2Mi42MTcgNjAwLjczM0M5NTkuNjMgNjAyLjgxMSA5NTQuMzk3IDYwMy44MyA5NDkuMDg1IDYwNS4zMzggOTQ0LjM2OCA2MDYuNjc4IDkzOS41ODggNjA4LjQwNiA5MzYuMzI0IDYxMS42OSA5MzMuNjAxIDYxNC40MyA5MzEuOTY0IDYxOC4yNjMgOTMyLjMxIDYyMy44NzggOTMyLjQxMiA2MjUuNTI3IDkzMi42OCA2MjcuMzI4IDkzMy4xNDMgNjI5LjI5OSA5MzUuMzE4IDYzMC4xMDIgOTM4Ljc4MiA2MzAuNDkgOTQyLjU3NyA2MjkuOTYyIDk0Ni45NyA2MjkuMzUxIDk1MS44MDQgNjI3LjUwNSA5NTUuNjI0IDYyMy41ODMgOTYwLjAwNSA2MTkuMDg0IDk2My4wNDkgNjExLjg4MiA5NjIuNjE3IDYwMC43MzN6TTkyMy4wNjkgNjQzLjkzOEM5MjMuODg0IDY0My45MTIgOTI1LjU4IDY0My44OCA5MjcuODI0IDY0My45NjEgOTMwLjAzIDY0NC4wNDEgOTMyLjc2NiA2NDQuMjMxIDkzNS43MTEgNjQ0LjYyOCA5MzkuODU2IDY0NS4xODUgOTQ0LjQxMSA2NDYuMTYxIDk0OC40OTYgNjQ3Ljc3MyA5NDguNTg1IDY0Ny44MDYgOTQ4LjYzIDY0Ny45MDUgOTQ4LjU5NyA2NDcuOTk0IDk0OC41NjQgNjQ4LjA4NCA5NDguNDY0IDY0OC4xMjkgOTQ4LjM3NSA2NDguMDk1IDk0NC4yNzYgNjQ2LjY0MyA5MzkuNzMyIDY0NS44NjYgOTM1LjYxNSA2NDUuNDMgOTMyLjY4OSA2NDUuMTIgOTI5Ljk3OSA2NDQuOTkgOTI3Ljc5NCA2NDQuOTM3IDkyNC42MzcgNjQ0Ljg2IDkyMi41ODMgNjQ0Ljk0OSA5MjIuNTgzIDY0NC45NDlMOTIyLjAzMSA2NDQuOTc2IDkyMi4wNjQgNjQ0LjQyNEM5MjIuMDY0IDY0NC40MjQgOTIyLjIwNSA2NDIuMjYgOTIxLjkyMyA2MzguOTIzIDkyMS43ODggNjM3LjMyNyA5MjEuNTYgNjM1LjQ2NCA5MjEuMTcxIDYzMy40NCA5MjAuNTQ3IDYzMC4xOTIgOTE5LjUxOSA2MjYuNTMxIDkxNy44IDYyMi44OTkgOTE3Ljc1OCA2MjIuODE0IDkxNy43OTIgNjIyLjcxIDkxNy44NzggNjIyLjY2OCA5MTcuOTYzIDYyMi42MjYgOTE4LjA2NiA2MjIuNjYxIDkxOC4xMDkgNjIyLjc0NiA5MTkuOTc4IDYyNi4zNTkgOTIxLjE1OSA2MzAuMDIzIDkyMS44OTQgNjMzLjI4OSA5MjIuMzUzIDYzNS4zMzMgOTIyLjYzOCA2MzcuMjE5IDkyMi44MTIgNjM4LjgzOCA5MjMuMDcxIDY0MS4yNTcgOTIzLjA4NCA2NDMuMDc5IDkyMy4wNjkgNjQzLjkzOHoiLz48cGF0aCBkPSJNOTA4Ljk5NCw2NjkuNjg2IEM5MDguOTk0LDY2OS42ODYgOTEwLjY0NSw2NjYuNzIyIDkxMy4zMjMsNjYyLjA1NiBDOTE0LjU4NCw2NTkuODU5IDkxNi4wNzUsNjU3LjI4NyA5MTcuNzE1LDY1NC40NjEgQzkyMS42MDcsNjQ3Ljc1NSA5MjYuNDA0LDYzOS42NTkgOTMxLjY2Miw2MzIuMTY3IEM5MzguMDAzLDYyMy4xMyA5NDQuOTEsNjE0LjkxNCA5NTEuMzMsNjEwLjkwNiBDOTUxLjQ5Myw2MTAuODA3IDk1MS41NDUsNjEwLjU5NSA5NTEuNDQ2LDYxMC40MzIgQzk1MS4zNDgsNjEwLjI2OSA5NTEuMTM1LDYxMC4yMTcgOTUwLjk3Myw2MTAuMzE2IEM5NDQuMzY1LDYxNC4yMDcgOTM3LjEyLDYyMi4zMTcgOTMwLjQ4Myw2MzEuMzE5IEM5MjUuMDE4LDYzOC43MzMgOTE5LjksNjQ2LjcwOCA5MTUuOTg1LDY1My40NTcgQzkxNC4zMzcsNjU2LjI5OSA5MTIuOTE0LDY1OC45MjggOTExLjczNCw2NjEuMTg0IEM5MDkuMjIzLDY2NS45OCA5MDcuODE4LDY2OS4wOTUgOTA3LjgxOCw2NjkuMDk1IEM5MDcuNjU1LDY2OS40MTkgOTA3Ljc4Niw2NjkuODE1IDkwOC4xMSw2NjkuOTc4IEM5MDguNDM1LDY3MC4xNDEgOTA4LjgzMSw2NzAuMDEgOTA4Ljk5NCw2NjkuNjg2IFoiLz48L2c+PC9nPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 171.75153997588012,
        height: 171.7515399758802,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(95,47,6,1)",
          "#000": "rgba(95,47,6,1)"
        }
      },
      {
        id: "LvE7XKXF2B",
        type: "svg",
        x: 835.1414929919007,
        y: 319.2540905140096,
        rotation: -80.13190766758532,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC05OTIgLTY5MikiPjxnIGZpbGw9IiMwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTkyMi4yMzYsNjQ0LjM2MyBDOTE3LjI1Niw2NDEuOTg5IDkxMS4xMzQsNjM1LjI4MSA5MDguMTE5LDYyNy4xNzYgQzkwNy44ODEsNjI2LjUzNiA5MDcuNjYyLDYyNS44ODggOTA3LjQ2OSw2MjUuMjMxIEM5MDcuMDIsNjIzLjcwMiA5MDYuNjk4LDYyMi4xMzIgOTA2LjUxNiw2MjAuNTQ0IEM5MDUuOTMsNjE1LjQ0NyA5MDYuODEsNjEwLjE2NSA5MDkuOTksNjA1LjMyOCBMOTEwLjIwNyw2MDQuOTg5IEw5MTAuMzM2LDYwNS4zNzEgQzkxMC45ODQsNjA3LjA0NyA5MTEuOTMzLDYwOC40OTcgOTEzLjA0Miw2MDkuODM2IEM5MTMuMTQ5LDYwOS45NjUgOTEzLjI1OSw2MTAuMDkxIDkxMy4zNjUsNjEwLjIyMSBDOTEzLjYxMyw2MTAuNTIyIDkxMy44NTgsNjEwLjgyOCA5MTQuMTE2LDYxMS4xMjQgQzkxNy40ODIsNjE0Ljk4MyA5MjIuMDMxLDYxOC4wNDEgOTI0LjkxOCw2MjIuMDcgQzkyNS43NjMsNjIzLjI1IDkyNi40OCw2MjQuNTA2IDkyNi45NzcsNjI1Ljg5OSBDOTI4LjQwNiw2MjkuOTExIDkyOC4wODEsNjM1LjAzIDkyNC4yNjgsNjQyLjMzOCBDOTI0LjY5Nyw2NDIuMiA5MjUuMjYxLDY0Mi4wMTMgOTI1Ljk0LDY0MS43OTcgQzkzMC44NzQsNjQwLjIyNiA5NDEuNzYsNjM3LjE1OSA5NTAuODE4LDYzOS43MjkgQzk1MS41NDQsNjM5LjkzNSA5NTIuMjU4LDY0MC4xNzkgOTUyLjk1OSw2NDAuNDU2IEM5NTQuMDA4LDY0MC44NzEgOTU1LjAyOCw2NDEuMzY2IDk1Niw2NDEuOTY2IEM5NTkuMzUxLDY0NC4wMzcgOTYyLjE1MSw2NDcuMzE3IDk2My44NjYsNjUyLjMyMSBMOTY0LjA5OSw2NTMuMDI2IEw5NjMuMzY4LDY1Mi44OTEgQzk2MS40NDgsNjUyLjUyNSA5NTkuMzIzLDY1Mi44MjQgOTU2Ljk2MSw2NTMuMjc5IEM5NTIuNjQ3LDY1NC4xMDggOTQ3LjU2Nyw2NTUuNDU2IDk0MS41NSw2NTQuNTg4IEM5MzguMzQ3LDY1NC4xMjYgOTM0Ljg4Niw2NTMuMDI0IDkzMS4xMTMsNjUwLjkwMSBDOTI4LjMzMSw2NDkuMzM2IDkyNS4zNjksNjQ3LjIyNiA5MjIuMjM2LDY0NC4zNjMgWiBNOTEwLjA5NCw2MDUuOTAxIEM5MDcuMzA0LDYxMC41OSA5MDYuNjQsNjE1LjYxNyA5MDcuMzAxLDYyMC40NDYgQzkwNy41MTIsNjIxLjk4MyA5MDcuODYxLDYyMy40OTkgOTA4LjMwOCw2MjQuOTgyIEM5MDguNSw2MjUuNjE5IDkwOC43MDgsNjI2LjI1MiA5MDguOTM1LDYyNi44NzYgQzkxMS44MjYsNjM0LjgyOCA5MTcuNjk5LDY0MS40ODEgOTIyLjUzNyw2NDMuODM2IEw5MjIuNjEyLDY0My44ODcgQzkyNS42OTIsNjQ2Ljc2NCA5MjguNTk2LDY0OC45MTYgOTMxLjM1NSw2NTAuNDcxIEM5MzUuMDU4LDY1Mi41NTcgOTM4LjQ4Miw2NTMuNTg1IDk0MS42MzEsNjU0LjAwMiBDOTQ3LjU3Myw2NTQuNzg5IDk1Mi41Niw2NTMuMzUzIDk1Ni44MDMsNjUyLjQ4MyBDOTU4Ljk4Nyw2NTIuMDM2IDk2MC45OCw2NTEuNzM5IDk2Mi44MDcsNjUxLjkyNiBDOTYxLjIzOSw2NDcuNDQ4IDk1OC43MTcsNjQ0LjQzMSA5NTUuNjgxLDY0Mi40NzIgQzk1NC43NSw2NDEuODcxIDk1My43NzQsNjQxLjM2NSA5NTIuNzU5LDY0MC45NTYgQzk1Mi4wNzgsNjQwLjY4MiA5NTEuMzc5LDY0MC40NTMgOTUwLjY3LDY0MC4yNTkgQzk0MS43Myw2MzcuODAyIDkzMS4wNDEsNjQwLjk5OSA5MjYuMTk4LDY0Mi41OTUgQzkyNS4wMjEsNjQyLjk4NCA5MjQuMTgyLDY0My4yNzkgOTIzLjc5LDY0My4zODUgQzkyMy42MDksNjQzLjQzNCA5MjMuNDg0LDY0My40NDQgOTIzLjQyNCw2NDMuNDQgQzkyMy4yNjcsNjQzLjQyOCA5MjMuMTc1LDY0My4zNTYgOTIzLjExOSw2NDMuMjk3IEM5MjMuMDA4LDY0My4xOCA5MjIuOTE5LDY0MyA5MjMuMDYzLDY0Mi43NiBDOTI3LjI0MSw2MzUuMzE0IDkyNy43NDUsNjMwLjE1NCA5MjYuMzU4LDYyNi4xMTYgQzkyNS44OTcsNjI0Ljc3NSA5MjUuMjM4LDYyMy41NTMgOTI0LjQyNCw2MjIuNDI0IEM5MjEuNTM1LDYxOC40MTYgOTE2Ljg5LDYxNS40ODkgOTEzLjQ2Niw2MTEuNzAxIEM5MTMuMTkzLDYxMS40IDkxMi45MjEsNjExLjA5OCA5MTIuNjcxLDYxMC43NzkgQzkxMi41NjMsNjEwLjY0MiA5MTIuNDYxLDYxMC41IDkxMi4zNjEsNjEwLjM1OCBDOTExLjM5OCw2MDguOTk4IDkxMC42MTQsNjA3LjUzIDkxMC4wOTQsNjA1LjkwMSBaIi8+PHBhdGggZD0iTTk2Mi42NzQgNjAwLjI2N0M5NTkuNzI3IDYwMi40IDk1NC4zNjcgNjAzLjMwNSA5NDguOTI0IDYwNC43NTMgOTQ0LjA2IDYwNi4wNDcgOTM5LjEzMyA2MDcuNzc0IDkzNS43MzkgNjExLjEwMiA5MzIuODIzIDYxMy45NjEgOTMxLjAxNCA2MTcuOTk1IDkzMS4zMzYgNjIzLjkzNCA5MzEuNDMzIDYyNS43MDcgOTMxLjcyNSA2MjcuNjUyIDkzMi4yMzMgNjI5Ljc4OEw5MzIuNTMzIDYzMC4xMzVDOTM0LjgwNCA2MzEuMDM1IDkzOC41NzUgNjMxLjUxNyA5NDIuNzEyIDYzMC45MDkgOTQ3LjI3MSA2MzAuMjM5IDk1Mi4yODEgNjI4LjI1OCA5NTYuMTkgNjI0LjEyNyA5NjAuNjMzIDYxOS40MzIgOTYzLjY2NCA2MTEuOTM5IDk2Mi45NDkgNjAwLjM5N0w5NjIuNjc0IDYwMC4yNjd6TTk2Mi42MTcgNjAwLjczM0M5NTkuNjMgNjAyLjgxMSA5NTQuMzk3IDYwMy44MyA5NDkuMDg1IDYwNS4zMzggOTQ0LjM2OCA2MDYuNjc4IDkzOS41ODggNjA4LjQwNiA5MzYuMzI0IDYxMS42OSA5MzMuNjAxIDYxNC40MyA5MzEuOTY0IDYxOC4yNjMgOTMyLjMxIDYyMy44NzggOTMyLjQxMiA2MjUuNTI3IDkzMi42OCA2MjcuMzI4IDkzMy4xNDMgNjI5LjI5OSA5MzUuMzE4IDYzMC4xMDIgOTM4Ljc4MiA2MzAuNDkgOTQyLjU3NyA2MjkuOTYyIDk0Ni45NyA2MjkuMzUxIDk1MS44MDQgNjI3LjUwNSA5NTUuNjI0IDYyMy41ODMgOTYwLjAwNSA2MTkuMDg0IDk2My4wNDkgNjExLjg4MiA5NjIuNjE3IDYwMC43MzN6TTkyMy4wNjkgNjQzLjkzOEM5MjMuODg0IDY0My45MTIgOTI1LjU4IDY0My44OCA5MjcuODI0IDY0My45NjEgOTMwLjAzIDY0NC4wNDEgOTMyLjc2NiA2NDQuMjMxIDkzNS43MTEgNjQ0LjYyOCA5MzkuODU2IDY0NS4xODUgOTQ0LjQxMSA2NDYuMTYxIDk0OC40OTYgNjQ3Ljc3MyA5NDguNTg1IDY0Ny44MDYgOTQ4LjYzIDY0Ny45MDUgOTQ4LjU5NyA2NDcuOTk0IDk0OC41NjQgNjQ4LjA4NCA5NDguNDY0IDY0OC4xMjkgOTQ4LjM3NSA2NDguMDk1IDk0NC4yNzYgNjQ2LjY0MyA5MzkuNzMyIDY0NS44NjYgOTM1LjYxNSA2NDUuNDMgOTMyLjY4OSA2NDUuMTIgOTI5Ljk3OSA2NDQuOTkgOTI3Ljc5NCA2NDQuOTM3IDkyNC42MzcgNjQ0Ljg2IDkyMi41ODMgNjQ0Ljk0OSA5MjIuNTgzIDY0NC45NDlMOTIyLjAzMSA2NDQuOTc2IDkyMi4wNjQgNjQ0LjQyNEM5MjIuMDY0IDY0NC40MjQgOTIyLjIwNSA2NDIuMjYgOTIxLjkyMyA2MzguOTIzIDkyMS43ODggNjM3LjMyNyA5MjEuNTYgNjM1LjQ2NCA5MjEuMTcxIDYzMy40NCA5MjAuNTQ3IDYzMC4xOTIgOTE5LjUxOSA2MjYuNTMxIDkxNy44IDYyMi44OTkgOTE3Ljc1OCA2MjIuODE0IDkxNy43OTIgNjIyLjcxIDkxNy44NzggNjIyLjY2OCA5MTcuOTYzIDYyMi42MjYgOTE4LjA2NiA2MjIuNjYxIDkxOC4xMDkgNjIyLjc0NiA5MTkuOTc4IDYyNi4zNTkgOTIxLjE1OSA2MzAuMDIzIDkyMS44OTQgNjMzLjI4OSA5MjIuMzUzIDYzNS4zMzMgOTIyLjYzOCA2MzcuMjE5IDkyMi44MTIgNjM4LjgzOCA5MjMuMDcxIDY0MS4yNTcgOTIzLjA4NCA2NDMuMDc5IDkyMy4wNjkgNjQzLjkzOHoiLz48cGF0aCBkPSJNOTA4Ljk5NCw2NjkuNjg2IEM5MDguOTk0LDY2OS42ODYgOTEwLjY0NSw2NjYuNzIyIDkxMy4zMjMsNjYyLjA1NiBDOTE0LjU4NCw2NTkuODU5IDkxNi4wNzUsNjU3LjI4NyA5MTcuNzE1LDY1NC40NjEgQzkyMS42MDcsNjQ3Ljc1NSA5MjYuNDA0LDYzOS42NTkgOTMxLjY2Miw2MzIuMTY3IEM5MzguMDAzLDYyMy4xMyA5NDQuOTEsNjE0LjkxNCA5NTEuMzMsNjEwLjkwNiBDOTUxLjQ5Myw2MTAuODA3IDk1MS41NDUsNjEwLjU5NSA5NTEuNDQ2LDYxMC40MzIgQzk1MS4zNDgsNjEwLjI2OSA5NTEuMTM1LDYxMC4yMTcgOTUwLjk3Myw2MTAuMzE2IEM5NDQuMzY1LDYxNC4yMDcgOTM3LjEyLDYyMi4zMTcgOTMwLjQ4Myw2MzEuMzE5IEM5MjUuMDE4LDYzOC43MzMgOTE5LjksNjQ2LjcwOCA5MTUuOTg1LDY1My40NTcgQzkxNC4zMzcsNjU2LjI5OSA5MTIuOTE0LDY1OC45MjggOTExLjczNCw2NjEuMTg0IEM5MDkuMjIzLDY2NS45OCA5MDcuODE4LDY2OS4wOTUgOTA3LjgxOCw2NjkuMDk1IEM5MDcuNjU1LDY2OS40MTkgOTA3Ljc4Niw2NjkuODE1IDkwOC4xMSw2NjkuOTc4IEM5MDguNDM1LDY3MC4xNDEgOTA4LjgzMSw2NzAuMDEgOTA4Ljk5NCw2NjkuNjg2IFoiLz48L2c+PC9nPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 244.3507253448381,
        height: 244.35072534483842,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(95,47,6,1)",
          "#000": "rgba(95,47,6,1)"
        }
      },
      {
        id: "qdK2CbudcC",
        type: "svg",
        x: 901.5981078315652,
        y: 23.12490531563334,
        rotation: -17.863303505488958,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC05OTIgLTY5MikiPjxnIGZpbGw9IiMwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTkyMi4yMzYsNjQ0LjM2MyBDOTE3LjI1Niw2NDEuOTg5IDkxMS4xMzQsNjM1LjI4MSA5MDguMTE5LDYyNy4xNzYgQzkwNy44ODEsNjI2LjUzNiA5MDcuNjYyLDYyNS44ODggOTA3LjQ2OSw2MjUuMjMxIEM5MDcuMDIsNjIzLjcwMiA5MDYuNjk4LDYyMi4xMzIgOTA2LjUxNiw2MjAuNTQ0IEM5MDUuOTMsNjE1LjQ0NyA5MDYuODEsNjEwLjE2NSA5MDkuOTksNjA1LjMyOCBMOTEwLjIwNyw2MDQuOTg5IEw5MTAuMzM2LDYwNS4zNzEgQzkxMC45ODQsNjA3LjA0NyA5MTEuOTMzLDYwOC40OTcgOTEzLjA0Miw2MDkuODM2IEM5MTMuMTQ5LDYwOS45NjUgOTEzLjI1OSw2MTAuMDkxIDkxMy4zNjUsNjEwLjIyMSBDOTEzLjYxMyw2MTAuNTIyIDkxMy44NTgsNjEwLjgyOCA5MTQuMTE2LDYxMS4xMjQgQzkxNy40ODIsNjE0Ljk4MyA5MjIuMDMxLDYxOC4wNDEgOTI0LjkxOCw2MjIuMDcgQzkyNS43NjMsNjIzLjI1IDkyNi40OCw2MjQuNTA2IDkyNi45NzcsNjI1Ljg5OSBDOTI4LjQwNiw2MjkuOTExIDkyOC4wODEsNjM1LjAzIDkyNC4yNjgsNjQyLjMzOCBDOTI0LjY5Nyw2NDIuMiA5MjUuMjYxLDY0Mi4wMTMgOTI1Ljk0LDY0MS43OTcgQzkzMC44NzQsNjQwLjIyNiA5NDEuNzYsNjM3LjE1OSA5NTAuODE4LDYzOS43MjkgQzk1MS41NDQsNjM5LjkzNSA5NTIuMjU4LDY0MC4xNzkgOTUyLjk1OSw2NDAuNDU2IEM5NTQuMDA4LDY0MC44NzEgOTU1LjAyOCw2NDEuMzY2IDk1Niw2NDEuOTY2IEM5NTkuMzUxLDY0NC4wMzcgOTYyLjE1MSw2NDcuMzE3IDk2My44NjYsNjUyLjMyMSBMOTY0LjA5OSw2NTMuMDI2IEw5NjMuMzY4LDY1Mi44OTEgQzk2MS40NDgsNjUyLjUyNSA5NTkuMzIzLDY1Mi44MjQgOTU2Ljk2MSw2NTMuMjc5IEM5NTIuNjQ3LDY1NC4xMDggOTQ3LjU2Nyw2NTUuNDU2IDk0MS41NSw2NTQuNTg4IEM5MzguMzQ3LDY1NC4xMjYgOTM0Ljg4Niw2NTMuMDI0IDkzMS4xMTMsNjUwLjkwMSBDOTI4LjMzMSw2NDkuMzM2IDkyNS4zNjksNjQ3LjIyNiA5MjIuMjM2LDY0NC4zNjMgWiBNOTEwLjA5NCw2MDUuOTAxIEM5MDcuMzA0LDYxMC41OSA5MDYuNjQsNjE1LjYxNyA5MDcuMzAxLDYyMC40NDYgQzkwNy41MTIsNjIxLjk4MyA5MDcuODYxLDYyMy40OTkgOTA4LjMwOCw2MjQuOTgyIEM5MDguNSw2MjUuNjE5IDkwOC43MDgsNjI2LjI1MiA5MDguOTM1LDYyNi44NzYgQzkxMS44MjYsNjM0LjgyOCA5MTcuNjk5LDY0MS40ODEgOTIyLjUzNyw2NDMuODM2IEw5MjIuNjEyLDY0My44ODcgQzkyNS42OTIsNjQ2Ljc2NCA5MjguNTk2LDY0OC45MTYgOTMxLjM1NSw2NTAuNDcxIEM5MzUuMDU4LDY1Mi41NTcgOTM4LjQ4Miw2NTMuNTg1IDk0MS42MzEsNjU0LjAwMiBDOTQ3LjU3Myw2NTQuNzg5IDk1Mi41Niw2NTMuMzUzIDk1Ni44MDMsNjUyLjQ4MyBDOTU4Ljk4Nyw2NTIuMDM2IDk2MC45OCw2NTEuNzM5IDk2Mi44MDcsNjUxLjkyNiBDOTYxLjIzOSw2NDcuNDQ4IDk1OC43MTcsNjQ0LjQzMSA5NTUuNjgxLDY0Mi40NzIgQzk1NC43NSw2NDEuODcxIDk1My43NzQsNjQxLjM2NSA5NTIuNzU5LDY0MC45NTYgQzk1Mi4wNzgsNjQwLjY4MiA5NTEuMzc5LDY0MC40NTMgOTUwLjY3LDY0MC4yNTkgQzk0MS43Myw2MzcuODAyIDkzMS4wNDEsNjQwLjk5OSA5MjYuMTk4LDY0Mi41OTUgQzkyNS4wMjEsNjQyLjk4NCA5MjQuMTgyLDY0My4yNzkgOTIzLjc5LDY0My4zODUgQzkyMy42MDksNjQzLjQzNCA5MjMuNDg0LDY0My40NDQgOTIzLjQyNCw2NDMuNDQgQzkyMy4yNjcsNjQzLjQyOCA5MjMuMTc1LDY0My4zNTYgOTIzLjExOSw2NDMuMjk3IEM5MjMuMDA4LDY0My4xOCA5MjIuOTE5LDY0MyA5MjMuMDYzLDY0Mi43NiBDOTI3LjI0MSw2MzUuMzE0IDkyNy43NDUsNjMwLjE1NCA5MjYuMzU4LDYyNi4xMTYgQzkyNS44OTcsNjI0Ljc3NSA5MjUuMjM4LDYyMy41NTMgOTI0LjQyNCw2MjIuNDI0IEM5MjEuNTM1LDYxOC40MTYgOTE2Ljg5LDYxNS40ODkgOTEzLjQ2Niw2MTEuNzAxIEM5MTMuMTkzLDYxMS40IDkxMi45MjEsNjExLjA5OCA5MTIuNjcxLDYxMC43NzkgQzkxMi41NjMsNjEwLjY0MiA5MTIuNDYxLDYxMC41IDkxMi4zNjEsNjEwLjM1OCBDOTExLjM5OCw2MDguOTk4IDkxMC42MTQsNjA3LjUzIDkxMC4wOTQsNjA1LjkwMSBaIi8+PHBhdGggZD0iTTk2Mi42NzQgNjAwLjI2N0M5NTkuNzI3IDYwMi40IDk1NC4zNjcgNjAzLjMwNSA5NDguOTI0IDYwNC43NTMgOTQ0LjA2IDYwNi4wNDcgOTM5LjEzMyA2MDcuNzc0IDkzNS43MzkgNjExLjEwMiA5MzIuODIzIDYxMy45NjEgOTMxLjAxNCA2MTcuOTk1IDkzMS4zMzYgNjIzLjkzNCA5MzEuNDMzIDYyNS43MDcgOTMxLjcyNSA2MjcuNjUyIDkzMi4yMzMgNjI5Ljc4OEw5MzIuNTMzIDYzMC4xMzVDOTM0LjgwNCA2MzEuMDM1IDkzOC41NzUgNjMxLjUxNyA5NDIuNzEyIDYzMC45MDkgOTQ3LjI3MSA2MzAuMjM5IDk1Mi4yODEgNjI4LjI1OCA5NTYuMTkgNjI0LjEyNyA5NjAuNjMzIDYxOS40MzIgOTYzLjY2NCA2MTEuOTM5IDk2Mi45NDkgNjAwLjM5N0w5NjIuNjc0IDYwMC4yNjd6TTk2Mi42MTcgNjAwLjczM0M5NTkuNjMgNjAyLjgxMSA5NTQuMzk3IDYwMy44MyA5NDkuMDg1IDYwNS4zMzggOTQ0LjM2OCA2MDYuNjc4IDkzOS41ODggNjA4LjQwNiA5MzYuMzI0IDYxMS42OSA5MzMuNjAxIDYxNC40MyA5MzEuOTY0IDYxOC4yNjMgOTMyLjMxIDYyMy44NzggOTMyLjQxMiA2MjUuNTI3IDkzMi42OCA2MjcuMzI4IDkzMy4xNDMgNjI5LjI5OSA5MzUuMzE4IDYzMC4xMDIgOTM4Ljc4MiA2MzAuNDkgOTQyLjU3NyA2MjkuOTYyIDk0Ni45NyA2MjkuMzUxIDk1MS44MDQgNjI3LjUwNSA5NTUuNjI0IDYyMy41ODMgOTYwLjAwNSA2MTkuMDg0IDk2My4wNDkgNjExLjg4MiA5NjIuNjE3IDYwMC43MzN6TTkyMy4wNjkgNjQzLjkzOEM5MjMuODg0IDY0My45MTIgOTI1LjU4IDY0My44OCA5MjcuODI0IDY0My45NjEgOTMwLjAzIDY0NC4wNDEgOTMyLjc2NiA2NDQuMjMxIDkzNS43MTEgNjQ0LjYyOCA5MzkuODU2IDY0NS4xODUgOTQ0LjQxMSA2NDYuMTYxIDk0OC40OTYgNjQ3Ljc3MyA5NDguNTg1IDY0Ny44MDYgOTQ4LjYzIDY0Ny45MDUgOTQ4LjU5NyA2NDcuOTk0IDk0OC41NjQgNjQ4LjA4NCA5NDguNDY0IDY0OC4xMjkgOTQ4LjM3NSA2NDguMDk1IDk0NC4yNzYgNjQ2LjY0MyA5MzkuNzMyIDY0NS44NjYgOTM1LjYxNSA2NDUuNDMgOTMyLjY4OSA2NDUuMTIgOTI5Ljk3OSA2NDQuOTkgOTI3Ljc5NCA2NDQuOTM3IDkyNC42MzcgNjQ0Ljg2IDkyMi41ODMgNjQ0Ljk0OSA5MjIuNTgzIDY0NC45NDlMOTIyLjAzMSA2NDQuOTc2IDkyMi4wNjQgNjQ0LjQyNEM5MjIuMDY0IDY0NC40MjQgOTIyLjIwNSA2NDIuMjYgOTIxLjkyMyA2MzguOTIzIDkyMS43ODggNjM3LjMyNyA5MjEuNTYgNjM1LjQ2NCA5MjEuMTcxIDYzMy40NCA5MjAuNTQ3IDYzMC4xOTIgOTE5LjUxOSA2MjYuNTMxIDkxNy44IDYyMi44OTkgOTE3Ljc1OCA2MjIuODE0IDkxNy43OTIgNjIyLjcxIDkxNy44NzggNjIyLjY2OCA5MTcuOTYzIDYyMi42MjYgOTE4LjA2NiA2MjIuNjYxIDkxOC4xMDkgNjIyLjc0NiA5MTkuOTc4IDYyNi4zNTkgOTIxLjE1OSA2MzAuMDIzIDkyMS44OTQgNjMzLjI4OSA5MjIuMzUzIDYzNS4zMzMgOTIyLjYzOCA2MzcuMjE5IDkyMi44MTIgNjM4LjgzOCA5MjMuMDcxIDY0MS4yNTcgOTIzLjA4NCA2NDMuMDc5IDkyMy4wNjkgNjQzLjkzOHoiLz48cGF0aCBkPSJNOTA4Ljk5NCw2NjkuNjg2IEM5MDguOTk0LDY2OS42ODYgOTEwLjY0NSw2NjYuNzIyIDkxMy4zMjMsNjYyLjA1NiBDOTE0LjU4NCw2NTkuODU5IDkxNi4wNzUsNjU3LjI4NyA5MTcuNzE1LDY1NC40NjEgQzkyMS42MDcsNjQ3Ljc1NSA5MjYuNDA0LDYzOS42NTkgOTMxLjY2Miw2MzIuMTY3IEM5MzguMDAzLDYyMy4xMyA5NDQuOTEsNjE0LjkxNCA5NTEuMzMsNjEwLjkwNiBDOTUxLjQ5Myw2MTAuODA3IDk1MS41NDUsNjEwLjU5NSA5NTEuNDQ2LDYxMC40MzIgQzk1MS4zNDgsNjEwLjI2OSA5NTEuMTM1LDYxMC4yMTcgOTUwLjk3Myw2MTAuMzE2IEM5NDQuMzY1LDYxNC4yMDcgOTM3LjEyLDYyMi4zMTcgOTMwLjQ4Myw2MzEuMzE5IEM5MjUuMDE4LDYzOC43MzMgOTE5LjksNjQ2LjcwOCA5MTUuOTg1LDY1My40NTcgQzkxNC4zMzcsNjU2LjI5OSA5MTIuOTE0LDY1OC45MjggOTExLjczNCw2NjEuMTg0IEM5MDkuMjIzLDY2NS45OCA5MDcuODE4LDY2OS4wOTUgOTA3LjgxOCw2NjkuMDk1IEM5MDcuNjU1LDY2OS40MTkgOTA3Ljc4Niw2NjkuODE1IDkwOC4xMSw2NjkuOTc4IEM5MDguNDM1LDY3MC4xNDEgOTA4LjgzMSw2NzAuMDEgOTA4Ljk5NCw2NjkuNjg2IFoiLz48L2c+PC9nPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 171.75153997588012,
        height: 171.7515399758802,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(95,47,6,1)",
          "#000": "rgba(95,47,6,1)"
        }
      },
      {
        id: "GBaLfW5Fzf",
        type: "svg",
        x: 953.6605029562602,
        y: 418.78481983102245,
        rotation: -100.96939005726625,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3NiIgaGVpZ2h0PSI3NiIgdmlld0JveD0iMCAwIDc2IDc2Ij48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC05OTIgLTY5MikiPjxnIGZpbGw9IiMwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDk0IDk1KSI+PHBhdGggZD0iTTkyMi4yMzYsNjQ0LjM2MyBDOTE3LjI1Niw2NDEuOTg5IDkxMS4xMzQsNjM1LjI4MSA5MDguMTE5LDYyNy4xNzYgQzkwNy44ODEsNjI2LjUzNiA5MDcuNjYyLDYyNS44ODggOTA3LjQ2OSw2MjUuMjMxIEM5MDcuMDIsNjIzLjcwMiA5MDYuNjk4LDYyMi4xMzIgOTA2LjUxNiw2MjAuNTQ0IEM5MDUuOTMsNjE1LjQ0NyA5MDYuODEsNjEwLjE2NSA5MDkuOTksNjA1LjMyOCBMOTEwLjIwNyw2MDQuOTg5IEw5MTAuMzM2LDYwNS4zNzEgQzkxMC45ODQsNjA3LjA0NyA5MTEuOTMzLDYwOC40OTcgOTEzLjA0Miw2MDkuODM2IEM5MTMuMTQ5LDYwOS45NjUgOTEzLjI1OSw2MTAuMDkxIDkxMy4zNjUsNjEwLjIyMSBDOTEzLjYxMyw2MTAuNTIyIDkxMy44NTgsNjEwLjgyOCA5MTQuMTE2LDYxMS4xMjQgQzkxNy40ODIsNjE0Ljk4MyA5MjIuMDMxLDYxOC4wNDEgOTI0LjkxOCw2MjIuMDcgQzkyNS43NjMsNjIzLjI1IDkyNi40OCw2MjQuNTA2IDkyNi45NzcsNjI1Ljg5OSBDOTI4LjQwNiw2MjkuOTExIDkyOC4wODEsNjM1LjAzIDkyNC4yNjgsNjQyLjMzOCBDOTI0LjY5Nyw2NDIuMiA5MjUuMjYxLDY0Mi4wMTMgOTI1Ljk0LDY0MS43OTcgQzkzMC44NzQsNjQwLjIyNiA5NDEuNzYsNjM3LjE1OSA5NTAuODE4LDYzOS43MjkgQzk1MS41NDQsNjM5LjkzNSA5NTIuMjU4LDY0MC4xNzkgOTUyLjk1OSw2NDAuNDU2IEM5NTQuMDA4LDY0MC44NzEgOTU1LjAyOCw2NDEuMzY2IDk1Niw2NDEuOTY2IEM5NTkuMzUxLDY0NC4wMzcgOTYyLjE1MSw2NDcuMzE3IDk2My44NjYsNjUyLjMyMSBMOTY0LjA5OSw2NTMuMDI2IEw5NjMuMzY4LDY1Mi44OTEgQzk2MS40NDgsNjUyLjUyNSA5NTkuMzIzLDY1Mi44MjQgOTU2Ljk2MSw2NTMuMjc5IEM5NTIuNjQ3LDY1NC4xMDggOTQ3LjU2Nyw2NTUuNDU2IDk0MS41NSw2NTQuNTg4IEM5MzguMzQ3LDY1NC4xMjYgOTM0Ljg4Niw2NTMuMDI0IDkzMS4xMTMsNjUwLjkwMSBDOTI4LjMzMSw2NDkuMzM2IDkyNS4zNjksNjQ3LjIyNiA5MjIuMjM2LDY0NC4zNjMgWiBNOTEwLjA5NCw2MDUuOTAxIEM5MDcuMzA0LDYxMC41OSA5MDYuNjQsNjE1LjYxNyA5MDcuMzAxLDYyMC40NDYgQzkwNy41MTIsNjIxLjk4MyA5MDcuODYxLDYyMy40OTkgOTA4LjMwOCw2MjQuOTgyIEM5MDguNSw2MjUuNjE5IDkwOC43MDgsNjI2LjI1MiA5MDguOTM1LDYyNi44NzYgQzkxMS44MjYsNjM0LjgyOCA5MTcuNjk5LDY0MS40ODEgOTIyLjUzNyw2NDMuODM2IEw5MjIuNjEyLDY0My44ODcgQzkyNS42OTIsNjQ2Ljc2NCA5MjguNTk2LDY0OC45MTYgOTMxLjM1NSw2NTAuNDcxIEM5MzUuMDU4LDY1Mi41NTcgOTM4LjQ4Miw2NTMuNTg1IDk0MS42MzEsNjU0LjAwMiBDOTQ3LjU3Myw2NTQuNzg5IDk1Mi41Niw2NTMuMzUzIDk1Ni44MDMsNjUyLjQ4MyBDOTU4Ljk4Nyw2NTIuMDM2IDk2MC45OCw2NTEuNzM5IDk2Mi44MDcsNjUxLjkyNiBDOTYxLjIzOSw2NDcuNDQ4IDk1OC43MTcsNjQ0LjQzMSA5NTUuNjgxLDY0Mi40NzIgQzk1NC43NSw2NDEuODcxIDk1My43NzQsNjQxLjM2NSA5NTIuNzU5LDY0MC45NTYgQzk1Mi4wNzgsNjQwLjY4MiA5NTEuMzc5LDY0MC40NTMgOTUwLjY3LDY0MC4yNTkgQzk0MS43Myw2MzcuODAyIDkzMS4wNDEsNjQwLjk5OSA5MjYuMTk4LDY0Mi41OTUgQzkyNS4wMjEsNjQyLjk4NCA5MjQuMTgyLDY0My4yNzkgOTIzLjc5LDY0My4zODUgQzkyMy42MDksNjQzLjQzNCA5MjMuNDg0LDY0My40NDQgOTIzLjQyNCw2NDMuNDQgQzkyMy4yNjcsNjQzLjQyOCA5MjMuMTc1LDY0My4zNTYgOTIzLjExOSw2NDMuMjk3IEM5MjMuMDA4LDY0My4xOCA5MjIuOTE5LDY0MyA5MjMuMDYzLDY0Mi43NiBDOTI3LjI0MSw2MzUuMzE0IDkyNy43NDUsNjMwLjE1NCA5MjYuMzU4LDYyNi4xMTYgQzkyNS44OTcsNjI0Ljc3NSA5MjUuMjM4LDYyMy41NTMgOTI0LjQyNCw2MjIuNDI0IEM5MjEuNTM1LDYxOC40MTYgOTE2Ljg5LDYxNS40ODkgOTEzLjQ2Niw2MTEuNzAxIEM5MTMuMTkzLDYxMS40IDkxMi45MjEsNjExLjA5OCA5MTIuNjcxLDYxMC43NzkgQzkxMi41NjMsNjEwLjY0MiA5MTIuNDYxLDYxMC41IDkxMi4zNjEsNjEwLjM1OCBDOTExLjM5OCw2MDguOTk4IDkxMC42MTQsNjA3LjUzIDkxMC4wOTQsNjA1LjkwMSBaIi8+PHBhdGggZD0iTTk2Mi42NzQgNjAwLjI2N0M5NTkuNzI3IDYwMi40IDk1NC4zNjcgNjAzLjMwNSA5NDguOTI0IDYwNC43NTMgOTQ0LjA2IDYwNi4wNDcgOTM5LjEzMyA2MDcuNzc0IDkzNS43MzkgNjExLjEwMiA5MzIuODIzIDYxMy45NjEgOTMxLjAxNCA2MTcuOTk1IDkzMS4zMzYgNjIzLjkzNCA5MzEuNDMzIDYyNS43MDcgOTMxLjcyNSA2MjcuNjUyIDkzMi4yMzMgNjI5Ljc4OEw5MzIuNTMzIDYzMC4xMzVDOTM0LjgwNCA2MzEuMDM1IDkzOC41NzUgNjMxLjUxNyA5NDIuNzEyIDYzMC45MDkgOTQ3LjI3MSA2MzAuMjM5IDk1Mi4yODEgNjI4LjI1OCA5NTYuMTkgNjI0LjEyNyA5NjAuNjMzIDYxOS40MzIgOTYzLjY2NCA2MTEuOTM5IDk2Mi45NDkgNjAwLjM5N0w5NjIuNjc0IDYwMC4yNjd6TTk2Mi42MTcgNjAwLjczM0M5NTkuNjMgNjAyLjgxMSA5NTQuMzk3IDYwMy44MyA5NDkuMDg1IDYwNS4zMzggOTQ0LjM2OCA2MDYuNjc4IDkzOS41ODggNjA4LjQwNiA5MzYuMzI0IDYxMS42OSA5MzMuNjAxIDYxNC40MyA5MzEuOTY0IDYxOC4yNjMgOTMyLjMxIDYyMy44NzggOTMyLjQxMiA2MjUuNTI3IDkzMi42OCA2MjcuMzI4IDkzMy4xNDMgNjI5LjI5OSA5MzUuMzE4IDYzMC4xMDIgOTM4Ljc4MiA2MzAuNDkgOTQyLjU3NyA2MjkuOTYyIDk0Ni45NyA2MjkuMzUxIDk1MS44MDQgNjI3LjUwNSA5NTUuNjI0IDYyMy41ODMgOTYwLjAwNSA2MTkuMDg0IDk2My4wNDkgNjExLjg4MiA5NjIuNjE3IDYwMC43MzN6TTkyMy4wNjkgNjQzLjkzOEM5MjMuODg0IDY0My45MTIgOTI1LjU4IDY0My44OCA5MjcuODI0IDY0My45NjEgOTMwLjAzIDY0NC4wNDEgOTMyLjc2NiA2NDQuMjMxIDkzNS43MTEgNjQ0LjYyOCA5MzkuODU2IDY0NS4xODUgOTQ0LjQxMSA2NDYuMTYxIDk0OC40OTYgNjQ3Ljc3MyA5NDguNTg1IDY0Ny44MDYgOTQ4LjYzIDY0Ny45MDUgOTQ4LjU5NyA2NDcuOTk0IDk0OC41NjQgNjQ4LjA4NCA5NDguNDY0IDY0OC4xMjkgOTQ4LjM3NSA2NDguMDk1IDk0NC4yNzYgNjQ2LjY0MyA5MzkuNzMyIDY0NS44NjYgOTM1LjYxNSA2NDUuNDMgOTMyLjY4OSA2NDUuMTIgOTI5Ljk3OSA2NDQuOTkgOTI3Ljc5NCA2NDQuOTM3IDkyNC42MzcgNjQ0Ljg2IDkyMi41ODMgNjQ0Ljk0OSA5MjIuNTgzIDY0NC45NDlMOTIyLjAzMSA2NDQuOTc2IDkyMi4wNjQgNjQ0LjQyNEM5MjIuMDY0IDY0NC40MjQgOTIyLjIwNSA2NDIuMjYgOTIxLjkyMyA2MzguOTIzIDkyMS43ODggNjM3LjMyNyA5MjEuNTYgNjM1LjQ2NCA5MjEuMTcxIDYzMy40NCA5MjAuNTQ3IDYzMC4xOTIgOTE5LjUxOSA2MjYuNTMxIDkxNy44IDYyMi44OTkgOTE3Ljc1OCA2MjIuODE0IDkxNy43OTIgNjIyLjcxIDkxNy44NzggNjIyLjY2OCA5MTcuOTYzIDYyMi42MjYgOTE4LjA2NiA2MjIuNjYxIDkxOC4xMDkgNjIyLjc0NiA5MTkuOTc4IDYyNi4zNTkgOTIxLjE1OSA2MzAuMDIzIDkyMS44OTQgNjMzLjI4OSA5MjIuMzUzIDYzNS4zMzMgOTIyLjYzOCA2MzcuMjE5IDkyMi44MTIgNjM4LjgzOCA5MjMuMDcxIDY0MS4yNTcgOTIzLjA4NCA2NDMuMDc5IDkyMy4wNjkgNjQzLjkzOHoiLz48cGF0aCBkPSJNOTA4Ljk5NCw2NjkuNjg2IEM5MDguOTk0LDY2OS42ODYgOTEwLjY0NSw2NjYuNzIyIDkxMy4zMjMsNjYyLjA1NiBDOTE0LjU4NCw2NTkuODU5IDkxNi4wNzUsNjU3LjI4NyA5MTcuNzE1LDY1NC40NjEgQzkyMS42MDcsNjQ3Ljc1NSA5MjYuNDA0LDYzOS42NTkgOTMxLjY2Miw2MzIuMTY3IEM5MzguMDAzLDYyMy4xMyA5NDQuOTEsNjE0LjkxNCA5NTEuMzMsNjEwLjkwNiBDOTUxLjQ5Myw2MTAuODA3IDk1MS41NDUsNjEwLjU5NSA5NTEuNDQ2LDYxMC40MzIgQzk1MS4zNDgsNjEwLjI2OSA5NTEuMTM1LDYxMC4yMTcgOTUwLjk3Myw2MTAuMzE2IEM5NDQuMzY1LDYxNC4yMDcgOTM3LjEyLDYyMi4zMTcgOTMwLjQ4Myw2MzEuMzE5IEM5MjUuMDE4LDYzOC43MzMgOTE5LjksNjQ2LjcwOCA5MTUuOTg1LDY1My40NTcgQzkxNC4zMzcsNjU2LjI5OSA5MTIuOTE0LDY1OC45MjggOTExLjczNCw2NjEuMTg0IEM5MDkuMjIzLDY2NS45OCA5MDcuODE4LDY2OS4wOTUgOTA3LjgxOCw2NjkuMDk1IEM5MDcuNjU1LDY2OS40MTkgOTA3Ljc4Niw2NjkuODE1IDkwOC4xMSw2NjkuOTc4IEM5MDguNDM1LDY3MC4xNDEgOTA4LjgzMSw2NzAuMDEgOTA4Ljk5NCw2NjkuNjg2IFoiLz48L2c+PC9nPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128.69080913759277,
        height: 128.6908091375927,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(95,47,6,1)",
          "#000": "rgba(95,47,6,1)"
        }
      },
      {
        id: "augOlsc1pO",
        type: "text",
        x: 272.8262859543057,
        y: 265.1310332344375,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "over 50% discounts in all items",
        placeholder: "",
        fontSize: 31,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 540,
        height: 37.199999999999996,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(255,252,198,1)"
  },
  {
    id: "Z5UxgyNf3u",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_124130.png?v=1740467524",
    elements: [
      {
        id: "38geJIJcj_",
        type: "svg",
        x: -714.70358018237,
        y: -208.55380461127967,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2lyY2xlIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDIwIDIwIiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBkPSJNMTAgLjRBOS42IDkuNiAwIDAgMCAuNCAxMGE5LjYgOS42IDAgMSAwIDE5LjItLjAwMUMxOS42IDQuNjk4IDE1LjMwMS40IDEwIC40em0wIDE3LjE5OUE3LjYgNy42IDAgMSAxIDEwIDIuNGE3LjYgNy42IDAgMSAxIDAgMTUuMTk5eiIvPjxtZXRhZGF0YT48cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnJkZnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDEvcmRmLXNjaGVtYSMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+PHJkZjpEZXNjcmlwdGlvbiBhYm91dD0iaHR0cHM6Ly9pY29uc2NvdXQuY29tL2xlZ2FsI2xpY2Vuc2VzIiBkYzp0aXRsZT0iY2lyY2xlIiBkYzpkZXNjcmlwdGlvbj0iY2lyY2xlIiBkYzpwdWJsaXNoZXI9Ikljb25zY291dCIgZGM6ZGF0ZT0iMjAxNy0wOS0xNCIgZGM6Zm9ybWF0PSJpbWFnZS9zdmcreG1sIiBkYzpsYW5ndWFnZT0iZW4iPjxkYzpjcmVhdG9yPjxyZGY6QmFnPjxyZGY6bGk+RGFuaWVsIEJydWNlPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 1206.8952680259142,
        height: 1206.8952680259138,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(146,94,50,1)"
        }
      },
      {
        id: "6HVsqUbZPR",
        type: "image",
        x: 57.95317090549683,
        y: 77.23170731707349,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 973.9867133420056,
        height: 682.8926983513451,
        src: "https://images.unsplash.com/photo-1483137140003-ae073b395549?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwxOXx8c3BhfGVufDB8fHx8MTYyMzA0Mjk3MA&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9508440742285731,
        cropHeight: 1,
        flipX: false,
        flipY: false,
        borderColor: "rgba(255,255,255,1)",
        borderSize: 10
      },
      {
        id: "zyo8wNfjxV",
        type: "svg",
        x: 717.1508860723151,
        y: 616.1346667731362,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 316.0806367836361,
        height: 320.74239422701396,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(236,205,178,1)"
        }
      },
      {
        id: "Mf1EiVKnef",
        type: "svg",
        x: 554,
        y: 616.1346667731362,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 326.30177214463083,
        height: 323.9708934229422,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(235,205,181,1)"
        }
      },
      {
        id: "h4PQdIYrlU",
        type: "text",
        x: 597.866461241425,
        y: 674.0887917385882,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Natural",
        placeholder: "",
        fontSize: 116.06918520792969,
        fontFamily: "Alex Brush",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(20,10,1,1)",
        align: "center",
        width: 482.13353875857473,
        height: 139.28302224951562,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "YLD5BFLryz",
        type: "text",
        x: 561.8375217687068,
        y: 747.7757749188282,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Ingredients",
        placeholder: "",
        fontSize: 110.16417976489286,
        fontFamily: "Alex Brush",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(20,10,1,1)",
        align: "center",
        width: 457.6050545577702,
        height: 132.19701571787144,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "EWOW4R23gq",
        type: "text",
        x: 270,
        y: 500,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "",
        placeholder: "",
        fontSize: 80,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 540,
        height: 96,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "EDER1rVw7x",
        type: "text",
        x: 270.0000000000001,
        y: 953.9414634146341,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "HOW THEY HELP YOUR SKIN",
        placeholder: "",
        fontSize: 35,
        fontFamily: "Roboto",
        fontStyle: "italic",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "right",
        width: 720.7148425089337,
        height: 42,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      }
    ],
    background: "rgba(250,187,131,1)"
  },
  {
    id: "T0Wr7F1b4K",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_130826.png?v=1740469185",
    elements: [
      {
        id: "jxWe6_PtUm",
        type: "svg",
        x: 976.0467275204412,
        y: -106.3900066009465,
        rotation: 35.719954312289914,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 686.4056729754631,
        height: 535.6562542924784,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "fRLjgaqMkD",
        type: "image",
        x: 53.86557302528671,
        y: -0.03007907545338817,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 1026.134426974709,
        height: 1080.0300790754502,
        src: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHwxMHx8UEFTVEF8ZW58MHx8fHwxNjI4MzQ3ODI0&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0.22037037037037038,
        cropY: 0,
        cropWidth: 0.5920518143973661,
        cropHeight: 1,
        flipX: false,
        flipY: false,
        clipSrc: "",
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "BZGtCdxuz6",
        type: "svg",
        x: 1082.1018145084718,
        y: -21.251095759421645,
        rotation: 44.999999999999964,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 44.141877282138886,
        height: 1605.5671650417237,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(255,154,0,1)"
        }
      },
      {
        id: "wRZ7sNcdo1",
        type: "svg",
        x: 454.55728941790386,
        y: -647.0438860619923,
        rotation: 44.9999999999999,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 900.3203774324528,
        height: 1647.981336362638,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "FAq5cOEKv1",
        type: "text",
        x: 40.1350955939928,
        y: 264.6003293576088,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "NOODLES",
        placeholder: "",
        fontSize: 95,
        fontFamily: "Bungee Shade",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(241,210,42,1)",
        align: "center",
        width: 568.6660097702013,
        height: 114,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "WFbdVhxGFI",
        type: "text",
        x: 54.468100469093415,
        y: 214.57478649283613,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "SPECIAL MENU",
        placeholder: "",
        fontSize: 54.70000058008248,
        fontFamily: "Anton",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(241,210,42,1)",
        align: "left",
        width: 876.5151496079135,
        height: 76.58000081211547,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.4,
        letterSpacing: 0.5000000000000003
      },
      {
        id: "zPWPVpKZIk",
        type: "text",
        x: 54.4681004690934,
        y: 391.6175223412207,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: '"Lorem ipsum dolor sit amet, consectetur adipiscing elit, \nsed do eiusmod tempor incididunt ut labore et dolore\n magna aliqua. Ut enim ad minim veniam, quis \nnostrud exercitation ullamco laboris\n nisi ut aliquip ex ',
        placeholder: "",
        fontSize: 20,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "left",
        width: 540,
        height: 120,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "4KasGujRz3",
        type: "svg",
        x: 54.46810046909349,
        y: 32.70239374942146,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2UtbWl0ZXJsaW1pdD0iMS41IiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZmlsbD0iI2ZmNTE4NSIgZmlsbC1ydWxlPSJub256ZXJvIiBkPSJtIDgsNDQgYSAxLjAwMDEsMS4wMDAxIDAgMCAwIC0wLjcwNzAzMTIsMS43MDcwMzEgbCA2LjE3MTg3NTIsNi4xNzE4NzUgYyAxLjg0MTgxLDEuODQxODExIDQuMzExOTQ0LDIuODMzNDkyIDYuODk2NDg0LDIuOTk0MTQxIDAuMTQ2MTA2LDAuNDM1NTgyIDAuMTg1ODU1LDAuOTE3Mzk1IDAuNTE1NjI1LDEuMjQ4MDQ3IGEgMS4wMDAxLDEuMDAwMSAwIDAgMCAwLjAwMiwwLjAwMiBDIDIxLjQ0MDQ3Niw1Ni42ODMxMTkgMjIuMjAyNjM4LDU3IDIyLjk5ODA0Nyw1NyBoIDE4LjAwMzkwNiBjIDAuNzk1NDA5LDAgMS41NTc1NzEsLTAuMzE2ODgxIDIuMTE5MTQxLC0wLjg3Njk1MyBhIDEuMDAwMSwxLjAwMDEgMCAwIDAgMC4wMDIsLTAuMDAyIGMgMC4zMjk3NywtMC4zMzA2NTIgMC4zNjk1MTksLTAuODEyNDY1IDAuNTE1NjI1LC0xLjI0ODA0NyAyLjU4NDU0LC0wLjE2MDY0OSA1LjA1NDY3NCwtMS4xNTIzMyA2Ljg5NjQ4NCwtMi45OTQxNDEgbCA2LjE3MTg3NSwtNi4xNzE4NzUgQSAxLjAwMDEsMS4wMDAxIDAgMCAwIDU2LDQ0IFogbSAyLjQxNDA2MiwyIGggNDMuMTcxODc2IGwgLTQuNDY0ODQ0LDQuNDY0ODQ0IEMgNDcuNDk3MzgsNTIuMDg4NTU3IDQ1LjI5NjI2LDUzIDQzLDUzIGEgMS4wMDAxLDEuMDAwMSAwIDAgMCAtMSwxIHYgMC4wMDIgYyAwLDAuMjYzNzA5IC0wLjEwNDI2NSwwLjUxNjg0MiAtMC4yOTEwMTYsMC43MDUwNzggQyA0MS41MjA1NTQsNTQuODk0OTU5IDQxLjI2NjU0NCw1NSA0MS4wMDE5NTMsNTUgSCAyMi45OTgwNDcgYyAtMC4yNjM3MDksMCAtMC41MTY4NDIsLTAuMTA0MjY1IC0wLjcwNTA3OCwtMC4yOTEwMTYgbCAtMC4wMDIsLTAuMDAyIEMgMjIuMTA0MjY1LDU0LjUxODc5NSAyMiw1NC4yNjU2NjIgMjIsNTQuMDAxOTUzIFYgNTQgYSAxLjAwMDEsMS4wMDAxIDAgMCAwIC0xLC0xIGMgLTIuMjk2MjYsMCAtNC40OTczOCwtMC45MTE0NDMgLTYuMTIxMDk0LC0yLjUzNTE1NiB6IiBjbGlwLXJ1bGU9Im5vbnplcm8iIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiIHdoaXRlLXNwYWNlPSJub3JtYWwiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7Zm9udC12YXJpYW50LWxpZ2F0dXJlczpub3JtYWw7Zm9udC12YXJpYW50LXBvc2l0aW9uOm5vcm1hbDtmb250LXZhcmlhbnQtY2Fwczpub3JtYWw7Zm9udC12YXJpYW50LW51bWVyaWM6bm9ybWFsO2ZvbnQtdmFyaWFudC1hbHRlcm5hdGVzOm5vcm1hbDtmb250LWZlYXR1cmUtc2V0dGluZ3M6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtZGVjb3JhdGlvbi1zdHlsZTpzb2xpZDt0ZXh0LWRlY29yYXRpb24tY29sb3I6IzAwMDt0ZXh0LXRyYW5zZm9ybTpub25lO3RleHQtb3JpZW50YXRpb246bWl4ZWQ7c2hhcGUtcGFkZGluZzowO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iNTAiIHI9IjEiIGZpbGw9IiNmZjUxODUiLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjQ4IiByPSIxIiBmaWxsPSIjZmY1MTg1Ii8+PGNpcmNsZSBjeD0iMjMiIGN5PSI0MyIgcj0iMSIgZmlsbD0iI2ZmNTE4NSIvPjxwYXRoIGZpbGw9IiNmZjUxODUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTM1IDUyYTEuMDAwMSAxLjAwMDEgMCAxIDAgMCAyaDRhMS4wMDAxIDEuMDAwMSAwIDEgMCAwLTJ6TTIzIDM4Yy0yLjc0OTA2MyAwLTUgMi4yNTA5MzctNSA1IDAgLjkwODk5NS4yNDQ5NjggMS43NzE4NTguNjc3NzM0IDIuNTA3ODEyQTEuMDAwMSAxLjAwMDEgMCAwIDAgMTkuNTM5MDYyIDQ2aDYuOTIxODc2YTEuMDAwMSAxLjAwMDEgMCAwIDAgLjg2MTMyOC0uNDkyMTg4QzI3Ljc1NTAzMiA0NC43NzE4NTggMjggNDMuOTA4OTk1IDI4IDQzIDI4IDQwLjI1MDkzNyAyNS43NDkwNjMgMzggMjMgMzh6bTAgMmMxLjY2NjkzNyAwIDMgMS4zMzMwNjMgMyAzIDAgLjM2OTI1LS4xNDkyMzMuNjc4NjczLS4yNjk1MzEgMUgyMC4yNjk1MzFDMjAuMTQ5MjMzIDQzLjY3ODY3MyAyMCA0My4zNjkyNSAyMCA0M2MwLTEuNjY2OTM3IDEuMzMzMDYzLTMgMy0zek00MC41IDQwLjVjLTIuNjc2Nzg1IDAtNC45NjAwODUgMS43NjQ1NTEtNS43MjQ2MDkgNC4yMDExNzJBMS4wMDAxIDEuMDAwMSAwIDAgMCAzNS43MzA0NjkgNDZoOS41MzkwNjJhMS4wMDAxIDEuMDAwMSAwIDAgMCAuOTU1MDc4LTEuMjk4ODI4QzQ1LjQ2MDA4NSA0Mi4yNjQ1NTEgNDMuMTc2Nzg1IDQwLjUgNDAuNSA0MC41em0wIDJjMS4yMTY3MjEgMCAyLjE2MzE3OC42NDk4MDkgMi44OTQ1MzEgMS41SDM3LjYwNTQ2OUMzOC4zMzY4MjIgNDMuMTQ5ODA5IDM5LjI4MzI3OSA0Mi41IDQwLjUgNDIuNXoiIGNsaXAtcnVsZT0ibm9uemVybyIgY29sb3I9IiMwMDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNDAwIiBvdmVyZmxvdz0idmlzaWJsZSIgd2hpdGUtc3BhY2U9Im5vcm1hbCIgc3R5bGU9ImxpbmUtaGVpZ2h0Om5vcm1hbDtmb250LXZhcmlhbnQtbGlnYXR1cmVzOm5vcm1hbDtmb250LXZhcmlhbnQtcG9zaXRpb246bm9ybWFsO2ZvbnQtdmFyaWFudC1jYXBzOm5vcm1hbDtmb250LXZhcmlhbnQtbnVtZXJpYzpub3JtYWw7Zm9udC12YXJpYW50LWFsdGVybmF0ZXM6bm9ybWFsO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC1kZWNvcmF0aW9uLXN0eWxlOnNvbGlkO3RleHQtZGVjb3JhdGlvbi1jb2xvcjojMDAwO3RleHQtdHJhbnNmb3JtOm5vbmU7dGV4dC1vcmllbnRhdGlvbjptaXhlZDtzaGFwZS1wYWRkaW5nOjA7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsIi8+PHBhdGggZmlsbD0iI2ZmNTE4NSIgZmlsbC1ydWxlPSJub256ZXJvIiBkPSJNMjMgMzVjLTQuNDA0Mzc1IDAtOCAzLjU5NTYyNS04IDggMCAuNzkzNzAxLjExNjk1OSAxLjU2NDkzMi4zMzc4OTEgMi4yOTEwMTZBMS4wMDAxIDEuMDAwMSAwIDAgMCAxNi4yOTQ5MjIgNDZoMTEuODA0Njg3YTEuMDAwMSAxLjAwMDEgMCAwIDAgLjk5MjE4OC0uODgwODU5Yy4xNzc3MzktMS40OTAwNTguNjM1ODQyLTIuODgyMDg2IDEuMzI0MjE5LTQuMTM0NzY2YTEuMDAwMSAxLjAwMDEgMCAwIDAgLjA1NjY0LS44Mzc4OTFDMjkuMzIwOTU5IDM3LjEzNTE0NSAyNi40MDA5MjQgMzUgMjMgMzV6bTAgMmMyLjQzOTAwMSAwIDQuNDkwOTExIDEuNDczNzE0IDUuNDMxNjQxIDMuNTU0Njg4QzI3LjkwMDMyNyA0MS42Mjk2NjYgMjcuNTI1NTYxIDQyLjc4NTEzNyAyNy4yOTY4NzUgNDRIMTcuMTQ2NDg0QzE3LjA4ODkxOCA0My42NjkxMDggMTcgNDMuMzUwMSAxNyA0M2MwLTMuMzIxNjI1IDIuNjc4Mzc1LTYgNi02ek00MC41IDM2Ljc1Yy00LjgwMzA2MyAwLTguODE1Nzc2IDMuNDkzMzY3LTkuNTk3NjU2IDguMDgyMDMxQTEuMDAwMSAxLjAwMDEgMCAwIDAgMzEuODg4NjcyIDQ2aDE3LjIyMjY1NmExLjAwMDEgMS4wMDAxIDAgMCAwIC45ODYzMjgtMS4xNjc5NjlDNDkuMzE1Nzc2IDQwLjI0MzM2NyA0NS4zMDMwNjMgMzYuNzUgNDAuNSAzNi43NXptMCAyYzMuMzkzOTg1IDAgNi4xNjExMDIgMi4yMjY3NCA3LjIwNzAzMSA1LjI1SDMzLjI5Mjk2OUMzNC4zMzg4OTggNDAuOTc2NzQgMzcuMTA2MDE1IDM4Ljc1IDQwLjUgMzguNzV6IiBjbGlwLXJ1bGU9Im5vbnplcm8iIGNvbG9yPSIjMDAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjQwMCIgb3ZlcmZsb3c9InZpc2libGUiIHdoaXRlLXNwYWNlPSJub3JtYWwiIHN0eWxlPSJsaW5lLWhlaWdodDpub3JtYWw7Zm9udC12YXJpYW50LWxpZ2F0dXJlczpub3JtYWw7Zm9udC12YXJpYW50LXBvc2l0aW9uOm5vcm1hbDtmb250LXZhcmlhbnQtY2Fwczpub3JtYWw7Zm9udC12YXJpYW50LW51bWVyaWM6bm9ybWFsO2ZvbnQtdmFyaWFudC1hbHRlcm5hdGVzOm5vcm1hbDtmb250LWZlYXR1cmUtc2V0dGluZ3M6bm9ybWFsO3RleHQtaW5kZW50OjA7dGV4dC1hbGlnbjpzdGFydDt0ZXh0LWRlY29yYXRpb24tbGluZTpub25lO3RleHQtZGVjb3JhdGlvbi1zdHlsZTpzb2xpZDt0ZXh0LWRlY29yYXRpb24tY29sb3I6IzAwMDt0ZXh0LXRyYW5zZm9ybTpub25lO3RleHQtb3JpZW50YXRpb246bWl4ZWQ7c2hhcGUtcGFkZGluZzowO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbCIvPjxwYXRoIGZpbGw9IiNmZjUxODUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0ibSAyMywzMiBjIC02LjA2MDI4MiwwIC0xMSw0LjkzOTcxOCAtMTEsMTEgMCwwLjc1Mzk1OCAwLjA3NDk5LDEuNDkxMzczIDAuMjIwNzAzLDIuMjAxMTcyIEEgMS4wMDAxLDEuMDAwMSAwIDAgMCAxMy4yMDExNzIsNDYgaCAxNC44OTg0MzcgYSAxLjAwMDEsMS4wMDAxIDAgMCAwIDAuOTkyMTg4LC0wLjg4MjgxMiBjIDAuMzA1NTIzLC0yLjU2OTMzNiAxLjQ1MzM0NywtNC44NjY0MzYgMy4xNjIxMDksLTYuNjIzMDQ3IGEgMS4wMDAxLDEuMDAwMSAwIDAgMCAwLjEzNjcxOSwtMS4yMTg3NSBDIDMwLjQ1NzA4MSwzNC4xMTExMDkgMjYuOTY2MTksMzIgMjMsMzIgWiBtIDAsMiBjIDMuMDM2NTM2LDAgNS42NzE2MjQsMS41MzY5MzcgNy4zMDI3MzQsMy44Mzc4OTEgQyAyOC44MjY0NDksMzkuNTczNjYgMjcuODA3NDU5LDQxLjY2Njk4MSAyNy4zNjMyODEsNDQgSCAxNC4wOTk2MDkgQyAxNC4wNjIxOTMsNDMuNjY3NjE5IDE0LDQzLjM0NDY4MyAxNCw0MyBjIDAsLTQuOTc3NzE4IDQuMDIyMjgyLC05IDksLTkgeiIgY2xpcC1ydWxlPSJub256ZXJvIiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIiB3aGl0ZS1zcGFjZT0ibm9ybWFsIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDA7dGV4dC10cmFuc2Zvcm06bm9uZTt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO3NoYXBlLXBhZGRpbmc6MDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48cGF0aCBmaWxsPSIjZmY1MTg1IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Im0gMzAsMzAgYyAtMi4xNTI5NjMsMCAtNC4wNTUzNDEsMS4xNDM0NDEgLTUuMTA3NDIyLDIuODYzMjgxIGEgMS4wMDAxLDEuMDAwMSAwIDAgMCAwLjU3ODEyNSwxLjQ4NDM3NSBjIDIuMTkzNTQ5LDAuNjIzOTAzIDQuMDQ4OTc2LDIuMDYyODQ5IDUuMjE0ODQ0LDMuOTY4NzUgYSAxLjAwMDEsMS4wMDAxIDAgMCAwIDEuNTcwMzEyLDAuMTczODI4IGMgMC45MDI0NzksLTAuOTMyODM3IDEuOTYyNDksLTEuNzEwMDQ4IDMuMTM0NzY2LC0yLjI5Mjk2OCBhIDEuMDAwMSwxLjAwMDEgMCAwIDAgMC41NDQ5MjIsLTEuMDMzMjA0IEMgMzUuNTMzMjU4LDMyLjI0NTk2OCAzMy4wMTY1ODEsMzAgMzAsMzAgWiBtIDAsMiBjIDEuODM2ODI3LDAgMy4zMTU3MjYsMS4yNTI3OTcgMy43ODcxMDksMi45Mjc3MzQgLTAuNzYwNDY5LDAuNDQzNDI1IC0xLjQ1OTE1MywwLjk2NzUyIC0yLjExNTIzNCwxLjU0Njg3NSBDIDMwLjU2MDg1MSwzNS4wMDM5NjMgMjkuMTA4MTYyLDMzLjg4NDE0MSAyNy40MDYyNSwzMy4xMjEwOTQgMjguMTEyMTI4LDMyLjQ3OTIzNSAyOC45NjQxMDMsMzIgMzAsMzIgWiIgY2xpcC1ydWxlPSJub256ZXJvIiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIiB3aGl0ZS1zcGFjZT0ibm9ybWFsIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDA7dGV4dC10cmFuc2Zvcm06bm9uZTt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO3NoYXBlLXBhZGRpbmc6MDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48cGF0aCBmaWxsPSIjZmY1MTg1IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Im0gMzAsMjYuMjUgYyAtNC4yMzAzOTMsMCAtNy44NDk4OTYsMi43MDc5NzMgLTkuMTkxNDA2LDYuNDk2MDk0IGEgMS4wMDAxLDEuMDAwMSAwIDAgMCAxLjA3NDIxOCwxLjMyNjE3MiBDIDIyLjI0NzE5MSwzNC4wMjQyNzQgMjIuNjE5MDc0LDM0IDIzLDM0IGMgMy4yNTc4MSwwIDYuMTAzMTI3LDEuNzI3NjQ3IDcuNjg1NTQ3LDQuMzE2NDA2IGEgMS4wMDAxLDEuMDAwMSAwIDAgMCAxLjU3MDMxMiwwLjE3MzgyOCBjIDEuNjkxODk2LC0xLjc0NjE3NiAzLjkzNTQ5MSwtMi45NTM5NzcgNi40NTExNzIsLTMuMzQ3NjU2IEEgMS4wMDAxLDEuMDAwMSAwIDAgMCAzOS41MzEyNSwzMy45NDMzNTkgQyAzOC41ODc3NzQsMjkuNTQ2MDQ3IDM0LjY2NzMzNiwyNi4yNSAzMCwyNi4yNSBaIG0gMCwyIGMgMy40MTMxOCwwIDYuMjExMzI3LDIuMjQ2MTM3IDcuMjQ4MDQ3LDUuMjk2ODc1IC0yLjA4OTgyNSwwLjUyNzI2OCAtMy45NTk2ODgsMS41MDk0NCAtNS41MzEyNSwyLjg4MjgxMyBDIDI5Ljc4OTQ0LDMzLjg3OTY5MyAyNi44MjU0ODIsMzIuMTkwODY3IDIzLjQyNTc4MSwzMi4wNTY2NDEgMjQuNzc5Njc4LDI5LjgwNDA3NSAyNy4xNzUwOTgsMjguMjUgMzAsMjguMjUgWiIgY2xpcC1ydWxlPSJub256ZXJvIiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIiB3aGl0ZS1zcGFjZT0ibm9ybWFsIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDA7dGV4dC10cmFuc2Zvcm06bm9uZTt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO3NoYXBlLXBhZGRpbmc6MDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48cGF0aCBmaWxsPSIjZmY1MTg1IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik00MC41IDMzQzMzLjYwNzY3IDMzIDI3Ljg5ODI1NSAzOC4xOTI3MzUgMjcuMTA1NDY5IDQ0Ljg4MjgxMkExLjAwMDEgMS4wMDAxIDAgMCAwIDI4LjA5OTYwOSA0NmgyNC44MDA3ODJhMS4wMDAxIDEuMDAwMSAwIDAgMCAuOTk0MTQtMS4xMTcxODhDNTMuMTAxNzQ1IDM4LjE5MjczNSA0Ny4zOTIzMyAzMyA0MC41IDMzem0wIDJjNS40NzY4MjYgMCA5LjkwMzU4IDMuODgyNDY0IDExLjA2MDU0NyA5SDI5LjQzOTQ1M0MzMC41OTY0MiAzOC44ODI0NjQgMzUuMDIzMTc0IDM1IDQwLjUgMzV6TTUwLjcwMzEyNSA2Ljk5ODA0NjlhMS4wMDAxIDEuMDAwMSAwIDAgMC0uMTY5OTIyLjAyMTQ4NGwtMzAgNS45OTk5OTk4YTEuMDAwMSAxLjAwMDEgMCAxIDAgLjM5MjU3OCAxLjk2MDkzOGwzMC02LjAwMDAwMDJBMS4wMDAxIDEuMDAwMSAwIDAgMCA1MC43MDMxMjUgNi45OTgwNDY5eiIgY2xpcC1ydWxlPSJub256ZXJvIiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIiB3aGl0ZS1zcGFjZT0ibm9ybWFsIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDA7dGV4dC10cmFuc2Zvcm06bm9uZTt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO3NoYXBlLXBhZGRpbmc6MDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48cGF0aCBmaWxsPSIjZmY1MTg1IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0yMC42MjEwOTQgNy40MjE4NzVBMS4wMDAxIDEuMDAwMSAwIDAgMCAyMC40ODI0MjIgOS40MTAxNTYyTDUwLjY0MDYyNSAxNC41NjI1YTEuMDAwNTI4IDEuMDAwNTI4IDAgMSAwIC4zMzU5MzctMS45NzI2NTZMMjAuODIwMzEyIDcuNDM3NUExLjAwMDEgMS4wMDAxIDAgMCAwIDIwLjYyMTA5NCA3LjQyMTg3NXpNMjMuNTc4MTI1IDE1LjI2NTYyNWExLjAwMDEgMS4wMDAxIDAgMCAwLS45NjQ4NDQgMS4yMTA5MzdsMi40MDYyNSAxMS45Mzc1YTEuMDAwMTE2NiAxLjAwMDExNjYgMCAxIDAgMS45NjA5MzgtLjM5NDUzMWwtMi40MDYyNS0xMS45Mzc1YTEuMDAwMSAxLjAwMDEgMCAwIDAtLjk5NjA5NC0uODE2NDA2ek0yMC43MjQ2MDkgOS43OTQ5MjE5Yy0xLjgyMzkxOSAwLTMuMzI0MjE4IDEuNTAwMjk5MS0zLjMyNDIxOCAzLjMyNDIxOTF2Mi42NzU3ODFhMS4wMDAxIDEuMDAwMSAwIDEgMCAyIDB2LTIuNjc1NzgxYzAtLjc0MjA4MS41ODIxMzgtMS4zMjQyMTkgMS4zMjQyMTgtMS4zMjQyMTloLjAwMmMuMzUzNTM4IDAgLjUxMzkwOS4wNDgwNy42OTMzNi4yMTY3OTcuMTc5NDUxLjE2ODcyNi40MzcxOTcuNTc1NDQ0LjU5NTcwMyAxLjQ4ODI4MWExLjAwMDEgMS4wMDAxIDAgMSAwIDEuOTY4NzUtLjM0MTc5N0MyMy43ODE4ODEgMTEuOTkyMDQgMjMuNDA2MzE1IDExLjEzMzIxMiAyMi43OTEwMTYgMTAuNTU0Njg4IDIyLjE3NTcxNyA5Ljk3NjE2MzMgMjEuMzgxMDI1IDkuNzk0OTIxOSAyMC43MjY1NjIgOS43OTQ5MjE5eiIgY2xpcC1ydWxlPSJub256ZXJvIiBjb2xvcj0iIzAwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIG92ZXJmbG93PSJ2aXNpYmxlIiB3aGl0ZS1zcGFjZT0ibm9ybWFsIiBzdHlsZT0ibGluZS1oZWlnaHQ6bm9ybWFsO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDA7dGV4dC10cmFuc2Zvcm06bm9uZTt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO3NoYXBlLXBhZGRpbmc6MDtpc29sYXRpb246YXV0bzttaXgtYmxlbmQtbW9kZTpub3JtYWwiLz48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 76.65213357709985,
        height: 76.65213357709987,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#ff5185": "rgba(255,255,255,1)"
        }
      },
      {
        id: "VFhNbTVaxi",
        type: "svg",
        x: 24.264459301954318,
        y: 852.3473049566693,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE4LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgdmlld0JveD0iMCAwIDU4IDU4IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1OCA1ODsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPHBhdGggc3R5bGU9ImZpbGw6IzQzNEM2RDsiIGQ9Ik00OC4wMDEsNThIOS45OTlDNC40NzcsNTgsMCw1My41MjMsMCw0OC4wMDFWOS45OTlDMCw0LjQ3Nyw0LjQ3NywwLDkuOTk5LDBoMzguMDAzDQoJCUM1My41MjMsMCw1OCw0LjQ3Nyw1OCw5Ljk5OXYzOC4wMDNDNTgsNTMuNTIzLDUzLjUyMyw1OCw0OC4wMDEsNTh6Ii8+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8L3N2Zz4NCg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 137.05941591137818,
        height: 45.64786872637745,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(67, 76, 109)": "rgba(255,154,0,1)"
        }
      },
      {
        id: "6Yx_YhtbQ3",
        type: "text",
        x: 26.132975519152097,
        y: 864.0220461366911,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "ORDER NOW",
        placeholder: "",
        fontSize: 23.205747804579918,
        fontFamily: "Anton",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(0,0,0,1)",
        align: "right",
        width: 125.45481046590515,
        height: 30.167472145953894,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.3,
        letterSpacing: 0.1000000000000004
      },
      {
        id: "kXjkaUjYLU",
        type: "text",
        x: 26.132975519152097,
        y: 817.4583813429434,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "123-456-789",
        placeholder: "",
        fontSize: 23.205747804579918,
        fontFamily: "Anton",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "rgba(255,255,255,1)",
        align: "right",
        width: 143.55022841138356,
        height: 30.167472145953894,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.3,
        letterSpacing: 0.1000000000000004
      },
      {
        id: "YbTuHmwfWE",
        type: "svg",
        x: -142.7925954731786,
        y: 378.6003293576089,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDY0IDY0IiB4bWw6c3BhY2U9InByZXNlcnZlIj48ZyBpZD0iZmxhdCI+PGcgaWQ9InRpZGUyXzFfIj48cGF0aCBmaWxsPSIjM0VCQkREIiBkPSJNNTQuNDggNDhjLTIuMzA5IDAtMy41MTQtMS4yODQtNC40ODEtMi4zMTVDNDkuMTE2IDQ0Ljc0MyA0OC40MiA0NCA0Ni45NzcgNDRjLTEuNDQxIDAtMi4xMzkuNzQzLTMuMDIxIDEuNjg1QzQyLjk4OSA0Ni43MTYgNDEuNzg1IDQ4IDM5LjQ3OCA0OGMtMi4zMDkgMC0zLjUxMy0xLjI4NC00LjQ4LTIuMzE2LS44ODMtLjk0MS0xLjU4LTEuNjg0LTMuMDIyLTEuNjg0LTEuNDQxIDAtMi4xMzkuNzQzLTMuMDIxIDEuNjg1QzI3Ljk4OCA0Ni43MTYgMjYuNzg0IDQ4IDI0LjQ3NyA0OHMtMy41MTItMS4yODQtNC40NzktMi4zMTZDMTkuMTE2IDQ0Ljc0MyAxOC40MiA0NCAxNi45NzkgNDRzLTIuMTM4Ljc0My0zLjAyIDEuNjg0QzEyLjk5MyA0Ni43MTYgMTEuNzkgNDggOS40ODIgNDhzLTMuNTEyLTEuMjg0LTQuNDc5LTIuMzE2QzQuMTIyIDQ0Ljc0MyAzLjQyNiA0NCAxLjk4NSA0NHYtMmMyLjMwOCAwIDMuNTExIDEuMjg0IDQuNDc4IDIuMzE2QzcuMzQ1IDQ1LjI1NyA4LjA0MSA0NiA5LjQ4MiA0NmMxLjQ0IDAgMi4xMzctLjc0MyAzLjAxOS0xLjY4NC45NjctMS4wMzIgMi4xNzEtMi4zMTYgNC40NzgtMi4zMTZzMy41MTEgMS4yODQgNC40NzggMi4zMTZjLjg4Mi45NCAxLjU3OCAxLjY4NCAzLjAyIDEuNjg0czIuMTM4LS43NDMgMy4wMi0xLjY4NGMuOTY2LTEuMDMyIDIuMTctMi4zMTYgNC40NzktMi4zMTZzMy41MTMgMS4yODQgNC40OCAyLjMxNmMuODgyLjk0MSAxLjU3OSAxLjY4NCAzLjAyMiAxLjY4NCAxLjQ0MSAwIDIuMTM4LS43NDMgMy4wMi0xLjY4NC45NjYtMS4wMzIgMi4xNy0yLjMxNiA0LjQ3OS0yLjMxNnMzLjUxNCAxLjI4NCA0LjQ4MSAyLjMxNWMuODgzLjk0MiAxLjU3OSAxLjY4NSAzLjAyMiAxLjY4NXMyLjE0MS0uNzQzIDMuMDIzLTEuNjg1QzU4LjQ3MiA0My4yODQgNTkuNjc3IDQyIDYxLjk4NSA0MnYyYy0xLjQ0MiAwLTIuMTQuNzQzLTMuMDIyIDEuNjg0QzU3Ljk5NSA0Ni43MTYgNTYuNzkgNDggNTQuNDggNDh6Ii8+PHBhdGggZmlsbD0iIzNFQkJERCIgZD0iTTU0LjQ4IDU1Yy0yLjMwOSAwLTMuNTE0LTEuMjg0LTQuNDgxLTIuMzE1QzQ5LjExNiA1MS43NDMgNDguNDIgNTEgNDYuOTc3IDUxYy0xLjQ0MSAwLTIuMTM5Ljc0My0zLjAyMSAxLjY4NUM0Mi45ODkgNTMuNzE2IDQxLjc4NSA1NSAzOS40NzggNTVjLTIuMzA5IDAtMy41MTMtMS4yODQtNC40OC0yLjMxNi0uODgzLS45NDEtMS41OC0xLjY4NC0zLjAyMi0xLjY4NC0xLjQ0MSAwLTIuMTM5Ljc0My0zLjAyMSAxLjY4NUMyNy45ODggNTMuNzE2IDI2Ljc4NCA1NSAyNC40NzcgNTVzLTMuNTEyLTEuMjg0LTQuNDc5LTIuMzE2QzE5LjExNiA1MS43NDMgMTguNDIgNTEgMTYuOTc5IDUxcy0yLjEzOC43NDMtMy4wMiAxLjY4NEMxMi45OTMgNTMuNzE2IDExLjc5IDU1IDkuNDgyIDU1cy0zLjUxMi0xLjI4NC00LjQ3OS0yLjMxNkM0LjEyMiA1MS43NDMgMy40MjYgNTEgMS45ODUgNTF2LTJjMi4zMDggMCAzLjUxMSAxLjI4NCA0LjQ3OCAyLjMxNkM3LjM0NSA1Mi4yNTcgOC4wNDEgNTMgOS40ODIgNTNjMS40NCAwIDIuMTM3LS43NDMgMy4wMTktMS42ODQuOTY3LTEuMDMyIDIuMTcxLTIuMzE2IDQuNDc4LTIuMzE2czMuNTExIDEuMjg0IDQuNDc4IDIuMzE2Yy44ODIuOTQgMS41NzggMS42ODQgMy4wMiAxLjY4NHMyLjEzOC0uNzQzIDMuMDItMS42ODRjLjk2Ni0xLjAzMiAyLjE3LTIuMzE2IDQuNDc5LTIuMzE2czMuNTEzIDEuMjg0IDQuNDggMi4zMTZjLjg4Mi45NDEgMS41NzkgMS42ODQgMy4wMjIgMS42ODQgMS40NDEgMCAyLjEzOC0uNzQzIDMuMDItMS42ODQuOTY2LTEuMDMyIDIuMTctMi4zMTYgNC40NzktMi4zMTZzMy41MTQgMS4yODQgNC40ODEgMi4zMTVjLjg4My45NDIgMS41NzkgMS42ODUgMy4wMjIgMS42ODVzMi4xNDEtLjc0MyAzLjAyMy0xLjY4NUM1OC40NzIgNTAuMjg0IDU5LjY3NyA0OSA2MS45ODUgNDl2MmMtMS40NDIgMC0yLjE0Ljc0My0zLjAyMiAxLjY4NEM1Ny45OTUgNTMuNzE2IDU2Ljc5IDU1IDU0LjQ4IDU1eiIvPjxwYXRoIGZpbGw9IiMzRUJCREQiIGQ9Ik01NC40OCA2MmMtMi4zMDkgMC0zLjUxNC0xLjI4NC00LjQ4MS0yLjMxNUM0OS4xMTYgNTguNzQzIDQ4LjQyIDU4IDQ2Ljk3NyA1OGMtMS40NDEgMC0yLjEzOS43NDMtMy4wMjEgMS42ODVDNDIuOTg5IDYwLjcxNiA0MS43ODUgNjIgMzkuNDc4IDYyYy0yLjMwOSAwLTMuNTEzLTEuMjg0LTQuNDgtMi4zMTYtLjg4My0uOTQxLTEuNTgtMS42ODQtMy4wMjItMS42ODQtMS40NDEgMC0yLjEzOS43NDMtMy4wMjEgMS42ODVDMjcuOTg4IDYwLjcxNiAyNi43ODQgNjIgMjQuNDc3IDYycy0zLjUxMi0xLjI4NC00LjQ3OS0yLjMxNkMxOS4xMTYgNTguNzQzIDE4LjQyIDU4IDE2Ljk3OSA1OHMtMi4xMzguNzQzLTMuMDIgMS42ODRDMTIuOTkzIDYwLjcxNiAxMS43OSA2MiA5LjQ4MiA2MnMtMy41MTItMS4yODQtNC40NzktMi4zMTZDNC4xMjIgNTguNzQzIDMuNDI2IDU4IDEuOTg1IDU4di0yYzIuMzA4IDAgMy41MTEgMS4yODQgNC40NzggMi4zMTZDNy4zNDUgNTkuMjU3IDguMDQxIDYwIDkuNDgyIDYwYzEuNDQgMCAyLjEzNy0uNzQzIDMuMDE5LTEuNjg0Ljk2Ny0xLjAzMiAyLjE3MS0yLjMxNiA0LjQ3OC0yLjMxNnMzLjUxMSAxLjI4NCA0LjQ3OCAyLjMxNmMuODgyLjk0IDEuNTc4IDEuNjg0IDMuMDIgMS42ODRzMi4xMzgtLjc0MyAzLjAyLTEuNjg0Yy45NjYtMS4wMzIgMi4xNy0yLjMxNiA0LjQ3OS0yLjMxNnMzLjUxMyAxLjI4NCA0LjQ4IDIuMzE2Yy44ODIuOTQxIDEuNTc5IDEuNjg0IDMuMDIyIDEuNjg0IDEuNDQxIDAgMi4xMzgtLjc0MyAzLjAyLTEuNjg0Ljk2Ni0xLjAzMiAyLjE3LTIuMzE2IDQuNDc5LTIuMzE2czMuNTE0IDEuMjg0IDQuNDgxIDIuMzE1Yy44ODMuOTQyIDEuNTc5IDEuNjg1IDMuMDIyIDEuNjg1czIuMTQxLS43NDMgMy4wMjMtMS42ODVDNTguNDcyIDU3LjI4NCA1OS42NzcgNTYgNjEuOTg1IDU2djJjLTEuNDQyIDAtMi4xNC43NDMtMy4wMjIgMS42ODRDNTcuOTk1IDYwLjcxNiA1Ni43OSA2MiA1NC40OCA2MnoiLz48cGF0aCBmaWxsPSIjNEQ0RDREIiBkPSJNMjIuOTg1IDIyaDR2MmgtNHoiLz48cGF0aCBmaWxsPSIjNEQ0RDREIiBkPSJNMjIuOTg1IDI2aDR2MmgtNHoiLz48cGF0aCBmaWxsPSIjNEQ0RDREIiBkPSJNMjQuOTg1IDM4Yy0uMzM0IDAtLjY0Ni0uMTY3LS44MzItLjQ0NWwtNC02QTEgMSAwIDAgMSAyMC45ODUgMzBoOGExIDEgMCAwIDEgLjgzMiAxLjU1NGwtNCA2YS45OTguOTk4IDAgMCAxLS44MzIuNDQ2em0tMi4xMzEtNmwyLjEzMiAzLjE5N0wyNy4xMTcgMzJoLTQuMjYzeiIvPjxwYXRoIGZpbGw9IiM0RDRENEQiIGQ9Ik0zOSAzOGMtLjMzNCAwLS42NDYtLjE2Ny0uODMyLS40NDVsLTQtNkExIDEgMCAwIDEgMzUgMzBoOGExIDEgMCAwIDEgLjgzMiAxLjU1NGwtNCA2QTEgMSAwIDAgMSAzOSAzOHptLTIuMTMyLTZMMzkgMzUuMTk3IDQxLjEzMiAzMmgtNC4yNjR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTM2Ljk4NSAyMmg0djJoLTR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTIyLjk4NSAxOGg0djJoLTR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTM2Ljk4NSAxOGg0djJoLTR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTM2Ljk4NSAyNmg0djJoLTR6Ii8+PC9nPjwvZz48bWV0YWRhdGE+PHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpyZGZzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzAxL3JkZi1zY2hlbWEjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPjxyZGY6RGVzY3JpcHRpb24gYWJvdXQ9Imh0dHBzOi8vaWNvbnNjb3V0LmNvbS9sZWdhbCNsaWNlbnNlcyIgZGM6dGl0bGU9InRpZGUtZmxvb2Qtc2VhLWxldmVsLXdhdmUtIiBkYzpkZXNjcmlwdGlvbj0idGlkZS1mbG9vZC1zZWEtbGV2ZWwtd2F2ZS0iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE4LTAzLTIzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5QZXRhaSBKYW50cmFwb29uPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 285.5851909463574,
        height: 285.5851909463572,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#4D4D4D": "rgba(0,0,0,1)",
          "#3EBBDD": "rgba(255,255,255,1)"
        }
      },
      {
        id: "UU11mNEhyW",
        type: "svg",
        x: 827.7296443226193,
        y: -214.55673040838587,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDY0IDY0IiB4bWw6c3BhY2U9InByZXNlcnZlIj48ZyBpZD0iZmxhdCI+PGcgaWQ9InRpZGUyXzFfIj48cGF0aCBmaWxsPSIjM0VCQkREIiBkPSJNNTQuNDggNDhjLTIuMzA5IDAtMy41MTQtMS4yODQtNC40ODEtMi4zMTVDNDkuMTE2IDQ0Ljc0MyA0OC40MiA0NCA0Ni45NzcgNDRjLTEuNDQxIDAtMi4xMzkuNzQzLTMuMDIxIDEuNjg1QzQyLjk4OSA0Ni43MTYgNDEuNzg1IDQ4IDM5LjQ3OCA0OGMtMi4zMDkgMC0zLjUxMy0xLjI4NC00LjQ4LTIuMzE2LS44ODMtLjk0MS0xLjU4LTEuNjg0LTMuMDIyLTEuNjg0LTEuNDQxIDAtMi4xMzkuNzQzLTMuMDIxIDEuNjg1QzI3Ljk4OCA0Ni43MTYgMjYuNzg0IDQ4IDI0LjQ3NyA0OHMtMy41MTItMS4yODQtNC40NzktMi4zMTZDMTkuMTE2IDQ0Ljc0MyAxOC40MiA0NCAxNi45NzkgNDRzLTIuMTM4Ljc0My0zLjAyIDEuNjg0QzEyLjk5MyA0Ni43MTYgMTEuNzkgNDggOS40ODIgNDhzLTMuNTEyLTEuMjg0LTQuNDc5LTIuMzE2QzQuMTIyIDQ0Ljc0MyAzLjQyNiA0NCAxLjk4NSA0NHYtMmMyLjMwOCAwIDMuNTExIDEuMjg0IDQuNDc4IDIuMzE2QzcuMzQ1IDQ1LjI1NyA4LjA0MSA0NiA5LjQ4MiA0NmMxLjQ0IDAgMi4xMzctLjc0MyAzLjAxOS0xLjY4NC45NjctMS4wMzIgMi4xNzEtMi4zMTYgNC40NzgtMi4zMTZzMy41MTEgMS4yODQgNC40NzggMi4zMTZjLjg4Mi45NCAxLjU3OCAxLjY4NCAzLjAyIDEuNjg0czIuMTM4LS43NDMgMy4wMi0xLjY4NGMuOTY2LTEuMDMyIDIuMTctMi4zMTYgNC40NzktMi4zMTZzMy41MTMgMS4yODQgNC40OCAyLjMxNmMuODgyLjk0MSAxLjU3OSAxLjY4NCAzLjAyMiAxLjY4NCAxLjQ0MSAwIDIuMTM4LS43NDMgMy4wMi0xLjY4NC45NjYtMS4wMzIgMi4xNy0yLjMxNiA0LjQ3OS0yLjMxNnMzLjUxNCAxLjI4NCA0LjQ4MSAyLjMxNWMuODgzLjk0MiAxLjU3OSAxLjY4NSAzLjAyMiAxLjY4NXMyLjE0MS0uNzQzIDMuMDIzLTEuNjg1QzU4LjQ3MiA0My4yODQgNTkuNjc3IDQyIDYxLjk4NSA0MnYyYy0xLjQ0MiAwLTIuMTQuNzQzLTMuMDIyIDEuNjg0QzU3Ljk5NSA0Ni43MTYgNTYuNzkgNDggNTQuNDggNDh6Ii8+PHBhdGggZmlsbD0iIzNFQkJERCIgZD0iTTU0LjQ4IDU1Yy0yLjMwOSAwLTMuNTE0LTEuMjg0LTQuNDgxLTIuMzE1QzQ5LjExNiA1MS43NDMgNDguNDIgNTEgNDYuOTc3IDUxYy0xLjQ0MSAwLTIuMTM5Ljc0My0zLjAyMSAxLjY4NUM0Mi45ODkgNTMuNzE2IDQxLjc4NSA1NSAzOS40NzggNTVjLTIuMzA5IDAtMy41MTMtMS4yODQtNC40OC0yLjMxNi0uODgzLS45NDEtMS41OC0xLjY4NC0zLjAyMi0xLjY4NC0xLjQ0MSAwLTIuMTM5Ljc0My0zLjAyMSAxLjY4NUMyNy45ODggNTMuNzE2IDI2Ljc4NCA1NSAyNC40NzcgNTVzLTMuNTEyLTEuMjg0LTQuNDc5LTIuMzE2QzE5LjExNiA1MS43NDMgMTguNDIgNTEgMTYuOTc5IDUxcy0yLjEzOC43NDMtMy4wMiAxLjY4NEMxMi45OTMgNTMuNzE2IDExLjc5IDU1IDkuNDgyIDU1cy0zLjUxMi0xLjI4NC00LjQ3OS0yLjMxNkM0LjEyMiA1MS43NDMgMy40MjYgNTEgMS45ODUgNTF2LTJjMi4zMDggMCAzLjUxMSAxLjI4NCA0LjQ3OCAyLjMxNkM3LjM0NSA1Mi4yNTcgOC4wNDEgNTMgOS40ODIgNTNjMS40NCAwIDIuMTM3LS43NDMgMy4wMTktMS42ODQuOTY3LTEuMDMyIDIuMTcxLTIuMzE2IDQuNDc4LTIuMzE2czMuNTExIDEuMjg0IDQuNDc4IDIuMzE2Yy44ODIuOTQgMS41NzggMS42ODQgMy4wMiAxLjY4NHMyLjEzOC0uNzQzIDMuMDItMS42ODRjLjk2Ni0xLjAzMiAyLjE3LTIuMzE2IDQuNDc5LTIuMzE2czMuNTEzIDEuMjg0IDQuNDggMi4zMTZjLjg4Mi45NDEgMS41NzkgMS42ODQgMy4wMjIgMS42ODQgMS40NDEgMCAyLjEzOC0uNzQzIDMuMDItMS42ODQuOTY2LTEuMDMyIDIuMTctMi4zMTYgNC40NzktMi4zMTZzMy41MTQgMS4yODQgNC40ODEgMi4zMTVjLjg4My45NDIgMS41NzkgMS42ODUgMy4wMjIgMS42ODVzMi4xNDEtLjc0MyAzLjAyMy0xLjY4NUM1OC40NzIgNTAuMjg0IDU5LjY3NyA0OSA2MS45ODUgNDl2MmMtMS40NDIgMC0yLjE0Ljc0My0zLjAyMiAxLjY4NEM1Ny45OTUgNTMuNzE2IDU2Ljc5IDU1IDU0LjQ4IDU1eiIvPjxwYXRoIGZpbGw9IiMzRUJCREQiIGQ9Ik01NC40OCA2MmMtMi4zMDkgMC0zLjUxNC0xLjI4NC00LjQ4MS0yLjMxNUM0OS4xMTYgNTguNzQzIDQ4LjQyIDU4IDQ2Ljk3NyA1OGMtMS40NDEgMC0yLjEzOS43NDMtMy4wMjEgMS42ODVDNDIuOTg5IDYwLjcxNiA0MS43ODUgNjIgMzkuNDc4IDYyYy0yLjMwOSAwLTMuNTEzLTEuMjg0LTQuNDgtMi4zMTYtLjg4My0uOTQxLTEuNTgtMS42ODQtMy4wMjItMS42ODQtMS40NDEgMC0yLjEzOS43NDMtMy4wMjEgMS42ODVDMjcuOTg4IDYwLjcxNiAyNi43ODQgNjIgMjQuNDc3IDYycy0zLjUxMi0xLjI4NC00LjQ3OS0yLjMxNkMxOS4xMTYgNTguNzQzIDE4LjQyIDU4IDE2Ljk3OSA1OHMtMi4xMzguNzQzLTMuMDIgMS42ODRDMTIuOTkzIDYwLjcxNiAxMS43OSA2MiA5LjQ4MiA2MnMtMy41MTItMS4yODQtNC40NzktMi4zMTZDNC4xMjIgNTguNzQzIDMuNDI2IDU4IDEuOTg1IDU4di0yYzIuMzA4IDAgMy41MTEgMS4yODQgNC40NzggMi4zMTZDNy4zNDUgNTkuMjU3IDguMDQxIDYwIDkuNDgyIDYwYzEuNDQgMCAyLjEzNy0uNzQzIDMuMDE5LTEuNjg0Ljk2Ny0xLjAzMiAyLjE3MS0yLjMxNiA0LjQ3OC0yLjMxNnMzLjUxMSAxLjI4NCA0LjQ3OCAyLjMxNmMuODgyLjk0IDEuNTc4IDEuNjg0IDMuMDIgMS42ODRzMi4xMzgtLjc0MyAzLjAyLTEuNjg0Yy45NjYtMS4wMzIgMi4xNy0yLjMxNiA0LjQ3OS0yLjMxNnMzLjUxMyAxLjI4NCA0LjQ4IDIuMzE2Yy44ODIuOTQxIDEuNTc5IDEuNjg0IDMuMDIyIDEuNjg0IDEuNDQxIDAgMi4xMzgtLjc0MyAzLjAyLTEuNjg0Ljk2Ni0xLjAzMiAyLjE3LTIuMzE2IDQuNDc5LTIuMzE2czMuNTE0IDEuMjg0IDQuNDgxIDIuMzE1Yy44ODMuOTQyIDEuNTc5IDEuNjg1IDMuMDIyIDEuNjg1czIuMTQxLS43NDMgMy4wMjMtMS42ODVDNTguNDcyIDU3LjI4NCA1OS42NzcgNTYgNjEuOTg1IDU2djJjLTEuNDQyIDAtMi4xNC43NDMtMy4wMjIgMS42ODRDNTcuOTk1IDYwLjcxNiA1Ni43OSA2MiA1NC40OCA2MnoiLz48cGF0aCBmaWxsPSIjNEQ0RDREIiBkPSJNMjIuOTg1IDIyaDR2MmgtNHoiLz48cGF0aCBmaWxsPSIjNEQ0RDREIiBkPSJNMjIuOTg1IDI2aDR2MmgtNHoiLz48cGF0aCBmaWxsPSIjNEQ0RDREIiBkPSJNMjQuOTg1IDM4Yy0uMzM0IDAtLjY0Ni0uMTY3LS44MzItLjQ0NWwtNC02QTEgMSAwIDAgMSAyMC45ODUgMzBoOGExIDEgMCAwIDEgLjgzMiAxLjU1NGwtNCA2YS45OTguOTk4IDAgMCAxLS44MzIuNDQ2em0tMi4xMzEtNmwyLjEzMiAzLjE5N0wyNy4xMTcgMzJoLTQuMjYzeiIvPjxwYXRoIGZpbGw9IiM0RDRENEQiIGQ9Ik0zOSAzOGMtLjMzNCAwLS42NDYtLjE2Ny0uODMyLS40NDVsLTQtNkExIDEgMCAwIDEgMzUgMzBoOGExIDEgMCAwIDEgLjgzMiAxLjU1NGwtNCA2QTEgMSAwIDAgMSAzOSAzOHptLTIuMTMyLTZMMzkgMzUuMTk3IDQxLjEzMiAzMmgtNC4yNjR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTM2Ljk4NSAyMmg0djJoLTR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTIyLjk4NSAxOGg0djJoLTR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTM2Ljk4NSAxOGg0djJoLTR6Ii8+PHBhdGggZmlsbD0iIzRENEQ0RCIgZD0iTTM2Ljk4NSAyNmg0djJoLTR6Ii8+PC9nPjwvZz48bWV0YWRhdGE+PHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpyZGZzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzAxL3JkZi1zY2hlbWEjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPjxyZGY6RGVzY3JpcHRpb24gYWJvdXQ9Imh0dHBzOi8vaWNvbnNjb3V0LmNvbS9sZWdhbCNsaWNlbnNlcyIgZGM6dGl0bGU9InRpZGUtZmxvb2Qtc2VhLWxldmVsLXdhdmUtIiBkYzpkZXNjcmlwdGlvbj0idGlkZS1mbG9vZC1zZWEtbGV2ZWwtd2F2ZS0iIGRjOnB1Ymxpc2hlcj0iSWNvbnNjb3V0IiBkYzpkYXRlPSIyMDE4LTAzLTIzIiBkYzpmb3JtYXQ9ImltYWdlL3N2Zyt4bWwiIGRjOmxhbmd1YWdlPSJlbiI+PGRjOmNyZWF0b3I+PHJkZjpCYWc+PHJkZjpsaT5QZXRhaSBKYW50cmFwb29uPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 285.5851909463574,
        height: 285.5851909463572,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "#4D4D4D": "rgba(0,0,0,1)",
          "#3EBBDD": "rgba(255,255,255,1)"
        }
      }
    ],
    background: "white"
  },
  {
    id: "O_Clu7mFel",
    src: "https://cdn.shopify.com/s/files/1/0921/3231/1333/files/Screenshot_2025-02-25_130858.png?v=1740469185",
    elements: [
      {
        id: "dQhT74ih7K",
        type: "svg",
        x: -2922851764186775e-29,
        y: -11.487324881719237,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 409.6440069093682,
        height: 1091.4873248817194,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(118,0,6,1)"
        }
      },
      {
        id: "PR0pI1hMYb",
        type: "svg",
        x: 131.36532853470044,
        y: 230.73647947807166,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMCwgMTYxLCAyNTUpIiAvPjwvc3ZnPg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 481.8279776851662,
        height: 700.1543462021546,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "YjatgwcvNt",
        type: "image",
        x: 108.57142857142966,
        y: 178.2672487579807,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        width: 494.22737085714346,
        height: 741.341056285715,
        src: "https://images.unsplash.com/photo-1610732344738-33af1db78aa2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTY5OTZ8MHwxfHNlYXJjaHw3N3x8bW9kZWwlMjB3aXRoJTIwcmVkJTIwbGlwc3RpY2t8ZW58MHx8fHwxNjI4MDYwODI3&ixlib=rb-1.2.1&q=80&w=1080",
        cropX: 0,
        cropY: 0,
        cropWidth: 0.9999999999999998,
        cropHeight: 0.9999999999999996,
        flipX: false,
        flipY: false,
        clipSrc: "",
        borderColor: "black",
        borderSize: 0
      },
      {
        id: "U7W7GhnLVH",
        type: "text",
        x: 561.1520737327195,
        y: 94.22853908056135,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Summer",
        placeholder: "",
        fontSize: 124,
        fontFamily: "Dancing Script",
        fontStyle: "normal",
        fontWeight: "bold",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 540,
        height: 148.79999999999998,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "uElrW8-7SA",
        type: "text",
        x: 561.1520737327197,
        y: 230.73647947807171,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "SALE",
        placeholder: "",
        fontSize: 114,
        fontFamily: "Abhaya Libre",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 540,
        height: 136.79999999999998,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "099Y2-Uwft",
        type: "text",
        x: 694.8387097074198,
        y: 426.25633755914055,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
        placeholder: "",
        fontSize: 30,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 323.5023041674648,
        height: 108,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "3WPJIHLSrD",
        type: "text",
        x: 131.36532853470044,
        y: 982.4876315518046,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        text: "Shop Now",
        placeholder: "",
        fontSize: 61,
        fontFamily: "Abhaya Libre",
        fontStyle: "normal",
        fontWeight: "normal",
        textDecoration: "",
        fill: "black",
        align: "center",
        width: 540,
        height: 73.2,
        strokeWidth: 0,
        stroke: "black",
        lineHeight: 1.2,
        letterSpacing: 0
      },
      {
        id: "1iXMFTM1aY",
        type: "svg",
        x: 1267.3796162722597,
        y: 752.7566575179422,
        rotation: 105.46495586756573,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ3LjUgNDcuNSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDcuNSA0Ny41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgdmVyc2lvbj0iMS4xIiBpZD0ic3ZnMiI+PGRlZnMgaWQ9ImRlZnM2Ij48Y2xpcFBhdGggaWQ9ImNsaXBQYXRoMTYiIGNsaXBQYXRoVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBpZD0icGF0aDE4IiBkPSJNIDAsMzggMzgsMzggMzgsMCAwLDAgMCwzOCBaIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMS4yNSwwLDAsLTEuMjUsMCw0Ny41KSIgaWQ9ImcxMCI+PGcgaWQ9ImcxMiI+PGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXBQYXRoMTYpIiBpZD0iZzE0Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNiwyNSkiIGlkPSJnMjAiPjxwYXRoIGlkPSJwYXRoMjIiIHN0eWxlPSJmaWxsOiNiZGRkZjQ7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiIGQ9Im0gMCwwIGMgMCwzLjg2NiAtMy4xMzQsNyAtNyw3IC0xLjE2NywwIC0yLjI2NSwtMC4yOSAtMy4yMzIsLTAuNzk0IC0yLjA4MiwyLjgyNyAtNS40MjUsNC42NjkgLTkuMjA2LDQuNjY5IC01LjEzMiwwIC05LjQ3NCwtMy4zOCAtMTAuOTIyLC04LjAzNiBDIC0zMy4wMTgsMi4yMjIgLTM1LC0wLjE1NSAtMzUsLTMgYyAwLC0yLjk3OSAyLjE3NCwtNS40NDUgNS4wMjEsLTUuOTEzIDAuMjE2LC0zLjk0OSAzLjQ3NywtNy4wODcgNy40NzksLTcuMDg3IDIuMTc2LDAgNC4xMywwLjkzMyA1LjUsMi40MTMgMS4zNywtMS40OCAzLjMyMywtMi40MTMgNS41LC0yLjQxMyA0LjE0MywwIDcuNSwzLjM1NyA3LjUsNy41IDAsMC43MSAtMC4xMDUsMS4zOTQgLTAuMjg5LDIuMDQ1IEMgLTEuNzcsLTUuMzk2IDAsLTIuOTA1IDAsMCIvPjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4LDYpIiBpZD0iZzI0Ij48cGF0aCBpZD0icGF0aDI2IiBzdHlsZT0iZmlsbDojYmRkZGY0O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIiBkPSJtIDAsMCBjIDAsLTEuNjU3IC0xLjM0MywtMyAtMywtMyAtMS42NTcsMCAtMywxLjM0MyAtMywzIDAsMS42NTcgMS4zNDMsMyAzLDMgMS42NTcsMCAzLC0xLjM0MyAzLC0zIi8+PC9nPjwvZz48L2c+PC9nPgoJCgk8bWV0YWRhdGE+CgkJPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpyZGZzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzAxL3JkZi1zY2hlbWEjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgoJCQk8cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJCYWxsb29uLCBCdWJibGUsIENvbWljLCBUaG91Z2h0IiBkYzpkZXNjcmlwdGlvbj0iQmFsbG9vbiwgQnViYmxlLCBDb21pYywgVGhvdWdodCIgZGM6cHVibGlzaGVyPSJJY29uc2NvdXQiIGRjOmRhdGU9IjIwMTYtMTItMTQiIGRjOmZvcm1hdD0iaW1hZ2Uvc3ZnK3htbCIgZGM6bGFuZ3VhZ2U9ImVuIj4KCQkJCTxkYzpjcmVhdG9yPgoJCQkJCTxyZGY6QmFnPgoJCQkJCQk8cmRmOmxpPlR3aXR0ZXIgRW1vamk8L3JkZjpsaT4KCQkJCQk8L3JkZjpCYWc+CgkJCQk8L2RjOmNyZWF0b3I+CgkJCTwvcmRmOkRlc2NyaXB0aW9uPgoJCTwvcmRmOlJERj4KICAgIDwvbWV0YWRhdGE+PC9zdmc+Cg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 561.8581612333472,
        height: 561.8581612333471,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(189, 221, 244)": "rgba(209,200,208,1)"
        }
      },
      {
        id: "dEr0bPKU3V",
        type: "svg",
        x: 471.4936991731415,
        y: 1036.9392456411524,
        rotation: -19.859771366711293,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ3LjUgNDcuNSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDcuNSA0Ny41OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgdmVyc2lvbj0iMS4xIiBpZD0ic3ZnMiI+PGRlZnMgaWQ9ImRlZnM2Ij48Y2xpcFBhdGggaWQ9ImNsaXBQYXRoMTYiIGNsaXBQYXRoVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBpZD0icGF0aDE4IiBkPSJNIDAsMzggMzgsMzggMzgsMCAwLDAgMCwzOCBaIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMS4yNSwwLDAsLTEuMjUsMCw0Ny41KSIgaWQ9ImcxMCI+PGcgaWQ9ImcxMiI+PGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXBQYXRoMTYpIiBpZD0iZzE0Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNiwyNSkiIGlkPSJnMjAiPjxwYXRoIGlkPSJwYXRoMjIiIHN0eWxlPSJmaWxsOiNiZGRkZjQ7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiIGQ9Im0gMCwwIGMgMCwzLjg2NiAtMy4xMzQsNyAtNyw3IC0xLjE2NywwIC0yLjI2NSwtMC4yOSAtMy4yMzIsLTAuNzk0IC0yLjA4MiwyLjgyNyAtNS40MjUsNC42NjkgLTkuMjA2LDQuNjY5IC01LjEzMiwwIC05LjQ3NCwtMy4zOCAtMTAuOTIyLC04LjAzNiBDIC0zMy4wMTgsMi4yMjIgLTM1LC0wLjE1NSAtMzUsLTMgYyAwLC0yLjk3OSAyLjE3NCwtNS40NDUgNS4wMjEsLTUuOTEzIDAuMjE2LC0zLjk0OSAzLjQ3NywtNy4wODcgNy40NzksLTcuMDg3IDIuMTc2LDAgNC4xMywwLjkzMyA1LjUsMi40MTMgMS4zNywtMS40OCAzLjMyMywtMi40MTMgNS41LC0yLjQxMyA0LjE0MywwIDcuNSwzLjM1NyA3LjUsNy41IDAsMC43MSAtMC4xMDUsMS4zOTQgLTAuMjg5LDIuMDQ1IEMgLTEuNzcsLTUuMzk2IDAsLTIuOTA1IDAsMCIvPjwvZz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4LDYpIiBpZD0iZzI0Ij48cGF0aCBpZD0icGF0aDI2IiBzdHlsZT0iZmlsbDojYmRkZGY0O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIiBkPSJtIDAsMCBjIDAsLTEuNjU3IC0xLjM0MywtMyAtMywtMyAtMS42NTcsMCAtMywxLjM0MyAtMywzIDAsMS42NTcgMS4zNDMsMyAzLDMgMS42NTcsMCAzLC0xLjM0MyAzLC0zIi8+PC9nPjwvZz48L2c+PC9nPgoJCgk8bWV0YWRhdGE+CgkJPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpyZGZzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzAxL3JkZi1zY2hlbWEjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgoJCQk8cmRmOkRlc2NyaXB0aW9uIGFib3V0PSJodHRwczovL2ljb25zY291dC5jb20vbGVnYWwjbGljZW5zZXMiIGRjOnRpdGxlPSJCYWxsb29uLCBCdWJibGUsIENvbWljLCBUaG91Z2h0IiBkYzpkZXNjcmlwdGlvbj0iQmFsbG9vbiwgQnViYmxlLCBDb21pYywgVGhvdWdodCIgZGM6cHVibGlzaGVyPSJJY29uc2NvdXQiIGRjOmRhdGU9IjIwMTYtMTItMTQiIGRjOmZvcm1hdD0iaW1hZ2Uvc3ZnK3htbCIgZGM6bGFuZ3VhZ2U9ImVuIj4KCQkJCTxkYzpjcmVhdG9yPgoJCQkJCTxyZGY6QmFnPgoJCQkJCQk8cmRmOmxpPlR3aXR0ZXIgRW1vamk8L3JkZjpsaT4KCQkJCQk8L3JkZjpCYWc+CgkJCQk8L2RjOmNyZWF0b3I+CgkJCTwvcmRmOkRlc2NyaXB0aW9uPgoJCTwvcmRmOlJERj4KICAgIDwvbWV0YWRhdGE+PC9zdmc+Cg==",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 561.8581612333472,
        height: 561.8581612333471,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(189, 221, 244)": "rgba(180,171,179,1)"
        }
      },
      {
        id: "Q-MqpKOUFL",
        type: "svg",
        x: 694.8387097074199,
        y: 958.8426207487131,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 173.64501080309063,
        height: 173.64501080309063,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(118,0,6,1)"
        }
      },
      {
        id: "UlqdzIFfs8",
        type: "svg",
        x: 56.36532853470055,
        y: 844.6083050436957,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMjgiIHN0cm9rZT0icmdiYSg5OCwgMTk3LCAyNTUsIDEpIiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 150,
        height: 150,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgba(98, 197, 255, 1)": "rgba(0,0,0,1)"
        }
      },
      {
        id: "v0GkSRSGIE",
        type: "svg",
        x: 314.54282314315526,
        y: -86.82250540154533,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InJnYigwLCAxNjEsIDI1NSkiIC8+PC9zdmc+",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: false,
        flipX: false,
        flipY: false,
        width: 173.64501080309063,
        height: 173.64501080309063,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          "rgb(0, 161, 255)": "rgba(180,171,179,1)"
        }
      },
      {
        id: "swYYcTAoga",
        type: "svg",
        x: -7.634671465299334,
        y: 484.93777690083834,
        rotation: 0,
        opacity: 1,
        locked: false,
        blurEnabled: false,
        blurRadius: 10,
        brightnessEnabled: false,
        brightness: 0,
        sepiaEnabled: false,
        grayscaleEnabled: false,
        shadowEnabled: false,
        shadowBlur: 5,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: "black",
        src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iRG90c190aHJlZV92ZXJ0aWNhbCIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHBhdGggZD0iTTEwLjAwMSA3LjhhMi4yIDIuMiAwIDEgMCAwIDQuNDAyQTIuMiAyLjIgMCAwIDAgMTAgNy44em0wLTIuNkEyLjIgMi4yIDAgMSAwIDkuOTk5LjhhMi4yIDIuMiAwIDAgMCAuMDAyIDQuNHptMCA5LjZhMi4yIDIuMiAwIDEgMCAwIDQuNDAyIDIuMiAyLjIgMCAwIDAgMC00LjQwMnoiLz48bWV0YWRhdGE+PHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpyZGZzPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzAxL3JkZi1zY2hlbWEjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPjxyZGY6RGVzY3JpcHRpb24gYWJvdXQ9Imh0dHBzOi8vaWNvbnNjb3V0LmNvbS9sZWdhbCNsaWNlbnNlcyIgZGM6dGl0bGU9ImRvdHMsdGhyZWUsdmVydGljYWwiIGRjOmRlc2NyaXB0aW9uPSJkb3RzLHRocmVlLHZlcnRpY2FsIiBkYzpwdWJsaXNoZXI9Ikljb25zY291dCIgZGM6ZGF0ZT0iMjAxNy0wOS0xNCIgZGM6Zm9ybWF0PSJpbWFnZS9zdmcreG1sIiBkYzpsYW5ndWFnZT0iZW4iPjxkYzpjcmVhdG9yPjxyZGY6QmFnPjxyZGY6bGk+RGFuaWVsIEJydWNlPC9yZGY6bGk+PC9yZGY6QmFnPjwvZGM6Y3JlYXRvcj48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC9tZXRhZGF0YT48L3N2Zz4=",
        maskSrc: "",
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        keepRatio: true,
        flipX: false,
        flipY: false,
        width: 128,
        height: 128,
        borderColor: "black",
        borderSize: 0,
        colorsReplace: {
          black: "rgba(255,255,255,1)"
        }
      }
    ],
    background: "white"
  }
];
const generateShortId = () => Math.random().toString(36).substr(2, 6);
const useImage = (src) => {
  const [image, setImage] = useState(null);
  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
  }, [src]);
  return image;
};
const TemplateSelector = ({
  onSelectTemplate,
  setIsEditingTemplate,
  setCurrentTab
}) => /* @__PURE__ */ jsxs(
  "div",
  {
    style: {
      padding: "30px",
      width: "80%",
      background: "#ffffff",
      // Set background to white
      overflowY: "auto",
      borderRadius: "20px",
      height: "80%",
      justifyContent: "center",
      flexDirection: "column",
      margin: "0 auto"
    },
    children: [
      /* @__PURE__ */ jsx("h2", { style: { fontSize: "16px", marginBottom: "10px", textAlign: "center" }, children: "Select a Template" }),
      /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "20px",
            placeItems: "center"
          },
          children: templates.map((template) => /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                height: "auto",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              onClick: () => {
                onSelectTemplate(template);
                setIsEditingTemplate(true);
                setCurrentTab("text");
              },
              children: template.src ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: template.src,
                  alt: template.name,
                  style: { width: "100px", height: "150px", objectFit: "contain" }
                }
              ) : /* @__PURE__ */ jsx(Fragment, { children: template == null ? void 0 : template.name })
            },
            template.id
          ))
        }
      )
    ]
  }
);
const EditableShape = ({
  shape,
  isSelected,
  onSelect,
  onChange,
  onDragMove
}) => {
  const shapeRef = useRef();
  const trRef = useRef();
  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  const handleTransform = () => {
    const node = shapeRef.current;
    const newAttrs = {
      x: node.x(),
      y: node.y(),
      scaleX: 1,
      scaleY: 1
    };
    if (shape.subType === "rect") {
      newAttrs.width = Math.max(5, node.width() * node.scaleX());
      newAttrs.height = Math.max(5, node.height() * node.scaleY());
    } else if (shape.subType === "circle") {
      newAttrs.radius = Math.max(5, node.width() * node.scaleX() / 2);
    } else if (shape.subType === "ellipse") {
      newAttrs.radiusX = Math.max(5, node.width() * node.scaleX() / 2);
      newAttrs.radiusY = Math.max(5, node.height() * node.scaleY() / 2);
    } else if (shape.subType === "line" || shape.subType === "arrow" || shape.subType === "curved-arrow") {
      newAttrs.points = node.points();
    } else if (shape.subType === "star") {
      newAttrs.numPoints = shape.numPoints;
      newAttrs.innerRadius = Math.max(5, shape.innerRadius * node.scaleX());
      newAttrs.outerRadius = Math.max(5, shape.outerRadius * node.scaleY());
    }
    onChange(newAttrs);
  };
  const shapeProps = {
    ...shape,
    ref: shapeRef,
    id: shape.id,
    draggable: isSelected,
    onClick: onSelect,
    onTap: onSelect,
    onTransformEnd: handleTransform,
    onDragMove
  };
  let ShapeComponent;
  switch (shape.subType) {
    case "rect":
      ShapeComponent = /* @__PURE__ */ jsx(Rect, { ...shapeProps });
      break;
    case "circle":
      ShapeComponent = /* @__PURE__ */ jsx(Circle, { ...shapeProps });
      break;
    case "ellipse":
      ShapeComponent = /* @__PURE__ */ jsx(Ellipse, { ...shapeProps });
      break;
    case "line":
      ShapeComponent = /* @__PURE__ */ jsx(Line, { ...shapeProps });
      break;
    case "arrow":
    case "curved-arrow":
      ShapeComponent = /* @__PURE__ */ jsx(Arrow, { ...shapeProps });
      break;
    case "star":
      ShapeComponent = /* @__PURE__ */ jsx(Star, { ...shapeProps });
      break;
    default:
      return null;
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    ShapeComponent,
    isSelected && /* @__PURE__ */ jsx(Transformer, { ref: trRef })
  ] });
};
const EditableText = ({
  element,
  selected,
  onSelect,
  updateElement,
  onDragMove
}) => {
  const shapeRef = useRef(null);
  const trRef = useRef(null);
  const textInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [text2, setText] = useState(element.text);
  const [fontLoaded, setFontLoaded] = useState(false);
  useEffect(() => {
    setText(element.text);
  }, [element.text]);
  useEffect(() => {
    var _a2;
    if (selected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      (_a2 = trRef.current.getLayer()) == null ? void 0 : _a2.batchDraw();
    }
  }, [selected, text2]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("webfontloader").then((WebFont) => {
        WebFont.load({
          google: {
            families: [element.fontFamily]
          },
          active: () => {
            setFontLoaded(true);
            setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 100);
          },
          inactive: () => setFontLoaded(false)
        });
      });
    }
  }, [element.fontFamily]);
  const handleTextChange = ({ target: { value } }) => setText(value);
  const handleBlur = () => {
    if (text2 !== element.text) {
      updateElement(element.id, "text", text2);
    }
    setIsEditing(false);
  };
  const inputStyles = {
    position: "absolute",
    top: element.y,
    left: element.x,
    fontFamily: element.fontFamily || "Roboto",
    fontWeight: element.fontWeight,
    color: element.fill,
    background: "transparent",
    border: "1px solid gray",
    outline: "none",
    resize: "both",
    padding: "2px",
    width: `${element.width || Math.max(text2.length * element.fontSize * 0.6, 50)}px`,
    height: `${element.height || element.fontSize * 1.5}px`,
    ...element
  };
  useEffect(() => {
    console.log("fontLoaded", fontLoaded);
  }, [fontLoaded]);
  console.log(`${element.fontStyle} ${element.fontWeight}`);
  let fontStyle = "";
  if (element.fontStyle === "italic" && element.fontWeight === "bold") {
    fontStyle = "italic bold";
  } else if (element.fontStyle === "italic") {
    fontStyle = "italic";
  } else if (element.fontWeight === "bold") {
    fontStyle = "bold";
  } else {
    fontStyle = "normal";
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    element.type === "text" && isEditing ? /* @__PURE__ */ jsx(Html, { children: /* @__PURE__ */ jsx(
      "input",
      {
        ref: textInputRef,
        value: text2,
        onChange: handleTextChange,
        onBlur: handleBlur,
        style: inputStyles,
        autoFocus: true
      }
    ) }) : /* @__PURE__ */ jsx(
      Text$1,
      {
        ...element,
        text: text2,
        ref: shapeRef,
        onClick: onSelect,
        fontStyle,
        fontSize: element.fontSize,
        width: element.width,
        onDblClick: () => setIsEditing(true),
        draggable: selected,
        height: element.height,
        align: element.align,
        fontFamily: fontLoaded ? element.fontFamily : element.fontFamily,
        onTransform: () => {
          const node = shapeRef.current;
          const transformer = trRef.current;
          if (node && transformer) {
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            console.log("current transformer", transformer);
            const newWidth = node.width() * scaleX;
            const newFontSize = Math.max(12, element.fontSize * scaleY);
            const newHeight = node.height() * scaleY;
            node.width(newWidth);
            node.height(newHeight);
            node.fontSize(newFontSize);
            node.scaleX(1);
            node.scaleY(1);
          }
        },
        onTransformEnd: () => {
          const node = shapeRef.current;
          if (node) {
            updateElement(element.id, {
              x: node.x(),
              y: node.y(),
              width: node.width(),
              height: node.height(),
              fontSize: node.fontSize()
            });
          }
        },
        onDragMove
      }
    ),
    selected && shapeRef.current && /* @__PURE__ */ jsx(
      Transformer,
      {
        ref: trRef,
        anchorSize: 16,
        enabledAnchors: [
          "top-left",
          "top-right",
          "middle-left",
          "middle-right",
          "bottom-left",
          "bottom-right",
          "bottom-center"
        ]
      }
    )
  ] });
};
const EditableImage = ({
  imageProps,
  isSelected,
  onSelect,
  onChange,
  onDragMove
}) => {
  const img = useImage(imageProps.src);
  const shapeRef = useRef(null);
  const trRef = useRef(null);
  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      Image,
      {
        width: imageProps.width,
        height: imageProps.height,
        x: imageProps.x,
        y: imageProps.y,
        rotation: imageProps.rotation,
        borderColor: imageProps == null ? void 0 : imageProps.borderColor,
        borderSize: imageProps == null ? void 0 : imageProps.borderSize,
        image: img,
        ref: shapeRef,
        opacity: imageProps.opacity,
        shadowBlur: imageProps.shadowBlur,
        shadowColor: imageProps.shadowColor,
        draggable: isSelected,
        onClick: onSelect,
        onTap: onSelect,
        onDragMove,
        onTransformEnd: (e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          onChange({
            ...imageProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            scaleX: 1,
            scaleY: 1
          });
        }
      }
    ),
    isSelected && /* @__PURE__ */ jsx(Transformer, { ref: trRef })
  ] });
};
const CircleWithImage = ({ el, index: index2, selectedId, handleSelectElement }) => {
  const image = useImage(el.src);
  console.log(el.src, "image");
  const isSelected = selectedId === el.id;
  return /* @__PURE__ */ jsxs(
    Group,
    {
      x: el.x,
      y: el.y,
      onClick: () => handleSelectElement(el.id),
      clipFunc: (ctx) => {
        ctx.beginPath();
        ctx.arc(el.radius, el.radius, el.radius, 0, Math.PI * 2, false);
        ctx.closePath();
      },
      children: [
        /* @__PURE__ */ jsx(
          Circle,
          {
            radius: el.radius,
            fill: "transparent",
            stroke: isSelected ? "black" : "white",
            draggable: true,
            strokeWidth: 5
          }
        ),
        image && /* @__PURE__ */ jsx(
          Image,
          {
            image,
            width: el.radius * 2,
            height: el.radius * 2,
            x: 0,
            y: 0,
            listening: false
          }
        )
      ]
    },
    el.id
  );
};
const SvgElement = ({ props, isSelected, onSelect, onDragMove }) => {
  console.log("isSelected", isSelected);
  const [image, setImage] = useState(null);
  const trRef = useRef(null);
  const shapeRef = useRef(null);
  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  useEffect(() => {
    if (!props.src || !props.colorsReplace) return;
    let svgString = atob(props.src.split(",")[1]);
    console.log(svgString, "svgString");
    Object.entries(props.colorsReplace).forEach(([oldColor, newColor]) => {
      console.log(oldColor, "-->", newColor);
      const colorRegex = new RegExp(
        oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      svgString = svgString.replace(colorRegex, newColor);
    });
    const updatedBase64 = `data:image/svg+xml;base64,${btoa(svgString)}`;
    const img = new window.Image();
    img.src = updatedBase64;
    img.onload = () => setImage(img);
  }, [props.src, props.colorsReplace]);
  return image && /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      Image,
      {
        image,
        x: props.x,
        y: props.y,
        ref: shapeRef,
        width: props.width,
        height: props.height,
        opacity: props.opacity,
        rotation: props.rotation,
        draggable: true,
        onClick: onSelect,
        onTap: onSelect,
        onDragMove
      }
    ),
    isSelected && /* @__PURE__ */ jsx(Transformer, { ref: trRef })
  ] });
};
const CanvasEditor = () => {
  var _a2, _b;
  const stageRef = useRef(null);
  useRef(null);
  const location = useLocation();
  const pin_style = useSelector((state) => state.new_pin.data.style);
  console.log(pin_style, "pin style");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProduct = (_a2 = location.state) == null ? void 0 : _a2.product;
  const featuredImage = (_b = selectedProduct == null ? void 0 : selectedProduct.node) == null ? void 0 : _b.featuredImage;
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [elements, setElements] = useState(pin_style || []);
  const [selectedId, setSelectedId] = useState(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [images, setImages] = useState([{ preview: featuredImage == null ? void 0 : featuredImage.url }]);
  const [currentTab, setCurrentTab] = useState("template");
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setElements(template.elements);
    setSelectedId(null);
  };
  const pin = useSelector((state) => state.new_pin.data);
  console.log(pin, "pin");
  const handleSelectElement = (id) => {
    console.log("clicked");
    selectedId === id ? setSelectedId(null) : setSelectedId(id);
  };
  const addElement = (type, url) => {
    const newElement = {
      id: generateShortId(),
      type,
      x: 175,
      y: 300,
      ...type === "text" ? {
        text: "New Text",
        fontSize: 100,
        fontFamily: "Arial",
        fill: "#fff"
      } : { src: url }
      // Ensure width & height
    };
    setElements((prevElements) => [...prevElements, newElement]);
    setTimeout(() => handleSelectElement(newElement.id), 0);
  };
  const addShape = (type, shape) => {
    const newElement = {
      id: generateShortId(),
      type,
      ...shape
    };
    setElements((prevElements) => [...prevElements, newElement]);
    setTimeout(() => handleSelectElement(newElement.id), 0);
  };
  const deleteElement = () => {
    setElements(
      (prevElements) => prevElements == null ? void 0 : prevElements.filter((el) => el.id !== selectedId)
    );
  };
  const updateElement = (id, key, value) => {
    setElements(
      (prev) => prev.map((el) => {
        if (id === el.id) {
          return { ...el, [key]: value };
        }
        return el;
      })
    );
  };
  const onDragMove = (e) => {
    setElements(
      (prev) => prev.map(
        (el) => el.id === selectedId ? { ...el, x: e.target.x(), y: e.target.y() } : el
      )
    );
  };
  useEffect(() => {
    !pin_style && handleSelectTemplate(templates[0]);
  }, []);
  const handleSave = () => {
    setSelectedId(null);
    if (stageRef.current) {
      const base64 = stageRef.current.toDataURL({
        mimeType: "image/png",
        // Define the MIME type
        quality: 1,
        // Define the image quality (1 = highest quality)
        pixelRatio: 2
        // Use a higher pixel ratio for better resolution
      });
      dispatch(
        setData({
          ...pin,
          edited_pin_base64: base64,
          style: elements
        })
      );
      navigate("/app/create_pin");
    }
  };
  useEffect(() => {
    console.log(selectedTemplate, "selected template");
  }, [selectedTemplate]);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(
      SideBar,
      {
        setCurrentTab,
        selectedTemplate
      }
    ),
    /* @__PURE__ */ jsx(
      Page,
      {
        title: "Canvas Editor",
        primaryAction: {
          content: "Save",
          onAction: handleSave
        }
      }
    ),
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "80%",
          margin: "0 auto"
        },
        children: currentTab === "template" ? /* @__PURE__ */ jsx(
          TemplateSelector,
          {
            onSelectTemplate: handleSelectTemplate,
            setIsEditingTemplate,
            setCurrentTab
          }
        ) : currentTab === "uploads" ? /* @__PURE__ */ jsx(Uploads, { setImages, images }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          currentTab === "text" && /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "20px"
              },
              children: [
                /* @__PURE__ */ jsx(
                  ComponentsBar,
                  {
                    addElement,
                    deleteElement
                  }
                ),
                /* @__PURE__ */ jsx(
                  Toolbar,
                  {
                    updateElement,
                    id: selectedId,
                    element: elements == null ? void 0 : elements.find((el) => el.id === selectedId)
                  }
                )
              ]
            }
          ) }),
          currentTab === "photos" && /* @__PURE__ */ jsx(Photos, { images, addElement }),
          currentTab === "shapes" && /* @__PURE__ */ jsx(Shapes, { addShape }),
          /* @__PURE__ */ jsx(
            Editor,
            {
              selectedTemplate,
              elements,
              setElements,
              selectedId,
              handleSelectElement,
              updateElement,
              onDragMove,
              stageRef,
              images
            }
          )
        ] })
      }
    )
  ] });
};
const Editor = ({
  selectedTemplate,
  elements,
  setElements,
  selectedId,
  handleSelectElement,
  updateElement,
  onDragMove,
  stageRef,
  images
}) => {
  images[0];
  const [isEditing, setIsEditing] = useState();
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Delete" && selectedId) {
        setElements(
          (prevElements) => prevElements == null ? void 0 : prevElements.filter((el) => el.id !== selectedId)
        );
        handleSelectElement(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedId, setElements, handleSelectElement]);
  return /* @__PURE__ */ jsx("div", { className: "canvas-editor", children: /* @__PURE__ */ jsx(Stage, { width: 1080, height: 1080, ref: stageRef, children: /* @__PURE__ */ jsxs(Layer, { children: [
    selectedTemplate && /* @__PURE__ */ jsx(
      Rect,
      {
        fill: selectedTemplate.background,
        width: 1080,
        height: 1080,
        draggable: true,
        onDragMove
      }
    ),
    elements == null ? void 0 : elements.map((el) => {
      switch (el.type) {
        case "text":
          return /* @__PURE__ */ jsx(
            EditableText,
            {
              id: el.id,
              element: el,
              selected: selectedId === el.id,
              onSelect: () => handleSelectElement(el.id),
              updateElement: () => updateElement(el.id),
              onDragMove
            },
            el.id
          );
        case "image":
          return (
            /*  */
            /* @__PURE__ */ jsx(
              EditableImage,
              {
                id: el.id,
                imageProps: { ...el },
                isSelected: selectedId === el.id,
                onSelect: () => handleSelectElement(el.id),
                onChange: (newAttrs) => updateElement(el.id, newAttrs),
                onDragMove
              },
              el.id
            )
          );
        case "rect":
          return /* @__PURE__ */ jsx(
            Rect,
            {
              id: el.id,
              ...el,
              onClick: () => handleSelectElement(el.id),
              isSelected: selectedId === el.id,
              onSelect: () => handleSelectElement(el.id),
              onDragMove,
              draggable: selectedId === el.id
            },
            el.id
          );
        case "circle":
          return /* @__PURE__ */ jsx(
            CircleWithImage,
            {
              id: el.id,
              el,
              index: el.id,
              selectedId,
              handleSelectElement,
              onDragMove
            },
            el.id
          );
        case "shape":
          return /* @__PURE__ */ jsx(
            EditableShape,
            {
              isSelected: selectedId === el.id,
              onSelect: () => handleSelectElement(el.id),
              shape: el,
              onDragMove
            },
            el.id
          );
        case "svg":
          return /* @__PURE__ */ jsx(
            SvgElement,
            {
              props: el,
              isSelected: selectedId === el.id,
              onDragMove,
              onSelect: () => handleSelectElement(el.id)
            },
            el.id
          );
      }
    })
  ] }) }) });
};
function EditorWrapper$1() {
  return /* @__PURE__ */ jsx(CanvasEditor, {});
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: EditorWrapper$1
}, Symbol.toStringTag, { value: "Module" }));
function CreatePin(props) {
  var _a2, _b, _c, _d, _e, _f, _g;
  const location = useLocation();
  const navigate = useNavigate();
  const Boardfetcher = useFetcher();
  let { product } = location.state ?? {};
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const new_pin_data = useSelector((state) => {
    var _a3;
    return (_a3 = state.new_pin) == null ? void 0 : _a3.data;
  });
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const bridge = useAppBridge();
  bridge.config.shop;
  useEffect(() => {
    var _a3, _b2, _c2;
    toDataUrl(
      (new_pin_data == null ? void 0 : new_pin_data.edited_pin_base64) ? new_pin_data == null ? void 0 : new_pin_data.edited_pin_base64 : (_c2 = (_b2 = (_a3 = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _a3.node) == null ? void 0 : _b2.featuredImage) == null ? void 0 : _c2.url,
      function(myBase64) {
        dispatch(setData({ ...new_pin_data, product_image_base64: myBase64 }));
      }
    );
    Boardfetcher.submit(
      { access_key: user == null ? void 0 : user.accessToken },
      { method: "post", action: "/api/pinterest/boards" }
    );
  }, []);
  useEffect(() => {
    var _a3;
    let b = [{ label: "Select", value: "" }];
    Object.values(((_a3 = Boardfetcher == null ? void 0 : Boardfetcher.data) == null ? void 0 : _a3.items) ?? []).map((row) => {
      b.push({ label: row.name, value: row.id });
    });
    if (new_pin_data == null ? void 0 : new_pin_data.board_id) ;
    else {
      if (Object.keys(b).length > 0) {
        dispatch(setData({ ...new_pin_data, board_id: b[0].value }));
      }
    }
    setBoards(b);
  }, [Boardfetcher == null ? void 0 : Boardfetcher.data]);
  const handleSubmit = (e) => {
    setLoading(true);
    if ((new_pin_data == null ? void 0 : new_pin_data.title) == "") {
      shopify.toast.show("Please enter the title");
      setLoading(false);
    } else if ((new_pin_data == null ? void 0 : new_pin_data.description) == "") {
      shopify.toast.show("Please enter the description");
      setLoading(false);
    } else if ((new_pin_data == null ? void 0 : new_pin_data.destination_url) == "" || (new_pin_data == null ? void 0 : new_pin_data.destination_url) == null) {
      shopify.toast.show("Please enter the destination url");
      setLoading(false);
    } else if ((new_pin_data == null ? void 0 : new_pin_data.board_id) == null || (new_pin_data == null ? void 0 : new_pin_data.board_id) == "") {
      shopify.toast.show("Please select a board");
      setLoading(false);
    } else {
      navigate("/app/preview_and_publish");
    }
  };
  const handleChangeBoard = (value) => {
    dispatch(setData({ ...new_pin_data, board_id: value }));
  };
  return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
    Page,
    {
      style: { display: "block" },
      title: "Create Pin",
      fullWidth: true,
      subtitle: "Create and customize your Pinterest pin",
      compactTitle: true,
      children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(Form, { onSubmit: handleSubmit, children: /* @__PURE__ */ jsx("div", { style: { padding: "1.5rem" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "60px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { width: "60%" }, children: [
            /* @__PURE__ */ jsx("div", { style: { marginTop: "30px" }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                value: new_pin_data == null ? void 0 : new_pin_data.title,
                defaultValue: (_a2 = product == null ? void 0 : product.node) == null ? void 0 : _a2.title,
                onChange: (value) => {
                  if (value) {
                    if (value.length <= 100) {
                      dispatch(
                        setData({ ...new_pin_data, title: value })
                      );
                    }
                  }
                },
                label: "PIN Title",
                type: "text",
                placeholder: "Enter the title",
                autoComplete: "text",
                maxLength: 100,
                minLength: 0,
                helpText: /* @__PURE__ */ jsxs("span", { children: [
                  100 - ((_b = new_pin_data == null ? void 0 : new_pin_data.title) == null ? void 0 : _b.length),
                  " characters left"
                ] })
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: "15px" }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                value: new_pin_data == null ? void 0 : new_pin_data.description,
                defaultValue: (_c = product == null ? void 0 : product.node) == null ? void 0 : _c.description,
                onChange: (value) => {
                  if (value) {
                    if (value.length <= 700) {
                      dispatch(
                        setData({ ...new_pin_data, description: value })
                      );
                    }
                  }
                },
                label: "Description",
                type: "text",
                multiline: 8,
                maxLength: 500,
                helpText: /* @__PURE__ */ jsxs("span", { children: [
                  700 - ((_d = new_pin_data == null ? void 0 : new_pin_data.description) == null ? void 0 : _d.length),
                  " characters left"
                ] })
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: "15px" }, children: /* @__PURE__ */ jsx(
              TextField,
              {
                value: new_pin_data == null ? void 0 : new_pin_data.destination_url,
                onChange: (value) => {
                  dispatch(
                    setData({ ...new_pin_data, destination_url: value })
                  );
                },
                def: true,
                label: "Destination URL",
                type: "text",
                placeholder: "Enter the URL",
                error: (new_pin_data == null ? void 0 : new_pin_data.destination_url) && !isValidURL(new_pin_data == null ? void 0 : new_pin_data.destination_url) ? "Please enter a valid URL" : void 0
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: "15px" }, children: /* @__PURE__ */ jsx(
              Select,
              {
                label: "Pinterest Board Selection",
                options: boards,
                onChange: (value) => {
                  handleChangeBoard(value);
                },
                value: `${new_pin_data == null ? void 0 : new_pin_data.board_id}`
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { width: "40%" }, children: [
            (new_pin_data == null ? void 0 : new_pin_data.edited_pin_base64) == null ? /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  // background: "#E6E1D2",
                  width: "100%",
                  padding: "30px"
                },
                children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      style: {
                        width: "100%",
                        height: "100px",
                        // background: "#C0B5B3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      },
                      children: /* @__PURE__ */ jsx(Text, { as: "h1", variant: "heading2xl", fontWeight: "bold", children: new_pin_data == null ? void 0 : new_pin_data.title })
                    }
                  ),
                  /* @__PURE__ */ jsx("div", { style: { width: "100%" }, children: /* @__PURE__ */ jsx(
                    "img",
                    {
                      style: { width: "100%" },
                      src: (_g = (_f = (_e = new_pin_data == null ? void 0 : new_pin_data.product) == null ? void 0 : _e.node) == null ? void 0 : _f.featuredImage) == null ? void 0 : _g.url
                    }
                  ) })
                ]
              }
            ) : /* @__PURE__ */ jsx(
              "div",
              {
                children: /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: new_pin_data == null ? void 0 : new_pin_data.edited_pin_base64,
                    style: { width: "100%" }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsx("div", {})
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              marginTop: "30px",
              display: "flex",
              gap: "15px",
              justifyContent: "center"
            },
            children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  to: "select_product",
                  variant: "primary",
                  tone: "critical",
                  size: "large",
                  type: "button",
                  onClick: () => {
                    navigate("/app");
                  },
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  to: "select_product",
                  size: "large",
                  type: "submit",
                  onClick: () => {
                    handleSubmit();
                  },
                  loading,
                  children: "Save"
                }
              )
            ]
          }
        )
      ] })
    }
  ) });
}
function toDataUrl(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open("GET", url);
  xhr.responseType = "blob";
  xhr.send();
}
const isValidURL = (url) => {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?((([a-zA-Z0-9$-_@.&+!*\\(\\),]+\\.)+[a-zA-Z]{2,})|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?(\\?[;&a-zA-Z0-9%_+.~#?&//=]*)?(\\#[-a-zA-Z0-9_]*)?$",
    "i"
  );
  return !!urlPattern.test(url);
};
function select_product$2() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(CreatePin, {}) });
}
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: select_product$2
}, Symbol.toStringTag, { value: "Module" }));
function StylePin() {
  const [current_editor, set_current_editor] = useState("text");
  const [textProperties, setTextProperties] = useState({
    text: "Title!",
    fontSize: 20,
    fontFamily: "Arial",
    fill: "#000000",
    align: "center",
    rectWidth: 250,
    // Rectangle width
    rectHeight: 100,
    // Rectangle height
    textWidth: 250,
    // Text width,
    scaleX: 1,
    scaleY: 1,
    x: 10,
    y: 10
  });
  const [image, set_image] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [inputPosition, setInputPosition] = useState({ x: 100, y: 100 });
  const [inputAttributes, setInputAttributes] = useState({});
  const stageRef = useRef(null);
  const textNodeRef = useRef(null);
  const rectRef = useRef(null);
  const transformerRef = useRef(null);
  const inputRef = useRef(null);
  const inputContainerRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleSelect = () => {
    if (transformerRef.current) {
      transformerRef.current.show();
      if (current_editor == "text") {
        transformerRef.current.nodes([textNodeRef.current]);
        transformerRef.current.getLayer().batchDraw();
      } else if (current_editor == "color") {
        transformerRef.current.nodes([rectRef.current]);
        transformerRef.current.enabledAnchors(false);
        transformerRef.current.getLayer().batchDraw();
      } else if (current_editor == "crop") {
        if (transformerRef.current) {
          if (imageRef.current) {
            transformerRef.current.nodes([imageRef.current]);
            transformerRef.current.getLayer().batchDraw();
          }
        }
      }
    }
  };
  useEffect(() => {
    const img = new window.Image();
    img.src = pin.product_image_base64;
    img.onload = () => {
      set_image(img);
    };
  }, []);
  useEffect(() => {
    handleSelect();
  }, [current_editor]);
  const handleEdit = (elem) => {
    console.log(elem.target.attrs);
    setInputPosition({
      x: elem.currentTarget.attrs.x,
      y: elem.currentTarget.attrs.y
    });
    setInputAttributes(elem.target.attrs);
    setIsEditing(true);
    setTimeout(() => {
      let scale = elem.target.attrs.scaleX || 1;
      let fontScale = elem.target.attrs.fontSize * scale;
      inputRef.current.style.fontSize = fontScale + "px";
    }, 0);
  };
  const saveText = () => {
    const newText = inputRef.current.value;
    console.log(pin_style == null ? void 0 : pin_style.text_scaleX, pin_style == null ? void 0 : pin_style.text_scaleY);
    dispatch(
      setData({
        ...pin,
        style: {
          ...pin_style,
          text: newText,
          x: inputPosition.x,
          y: inputPosition.y,
          text_scaleX: inputAttributes.scaleX,
          text_scaleY: inputAttributes.scaleY
        }
      })
    );
    setIsEditing(false);
  };
  useEffect(() => {
    handleSelect();
  }, [textProperties.rectWidth, textProperties.rectHeight]);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    } else {
      setTimeout(() => {
        handleSelect();
      }, 100);
    }
  }, [isEditing]);
  const pin_style = useSelector((state) => state.new_pin.data.style);
  const pin = useSelector((state) => state.new_pin.data);
  let color_tool_input = useRef();
  const ShowTools = useCallback(() => {
    useEffect(() => {
      setTimeout(() => {
        if (color_tool_input.current) {
          color_tool_input.current.click();
        }
      }, 500);
    }, []);
    if (current_editor == "text") {
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: "style-pin-text-tool-container",
          style: {
            display: "inline-table",
            width: "auto",
            padding: "7px 15px",
            background: "#43464E",
            height: "20px"
          },
          children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "7px" }, children: [
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx(
              "select",
              {
                style: styles$6.style_pin_title_s_items_fontsize_select,
                onChange: (e) => {
                  dispatch(
                    setData({
                      ...pin,
                      style: { ...pin_style, text_font_size: e.target.value }
                    })
                  );
                },
                children: Object.values(fontSizes).map((row) => {
                  return /* @__PURE__ */ jsx(
                    "option",
                    {
                      selected: (pin_style == null ? void 0 : pin_style.text_font_size) == row ? true : false,
                      value: row,
                      children: row
                    }
                  );
                })
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx(
              "select",
              {
                style: styles$6.style_pin_title_s_items_fontfamily_select,
                onChange: (e) => {
                  dispatch(
                    setData({
                      ...pin,
                      style: { ...pin_style, text_font_family: e.target.value }
                    })
                  );
                },
                children: Object.values(fontList).map((row) => {
                  return /* @__PURE__ */ jsx(
                    "option",
                    {
                      selected: (pin_style == null ? void 0 : pin_style.text_font_family) == row ? true : false,
                      value: row,
                      children: row
                    }
                  );
                })
              }
            ) }),
            /* @__PURE__ */ jsx(
              "div",
              {
                style: styles$6.style_pin_title_s_items_container,
                onChange: (e) => {
                  dispatch(
                    setData({
                      ...pin,
                      style: { ...pin_style, text_color: e.target.value }
                    })
                  );
                },
                children: /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "color",
                    style: styles$6.style_pin_title_s_items_color_select
                  }
                )
              }
            ),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx("div", { style: { width: "20px", height: "20px" }, children: /* @__PURE__ */ jsx(Icon, { source: TextAlignLeftIcon, size: "small" }) }) }),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx("div", { style: { width: "20px", height: "20px" }, children: /* @__PURE__ */ jsx(Icon, { source: TextAlignCenterIcon }) }) }),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx("div", { style: { width: "20px", height: "20px" }, children: /* @__PURE__ */ jsx(Icon, { source: TextAlignRightIcon }) }) }),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx(
              "div",
              {
                style: { width: "20px", height: "20px" },
                onClick: (e) => {
                  setTimeout(() => {
                    if ((pin_style == null ? void 0 : pin_style.text_wieght) == "bold") {
                      dispatch(
                        setData({
                          ...pin,
                          style: { ...pin_style, text_wieght: "normal" }
                        })
                      );
                    } else {
                      dispatch(
                        setData({
                          ...pin,
                          style: { ...pin_style, text_wieght: "bold" }
                        })
                      );
                    }
                  }, 100);
                },
                children: /* @__PURE__ */ jsx(Icon, { source: TextBoldIcon })
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx(
              "div",
              {
                style: { width: "20px", height: "20px" },
                onClick: (e) => {
                  if ((pin_style == null ? void 0 : pin_style.text_italic) == "italic") {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_italic: "normal" }
                      })
                    );
                  } else {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_italic: "italic" }
                      })
                    );
                  }
                },
                children: /* @__PURE__ */ jsx(Icon, { source: TextItalicIcon })
              }
            ) }),
            /* @__PURE__ */ jsx("div", { style: styles$6.style_pin_title_s_items_container, children: /* @__PURE__ */ jsx(
              "div",
              {
                style: { width: "20px", height: "20px" },
                onClick: (e) => {
                  if ((pin_style == null ? void 0 : pin_style.text_underline) == "underline") {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_underline: "normal" }
                      })
                    );
                  } else {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_underline: "underline" }
                      })
                    );
                  }
                },
                children: /* @__PURE__ */ jsx(Icon, { source: TextUnderlineIcon })
              }
            ) })
          ] })
        }
      );
    } else if (current_editor == "color") {
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: "style-pin-text-tool-container",
          style: {
            display: "inline-table",
            width: "auto",
            padding: "7px 15px",
            background: "#43464E",
            height: "20px"
          },
          children: /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: "7px" }, children: /* @__PURE__ */ jsx(
            "div",
            {
              style: styles$6.style_pin_title_s_items_container,
              onChange: (e) => {
                dispatch(
                  setData({
                    ...pin,
                    style: { ...pin_style, rect_bg: e.target.value }
                  })
                );
              },
              children: /* @__PURE__ */ jsx(
                "input",
                {
                  ref: color_tool_input,
                  type: "color",
                  style: styles$6.style_pin_title_s_items_color_select,
                  value: pin_style == null ? void 0 : pin_style.rect_bg,
                  autoFocus: true
                }
              )
            }
          ) })
        }
      );
    }
  }, [
    pin_style == null ? void 0 : pin_style.text,
    current_editor,
    pin_style == null ? void 0 : pin_style.text_wieght,
    pin_style == null ? void 0 : pin_style.text_italic,
    pin_style == null ? void 0 : pin_style.text_font_family,
    pin_style == null ? void 0 : pin_style.text_font_size,
    pin_style == null ? void 0 : pin_style.text_underline
  ]);
  const imageRef = useRef();
  const imageGroupRef = useRef();
  useRef();
  const handleSave = () => {
    var _a2, _b, _c, _d, _e, _f, _g, _h;
    if (stageRef.current) {
      transformerRef.current.hide();
      const base64 = stageRef.current.toDataURL({
        mimeType: "image/png",
        // Define the MIME type
        quality: 1,
        // Define the image quality (1 = highest quality)
        pixelRatio: 2
        // Use a higher pixel ratio for better resolution
      });
      dispatch(
        setData({
          ...pin,
          edited_pin_base64: base64,
          style: {
            ...pin_style,
            text_scaleX: (_b = (_a2 = textNodeRef.current) == null ? void 0 : _a2.attrs) == null ? void 0 : _b.scaleX,
            text_scaleY: (_d = (_c = textNodeRef.current) == null ? void 0 : _c.attrs) == null ? void 0 : _d.scaleY,
            text_x: (_f = (_e = textNodeRef.current) == null ? void 0 : _e.attrs) == null ? void 0 : _f.x,
            text_y: (_h = (_g = textNodeRef.current) == null ? void 0 : _g.attrs) == null ? void 0 : _h.y
          }
        })
      );
      transformerRef.current.show();
      navigate("/app/create_pin");
    }
  };
  return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
    Page,
    {
      style: { display: "block" },
      title: "Customize",
      fullWidth: true,
      subtitle: "Customize your Pinterest pin",
      compactTitle: true,
      children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("div", { style: { padding: "1.5rem", minHeight: "600px" }, children: /* @__PURE__ */ jsx("div", { style: { marginTop: "0px" }, children: /* @__PURE__ */ jsxs(Grid, { children: [
        /* @__PURE__ */ jsxs(Grid.Cell, { columnSpan: { xs: 2, sm: 2, md: 2, lg: 4, xl: 4 }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              style: current_editor == "text" ? {
                ...styles$6.theme_button,
                width: "100%",
                marginBottom: "15px"
              } : {
                ...styles$6.theme_button_2,
                width: "100%",
                marginBottom: "15px"
              },
              onClick: () => {
                set_current_editor("text");
              },
              children: "Text Tool"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              style: current_editor == "color" ? {
                ...styles$6.theme_button,
                width: "100%",
                marginBottom: "15px"
              } : {
                ...styles$6.theme_button_2,
                width: "100%",
                marginBottom: "15px"
              },
              onClick: () => {
                set_current_editor("color");
              },
              children: "Color Tool"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              style: current_editor == "crop" ? {
                ...styles$6.theme_button,
                width: "100%",
                marginBottom: "15px"
              } : {
                ...styles$6.theme_button_2,
                width: "100%",
                marginBottom: "15px"
              },
              onClick: () => {
                set_current_editor("crop");
              },
              children: "Crop Tool"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Grid.Cell, { columnSpan: { xs: 8, sm: 8, md: 8, lg: 8, xl: 8 }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                background: "#E6E1D2",
                width: "300px",
                height: "450px",
                padding: "30px"
              },
              children: /* @__PURE__ */ jsx(Stage, { ref: stageRef, width: 250, height: 400, children: /* @__PURE__ */ jsxs(Layer, { height: 450, width: 250, children: [
                /* @__PURE__ */ jsxs(Group, { x: position.x, y: position.y, children: [
                  /* @__PURE__ */ jsx(
                    Rect,
                    {
                      ref: rectRef,
                      width: textProperties.rectWidth,
                      height: textProperties.rectHeight,
                      fill: pin_style == null ? void 0 : pin_style.rect_bg,
                      stroke: "black",
                      strokeWidth: 0,
                      cornerRadius: 0
                    }
                  ),
                  !isEditing ? /* @__PURE__ */ jsx(
                    Konva.Text,
                    {
                      ref: textNodeRef,
                      x: pin_style == null ? void 0 : pin_style.text_x,
                      y: pin_style == null ? void 0 : pin_style.text_x,
                      scaleX: pin_style == null ? void 0 : pin_style.text_scaleX,
                      scaleY: pin_style == null ? void 0 : pin_style.text_scaleY,
                      text: pin_style == null ? void 0 : pin_style.text,
                      fontSize: pin_style == null ? void 0 : pin_style.text_font_size,
                      fontFamily: pin_style == null ? void 0 : pin_style.text_font_family,
                      fontStyle: `${pin_style == null ? void 0 : pin_style.text_italic} ${pin_style == null ? void 0 : pin_style.text_wieght}`,
                      fill: pin_style == null ? void 0 : pin_style.text_color,
                      textDecoration: pin_style == null ? void 0 : pin_style.text_underline,
                      align: textProperties.align,
                      verticalAlign: "middle",
                      padding: 0,
                      draggable: true,
                      onClick: handleSelect,
                      onTap: handleSelect,
                      onDblClick: handleEdit,
                      dragBoundFunc: (pos) => {
                        let { x, y } = pos;
                        let newX = x;
                        let newY = y;
                        textNodeRef.current.getTextWidth();
                        textNodeRef.current.getHeight();
                        textProperties.rectWidth;
                        if (x < 0) {
                          newX = 0;
                        }
                        if (y < 0) {
                          newY = 0;
                        }
                        return { x: newX, y: newY };
                      },
                      onDragEnd: (pos) => {
                      }
                    }
                  ) : /* @__PURE__ */ jsx(
                    Html,
                    {
                      groupProps: {
                        x: inputPosition == null ? void 0 : inputPosition.x,
                        y: inputPosition == null ? void 0 : inputPosition.y
                      },
                      ref: inputContainerRef,
                      children: /* @__PURE__ */ jsx(
                        "input",
                        {
                          ref: inputRef,
                          type: "text",
                          defaultValue: pin_style == null ? void 0 : pin_style.text,
                          onBlur: saveText,
                          onKeyDown: (e) => {
                            if (e.key === "Enter") {
                              saveText();
                            }
                          },
                          style: {
                            width: "100%",
                            height: "100%",
                            fontSize: `${pin_style == null ? void 0 : pin_style.text_font_size}px`,
                            fontFamily: pin_style == null ? void 0 : pin_style.text_font_family,
                            fontWeight: pin_style == null ? void 0 : pin_style.text_wieght,
                            fontStyle: pin_style == null ? void 0 : pin_style.text_italic,
                            textDecoration: pin_style == null ? void 0 : pin_style.text_underline,
                            color: pin_style == null ? void 0 : pin_style.text_color,
                            border: "none",
                            outline: "none",
                            background: "transparent"
                          }
                        }
                      )
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(
                  Group,
                  {
                    x: 0,
                    y: 100,
                    ref: imageGroupRef,
                    clipFunc: (ctx) => {
                      ctx.beginPath();
                      ctx.rect(0, 0, 250, 300);
                      ctx.closePath();
                    },
                    children: [
                      /* @__PURE__ */ jsx(
                        Rect,
                        {
                          width: 250,
                          height: 300,
                          fill: "white"
                        }
                      ),
                      image ? /* @__PURE__ */ jsx(
                        Image,
                        {
                          image,
                          width: 250,
                          height: 300,
                          draggable: true,
                          ref: imageRef
                        }
                      ) : null
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  Transformer,
                  {
                    ref: transformerRef,
                    enabledAnchors: [
                      "top-left",
                      "top-right",
                      "bottom-left",
                      "bottom-right"
                    ],
                    boundBoxFunc: (oldBox, newBox) => {
                      newBox.width = Math.max(0, newBox.width);
                      return newBox;
                    },
                    rotateEnabled: false
                  }
                )
              ] }) })
            }
          ),
          /* @__PURE__ */ jsx("div", { style: { marginTop: "15px" }, children: /* @__PURE__ */ jsx(ShowTools, {}) }),
          /* @__PURE__ */ jsxs("div", { style: { marginTop: "30px" }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                to: "select_product",
                style: {
                  ...styles$6.theme_button_2,
                  margin: "auto",
                  marginRight: "10px"
                },
                type: "button",
                onClick: () => {
                  navigate("/app/create_pin");
                },
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                to: "select_product",
                style: { ...styles$6.theme_button, margin: "auto" },
                type: "button",
                onClick: () => {
                  handleSave();
                },
                children: "Save"
              }
            )
          ] })
        ] })
      ] }) }) }) })
    }
  ) });
}
function select_product$1() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(StylePin, {}) });
}
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: select_product$1
}, Symbol.toStringTag, { value: "Module" }));
function EditorWrapper() {
  return /* @__PURE__ */ jsx(CanvasEditor, {});
}
const route22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: EditorWrapper
}, Symbol.toStringTag, { value: "Module" }));
function ViewPins() {
  const storePinFetcher = useFetcher();
  console.log(storePinFetcher == null ? void 0 : storePinFetcher.data);
  const deletePinFetcher = useFetcher();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const getPins = () => {
    storePinFetcher.submit(
      {
        shopifyShopId: user == null ? void 0 : user.shopifyShopId
      },
      { method: "post", action: "/data/pins/get" }
    );
  };
  useEffect(() => {
    if (storePinFetcher == null ? void 0 : storePinFetcher.data) {
      setLoading(false);
    }
  }, [storePinFetcher == null ? void 0 : storePinFetcher.data]);
  useEffect(() => {
    getPins();
  }, []);
  const deselectedOptions = useMemo(
    () => [
      { value: "rustic", label: "Rustic" },
      { value: "antique", label: "Antique" },
      { value: "vinyl", label: "Vinyl" },
      { value: "vintage", label: "Vintage" },
      { value: "refurbished", label: "Refurbished" }
    ],
    []
  );
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [DeleteAlertMsg, setDeleteAlertMsg] = useState("");
  const toggleDeleteAlert = useCallback(
    () => setShowDeleteAlert((active) => !active),
    []
  );
  const DeleteAlertMarkup = showDeleteAlert ? /* @__PURE__ */ jsx(Toast, { content: DeleteAlertMsg, onDismiss: toggleDeleteAlert }) : null;
  const [deleteItemData, setDeleteItemData] = useState({});
  const [showDeleteAlertModal, setShowDeleteAlertModal] = useState(false);
  const handleCloseModal = () => {
    setShowDeleteAlertModal(false);
  };
  const confirmDelete = () => {
    setShowDeleteAlertModal(false);
    handleDelete(deleteItemData == null ? void 0 : deleteItemData.id, deleteItemData == null ? void 0 : deleteItemData.pin_id);
  };
  const handleDelete = (id, pin_id) => {
    deletePinFetcher.submit(
      {
        access_key: user == null ? void 0 : user.accessToken,
        id,
        pin_id
      },
      { method: "post", action: "/data/pins/delete" }
    );
  };
  const handleEditPin = (data) => {
    dispatch(setData(data));
    navigate("/app/create_pin");
  };
  useEffect(() => {
    var _a2;
    if ((_a2 = deletePinFetcher == null ? void 0 : deletePinFetcher.data) == null ? void 0 : _a2.success) {
      setDeleteAlertMsg("Pin deleted successfully.");
      setShowDeleteAlert(true);
      getPins();
    }
  }, [deletePinFetcher.data]);
  const [popoverStates, setPopoverStates] = useState({});
  return /* @__PURE__ */ jsxs(Frame, { children: [
    DeleteAlertMarkup,
    /* @__PURE__ */ jsx(
      Page,
      {
        title: "View Pins",
        fullWidth: true,
        subtitle: "Browse and manage all your created pins in one place.",
        compactTitle: true,
        children: /* @__PURE__ */ jsx(Card, { children: loading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "20px" }, children: /* @__PURE__ */ jsx(Spinner, {}) }) : Object.values((storePinFetcher == null ? void 0 : storePinFetcher.data) ?? {}).length === 0 ? /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              textAlign: "center",
              padding: "20px",
              fontSize: "16px",
              color: "#777"
            },
            children: /* @__PURE__ */ jsx("p", { children: "No items available" })
          }
        ) : /* @__PURE__ */ jsx(
          DataTable,
          {
            columnContentTypes: ["text", "text", "text", "text", "text"],
            headings: [
              "Image",
              "Product",
              "Title Pin",
              "Date of Creation",
              "Actions"
            ],
            rows: Object.values((storePinFetcher == null ? void 0 : storePinFetcher.data) ?? {}).map((row) => {
              var _a2, _b, _c, _d, _e, _f, _g;
              const pinterestJson = JSON.parse(row.pinterestJson);
              const productEditJson = JSON.parse(row.productEditJson);
              const title = ((_b = (_a2 = productEditJson == null ? void 0 : productEditJson.product) == null ? void 0 : _a2.node) == null ? void 0 : _b.title) || "Untitled";
              const pinTitle = (productEditJson == null ? void 0 : productEditJson.title) || "Untitled";
              ((_g = (_f = (_e = (_d = (_c = productEditJson.product) == null ? void 0 : _c.node) == null ? void 0 : _d.variants) == null ? void 0 : _e.edges[0]) == null ? void 0 : _f.node) == null ? void 0 : _g.price) || "0.00";
              const imageUrl = (productEditJson == null ? void 0 : productEditJson.edited_pin_base64) ?? (productEditJson == null ? void 0 : productEditJson.product_image_base64);
              const creationDate = pinterestJson.created_at ? new Date(pinterestJson.created_at).toLocaleDateString() : "N/A";
              let ActionButton = /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "7px" }, children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "dash-action-icon-edit",
                    onClick: () => {
                      handleEditPin(productEditJson);
                    },
                    children: /* @__PURE__ */ jsx(Icon, { source: EditIcon, tone: "base" })
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "dash-action-icon-delete",
                    onClick: () => {
                      setDeleteItemData({
                        id: row.id,
                        pin_id: pinterestJson.id
                      });
                      setShowDeleteAlertModal(true);
                    },
                    children: /* @__PURE__ */ jsx(Icon, { source: DeleteIcon, tone: "base" })
                  }
                )
              ] });
              return [
                /* @__PURE__ */ jsx(
                  Thumbnail,
                  {
                    source: imageUrl || "https://via.placeholder.com/200",
                    alt: "Product",
                    size: "small"
                  }
                ),
                title,
                // Product column
                pinTitle,
                // Title Pin column (or any other relevant info)
                creationDate,
                // Date of Creation column
                ActionButton
                // Actions column
              ];
            })
          }
        ) })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal$1,
      {
        open: showDeleteAlertModal,
        onClose: handleCloseModal,
        title: "Are you sure you want to delete this product?",
        primaryAction: {
          content: "Delete",
          destructive: true,
          onAction: confirmDelete
        },
        secondaryAction: {
          content: "Cancel",
          onAction: handleCloseModal
        },
        children: /* @__PURE__ */ jsx(Modal$1.Section, { children: /* @__PURE__ */ jsx("p", { children: "This action cannot be undone." }) })
      }
    )
  ] });
}
function select_product() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(ViewPins, {}) });
}
const route23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: select_product
}, Symbol.toStringTag, { value: "Module" }));
const action$6 = async ({ request }) => {
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  body.get("product_id");
  body.get("pinterestJson");
  let pins = await prisma.PinterestProductPins.findMany({
    where: { shopifyShopId }
  });
  return json$1(pins);
};
const route24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: "Module" }));
const action$5 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.formData();
  const query = body.get("query");
  const variables = JSON.parse(body.get("variables"));
  const response = await admin.graphql(
    `
      ${query}
    `,
    {
      variables
    }
  );
  const productData = await response.json();
  return json$1(productData.data);
};
const route25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: "Module" }));
const route26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
function BoardsPage() {
  const [boards, setBoards] = useState([]);
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);
  console.log(user, "user===>");
  const fetchBoards = async () => {
    try {
      const res = await fetch("/api/pinterest/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          access_key: user == null ? void 0 : user.accessToken
        }
      });
      if (!res.ok) {
        throw new Error("Error while fetching boards");
      }
      const data = await res.json();
      console.log(data == null ? void 0 : data.items, "data");
      setBoards((data == null ? void 0 : data.items) || []);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    fetchBoards();
  }, []);
  const items = boards;
  const emptyStateMarkup = !items.length ? /* @__PURE__ */ jsx(
    EmptyState,
    {
      heading: "No boards available",
      action: { content: "Create a board" },
      image: "https://cdn.shopify.com/s/files/1/2376/3301/products/emptystate-files.png",
      children: /* @__PURE__ */ jsx("p", { children: "You can create a new Pinterest board to get started." })
    }
  ) : void 0;
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Boards",
      secondaryActions: /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: () => navigate("/app"), children: "Back" }),
      primaryAction: /* @__PURE__ */ jsx(
        Button,
        {
          variant: "primary",
          onClick: () => {
            console.log("navigate");
            navigate("/app/create_board");
          },
          children: "New"
        }
      ),
      children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(LegacyCard, { children: /* @__PURE__ */ jsx(
        ResourceList,
        {
          emptyState: emptyStateMarkup,
          items,
          renderItem: (item) => {
            const media = /* @__PURE__ */ jsx(Icon, { source: ClipboardIcon });
            return /* @__PURE__ */ jsxs(
              ResourceList.Item,
              {
                accessibilityLabel: `View details for ${item.name}`,
                media,
                children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "bold", as: "h3", children: item.name }),
                  /* @__PURE__ */ jsx("div", { children: item.description })
                ]
              },
              item.id
            );
          },
          showHeader: true,
          totalItemsCount: boards.length,
          resourceName: { singular: "board", plural: "boards" }
        }
      ) }) }) })
    }
  );
}
function board() {
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(BoardsPage, {}) });
}
const route29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: board
}, Symbol.toStringTag, { value: "Module" }));
const loader$5 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const action$4 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][Math.floor(Math.random() * 4)];
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
          title: `${color} Snowboard`
        }
      }
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
        variants: [{ id: variantId, price: "100.00" }]
      }
    }
  );
  await variantResponse.json();
};
function Index$1() {
  const [refresh, setRefresh] = useState(false);
  const handleRefresh = () => {
    setRefresh(!refresh);
  };
  useEffect(() => {
  }, [refresh]);
  const [selected_menu, set_selected_menu] = useState("dashboard");
  return /* @__PURE__ */ jsx(Index$2, { children: /* @__PURE__ */ jsx(Dashboard, { handleRefresh }) });
}
const route30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: Index$1,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = {
  ActionMenu: {
    Actions: {
      moreActions: "More actions"
    },
    RollupActions: {
      rollupButton: "View actions"
    }
  },
  ActionList: {
    SearchField: {
      clearButtonLabel: "Clear",
      search: "Search",
      placeholder: "Search actions"
    }
  },
  Avatar: {
    label: "Avatar",
    labelWithInitials: "Avatar with initials {initials}"
  },
  Autocomplete: {
    spinnerAccessibilityLabel: "Loading",
    ellipsis: "{content}…"
  },
  Badge: {
    PROGRESS_LABELS: {
      incomplete: "Incomplete",
      partiallyComplete: "Partially complete",
      complete: "Complete"
    },
    TONE_LABELS: {
      info: "Info",
      success: "Success",
      warning: "Warning",
      critical: "Critical",
      attention: "Attention",
      "new": "New",
      readOnly: "Read-only",
      enabled: "Enabled"
    },
    progressAndTone: "{toneLabel} {progressLabel}"
  },
  Banner: {
    dismissButton: "Dismiss notification"
  },
  Button: {
    spinnerAccessibilityLabel: "Loading"
  },
  Common: {
    checkbox: "checkbox",
    undo: "Undo",
    cancel: "Cancel",
    clear: "Clear",
    close: "Close",
    submit: "Submit",
    more: "More"
  },
  ContextualSaveBar: {
    save: "Save",
    discard: "Discard"
  },
  DataTable: {
    sortAccessibilityLabel: "sort {direction} by",
    navAccessibilityLabel: "Scroll table {direction} one column",
    totalsRowHeading: "Totals",
    totalRowHeading: "Total"
  },
  DatePicker: {
    previousMonth: "Show previous month, {previousMonthName} {showPreviousYear}",
    nextMonth: "Show next month, {nextMonth} {nextYear}",
    today: "Today ",
    start: "Start of range",
    end: "End of range",
    months: {
      january: "January",
      february: "February",
      march: "March",
      april: "April",
      may: "May",
      june: "June",
      july: "July",
      august: "August",
      september: "September",
      october: "October",
      november: "November",
      december: "December"
    },
    days: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday"
    },
    daysAbbreviated: {
      monday: "Mo",
      tuesday: "Tu",
      wednesday: "We",
      thursday: "Th",
      friday: "Fr",
      saturday: "Sa",
      sunday: "Su"
    }
  },
  DiscardConfirmationModal: {
    title: "Discard all unsaved changes",
    message: "If you discard changes, you’ll delete any edits you made since you last saved.",
    primaryAction: "Discard changes",
    secondaryAction: "Continue editing"
  },
  DropZone: {
    single: {
      overlayTextFile: "Drop file to upload",
      overlayTextImage: "Drop image to upload",
      overlayTextVideo: "Drop video to upload",
      actionTitleFile: "Add file",
      actionTitleImage: "Add image",
      actionTitleVideo: "Add video",
      actionHintFile: "or drop file to upload",
      actionHintImage: "or drop image to upload",
      actionHintVideo: "or drop video to upload",
      labelFile: "Upload file",
      labelImage: "Upload image",
      labelVideo: "Upload video"
    },
    allowMultiple: {
      overlayTextFile: "Drop files to upload",
      overlayTextImage: "Drop images to upload",
      overlayTextVideo: "Drop videos to upload",
      actionTitleFile: "Add files",
      actionTitleImage: "Add images",
      actionTitleVideo: "Add videos",
      actionHintFile: "or drop files to upload",
      actionHintImage: "or drop images to upload",
      actionHintVideo: "or drop videos to upload",
      labelFile: "Upload files",
      labelImage: "Upload images",
      labelVideo: "Upload videos"
    },
    errorOverlayTextFile: "File type is not valid",
    errorOverlayTextImage: "Image type is not valid",
    errorOverlayTextVideo: "Video type is not valid"
  },
  EmptySearchResult: {
    altText: "Empty search results"
  },
  Frame: {
    skipToContent: "Skip to content",
    navigationLabel: "Navigation",
    Navigation: {
      closeMobileNavigationLabel: "Close navigation"
    }
  },
  FullscreenBar: {
    back: "Back",
    accessibilityLabel: "Exit fullscreen mode"
  },
  Filters: {
    moreFilters: "More filters",
    moreFiltersWithCount: "More filters ({count})",
    filter: "Filter {resourceName}",
    noFiltersApplied: "No filters applied",
    cancel: "Cancel",
    done: "Done",
    clearAllFilters: "Clear all filters",
    clear: "Clear",
    clearLabel: "Clear {filterName}",
    addFilter: "Add filter",
    clearFilters: "Clear all",
    searchInView: "in:{viewName}"
  },
  FilterPill: {
    clear: "Clear",
    unsavedChanges: "Unsaved changes - {label}"
  },
  IndexFilters: {
    searchFilterTooltip: "Search and filter",
    searchFilterTooltipWithShortcut: "Search and filter (F)",
    searchFilterAccessibilityLabel: "Search and filter results",
    sort: "Sort your results",
    addView: "Add a new view",
    newView: "Custom search",
    SortButton: {
      ariaLabel: "Sort the results",
      tooltip: "Sort",
      title: "Sort by",
      sorting: {
        asc: "Ascending",
        desc: "Descending",
        az: "A-Z",
        za: "Z-A"
      }
    },
    EditColumnsButton: {
      tooltip: "Edit columns",
      accessibilityLabel: "Customize table column order and visibility"
    },
    UpdateButtons: {
      cancel: "Cancel",
      update: "Update",
      save: "Save",
      saveAs: "Save as",
      modal: {
        title: "Save view as",
        label: "Name",
        sameName: "A view with this name already exists. Please choose a different name.",
        save: "Save",
        cancel: "Cancel"
      }
    }
  },
  IndexProvider: {
    defaultItemSingular: "Item",
    defaultItemPlural: "Items",
    allItemsSelected: "All {itemsLength}+ {resourceNamePlural} are selected",
    selected: "{selectedItemsCount} selected",
    a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
    a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
    a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
    a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}"
  },
  IndexTable: {
    emptySearchTitle: "No {resourceNamePlural} found",
    emptySearchDescription: "Try changing the filters or search term",
    onboardingBadgeText: "New",
    resourceLoadingAccessibilityLabel: "Loading {resourceNamePlural}…",
    selectAllLabel: "Select all {resourceNamePlural}",
    selected: "{selectedItemsCount} selected",
    undo: "Undo",
    selectAllItems: "Select all {itemsLength}+ {resourceNamePlural}",
    selectItem: "Select {resourceName}",
    selectButtonText: "Select",
    sortAccessibilityLabel: "sort {direction} by"
  },
  Loading: {
    label: "Page loading bar"
  },
  Modal: {
    iFrameTitle: "body markup",
    modalWarning: "These required properties are missing from Modal: {missingProps}"
  },
  Page: {
    Header: {
      rollupActionsLabel: "View actions for {title}",
      pageReadyAccessibilityLabel: "{title}. This page is ready"
    }
  },
  Pagination: {
    previous: "Previous",
    next: "Next",
    pagination: "Pagination"
  },
  ProgressBar: {
    negativeWarningMessage: "Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.",
    exceedWarningMessage: "Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."
  },
  ResourceList: {
    sortingLabel: "Sort by",
    defaultItemSingular: "item",
    defaultItemPlural: "items",
    showing: "Showing {itemsCount} {resource}",
    showingTotalCount: "Showing {itemsCount} of {totalItemsCount} {resource}",
    loading: "Loading {resource}",
    selected: "{selectedItemsCount} selected",
    allItemsSelected: "All {itemsLength}+ {resourceNamePlural} in your store are selected",
    allFilteredItemsSelected: "All {itemsLength}+ {resourceNamePlural} in this filter are selected",
    selectAllItems: "Select all {itemsLength}+ {resourceNamePlural} in your store",
    selectAllFilteredItems: "Select all {itemsLength}+ {resourceNamePlural} in this filter",
    emptySearchResultTitle: "No {resourceNamePlural} found",
    emptySearchResultDescription: "Try changing the filters or search term",
    selectButtonText: "Select",
    a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
    a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
    a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
    a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}",
    Item: {
      actionsDropdownLabel: "Actions for {accessibilityLabel}",
      actionsDropdown: "Actions dropdown",
      viewItem: "View details for {itemName}"
    },
    BulkActions: {
      actionsActivatorLabel: "Actions",
      moreActionsActivatorLabel: "More actions"
    }
  },
  SkeletonPage: {
    loadingLabel: "Page loading"
  },
  Tabs: {
    newViewAccessibilityLabel: "Create new view",
    newViewTooltip: "Create view",
    toggleTabsLabel: "More views",
    Tab: {
      rename: "Rename view",
      duplicate: "Duplicate view",
      edit: "Edit view",
      editColumns: "Edit columns",
      "delete": "Delete view",
      copy: "Copy of {name}",
      deleteModal: {
        title: "Delete view?",
        description: "This can’t be undone. {viewName} view will no longer be available in your admin.",
        cancel: "Cancel",
        "delete": "Delete view"
      }
    },
    RenameModal: {
      title: "Rename view",
      label: "Name",
      cancel: "Cancel",
      create: "Save",
      errors: {
        sameName: "A view with this name already exists. Please choose a different name."
      }
    },
    DuplicateModal: {
      title: "Duplicate view",
      label: "Name",
      cancel: "Cancel",
      create: "Create view",
      errors: {
        sameName: "A view with this name already exists. Please choose a different name."
      }
    },
    CreateViewModal: {
      title: "Create new view",
      label: "Name",
      cancel: "Cancel",
      create: "Create view",
      errors: {
        sameName: "A view with this name already exists. Please choose a different name."
      }
    }
  },
  Tag: {
    ariaLabel: "Remove {children}"
  },
  TextField: {
    characterCount: "{count} characters",
    characterCountWithMaxLength: "{count} of {limit} characters used"
  },
  TooltipOverlay: {
    accessibilityLabel: "Tooltip: {label}"
  },
  TopBar: {
    toggleMenuLabel: "Toggle menu",
    SearchField: {
      clearButtonLabel: "Clear",
      search: "Search"
    }
  },
  MediaCard: {
    dismissButton: "Dismiss",
    popoverButton: "Actions"
  },
  VideoThumbnail: {
    playButtonA11yLabel: {
      "default": "Play video",
      defaultWithDuration: "Play video of length {duration}",
      duration: {
        hours: {
          other: {
            only: "{hourCount} hours",
            andMinutes: "{hourCount} hours and {minuteCount} minutes",
            andMinute: "{hourCount} hours and {minuteCount} minute",
            minutesAndSeconds: "{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds",
            minutesAndSecond: "{hourCount} hours, {minuteCount} minutes, and {secondCount} second",
            minuteAndSeconds: "{hourCount} hours, {minuteCount} minute, and {secondCount} seconds",
            minuteAndSecond: "{hourCount} hours, {minuteCount} minute, and {secondCount} second",
            andSeconds: "{hourCount} hours and {secondCount} seconds",
            andSecond: "{hourCount} hours and {secondCount} second"
          },
          one: {
            only: "{hourCount} hour",
            andMinutes: "{hourCount} hour and {minuteCount} minutes",
            andMinute: "{hourCount} hour and {minuteCount} minute",
            minutesAndSeconds: "{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds",
            minutesAndSecond: "{hourCount} hour, {minuteCount} minutes, and {secondCount} second",
            minuteAndSeconds: "{hourCount} hour, {minuteCount} minute, and {secondCount} seconds",
            minuteAndSecond: "{hourCount} hour, {minuteCount} minute, and {secondCount} second",
            andSeconds: "{hourCount} hour and {secondCount} seconds",
            andSecond: "{hourCount} hour and {secondCount} second"
          }
        },
        minutes: {
          other: {
            only: "{minuteCount} minutes",
            andSeconds: "{minuteCount} minutes and {secondCount} seconds",
            andSecond: "{minuteCount} minutes and {secondCount} second"
          },
          one: {
            only: "{minuteCount} minute",
            andSeconds: "{minuteCount} minute and {secondCount} seconds",
            andSecond: "{minuteCount} minute and {secondCount} second"
          }
        },
        seconds: {
          other: "{secondCount} seconds",
          one: "{secondCount} second"
        }
      }
    }
  }
};
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-BeiPL2RV.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const links$1 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$4 = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return json$1({ errors, polarisTranslations });
};
const action$3 = async ({ request }) => {
  loginErrorMessage(await login(request));
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form$1, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in 1" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "example.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}
const route31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: Auth,
  links: links$1,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const action$2 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.formData();
  const shopifyShopId = body.get("shopifyShopId");
  let user = await prisma.PinterestUser.findMany({
    where: { shopifyShopId }
  });
  return json$1(user);
};
const route32 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2
}, Symbol.toStringTag, { value: "Module" }));
const action$1 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `query getShopCurrency {
    shop {
      currencyCode
    }
  }`
  );
  const shop = await response.json();
  return json$1(shop);
};
const route33 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    return json$1({
      pinterest_app_id: process.env.PINTEREST_APP_ID,
      PINTEREST_REDIRECT: process.env.SHOPIFY_APP_URL,
      application_url: process.env.SHOPIFY_APP_URL
    });
  } catch (error) {
    console.log("error", error);
    return json$1({ error });
  }
};
const route34 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const action = async ({ request }) => {
  const { topic, shop, session, admin } = await authenticate.webhook(request);
  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response();
  }
  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }
  throw new Response();
};
const route35 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action
}, Symbol.toStringTag, { value: "Module" }));
function Index() {
  useFetcher();
  const authFetcher = useFetcher();
  const userAccountFetcher = useFetcher();
  const userSaveFetcher = useFetcher();
  const redirectFetcher = useFetcher();
  const [authToken, setAuthToken] = useState("");
  const [refreshAuthToken, setRefreshAuthToken] = useState("");
  const [shopConfig, setShopConfig] = useState(null);
  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let code = urlParams.get("code");
    let store2 = urlParams.get("state");
    if (code) {
      setTimeout(() => {
        authFetcher.submit(
          {
            grant_type: "authorization_code",
            code,
            state: store2
          },
          { method: "post", action: "/api/pinterest/auth" }
        );
      }, 5e3);
    }
  }, []);
  useEffect(() => {
    var _a2;
    if ((_a2 = authFetcher == null ? void 0 : authFetcher.data) == null ? void 0 : _a2.access_token) {
      setAuthToken(authFetcher.data.access_token);
      setRefreshAuthToken(authFetcher.data.refresh_token);
      userAccountFetcher.submit(
        {
          access_key: authFetcher.data.access_token
        },
        { method: "post", action: "/api/pinterest/user_account" }
      );
    }
  }, [authFetcher.data]);
  useEffect(() => {
    var _a2, _b, _c;
    if ((_a2 = userAccountFetcher == null ? void 0 : userAccountFetcher.data) == null ? void 0 : _a2.id) {
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      urlParams.get("code");
      let store2 = urlParams.get("state");
      userSaveFetcher.submit({
        shopifyShopId: store2,
        pinterestUserId: (_b = userAccountFetcher == null ? void 0 : userAccountFetcher.data) == null ? void 0 : _b.id,
        accessToken: authToken,
        refreshToken: refreshAuthToken,
        userName: (_c = userAccountFetcher == null ? void 0 : userAccountFetcher.data) == null ? void 0 : _c.username
      }, { method: "post", action: "/data/users/create" });
    }
  }, [userAccountFetcher.data]);
  useEffect(() => {
    var _a2;
    if ((_a2 = userSaveFetcher == null ? void 0 : userSaveFetcher.data) == null ? void 0 : _a2.shopifyShopId) {
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      let store2 = urlParams.get("state");
      if (store2) {
        redirectFetcher.submit(
          {
            shop: store2
          },
          { method: "post", action: "/auth/login" }
        );
      }
    }
  }, [userSaveFetcher.data]);
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", height: "400px", justifyContent: "center", alignItems: "center" }, children: /* @__PURE__ */ jsxs("div", { style: {
    textAlign: "center",
    fontFamily: "sans-serif"
  }, children: [
    /* @__PURE__ */ jsx("img", { style: { width: "50px", height: "50px" }, src: "/loading.svg" }),
    /* @__PURE__ */ jsx("div", { style: { textAlign: "center" }, children: "Connecting..." })
  ] }) });
}
const route36 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const route38 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$1 = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return json$1({ showForm: Boolean(login) });
};
function App$1() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: styles.index, children: /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "A short heading about [your app]" }),
    /* @__PURE__ */ jsx("p", { className: styles.text, children: "A tagline about [your app] that describes your value proposition." }),
    showForm && /* @__PURE__ */ jsxs(Form$1, { className: styles.form, method: "post", action: "/auth/login", children: [
      /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
        /* @__PURE__ */ jsx("span", { children: "Shop domain" }),
        /* @__PURE__ */ jsx("input", { className: styles.input, type: "text", name: "shop" }),
        /* @__PURE__ */ jsx("span", { children: "e.g: my-shop-domain.myshopify.com" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Log in" })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Product feature" }),
        ". Some detail about your feature and its benefit to your customer."
      ] })
    ] })
  ] }) });
}
const route40 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const store = configureStore({
  reducer: {
    new_pin: newPinReducer,
    user: userReducer
  }
});
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json$1({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsxs(Provider, { store, children: [
      /* @__PURE__ */ jsxs(NavMenu, { children: [
        /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Home" }),
        /* @__PURE__ */ jsx(Link, { to: "/app/select_product", children: "Select Product" })
      ] }),
      /* @__PURE__ */ jsx(Outlet, {})
    ] }),
    /* @__PURE__ */ jsx(ToastContainer, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route41 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CMKwzKeP.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/client-CA4kW8a5.js", "/assets/components-BlTBjdub.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-C1ckoBP4.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/client-CA4kW8a5.js", "/assets/components-BlTBjdub.js"], "css": [] }, "routes/api.pinterest.create_board": { "id": "routes/api.pinterest.create_board", "parentId": "root", "path": "api/pinterest/create_board", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.create_board-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.refresh_auth": { "id": "routes/api.pinterest.refresh_auth", "parentId": "root", "path": "api/pinterest/refresh_auth", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.refresh_auth-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.schedule_pin": { "id": "routes/api.pinterest.schedule_pin", "parentId": "root", "path": "api/pinterest/schedule_pin", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.schedule_pin-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.user_account": { "id": "routes/api.pinterest.user_account", "parentId": "root", "path": "api/pinterest/user_account", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.user_account-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.create_pin": { "id": "routes/api.pinterest.create_pin", "parentId": "root", "path": "api/pinterest/create_pin", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.create_pin-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.user_check": { "id": "routes/api.pinterest.user_check", "parentId": "root", "path": "api/pinterest/user_check", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.user_check-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.preview_and_publish": { "id": "routes/app.preview_and_publish", "parentId": "routes/app", "path": "preview_and_publish", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.preview_and_publish-B0q3xSQ7.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/styles-D_XvpvLC.js", "/assets/create-DC3FBBky.js", "/assets/react-toastify.esm-DDqzjVhy.js", "/assets/index-CNPq0y9p.js", "/assets/moment-C5S46NFB.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/Select-Cqc2aBNG.js", "/assets/Banner-BO8VKTka.js", "/assets/Toast-uxKpnzSx.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/context-CVOPGIzy.js", "/assets/XIcon.svg-DfjWHrjT.js", "/assets/index-CQUpKOYE.js"], "css": [] }, "routes/api.generate-preview": { "id": "routes/api.generate-preview", "parentId": "root", "path": "api/generate-preview", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.generate-preview-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.boards": { "id": "routes/api.pinterest.boards", "parentId": "root", "path": "api/pinterest/boards", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.boards-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.pins.save_draft": { "id": "routes/data.pins.save_draft", "parentId": "root", "path": "data/pins/save_draft", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.pins.save_draft-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/api.pinterest.auth": { "id": "routes/api.pinterest.auth", "parentId": "root", "path": "api/pinterest/auth", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.pinterest.auth-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.select_product": { "id": "routes/app.select_product", "parentId": "routes/app", "path": "select_product", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.select_product-C_2d2RQ5.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/styles-D_XvpvLC.js", "/assets/create-DC3FBBky.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/ResourceList-CDHVAF4t.js", "/assets/Thumbnail-BCdXp_8z.js", "/assets/Banner-BO8VKTka.js", "/assets/index-CNPq0y9p.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/context-CVOPGIzy.js", "/assets/Select-Cqc2aBNG.js", "/assets/index-CQUpKOYE.js", "/assets/InlineGrid-C9bjlSrV.js", "/assets/Sticky-525yc6rr.js", "/assets/XIcon.svg-DfjWHrjT.js"], "css": ["/assets/app-BOWNthc6.css"] }, "routes/data.users.create": { "id": "routes/data.users.create", "parentId": "routes/data.users", "path": "create", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.users.create-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.users.delete": { "id": "routes/data.users.delete", "parentId": "routes/data.users", "path": "delete", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.users.delete-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.users.update": { "id": "routes/data.users.update", "parentId": "routes/data.users", "path": "update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.users.update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.create_board": { "id": "routes/app.create_board", "parentId": "routes/app", "path": "create_board", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.create_board-B6m7LS4N.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/create-DC3FBBky.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/Form-FMERqV2F.js", "/assets/index-CNPq0y9p.js", "/assets/styles-D_XvpvLC.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/components-BlTBjdub.js", "/assets/context-CVOPGIzy.js"], "css": [] }, "routes/data.pins.create": { "id": "routes/data.pins.create", "parentId": "root", "path": "data/pins/create", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.pins.create-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.pins.delete": { "id": "routes/data.pins.delete", "parentId": "root", "path": "data/pins/delete", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.pins.delete-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.additional-BZ-T44pL.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/Templates-D6FWNYc6.js", "/assets/index-CP26dfb2.js", "/assets/Page-CP5RaZ3z.js", "/assets/context-CVOPGIzy.js", "/assets/styleData-C385Sftb.js", "/assets/client-CA4kW8a5.js", "/assets/create-DC3FBBky.js"], "css": ["/assets/Templates-BAZlaYmP.css"] }, "routes/app.create_pin": { "id": "routes/app.create_pin", "parentId": "routes/app", "path": "create_pin", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.create_pin-C6oYm8Qb.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/create-DC3FBBky.js", "/assets/react-toastify.esm-DDqzjVhy.js", "/assets/index-CNPq0y9p.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/Form-FMERqV2F.js", "/assets/Select-Cqc2aBNG.js", "/assets/styles-D_XvpvLC.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/context-CVOPGIzy.js"], "css": [] }, "routes/app.style_pin": { "id": "routes/app.style_pin", "parentId": "routes/app", "path": "style_pin", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.style_pin-BuTX319d.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/styleData-C385Sftb.js", "/assets/styles-D_XvpvLC.js", "/assets/create-DC3FBBky.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/index-CNPq0y9p.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/components-BlTBjdub.js", "/assets/client-CA4kW8a5.js", "/assets/context-CVOPGIzy.js"], "css": [] }, "routes/app.templates": { "id": "routes/app.templates", "parentId": "routes/app", "path": "templates", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.templates-BZ-T44pL.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/Templates-D6FWNYc6.js", "/assets/index-CP26dfb2.js", "/assets/Page-CP5RaZ3z.js", "/assets/context-CVOPGIzy.js", "/assets/styleData-C385Sftb.js", "/assets/client-CA4kW8a5.js", "/assets/create-DC3FBBky.js"], "css": ["/assets/Templates-BAZlaYmP.css"] }, "routes/app.view_pins": { "id": "routes/app.view_pins", "parentId": "routes/app", "path": "view_pins", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.view_pins-D0eAtYBO.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/create-DC3FBBky.js", "/assets/moment-C5S46NFB.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/context-CVOPGIzy.js", "/assets/Card-cfPGhfhX.js", "/assets/Toast-uxKpnzSx.js", "/assets/context-DUgBqHB1.js", "/assets/XIcon.svg-DfjWHrjT.js", "/assets/InlineGrid-C9bjlSrV.js", "/assets/DataTable-Bwh0IRBP.js", "/assets/Thumbnail-BCdXp_8z.js", "/assets/index-CNPq0y9p.js", "/assets/styles-D_XvpvLC.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/index-CQUpKOYE.js", "/assets/Sticky-525yc6rr.js"], "css": [] }, "routes/data.pins.get": { "id": "routes/data.pins.get", "parentId": "root", "path": "data/pins/get", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.pins.get-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.products": { "id": "routes/data.products", "parentId": "root", "path": "data/products", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.products-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.modules": { "id": "routes/app.modules", "parentId": "routes/app", "path": "modules", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app-BPypBdx3.css", "imports": [], "css": [] }, "routes/AuthChecker": { "id": "routes/AuthChecker", "parentId": "root", "path": "AuthChecker", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/AuthChecker-CNFSFa96.js", "imports": ["/assets/index-CP26dfb2.js", "/assets/components-BlTBjdub.js"], "css": [] }, "routes/ThemeLayout": { "id": "routes/ThemeLayout", "parentId": "root", "path": "ThemeLayout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/ThemeLayout-CSZUhtdd.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/index-CNPq0y9p.js", "/assets/styles-D_XvpvLC.js", "/assets/create-DC3FBBky.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/context-CVOPGIzy.js"], "css": [] }, "routes/app.boards": { "id": "routes/app.boards", "parentId": "routes/app", "path": "boards", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.boards-P-HBuCLJ.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-CP26dfb2.js", "/assets/create-DC3FBBky.js", "/assets/Page-CP5RaZ3z.js", "/assets/InlineGrid-C9bjlSrV.js", "/assets/Card-cfPGhfhX.js", "/assets/ResourceList-CDHVAF4t.js", "/assets/index-CNPq0y9p.js", "/assets/styles-D_XvpvLC.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/components-BlTBjdub.js", "/assets/context-CVOPGIzy.js", "/assets/Select-Cqc2aBNG.js", "/assets/index-CQUpKOYE.js", "/assets/Sticky-525yc6rr.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-dztF2kiA.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/ThemeLayout-CSZUhtdd.js", "/assets/index-tgQQ76OV.js", "/assets/index-CNPq0y9p.js", "/assets/styles-D_XvpvLC.js", "/assets/create-DC3FBBky.js", "/assets/moment-C5S46NFB.js", "/assets/index-EHAiWlOd.js", "/assets/AuthChecker-CNFSFa96.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/context-CVOPGIzy.js", "/assets/Card-cfPGhfhX.js", "/assets/DataTable-Bwh0IRBP.js", "/assets/index-CQUpKOYE.js", "/assets/Sticky-525yc6rr.js"], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-CJWgxvOe.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/styles-D5koe_rk.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/Card-cfPGhfhX.js", "/assets/context-CVOPGIzy.js", "/assets/context-DUgBqHB1.js"], "css": [] }, "routes/data.users": { "id": "routes/data.users", "parentId": "root", "path": "data/users", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.users-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.shop": { "id": "routes/data.shop", "parentId": "root", "path": "data/shop", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.shop-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/data.env": { "id": "routes/data.env", "parentId": "root", "path": "data/env", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/data.env-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks": { "id": "routes/webhooks", "parentId": "root", "path": "webhooks", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/connect": { "id": "routes/connect", "parentId": "root", "path": "connect", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/index-D5kG5eki.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/components-BlTBjdub.js"], "css": [] }, "routes/Screens": { "id": "routes/Screens", "parentId": "root", "path": "Screens", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/index-CVzA-BNr.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/index-tgQQ76OV.js", "/assets/index-CNPq0y9p.js", "/assets/create-DC3FBBky.js", "/assets/moment-C5S46NFB.js", "/assets/components-BlTBjdub.js", "/assets/Page-CP5RaZ3z.js", "/assets/context-CVOPGIzy.js", "/assets/Card-cfPGhfhX.js", "/assets/DataTable-Bwh0IRBP.js", "/assets/index-CQUpKOYE.js", "/assets/Sticky-525yc6rr.js"], "css": [] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/styles": { "id": "routes/styles", "parentId": "root", "path": "styles", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/styles-D_XvpvLC.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-BGyz1XEg.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/components-BlTBjdub.js", "/assets/index-CP26dfb2.js"], "css": ["/assets/route-TqOIn4DE.css"] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-B5obxmSQ.js", "imports": ["/assets/jsx-runtime-BLI8ZJsa.js", "/assets/index-CP26dfb2.js", "/assets/components-BlTBjdub.js", "/assets/styles-D5koe_rk.js", "/assets/index-CNPq0y9p.js", "/assets/create-DC3FBBky.js", "/assets/index-EHAiWlOd.js", "/assets/react-toastify.esm-DDqzjVhy.js", "/assets/context-CVOPGIzy.js", "/assets/context-DUgBqHB1.js"], "css": ["/assets/app-Bh76j7cs.css"] } }, "url": "/assets/manifest-9e1da032.js", "version": "9e1da032" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": false, "v3_relativeSplatPath": false, "v3_throwAbortReason": false, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/api.pinterest.create_board": {
    id: "routes/api.pinterest.create_board",
    parentId: "root",
    path: "api/pinterest/create_board",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/api.pinterest.refresh_auth": {
    id: "routes/api.pinterest.refresh_auth",
    parentId: "root",
    path: "api/pinterest/refresh_auth",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/api.pinterest.schedule_pin": {
    id: "routes/api.pinterest.schedule_pin",
    parentId: "root",
    path: "api/pinterest/schedule_pin",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/api.pinterest.user_account": {
    id: "routes/api.pinterest.user_account",
    parentId: "root",
    path: "api/pinterest/user_account",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/api.pinterest.create_pin": {
    id: "routes/api.pinterest.create_pin",
    parentId: "root",
    path: "api/pinterest/create_pin",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/api.pinterest.user_check": {
    id: "routes/api.pinterest.user_check",
    parentId: "root",
    path: "api/pinterest/user_check",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.preview_and_publish": {
    id: "routes/app.preview_and_publish",
    parentId: "routes/app",
    path: "preview_and_publish",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/api.generate-preview": {
    id: "routes/api.generate-preview",
    parentId: "root",
    path: "api/generate-preview",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/api.pinterest.boards": {
    id: "routes/api.pinterest.boards",
    parentId: "root",
    path: "api/pinterest/boards",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/data.pins.save_draft": {
    id: "routes/data.pins.save_draft",
    parentId: "root",
    path: "data/pins/save_draft",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/api.pinterest.auth": {
    id: "routes/api.pinterest.auth",
    parentId: "root",
    path: "api/pinterest/auth",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.select_product": {
    id: "routes/app.select_product",
    parentId: "routes/app",
    path: "select_product",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/data.users.create": {
    id: "routes/data.users.create",
    parentId: "routes/data.users",
    path: "create",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/data.users.delete": {
    id: "routes/data.users.delete",
    parentId: "routes/data.users",
    path: "delete",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/data.users.update": {
    id: "routes/data.users.update",
    parentId: "routes/data.users",
    path: "update",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.create_board": {
    id: "routes/app.create_board",
    parentId: "routes/app",
    path: "create_board",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/data.pins.create": {
    id: "routes/data.pins.create",
    parentId: "root",
    path: "data/pins/create",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/data.pins.delete": {
    id: "routes/data.pins.delete",
    parentId: "root",
    path: "data/pins/delete",
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/app.create_pin": {
    id: "routes/app.create_pin",
    parentId: "routes/app",
    path: "create_pin",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  },
  "routes/app.style_pin": {
    id: "routes/app.style_pin",
    parentId: "routes/app",
    path: "style_pin",
    index: void 0,
    caseSensitive: void 0,
    module: route21
  },
  "routes/app.templates": {
    id: "routes/app.templates",
    parentId: "routes/app",
    path: "templates",
    index: void 0,
    caseSensitive: void 0,
    module: route22
  },
  "routes/app.view_pins": {
    id: "routes/app.view_pins",
    parentId: "routes/app",
    path: "view_pins",
    index: void 0,
    caseSensitive: void 0,
    module: route23
  },
  "routes/data.pins.get": {
    id: "routes/data.pins.get",
    parentId: "root",
    path: "data/pins/get",
    index: void 0,
    caseSensitive: void 0,
    module: route24
  },
  "routes/data.products": {
    id: "routes/data.products",
    parentId: "root",
    path: "data/products",
    index: void 0,
    caseSensitive: void 0,
    module: route25
  },
  "routes/app.modules": {
    id: "routes/app.modules",
    parentId: "routes/app",
    path: "modules",
    index: void 0,
    caseSensitive: void 0,
    module: route26
  },
  "routes/AuthChecker": {
    id: "routes/AuthChecker",
    parentId: "root",
    path: "AuthChecker",
    index: void 0,
    caseSensitive: void 0,
    module: route27
  },
  "routes/ThemeLayout": {
    id: "routes/ThemeLayout",
    parentId: "root",
    path: "ThemeLayout",
    index: void 0,
    caseSensitive: void 0,
    module: route28
  },
  "routes/app.boards": {
    id: "routes/app.boards",
    parentId: "routes/app",
    path: "boards",
    index: void 0,
    caseSensitive: void 0,
    module: route29
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route30
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route31
  },
  "routes/data.users": {
    id: "routes/data.users",
    parentId: "root",
    path: "data/users",
    index: void 0,
    caseSensitive: void 0,
    module: route32
  },
  "routes/data.shop": {
    id: "routes/data.shop",
    parentId: "root",
    path: "data/shop",
    index: void 0,
    caseSensitive: void 0,
    module: route33
  },
  "routes/data.env": {
    id: "routes/data.env",
    parentId: "root",
    path: "data/env",
    index: void 0,
    caseSensitive: void 0,
    module: route34
  },
  "routes/webhooks": {
    id: "routes/webhooks",
    parentId: "root",
    path: "webhooks",
    index: void 0,
    caseSensitive: void 0,
    module: route35
  },
  "routes/connect": {
    id: "routes/connect",
    parentId: "root",
    path: "connect",
    index: void 0,
    caseSensitive: void 0,
    module: route36
  },
  "routes/Screens": {
    id: "routes/Screens",
    parentId: "root",
    path: "Screens",
    index: void 0,
    caseSensitive: void 0,
    module: route37
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route38
  },
  "routes/styles": {
    id: "routes/styles",
    parentId: "root",
    path: "styles",
    index: void 0,
    caseSensitive: void 0,
    module: route39
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route40
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route41
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
