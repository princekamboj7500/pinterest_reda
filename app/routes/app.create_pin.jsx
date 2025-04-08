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
import ThemeLayout from './ThemeLayout'
import CreatePin from "./Screens/CreatePin";


export default function select_product() {
  return <ThemeLayout >
            <CreatePin />
        </ThemeLayout>
}

