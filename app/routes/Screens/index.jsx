import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import Dashboard from './Dashboard/index'
import { BrowserRouter, Routes, Route } from "react-router-dom";




export default function Screens() {
  const style = {
    
  }
  
  
  return (
        <div>
          <Routes>
            <Route path="/" exact component={Dashboard} />
            <Route path="/about" component={Dashboard} />
            <Route path="/contact" component={Dashboard} />
          </Routes>
            <Dashboard title="Dashboard" />
        </div>
  );
}
