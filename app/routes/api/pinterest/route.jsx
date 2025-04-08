// app/routes/api/pinterest/boards.jsx
import { json } from "@remix-run/node"; // or '@remix-run/cloudflare'
import axios from "axios";

export const loader = async () => {
  try {
    const response = await axios.get(
      "https://api-sandbox.pinterest.com/v5/boards",
      {
        headers: {
          Authorization: `Bearer ${process.env.PINTEREST_API_KEY}`, // Pinterest access token
          "Content-Type": "application/json",
        },
      }
    );

    return json(response.data);
  } catch (error) {
    console.error("Failed to fetch Pinterest data:", error);
    return json({ error: "Failed to fetch Pinterest data" }, { status: 500 });
  }
};
