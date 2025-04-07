import { useEffect, useMemo, useState } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
import { PlusCircleIcon } from "@shopify/polaris-icons";
import { SearchIcon } from "@shopify/polaris-icons";
import { NumericFormat } from "react-number-format";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import {
  Page,
  Text,
  TextField,
  Card,
  Button,
  BlockStack,
  ResourceItem,
  ResourceList,
  Thumbnail,
  Banner,
  Spinner,
} from "@shopify/polaris";

import styles from "../../styles";
import "./style.css";
import { useSelector, useDispatch } from "react-redux";
import { setData } from "../../../redux/slices/pin/create.jsx";

export default function SelectProduct() {
  const [loading, setLoading] = useState(true);
  const [buttonPressed, setButtonPressed] = useState(false);
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const new_pin_data = useSelector((state) => state.new_pin?.data);

  const dispatch = useDispatch();
  const style = {
    list_action_button_main: {
      display: "flex",
      justifyContent: "space-between",
    },
  };

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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showError, setShowError] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [prevCursor, setPrevCursor] = useState(null);

  const updateSelection = () => {};
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
          rect_bg: "#d3d3d3",
        },
        edited_pin_base64: null,
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
      first: direction === "next" ? 10 : null, // Use `first` for forward pagination
      last: direction === "prev" ? 10 : null, // Use `last` for backward pagination
      after: direction === "next" ? cursor : null,
      before: direction === "prev" ? cursor : null,
      query: searchTerm ? `${searchTerm} ` : "",
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
    if (fetcher.data) {
      setLoading(false);
    }
    console.log(fetcher?.data, "fetcher data");
    if (fetcher.data?.products?.pageInfo) {
      setHasNextPage(fetcher.data.products.pageInfo.hasNextPage);
      setHasPreviousPage(fetcher.data.products.pageInfo.hasPreviousPage);
      setNextCursor(fetcher.data.products.pageInfo.endCursor);
      setPrevCursor(fetcher.data.products.pageInfo.startCursor);
    }
  }, [fetcher.data]);

  const handleSelectionChange = (newSelectedItems) => {
    console.log(newSelectedItems, "newSelectedItems");
    setShowError(false);

    if (newSelectedItems.length === 0) {
      // If no items are selected, clear selection
      setSelectedItems([]);
      setSelectedProduct(null);
      return;
    }

    // Only keep the most recently selected item (deselecting previous selection)
    const selectedId = newSelectedItems[newSelectedItems.length - 1];

    setSelectedItems([selectedId]); // Always keep only one selected item

    // Find and set the selected product
    const selectedProduct = fetcher?.data?.products?.edges.find(
      (row) => row.node.id === selectedId
    );
    console.log(selectedProduct, "selectedProduct");
    setSelectedProduct(selectedProduct || null);
  };

  const onSubmit = () => {
    setButtonPressed(true);
    if (selectedProduct?.node?.id) {
      dispatch(setData({ ...new_pin_data, product: selectedProduct }));
      // navigate("/app/create_pin", { state: { product: selectedProduct } });
      navigate("/app/templates", { state: { product: selectedProduct } });
      setButtonPressed(false);
    } else {
      setShowError(true);
      setButtonPressed(false);
    }
  };
  return (
    <div>
      <Page
        style={{ display: "block" }}
        title="Selected Product"
        fullWidth
        subtitle="Choose the product you want to turn into a Pinterest pin."
        compactTitle
      >
        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "20px",
                alignItems: "center",
              }}
            >
              <div style={{ width: "75%" }}>
                <TextField
                  type="text"
                  label=""
                  value={inputValue}
                  onChange={setInputValue}
                  autoComplete="off"
                  placeholder="Search"
                />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "1.5rem" }}>
                <Spinner size="large" />
              </div>
            ) : (
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={
                  fetcher?.data
                    ? Object.values(fetcher.data.products.edges)
                    : []
                }
                selectedItems={selectedItems}
                promotedBulkActions={[
                  {
                    content: "Next",
                    loading: buttonPressed,
                    onAction: () => onSubmit(),
                  },
                ]}
                onSelectionChange={handleSelectionChange}
                selectable
                pagination={{
                  hasNext: hasNextPage,
                  hasPrevious: hasPreviousPage,
                  onNext: () => handleSearch(nextCursor, "next"),
                  onPrevious: () => handleSearch(prevCursor, "prev"),
                }}
                loading={loading}
                renderItem={(row) => {
                  const { id, title, featuredImage, variants } = row.node;
                  const price = variants?.edges[0]?.node?.price || "0.00";

                  return (
                    <ResourceItem
                      id={id}
                      accessibilityLabel={`View details for ${title}`}
                      name={title}
                      media={
                        <Thumbnail
                          source={
                            featuredImage?.url ||
                            "https://via.placeholder.com/200"
                          }
                          alt={title}
                          size="small"
                        />
                      }
                    >
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {title}
                      </Text>
                      <Text variant="headingMd">
                        <NumericFormat
                          value={price}
                          displayType={"text"}
                          thousandSeparator={true}
                          prefix={"$"}
                          decimalScale={2}
                          fixedDecimalScale={true}
                        />
                      </Text>
                    </ResourceItem>
                  );
                }}
              />
            )}
          </div>
          {showError ? (
            <Banner
              tone="warning"
              onDismiss={() => {}}
              stopAnnouncements={true}
            >
              <p>Please select a product to pin.</p>
            </Banner>
          ) : null}
          <BlockStack inlineAlign="center">
            <div style={{ marginTop: "30px", display: "flex", gap: "15px" }}>
              <Button
                to="select_product"
                style={{ ...styles.theme_button, margin: "auto" }}
                type="button"
                onClick={() => {
                  onSubmit();
                }}
                loading={buttonPressed}
              >
                Next
              </Button>
            </div>
          </BlockStack>
        </Card>
      </Page>
    </div>
  );
}
