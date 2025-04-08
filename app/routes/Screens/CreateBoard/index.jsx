import { useEffect, useMemo, useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PlusCircleIcon } from "@shopify/polaris-icons";
import { SearchIcon } from "@shopify/polaris-icons";
import {
  Page,
  Toast,
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

export default function CreateBoard(props) {
  const location = useLocation();
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
        access_token: user.accessToken,
      },
    });
    const resJson = await response.json();
    console.log(resJson, "response");
    if (response.ok) {
      setLoading(false);
      navigate("/app");
    } else {
      setLoading(false);
      setError(resJson?.message);
    }
    return;
  };

  return (
    <div>
      <Page
        style={{ display: "block" }}
        title="Create Board"
        fullWidth
        subtitle="Create Pinterest Board"
        compactTitle
      >
        <Card>
          <Form onSubmit={handleSubmit}>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "60px" }}>
                <div style={{ width: "60%" }}>
                  <div style={{ marginTop: "15px" }}>
                    <TextField
                      value={name}
                      onChange={(value) => {
                        setName(value);
                      }}
                      label="Name"
                      placeholder="Enter Board Name"
                      type="text"
                      maxLength={30}
                    />
                  </div>

                  <div style={{ marginTop: "15px" }}>
                    <TextField
                      value={description}
                      onChange={(value) => {
                        setDescription(value);
                      }}
                      multiline={4}
                      label="Description"
                      type="text"
                      placeholder="Enter Description"
                      maxLength={200}
                    />
                  </div>
                </div>
                {/*  */}
              </div>
              {error && <span style={{ color: "red" }}>{error}</span>}
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
              size="large"
              type="button"
              onClick={() => {
                navigate("/app/boards");
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
