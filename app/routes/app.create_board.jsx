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
import CreateBoard from "./Screens/CreateBoard";

export default function create_board() {
  return (
    <ThemeLayout>
      <CreateBoard />
    </ThemeLayout>
  );
}
