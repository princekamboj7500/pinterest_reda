import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";

import {
  Page,
  Text,
  Card,
  TextField,
  Form,
  Select,
  Button,
} from "@shopify/polaris";
import styles from "../../styles";
import { useLocation } from "@remix-run/react";
import { useSelector, useDispatch } from "react-redux";
import { setData } from "../../../redux/slices/pin/create.jsx";
import { toast } from "react-toastify";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function CreatePin(props) {
  const location = useLocation();
  const navigate = useNavigate();
  const Boardfetcher = useFetcher();
  let { product } = location.state ?? {};
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const new_pin_data = useSelector((state) => state.new_pin?.data);
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const bridge = useAppBridge();
  const shopUrl = bridge.config.shop;
  const style = {
    list_action_button_main: {
      display: "flex",
      justifyContent: "space-between",
    },
  };

  useEffect(() => {
    var base64 = toDataUrl(
      new_pin_data?.edited_pin_base64
        ? new_pin_data?.edited_pin_base64
        : new_pin_data?.product?.node?.featuredImage?.url,
      function (myBase64) {
        dispatch(setData({ ...new_pin_data, product_image_base64: myBase64 }));
      }
    );

    Boardfetcher.submit(
      { access_key: user?.accessToken },
      { method: "post", action: "/api/pinterest/boards" }
    );
  }, []);

  useEffect(() => {
    let b = [{ label: "Select", value: "" }];
    Object.values(Boardfetcher?.data?.items ?? []).map((row) => {
      b.push({ label: row.name, value: row.id });
    });
    if (new_pin_data?.board_id) {
    } else {
      if (Object.keys(b).length > 0) {
        dispatch(setData({ ...new_pin_data, board_id: b[0].value }));
      }
    }

    setBoards(b);
  }, [Boardfetcher?.data]);

  const handleSubmit = (e) => {
    setLoading(true);
    if (new_pin_data?.title == "") {
      shopify.toast.show("Please enter the title");
      setLoading(false);
    } else if (new_pin_data?.description == "") {
      shopify.toast.show("Please enter the description");
      setLoading(false);
    } else if (
      new_pin_data?.destination_url == "" ||
      new_pin_data?.destination_url == null
    ) {
      shopify.toast.show("Please enter the destination url");
      setLoading(false);
    } else if (new_pin_data?.board_id == null || new_pin_data?.board_id == "") {
      shopify.toast.show("Please select a board");
      setLoading(false);
    } else {
      navigate("/app/preview_and_publish");
    }
    //
    //console.log('e',e)
  };

  const handleChangeBoard = (value) => {
    dispatch(setData({ ...new_pin_data, board_id: value }));
  };
  return (
    <div>
      <Page
        style={{ display: "block" }}
        title="Create Pin"
        fullWidth
        subtitle="Create and customize your Pinterest pin"
        compactTitle
      >
        <Card>
          <Form onSubmit={handleSubmit}>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "60px" }}>
                <div style={{ width: "60%" }}>
                  <div style={{ marginTop: "30px" }}>
                    <TextField
                      value={new_pin_data?.title}
                      defaultValue={product?.node?.title}
                      onChange={(value) => {
                        if (value) {
                          if (value.length <= 100) {
                            dispatch(
                              setData({ ...new_pin_data, title: value })
                            );
                          }
                        }
                      }}
                      label="PIN Title"
                      type="text"
                      placeholder="Enter the title"
                      autoComplete="text"
                      maxLength={100}
                      minLength={0}
                      helpText={
                        <span>
                          {100 - new_pin_data?.title?.length} characters left
                        </span>
                      }
                    />
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    <TextField
                      value={new_pin_data?.description}
                      defaultValue={product?.node?.description}
                      onChange={(value) => {
                        if (value) {
                          if (value.length <= 700) {
                            dispatch(
                              setData({ ...new_pin_data, description: value })
                            );
                          }
                        }
                      }}
                      label="Description"
                      type="text"
                      multiline={8}
                      maxLength={500}
                      helpText={
                        <span>
                          {700 - new_pin_data?.description?.length} characters
                          left
                        </span>
                      }
                    />
                  </div>

                  <div style={{ marginTop: "15px" }}>
                    <TextField
                      value={new_pin_data?.destination_url}
                      onChange={(value) => {
                        dispatch(
                          setData({ ...new_pin_data, destination_url: value })
                        );
                      }}
                      def
                      label="Destination URL"
                      type="text"
                      placeholder="Enter the URL"
                      error={
                        new_pin_data?.destination_url &&
                        !isValidURL(new_pin_data?.destination_url)
                          ? "Please enter a valid URL"
                          : undefined
                      }
                    />
                  </div>

                  <div style={{ marginTop: "15px" }}>
                    <Select
                      label="Pinterest Board Selection"
                      options={boards}
                      onChange={(value) => {
                        handleChangeBoard(value);
                      }}
                      value={`${new_pin_data?.board_id}`}
                    />
                  </div>
                </div>
                {/*  */}
                <div style={{ width: "40%" }}>
                  {new_pin_data?.edited_pin_base64 == null ? (
                    <div
                      style={{
                        // background: "#E6E1D2",
                        width: "100%",
                        padding: "30px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100px",
                          // background: "#C0B5B3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text as="h1" variant="heading2xl" fontWeight="bold">
                          {new_pin_data?.title}
                        </Text>
                      </div>
                      <div style={{ width: "100%" }}>
                        <img
                          style={{ width: "100%" }}
                          src={new_pin_data?.product?.node?.featuredImage?.url}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                    // style={{
                    //   padding: "25px",
                    //   background: "#C0B5B3",
                    // }}
                    >
                      <img
                        src={new_pin_data?.edited_pin_base64}
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}

                  {/* <div style={{ width: "100%", marginTop: "15px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        
                        navigate("/app/templates");
                      }}
                      style={{
                        cursor: "pointer",
                        width: "100%",
                        background: "white",
                        border: "1px solid gainsboro",
                        padding: "10px 15px",
                        fontSize: "12px",
                      }}
                    >
                      Edit
                    </button>
                  </div> */}
                  <div></div>
                </div>
              </div>
            </div>
          </Form>

          <div
            style={{
              marginTop: "30px",
              display: "flex",
              gap: "15px",
              justifyContent: "center",
            }}
          >
            <Button
              to="select_product"
              variant="primary"
              tone="critical"
              size="large"
              type="button"
              onClick={() => {
                navigate("/app");
              }}
            >
              Cancel
            </Button>

            {/*  */}
            <Button
              to="select_product"
              size="large"
              type="submit"
              onClick={() => {
                handleSubmit();
              }}
              loading={loading}
            >
              Save
            </Button>
          </div>
        </Card>
      </Page>
    </div>
  );
}
function toDataUrl(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    var reader = new FileReader();
    reader.onloadend = function () {
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
    "^(https?:\\/\\/)?" + // protocol
      "((([a-zA-Z0-9$-_@.&+!*\\(\\),]+\\.)+[a-zA-Z]{2,})|" + // domain name and extension
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR IPv4 address
      "(\\:\\d+)?(\\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?" + // port and path
      "(\\?[;&a-zA-Z0-9%_+.~#?&//=]*)?" + // query string
      "(\\#[-a-zA-Z0-9_]*)?$",
    "i"
  );
  return !!urlPattern.test(url);
};
