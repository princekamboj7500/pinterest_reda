import { useEffect, useState, useCallback } from "react";

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
  DataTable,
  Icon,
  Spinner,
} from "@shopify/polaris";

import { DeleteIcon, EditIcon, RefreshIcon } from "@shopify/polaris-icons";
import styles from "../../styles";
import { Link } from "@remix-run/react";
import TabOne from "./Tabs/One";
import TabTwo from "./Tabs/Two";
import TabThree from "./Tabs/Three";
import TabFour from "./Tabs/Four";
import TabFive from "./Tabs/Five";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import { setData } from "../../../redux/slices/pin/create.jsx";
//  import Queue from 'bull';

export const loader = () => {
  const PINTEREST_APP_ID = import.meta.env.PINTEREST_APP_ID;
  return json({ PINTEREST_APP_ID });
};

export default function Dashboard(props) {
  // Initialize the queue
  //const queue = new Queue('shopifyJobQueue');
  const [get_started_tab, set_get_started_tab] = useState(1);
  const [shopConfig, setShopConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const disconnectFetcher = useFetcher();
  const storePinFetcher = useFetcher();
  const deletePinFetcher = useFetcher();
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const appBridge = useAppBridge();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const style = {
    list_action_button_main: {
      display: "flex",
      justifyContent: "space-between",
    },
  };
  const [deleteItemData, setDeleteItemData] = useState({});

  ///
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [DeleteAlertMsg, setDeleteAlertMsg] = useState("");

  const toggleDeleteAlert = useCallback(
    () => setShowDeleteAlert((active) => !active),
    []
  );

  const DeleteAlertMarkup = showDeleteAlert
    ? shopify.toast.show(DeleteAlertMsg, {
        duration: 1000,
        onDismiss: toggleDeleteAlert,
      })
    : null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const config = appBridge.config; // or any other client-side config
      setShopConfig(config);
    }
  }, []);
  const handleDisconnect = () => {
    disconnectFetcher.submit(
      { shopifyShopId: shopConfig.shop },
      { method: "post", action: "/data/users/delete" }
    );
    window.location.reload();
    //props.handleRefresh()
  };
  const RenderGetStartTabs = () => {
    if (get_started_tab == 1) {
      return <TabOne set_get_started_tab={set_get_started_tab} />;
    } else if (get_started_tab == 2) {
      return <TabTwo set_get_started_tab={set_get_started_tab} />;
    } else if (get_started_tab == 3) {
      return <TabThree set_get_started_tab={set_get_started_tab} />;
    } else if (get_started_tab == 4) {
      return <TabFour set_get_started_tab={set_get_started_tab} />;
    } else if (get_started_tab == 5) {
      return <TabFive set_get_started_tab={set_get_started_tab} />;
    }
  };

  const getPins = () => {
    setLoading(true);
    storePinFetcher.submit(
      {
        shopifyShopId: user?.shopifyShopId,
      },
      { method: "post", action: "/data/pins/get" }
    );
  };

  const handleDelete = (id, pin_id) => {
    deletePinFetcher.submit(
      {
        access_key: user?.accessToken,
        id: id,
        pin_id: pin_id,
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
    if (deletePinFetcher?.data?.success) {
      setDeleteAlertMsg("Pin deleted successfully.");
      setShowDeleteAlert(true);
      getPins();
    }
  }, [deletePinFetcher.data]);

  async function rerunJob(jobId) {
    try {
      // Fetch the job by its ID
      const job = await queue.getJob(jobId);
      if (job) {
        // Check if the job has failed
        if (job.failedReason) {
          await job.retry(); // Retry the failed job
          console.log(`Job ${jobId} has been retried.`);
        } else {
          // If the job is not in a failed state, you can add a new one with the same data
          await queue.add(job.data);
          console.log(`Job ${jobId} has been added again with the same data.`);
        }
      } else {
        console.log(`Job ${jobId} not found.`);
      }
    } catch (error) {
      console.error(`Error rerunning job ${jobId}:`, error);
    }
  }

  useEffect(() => {
    console.log("inside useEffect");
    if (Object.keys(storePinFetcher?.data ?? {}).length > 0) {
      const data = Object.values(storePinFetcher.data).map((row) => {
        let pin = JSON.parse(row.pinterestJson);
        let pinEdit = row.productEditJson
          ? JSON.parse(row.productEditJson)
          : {};

        // Status logic
        const status =
          row.status === "draft" ? (
            <Button>Draft</Button>
          ) : row.status === "scheduled" ? (
            <Button variant="primary" tone="critical">
              Waiting
            </Button>
          ) : row.status === "published" ? (
            <Button variant="primary" tone="success">
              Published
            </Button>
          ) : null;

        // Action buttons
        const ActionButton = (
          <div style={{ display: "flex", gap: "7px" }}>
            <div
              className="dash-action-icon-edit"
              onClick={() => handleEditPin(pinEdit)}
            >
              <Icon source={EditIcon} tone="base"></Icon>
            </div>
            <div
              className="dash-action-icon-delete"
              onClick={() => {
                setDeleteItemData({ id: row.id, pin_id: pin.id });
                setShowDeleteAlertModal(true);
                shopify.modal.show("delete-modal");
              }}
            >
              <Icon source={DeleteIcon} tone="base"></Icon>
            </div>
          </div>
        );

        // Prepare row data
        return [
          row.product_title,
          pinEdit.title,
          status,
          new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          ActionButton,
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
    handleDelete(deleteItemData?.id, deleteItemData?.pin_id);
  };
  return (
    <div>
      <Page>
        {DeleteAlertMarkup}
        <Page
          style={{ display: "block" }}
          title="Dashboard"
          fullWidth
          subtitle="The integration process guide through the main features of the application."
          compactTitle
          secondaryActions={
            <div style={{ display: "flex", gap: "7px" }}>
              <Button
                onClick={() => {
                  getPins();
                }}
              >
                <Icon source={RefreshIcon} tone="base"></Icon>
              </Button>
              <Button
                onClick={() => {
                  handleDisconnect();
                }}
              >
                Disconnect Pinterest
              </Button>

              <Button
                onClick={() => {
                  navigate("/app/boards");
                }}
              >
                Boards
              </Button>
            </div>
          }
        >
          {/* Tabs */}

          {/* <RenderGetStartTabs/>  */}

          <Card>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "50vh",
                }}
              >
                <Spinner size="large" />
              </div>
            ) : rows && rows.length > 0 ? (
              <DataTable
                columnContentTypes={[]}
                headings={[
                  "Product",
                  "Title Pin",
                  "Status",
                  "Date of Creation",
                  "Actions",
                ]}
                rows={rows}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "50vh",
                }}
              >
                <Text>No Pins Found</Text>
              </div>
            )}
          </Card>
        </Page>
      </Page>

      <ui-modal
        // open={showDeleteAlertModal}
        id="delete-modal"
        // onClose={handleCloseModal}
        // title="Are you sure you want to delete this product?"
        // primaryAction={{
        //   content: "Delete",
        //   destructive: true,
        //   onAction: confirmDelete,
        // }}
        // secondaryAction={{
        //   content: "Cancel",
        //   onAction: handleCloseModal,
        // }}
      >
        <div gap="4">
          <Text>Are you sure you want to delete this pin?</Text>
        </div>
        <ui-title-bar title="Delete Item">
          <button variant="primary" tone="critical" onClick={confirmDelete}>
            Delete
          </button>
          <button onClick={handleCloseModal}>Cancel</button>
        </ui-title-bar>
      </ui-modal>
    </div>
  );
}
