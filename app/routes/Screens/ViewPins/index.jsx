import { Spinner } from "@shopify/polaris";
import { useEffect, useMemo, useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import {
  Page,
  Card,
  Button,
  DataTable,
  Icon,
  Modal,
  Frame,
  Toast,
  Thumbnail,
} from "@shopify/polaris";

import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";

import { useSelector, useDispatch } from "react-redux";
import styles from "../../styles";
import { setData } from "../../../redux/slices/pin/create.jsx";
import moment from "moment";

export default function ViewPins() {
  const storePinFetcher = useFetcher();
  console.log(storePinFetcher?.data);
  const deletePinFetcher = useFetcher();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const style = {
    list_action_button_main: {
      display: "flex",
      justifyContent: "space-between",
    },
  };
  const [loading, setLoading] = useState(true);
  const getPins = () => {
    storePinFetcher.submit(
      {
        shopifyShopId: user?.shopifyShopId,
      },
      { method: "post", action: "/data/pins/get" }
    );
  };
  useEffect(() => {
    if (storePinFetcher?.data) {
      setLoading(false); // Hide loader when data is fetched
    }
  }, [storePinFetcher?.data]);

  useEffect(() => {
    getPins();
  }, []);

  const deselectedOptions = useMemo(
    () => [
      { value: "rustic", label: "Rustic" },
      { value: "antique", label: "Antique" },
      { value: "vinyl", label: "Vinyl" },
      { value: "vintage", label: "Vintage" },
      { value: "refurbished", label: "Refurbished" },
    ],
    []
  );
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState(deselectedOptions);
  const updateSelection = () => {};
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [DeleteAlertMsg, setDeleteAlertMsg] = useState("");
  const toggleDeleteAlert = useCallback(
    () => setShowDeleteAlert((active) => !active),
    []
  );
  const DeleteAlertMarkup = showDeleteAlert ? (
    <Toast content={DeleteAlertMsg} onDismiss={toggleDeleteAlert} />
  ) : null;

  const [deleteItemData, setDeleteItemData] = useState({});
  const [showDeleteAlertModal, setShowDeleteAlertModal] = useState(false);

  const handleCloseModal = () => {
    setShowDeleteAlertModal(false);
  };
  const confirmDelete = () => {
    setShowDeleteAlertModal(false);
    handleDelete(deleteItemData?.id, deleteItemData?.pin_id);
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
    if (deletePinFetcher?.data?.success) {
      setDeleteAlertMsg("Pin deleted successfully.");
      setShowDeleteAlert(true);
      getPins();
    }
  }, [deletePinFetcher.data]);
  const [popoverStates, setPopoverStates] = useState({});

  const togglePopover = (id) => {
    setPopoverStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Frame>
      {DeleteAlertMarkup}
      <Page
        title="View Pins"
        fullWidth
        subtitle="Browse and manage all your created pins in one place."
        compactTitle
      >
        <Card>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Spinner />
            </div>
          ) : Object.values(storePinFetcher?.data ?? {}).length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                fontSize: "16px",
                color: "#777",
              }}
            >
              <p>No items available</p>
            </div>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text"]}
              headings={[
                "Image",
                "Product",
                "Title Pin",
                "Date of Creation",
                "Actions",
              ]}
              rows={Object.values(storePinFetcher?.data ?? {}).map((row) => {
                const pinterestJson = JSON.parse(row.pinterestJson);
                const productEditJson = JSON.parse(row.productEditJson);
                const title =
                  productEditJson?.product?.node?.title || "Untitled";
                const pinTitle = productEditJson?.title || "Untitled";
                const price =
                  productEditJson.product?.node?.variants?.edges[0]?.node
                    ?.price || "0.00";
                const imageUrl =
                  productEditJson?.edited_pin_base64 ??
                  productEditJson?.product_image_base64;
                const creationDate = pinterestJson.created_at
                  ? new Date(pinterestJson.created_at).toLocaleDateString()
                  : "N/A";

                let ActionButton = (
                  <div style={{ display: "flex", gap: "7px" }}>
                    <div
                      className="dash-action-icon-edit"
                      onClick={() => {
                        handleEditPin(productEditJson);
                      }}
                    >
                      <Icon source={EditIcon} tone="base" />
                    </div>
                    <div
                      className="dash-action-icon-delete"
                      onClick={() => {
                        setDeleteItemData({
                          id: row.id,
                          pin_id: pinterestJson.id,
                        });
                        setShowDeleteAlertModal(true);
                      }}
                    >
                      <Icon source={DeleteIcon} tone="base" />
                    </div>
                  </div>
                );

                return [
                  <Thumbnail
                    source={imageUrl || "https://via.placeholder.com/200"}
                    alt="Product"
                    size="small"
                  />,
                  title, // Product column
                  pinTitle, // Title Pin column (or any other relevant info)
                  creationDate, // Date of Creation column
                  ActionButton, // Actions column
                ];
              })}
            />
          )}
        </Card>
      </Page>

      <Modal
        open={showDeleteAlertModal}
        onClose={handleCloseModal}
        title="Are you sure you want to delete this product?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryAction={{
          content: "Cancel",
          onAction: handleCloseModal,
        }}
      >
        <Modal.Section>
          <p>This action cannot be undone.</p>
        </Modal.Section>
      </Modal>
    </Frame>
  );

  // return (
  //       <div>
  //          <Frame>
  //          {DeleteAlertMarkup}
  //           <Page style={{display : 'block'}}
  //             title="View Pins"
  //             fullWidth
  //             subtitle="Browse and manage all your created pins in one place."
  //             compactTitle
  //           >

  //             <Card>
  //               <div style={{padding:'1.5rem',minHeight:'600px'}}>

  //                   {/*  Items grid */}
  //                   <div style={{marginTop:'0px'}}>
  //                       <Grid>

  //                           {
  //                             Object.values(storePinFetcher?.data ?? []).map((row)=>{

  //                               let pinterestJson = JSON.parse(row.pinterestJson)
  //                               let productEditJson = JSON.parse(row.productEditJson)

  //                               return <Grid.Cell columnSpan={{xs: 4, sm: 4, md: 4, lg: 4, xl: 4}}>
  //                                         <LegacyCard title="" sectioned>
  //                                             <div style={{display:'flex'}}>
  //                                               <img
  //                                                 style={{width:'200px',height:'250px',margin:'auto'}}
  //                                                 src={productEditJson?.edited_pin_base64 ?? productEditJson?.product_image_base64} />
  //                                             </div>
  //                                             <div style={{display:'flex',justifyContent:'space-between'}}>
  //                                               <Text as="h3" variant="bodyMd">{productEditJson?.product?.node?.title}</Text>
  //                                               <Text variant="headingMd">
  //                                                 <NumericFormat

  //                                                   value={productEditJson.product?.node?.variants?.edges[0]?.node?.price}
  //                                                   displayType={'text'}
  //                                                   thousandSeparator={true}
  //                                                   prefix={"$"}
  //                                                   decimalScale={2}
  //                                                   fixedDecimalScale={true}

  //                                               />
  //                                               </Text>
  //                                             </div>
  //                                             <div style={{marginTop:'15px',display:'flex',justifyContent:'center'}}>
  //                                               <button style={{...styles.theme_button, minWidth:'200px', maxWidth:'300px'}}
  //                                                 onClick={()=>{
  //                                                   handleEditPin(productEditJson)
  //                                                 }}
  //                                               >
  //                                                   Edit PIN
  //                                               </button>
  //                                             </div>
  //                                             <div style={{marginTop:'15px',display:'flex',justifyContent:'center'}}>
  //                                               <button
  //                                                 style={{...styles.theme_button, minWidth:'200px', maxWidth:'300px',background:'none',color:"rgb(215, 44, 13)",border: "1px solid rgb(215, 44, 13)"}}
  //                                                 onClick={()=>{
  //                                                   setDeleteItemData({id: row.id,pin_id : pinterestJson.id})
  //                                                   setShowDeleteAlertModal(true)
  //                                                 }}
  //                                               >
  //                                                   Delete PIN
  //                                               </button>
  //                                             </div>
  //                                         </LegacyCard>
  //                                       </Grid.Cell>
  //                             })
  //                           }

  //                             {/*  */}

  //                       </Grid>
  //                   </div>

  //               </div>
  //               <div style={{marginTop : '30px',display:'flex',gap:'15px'}} >

  //                   <button to="select_product"  style={{...styles.theme_button, margin:'auto'}} type="button" onClick={()=>{
  //                       navigate('/app/create_pin')
  //                   }}>
  //                       Create a new PIN
  //                   </button>
  //               </div>
  //             </Card>

  //           </Page>
  //         </Frame>

  //           <Modal
  //               open={showDeleteAlertModal}
  //               onClose={handleCloseModal}
  //               title="Are you sure you want to delete this product?"
  //               primaryAction={{
  //                 content: 'Delete',
  //                 destructive: true,
  //                 onAction: confirmDelete,
  //               }}
  //               secondaryAction={{
  //                 content: 'Cancel',
  //                 onAction: handleCloseModal,
  //               }}
  //             >
  //               <Modal.Section>
  //                 <p>This action cannot be undone.</p>
  //               </Modal.Section>
  //           </Modal>
  //       </div>
  // );
}

