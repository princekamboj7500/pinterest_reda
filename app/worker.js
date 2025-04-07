// app/utils/jobWorker.js
import { Worker } from "bullmq";
import redisClient from "./redisClient";
import axios from "axios";
import prisma from "./db.server";
// Create a new worker to process jobs from 'shopifyJobQueue'
const worker = new Worker(
  "shopifyJobQueue",
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    // Example: Perform some operation based on job data
    if (job.name === "shopifyProcessJob") {
      const { url, method, headers, data, shopifyShopId } = job.data;
      console.log("headers", headers);
      const { Authorization, "Content-Type": ContentType } = headers;
      console.log("access_key", Authorization);
      // Perform operations like syncing product, updating metadata, etc.
      let base64 = data.pin_data?.product_image_base64
        ?.replaceAll("data:image/jpeg;base64,", "")
        .replaceAll("data:image/png;base64,", "");
      let edited_pin_base64 = data.pin_data?.edited_pin_base64
        ?.replaceAll("data:image/jpeg;base64,", "")
        .replaceAll("data:image/png;base64,", "");
      let pin_data = {
        title: data.pin_data.title,
        description: data.pin_data.description,
        board_id: data.pin_data.board_id,
        media_source: {
          source_type: "image_base64",
          content_type: "image/png",
          data:
            data.pin_data.edited_pin_base64 == null
              ? base64
              : edited_pin_base64,
        },
      };

      const response = await axios
        .post(url, pin_data, {
          headers: {
            Authorization, // Correctly extracted token
            "Content-Type": ContentType, // Use extracted Content-Type
          },
        })
        .catch((error) => {
          console.log("response.data", error);
        });

      let pintrestData = response.data;
      let product_id = data.pin_data.product.node.id;
      let product_title = data.pin_data.product.node.title;
      let pinterestJson = JSON.stringify(pintrestData);
      let productEditJson = JSON.stringify(data.pin_data);
      let status = "published";

      let record = await prisma.PinterestProductPins.findFirst({
        where: { QueJobId: job.id },
      });

      console.log("record find", record);
      let pin = await prisma.PinterestProductPins.update({
        where: {
          id: record.id, // Unique identifier for the record
        },
        data: {
          shopifyShopId: shopifyShopId,
          product_id: product_id,
          pinterestJson: pinterestJson,
          product_title: product_title,
          status: status,
          productEditJson: productEditJson,
        },
      });

      // Your logic here...
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

export default worker;
