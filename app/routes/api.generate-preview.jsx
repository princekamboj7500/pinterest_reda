const books = {
  highTower: "DAGdwmW9UAs",
};
const generatePrompt = (collection, age, hairType, faceType, gender) => {
  switch (collection) {
    case "highTower":
      return {
        prompt: `This ${age} year old ${gender} who has ${hairType} hair, ${faceType} face, wearing wizarding robes and a wizards hat, standing outside of hogwarts, smiling`,
        coverImageId: "5536c269-1ace-4d04-b48c-29839d5b09a2",
        imageId: "2afa8838-226d-4e55-a72f-30c2cb8d2561",
      };
    default:
      return ``;
  }
};

export const action = async ({ request }) => {
  try {
    const req = await request.json();
    const {
      firstName,
      lastName,
      age,
      hairType,
      faceType,
      uploadImage,
      gender,
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

    // upload image to canva
    const jobId = await createAssetUploadJob(result?.generated_images[0]?.url);
    const assetId = await getAssetUploadJob(jobId);

    // create autofill job

    const autoFillJonID = await createAutoFillJob(
      books[collection],
      {
        f_name: {
          type: "text",
          text: firstName,
        },
        page1_image: {
          type: "image",
          image: assetId,
        },
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
        url,
      })
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};

async function generateAiImage(data) {
  console.log(data, "data");
  try {
    const url = "https://cloud.leonardo.ai/api/rest/v1/generations";
    const apiKey = "16f80776-44a1-4023-85d4-dd083cc06415";
    const authorization = `Bearer ${apiKey}`;
    const initHeaders = {
      accept: "application/json",
      "content-type": "application/json",
      authorization,
    };
    const body = {
      height: 720,
      modelId: "2067ae52-33fd-4a82-bb92-c2c55e7d2786",
      prompt: data?.prompt,
      width: 1280,
      num_images: 1,
      init_image_id: data?.imageId,
      init_strength: 0.3,
      contrast: 3.5,
      controlnets: [
        {
          preprocessorId: 67,
          initImageType: "UPLOADED",
          initImageId: data?.coverImageId,
          strengthType: "High", //data?.cover?.coverImageStrength
        },
        {
          preprocessorId: 133,
          initImageType: "UPLOADED",
          initImageId: data?.id,
          strengthType: "High",
        },
      ],
    };
    const generateImage = await fetch(url, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify(body),
    });

    const aiImage = await generateImage.json();
    console.log(aiImage, "aiImage");

    let maxAttempt = 5;
    let flag = false;
    while (maxAttempt > 0 && flag === false) {
      maxAttempt -= 1;
      const getImage = await fetch(
        url + "/" + aiImage?.sdGenerationJob?.generationId,
        {
          method: "GET",
          headers: initHeaders,
        }
      );
      const responseImage = await getImage.json();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      if (responseImage?.generations_by_pk?.generated_images?.length > 0) {
        flag = true;

        return responseImage?.generations_by_pk;
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

  const mimeType = match[1]; // e.g., "image/png"
  const base64Data = match[2];
  const binaryData = atob(base64Data); // Decode base64 string

  // Convert binary string to a Uint8Array
  const arrayBuffer = new Uint8Array(binaryData.length);
  for (let i = 0; i < binaryData.length; i++) {
    arrayBuffer[i] = binaryData.charCodeAt(i);
  }

  // Create a Blob or File object
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const file = new File([blob], "image.png", { type: mimeType });

  const req = await fetch("https://cloud.leonardo.ai/api/rest/v1/init-image", {
    method: "POST",
    headers: {
      Authorization: "Bearer 16f80776-44a1-4023-85d4-dd083cc06415",
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      extension: mimeType.split("/").pop(),
    }),
  });
  const res = await req.json();
  const fields = JSON.parse(res.uploadInitImage.fields);
  const form = new FormData();
  for (const key in fields) {
    form.append(key, fields[key]);
  }
  form.append("file", file);

  const upload_req = await fetch(res.uploadInitImage.url, {
    method: "POST",
    body: form,
  });
  const upload_res = await upload_req.text();
  return {
    image: "https://cdn.leonardo.ai/" + res.uploadInitImage.key,
    id: res.uploadInitImage.id,
  };
}

const createDesignExport = async (designId) => {
  const TOKEN = await getValidAccessToken();
  try {
    const response = await fetch("https://api.canva.com/rest/v1/exports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        design_id: designId,
        format: {
          type: "pdf",
          size: "a4",
          pages: [1],
          // export_quality: "pro",
        },
      }),
    });

    const data = await response.json();
    return data?.job?.id;
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brand_template_id: brandTemplateId,

        title: title, // Modify if needed
        data: payloadData,
      }),
    });
    // Check if response is successful
    if (!response.ok) {
      console.log("Error creating autofill job:", response);
      throw new ApiError(
        response.status,
        `Failed to create autofill job: ${response.statusText}`
      );
    }

    // Parse JSON response and check for job ID
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
  const TOKEN = await getValidAccessToken();
  try {
    let status = "in_progress";
    let designId = null;
    let attempts = 0;
    const maxAttempts = 5;
    const delay = 1000;

    while (status === "in_progress" && attempts < maxAttempts) {
      const response = await fetch(
        `https://api.canva.com/rest/v1/autofills/${jobId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
          },
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
          designId = data.job.result?.design?.id;
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

export { createAutoFillJob, getAutoFillJobStatus };