{
  /*     
            <ResourceList
              resourceName={{ singular: "pin", plural: "pins" }}
              items={Object.values(storePinFetcher?.data ?? [])}
              renderItem={(row) => {
                const pinterestJson = JSON.parse(row.pinterestJson);
                const productEditJson = JSON.parse(row.productEditJson);
                const title =
                  productEditJson?.product?.node?.title || "Untitled";
                const price =
                  productEditJson.product?.node?.variants?.edges[0]?.node
                    ?.price || "0.00";
                const imageUrl =
                  productEditJson?.edited_pin_base64 ??
                  productEditJson?.product_image_base64;

                return (
                  <ResourceItem
                    id={row.id}
                    media={
                      <Thumbnail
                        source={imageUrl || "https://via.placeholder.com/200"}
                        alt={title}
                        size="small"
                      />
                    }
                    accessibilityLabel={`View details for ${title}`}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto", // Title takes full space, price & actions align right
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      
                      <Text
                        as="h3"
                        variant="bodyMd"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {title}
                      </Text>

                      
                      <Text
                        variant="headingMd"
                        style={{ textAlign: "right", minWidth: "80px" }}
                      >
                        <NumericFormat
                          value={price}
                          displayType={"text"}
                          thousandSeparator={true}
                          prefix={"$"}
                          decimalScale={2}
                          fixedDecimalScale={true}
                        />
                      </Text>

                      
                      <Popover
                        active={popoverStates[row.id] || false}
                        activator={
                          <Button
                            icon={MenuVerticalIcon}
                            onClick={() => togglePopover(row.id)}
                          />
                        }
                        onClose={() => togglePopover(row.id)}
                      >
                        <ActionList
                          items={[
                            {
                              content: "Edit PIN",
                              onAction: () => handleEditPin(productEditJson),
                            },
                            {
                              content: "Delete PIN",
                              destructive: true,
                              onAction: () => {
                                setDeleteItemData({
                                  id: row.id,
                                  pin_id: pinterestJson.id,
                                });
                                setShowDeleteAlertModal(true);
                              },
                            },
                          ]}
                        />
                      </Popover>
                    </div>
                  </ResourceItem>
                );
              }}

            />
 */
}
