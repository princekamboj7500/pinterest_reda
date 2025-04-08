import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  try {
    const data = await request.json();
    console.log(data, "data");

    const { name, description } = data;
    const access_token = request.headers.get("access_token");
    console.log(access_token, "access_token");
    if (!access_token) {
      return json({ message: "Access token not found" }, { status: 401 });
    }
    const response = await fetch(`${process.env.PINTEREST_API_HOST}/boards`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    const jsonResponse = await response.json();
    console.log(jsonResponse, "response");

    if (!response.ok) {
      return json(
        { message: "Failed to create board: " + jsonResponse.message },
        { status: 500 }
      );
    }

    return json({ message: "Board created successfully" });
  } catch (error) {
    console.error("Failed to fetch Pinterest data:", error);

    return json(
      { error: "An error occurred while creating the board" },
      { status: 500 }
    );
  }
};
