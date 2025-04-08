import React from "react";
import { fontList } from "./styleData";
import { fontSizes } from "./styleData";
import styles from "./styles";

const Toolbar = ({ id, updateElement, element }) => {
  const handleFontSizeChange = (e) => {
    console.log(element);
    updateElement(id, "fontSize", e.target.value);
  };
  const handleIncreaseFontSize = () => {
    updateElement(id, "fontSize", element.fontSize + 1);
  };
  const handleDecreaseFontSize = () => {
    updateElement(id, "fontSize", element.fontSize - 1);
  };
  const handleFontFamilyChange = (e) => {
    updateElement(id, "fontFamily", e.target.value);
  };

  const handleBoldToggle = () => {
    console.log(element);
    updateElement(
      id,
      "fontWeight",
      element.fontWeight === "bold" ? "" : "bold"
    );
  };

  const handleItalicToggle = () => {
    updateElement(
      id,
      "fontStyle",
      element.fontStyle === "italic" ? "" : "italic"
    );
  };

  const handleTextAlignChange = (e) => {
    updateElement(id, "align", e.target.value);
  };

  const handleFontColorChange = (e) => {
    console.log(e.target.value, "handleFontColorChange");
    updateElement(id, "fill", e.target.value); // 'fill' is the text color
  };
  const handleStrokeColorChange = (e) => {
    updateElement(id, "stroke", e.target.value); // 'fill' is the text color
  };
  const handleStrokeWidth = (e) => {
    updateElement(id, "strokeWidth", e.target.value); // 'fill' is the text color
  };
  const handleOpacity = (e) => {
    updateElement(id, "opacity", e.target.value);
  };
  const replaceImage = (image) => {
    updateElement(id, "src", image);
  };
  return (
    <div style={styles.toolbarContainer}>
      <div style={styles.section}>
        <h1 style={styles.toolbarTitle}>Fonts</h1>
        <div style={styles.selectContainer}>
          <select
            style={styles.fontSizeSelect}
            value={element?.fontSize}
            onChange={handleFontSizeChange}
          >
            {Object.values(fontSizes).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <div style={styles.fontSizeInputContainer}>
            <button
              onClick={handleDecreaseFontSize}
              style={styles.fontSizeButton}
            >
              -
            </button>
            <input
              type="number"
              value={element?.fontSize}
              min={8}
              onChange={handleFontSizeChange}
              style={styles.fontSizeInput}
            />
            <button
              onClick={handleIncreaseFontSize}
              style={styles.fontSizeButton}
            >
              +
            </button>
          </div>

          <select
            style={styles.fontFamilySelect}
            value={element?.fontFamily}
            onChange={handleFontFamilyChange}
          >
            {Object.values(fontList).map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.section}>
        <h1 style={styles.toolbarTitle}>Style</h1>
        <div style={styles.buttonContainer}>
          <button
            style={{
              ...styles.iconButton,
              fontWeight: element?.fontWeight === "bold" ? "bold" : "normal",
              backgroundColor:
                element?.fontWeight === "bold" ? "#ddd" : "transparent",
            }}
            onClick={handleBoldToggle}
          >
            <b>B</b>
          </button>
          <button
            style={{
              ...styles.iconButton,
              fontStyle: element?.fontStyle === "italic" ? "italic" : "normal",
              backgroundColor:
                element?.fontStyle === "italic" ? "#ddd" : "transparent",
            }}
            onClick={handleItalicToggle}
          >
            <i>I</i>
          </button>
        </div>

        <div style={styles.alignmentContainer}>
          <label style={styles.alignLabel}>Align:</label>
          <select
            style={styles.alignSelect}
            value={element?.align}
            onChange={handleTextAlignChange}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div style={styles.fontColorContainer}>
          <label style={styles.colorLabel}>Fill Color:</label>
          <input
            type="color"
            value={element?.fill}
            onChange={handleFontColorChange}
            style={styles.colorPicker}
          />
        </div>
        <div style={styles.fontColorContainer}>
          <label style={styles.colorLabel}>Stroke Color:</label>
          <input
            type="color"
            value={element?.stroke}
            onChange={handleStrokeColorChange}
            style={styles.colorPicker}
          />
        </div>
        {/* <div style={styles.fontColorContainer}>
          <label style={styles.colorLabel}>Stroke Width:</label>
          <input
            type="range"
            value={element?.strokeWidth}
            onChange={handleStrokeWidth}
            style={styles.colorPicker}
            size={10}
            step={1}
          />
          
        </div> */}
        <div style={styles.fontColorContainer}>
          <label style={styles.colorLabel}>Opacity:</label>
          <input
            type="range"
            value={element?.opacity || 1}
            onChange={handleOpacity}
            style={styles.opacitySlider}
            min={0}
            max={1}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
