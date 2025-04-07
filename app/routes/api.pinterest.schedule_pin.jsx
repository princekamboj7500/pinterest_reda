import { json } from "@remix-run/node";
import axios from "axios";
import { parse, stringify, toJSON, fromJSON } from "flatted";
import jobQueue from "./../jobQueue";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const body = await request.formData();
    const access_key = body.get("access_key");
    const rawData = body.get("data");
    const delay = body.get("delay");

    if (!access_key || !rawData || !delay) {
      return json({ error: "Missing required fields" }, { status: 400 });
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
          "Content-Type": "application/json",
        },
        data: parsedData,
        shopifyShopId,
      },
      {
        delay: parseInt(delay, 10),
        attempts: 5,
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
        QueJobId,
      },
    });

    return json({ jobID: job.id }, { status: 200 });
  } catch (error) {
    console.error("Failed to process request:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
};
