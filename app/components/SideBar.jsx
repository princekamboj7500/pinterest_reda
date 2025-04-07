import React from "react";
import {
  TextBlockIcon,
  ImageIcon,
  ImageAddIcon,
  ThemeTemplateIcon,
  IconsFilledIcon,
} from "@shopify/polaris-icons";
import { Icon } from "@shopify/polaris";

const SideBar = ({ setCurrentTab, selectedTemplate }) => {
  console.log(selectedTemplate, "selectedTemplate");
  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarItem} onClick={() => setCurrentTab("template")}>
        <Icon source={ThemeTemplateIcon} style={{ marginRight: "10px" }} />
        <span style={styles.sidebarText}>Templates</span>
      </div>
      <div
        style={styles.sidebarItem}
        onClick={() => selectedTemplate && setCurrentTab("text")}
      >
        <Icon source={TextBlockIcon} />
        <span style={styles.sidebarText}>Text</span>
      </div>
      <div
        style={styles.sidebarItem}
        onClick={() => selectedTemplate && setCurrentTab("photos")}
      >
        <Icon source={ImageIcon} />
        <span style={styles.sidebarText}>Photos</span>
      </div>
      {/* <div style={styles.sidebarItem} onClick={() => setCurrentTab("shapes")}>
        <Icon source={IconsFilledIcon} />
        <span style={styles.sidebarText}>Shapes</span>
      </div> */}
      <div
        style={styles.sidebarItem}
        onClick={() => selectedTemplate && setCurrentTab("uploads")}
      >
        <Icon source={ImageAddIcon} />
        <span style={styles.sidebarText}>Uploads</span>
      </div>
    </div>
  );
};

// Styling for the Sidebar
const styles = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f4f4f4",
    padding: "20px",
    width: "100px",
    height: "100vh",
    boxShadow: "2px 0 5px rgba(0,0,0,0.1)", // Light shadow for separation
    position: "fixed",
  },
  sidebarItem: {
    padding: "10px",
    display: "flex",
    flexDirection: "column",

    justifyContent: "start",
    alignItems: "center",
    marginBottom: "15px",
    cursor: "pointer",
    borderRadius: "5px",
    transition: "background-color 0.3s ease",
  },
  sidebarItemHover: {
    backgroundColor: "#ddd", // Slightly darker background on hover
  },
  sidebarText: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#333",
  },
};

export default SideBar;
