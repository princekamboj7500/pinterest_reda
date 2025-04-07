import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import ThemeLayout from "./ThemeLayout";
import BoardsPage from "./Screens/Boards";

export default function board() {
  return (
    <ThemeLayout>
      <BoardsPage />
    </ThemeLayout>
  );
}
