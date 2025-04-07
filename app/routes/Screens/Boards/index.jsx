import React, { useEffect, useState } from "react";
import {
  LegacyFilters,
  EmptyState,
  Page,
  Layout,
  LegacyCard,
  ResourceList,
  Text,
  Avatar,
  Icon,
  Button,
} from "@shopify/polaris";
import { ClipboardIcon } from "@shopify/polaris-icons";
import { useSelector, useDispatch } from "react-redux";

import { useNavigate } from "@remix-run/react";
export default function BoardsPage() {
  const [boards, setBoards] = useState([]);
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);
  console.log(user, "user===>");
  // Fetch boards from your API
  const fetchBoards = async () => {
    try {
      const res = await fetch("/api/pinterest/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          access_key: user?.accessToken,
        },
      });

      if (!res.ok) {
        throw new Error("Error while fetching boards");
      }

      const data = await res.json();
      console.log(data?.items, "data");
      setBoards(data?.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch the boards on component mount
  useEffect(() => {
    fetchBoards();
  }, []);

  const items = boards; // Use the fetched boards as items for the ResourceList

  const emptyStateMarkup = !items.length ? (
    <EmptyState
      heading="No boards available"
      action={{ content: "Create a board" }}
      image="https://cdn.shopify.com/s/files/1/2376/3301/products/emptystate-files.png"
    >
      <p>You can create a new Pinterest board to get started.</p>
    </EmptyState>
  ) : undefined;

  return (
    <Page
      title="Boards"
      secondaryActions={
        <Button variant="secondary" onClick={() => navigate("/app")}>
          Back
        </Button>
      }
      primaryAction={
        <Button
          variant="primary"
          onClick={() => {
            console.log("navigate");
            navigate("/app/create_board");
          }}
        >
          New
        </Button>
      }
    >
      <Layout>
        <Layout.Section>
          <LegacyCard>
            <ResourceList
              emptyState={emptyStateMarkup}
              items={items}
              renderItem={(item) => {
                const media = <Icon source={ClipboardIcon} />;

                return (
                  <ResourceList.Item
                    key={item.id}
                    accessibilityLabel={`View details for ${item.name}`}
                    media={media}
                  >
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {item.name}
                    </Text>
                    <div>{item.description}</div>
                  </ResourceList.Item>
                );
              }}
              showHeader
              totalItemsCount={boards.length}
              resourceName={{ singular: "board", plural: "boards" }}
            />
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
