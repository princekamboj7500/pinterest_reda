import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { Stage, Layer, Rect, Transformer, Group, Image } from "react-konva";
import * as Konva from "react-konva";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineGrid,
  InlineStack,
  LegacyCard,
  DataTable,
  Icon,
  Grid,
  Autocomplete,
} from "@shopify/polaris";
import styles from "../../styles";
import $ from "jquery";
import { EditableText } from "./EditableText";
import { Html } from "react-konva-utils";
import { fontList, fontSizes } from "../../../components/styleData.jsx";
import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@shopify/polaris-icons";
import { useSelector, useDispatch } from "react-redux";
import { setData } from "../../../redux/slices/pin/create.jsx";
const KonvaTextEditor = () => {
  // React state to manage text properties
};

export default function StylePin() {
  const [current_editor, set_current_editor] = useState("text");
  const [textProperties, setTextProperties] = useState({
    text: "Title!",
    fontSize: 20,
    fontFamily: "Arial",
    fill: "#000000",
    align: "center",
    rectWidth: 250, // Rectangle width
    rectHeight: 100, // Rectangle height
    textWidth: 250, // Text width,
    scaleX: 1,
    scaleY: 1,
    x: 10,
    y: 10,
  });
  const [image, set_image] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [inputPosition, setInputPosition] = useState({ x: 100, y: 100 });
  const [inputAttributes, setInputAttributes] = useState({});
  const stageRef = useRef(null);
  const textNodeRef = useRef(null);
  const rectRef = useRef(null);
  const transformerRef = useRef(null);
  const inputRef = useRef(null);
  const inputContainerRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSelect = () => {
    if (transformerRef.current) {
      // text
      transformerRef.current.show();
      if (current_editor == "text") {
        transformerRef.current.nodes([textNodeRef.current]);
        transformerRef.current.getLayer().batchDraw();
      } else if (current_editor == "color") {
        transformerRef.current.nodes([rectRef.current]);
        transformerRef.current.enabledAnchors(false);
        transformerRef.current.getLayer().batchDraw();
      } else if (current_editor == "crop") {
        if (transformerRef.current) {
          if (imageRef.current) {
            transformerRef.current.nodes([imageRef.current]);
            transformerRef.current.getLayer().batchDraw();
          }
        }
      }
    }
  };

  useEffect(() => {
    const img = new window.Image();
    img.src = pin.product_image_base64; // Replace with your image URL
    img.onload = () => {
      set_image(img);
    };
  }, []);

  useEffect(() => {
    handleSelect();
  }, [current_editor]);

  const handleEdit = (elem) => {
    //console.log('pos.currentTarget.attrs',pos.currentTarget.attrs)
    console.log(elem.target.attrs);
    setInputPosition({
      x: elem.currentTarget.attrs.x,
      y: elem.currentTarget.attrs.y,
    });
    setInputAttributes(elem.target.attrs);
    setIsEditing(true);
    setTimeout(() => {
      let scale = elem.target.attrs.scaleX || 1;
      let fontScale = elem.target.attrs.fontSize * scale;
      inputRef.current.style.fontSize = fontScale + "px";
    }, 0);
  };

  const saveText = () => {
    const newText = inputRef.current.value;
    console.log(pin_style?.text_scaleX, pin_style?.text_scaleY);
    dispatch(
      setData({
        ...pin,
        style: {
          ...pin_style,
          text: newText,
          x: inputPosition.x,
          y: inputPosition.y,
          text_scaleX: inputAttributes.scaleX,
          text_scaleY: inputAttributes.scaleY,
        },
      })
    );
    setIsEditing(false);
  };

  useEffect(() => {
    handleSelect();
  }, [textProperties.rectWidth, textProperties.rectHeight]);

  // Ensure the input element is focused when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    } else {
      setTimeout(() => {
        handleSelect();
      }, 100);
    }
  }, [isEditing]);

  const pin_style = useSelector((state) => state.new_pin.data.style);
  const pin = useSelector((state) => state.new_pin.data);

  let color_tool_input = useRef();
  const ShowTools = useCallback(() => {
    useEffect(() => {
      setTimeout(() => {
        if (color_tool_input.current) {
          color_tool_input.current.click();
        }
      }, 500);
    }, []);
    if (current_editor == "text") {
      return (
        <div
          className="style-pin-text-tool-container"
          style={{
            display: "inline-table",
            width: "auto",
            padding: "7px 15px",
            background: "#43464E",
            height: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "7px" }}>
            <div style={styles.style_pin_title_s_items_container}>
              <select
                style={styles.style_pin_title_s_items_fontsize_select}
                onChange={(e) => {
                  dispatch(
                    setData({
                      ...pin,
                      style: { ...pin_style, text_font_size: e.target.value },
                    })
                  );
                }}
              >
                {Object.values(fontSizes).map((row) => {
                  return (
                    <option
                      selected={pin_style?.text_font_size == row ? true : false}
                      value={row}
                    >
                      {row}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <select
                style={styles.style_pin_title_s_items_fontfamily_select}
                onChange={(e) => {
                  dispatch(
                    setData({
                      ...pin,
                      style: { ...pin_style, text_font_family: e.target.value },
                    })
                  );
                }}
              >
                {Object.values(fontList).map((row) => {
                  return (
                    <option
                      selected={
                        pin_style?.text_font_family == row ? true : false
                      }
                      value={row}
                    >
                      {row}
                    </option>
                  );
                })}
              </select>
            </div>

            <div
              style={styles.style_pin_title_s_items_container}
              onChange={(e) => {
                dispatch(
                  setData({
                    ...pin,
                    style: { ...pin_style, text_color: e.target.value },
                  })
                );
              }}
            >
              <input
                type="color"
                style={styles.style_pin_title_s_items_color_select}
              />
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <div style={{ width: "20px", height: "20px" }}>
                <Icon source={TextAlignLeftIcon} size="small" />
              </div>
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <div style={{ width: "20px", height: "20px" }}>
                <Icon source={TextAlignCenterIcon} />
              </div>
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <div style={{ width: "20px", height: "20px" }}>
                <Icon source={TextAlignRightIcon} />
              </div>
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <div
                style={{ width: "20px", height: "20px" }}
                onClick={(e) => {
                  setTimeout(() => {
                    if (pin_style?.text_wieght == "bold") {
                      dispatch(
                        setData({
                          ...pin,
                          style: { ...pin_style, text_wieght: "normal" },
                        })
                      );
                    } else {
                      dispatch(
                        setData({
                          ...pin,
                          style: { ...pin_style, text_wieght: "bold" },
                        })
                      );
                    }
                  }, 100);
                }}
              >
                <Icon source={TextBoldIcon} />
              </div>
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <div
                style={{ width: "20px", height: "20px" }}
                onClick={(e) => {
                  if (pin_style?.text_italic == "italic") {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_italic: "normal" },
                      })
                    );
                  } else {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_italic: "italic" },
                      })
                    );
                  }
                }}
              >
                <Icon source={TextItalicIcon} />
              </div>
            </div>
            <div style={styles.style_pin_title_s_items_container}>
              <div
                style={{ width: "20px", height: "20px" }}
                onClick={(e) => {
                  if (pin_style?.text_underline == "underline") {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_underline: "normal" },
                      })
                    );
                  } else {
                    dispatch(
                      setData({
                        ...pin,
                        style: { ...pin_style, text_underline: "underline" },
                      })
                    );
                  }
                }}
              >
                <Icon source={TextUnderlineIcon} />
              </div>
            </div>
          </div>
        </div>
      );
    } else if (current_editor == "color") {
      return (
        <div
          className="style-pin-text-tool-container"
          style={{
            display: "inline-table",
            width: "auto",
            padding: "7px 15px",
            background: "#43464E",
            height: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "7px" }}>
            <div
              style={styles.style_pin_title_s_items_container}
              onChange={(e) => {
                dispatch(
                  setData({
                    ...pin,
                    style: { ...pin_style, rect_bg: e.target.value },
                  })
                );
              }}
            >
              <input
                ref={color_tool_input}
                type="color"
                style={styles.style_pin_title_s_items_color_select}
                value={pin_style?.rect_bg}
                autoFocus
              />
            </div>
          </div>
        </div>
      );
    }
  }, [
    pin_style?.text,
    current_editor,
    pin_style?.text_wieght,
    pin_style?.text_italic,
    pin_style?.text_font_family,
    pin_style?.text_font_size,
    pin_style?.text_underline,
  ]);

  const imageRef = useRef();
  const imageGroupRef = useRef();
  const imageTransformerRef = useRef();

  const handleSave = () => {
    if (stageRef.current) {
      // Use the `toDataURL()` method to get the base64 representation
      transformerRef.current.hide();
      const base64 = stageRef.current.toDataURL({
        mimeType: "image/png", // Define the MIME type
        quality: 1, // Define the image quality (1 = highest quality)
        pixelRatio: 2, // Use a higher pixel ratio for better resolution
      });
      //edited_pin_base64

      dispatch(
        setData({
          ...pin,

          edited_pin_base64: base64,
          style: {
            ...pin_style,
            text_scaleX: textNodeRef.current?.attrs?.scaleX,
            text_scaleY: textNodeRef.current?.attrs?.scaleY,
            text_x: textNodeRef.current?.attrs?.x,
            text_y: textNodeRef.current?.attrs?.y,
          },
        })
      );
      transformerRef.current.show();
      navigate("/app/create_pin");
    }
  };

  return (
    <div>
      <Page
        style={{ display: "block" }}
        title="Customize"
        fullWidth
        subtitle="Customize your Pinterest pin"
        compactTitle
      >
        <Card>
          <div style={{ padding: "1.5rem", minHeight: "600px" }}>
            {/*  Items grid */}
            <div style={{ marginTop: "0px" }}>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 2, sm: 2, md: 2, lg: 4, xl: 4 }}>
                  <button
                    style={
                      current_editor == "text"
                        ? {
                            ...styles.theme_button,
                            width: "100%",
                            marginBottom: "15px",
                          }
                        : {
                            ...styles.theme_button_2,
                            width: "100%",
                            marginBottom: "15px",
                          }
                    }
                    onClick={() => {
                      set_current_editor("text");
                    }}
                  >
                    Text Tool
                  </button>
                  <button
                    style={
                      current_editor == "color"
                        ? {
                            ...styles.theme_button,
                            width: "100%",
                            marginBottom: "15px",
                          }
                        : {
                            ...styles.theme_button_2,
                            width: "100%",
                            marginBottom: "15px",
                          }
                    }
                    onClick={() => {
                      set_current_editor("color");
                    }}
                  >
                    Color Tool
                  </button>
                  <button
                    style={
                      current_editor == "crop"
                        ? {
                            ...styles.theme_button,
                            width: "100%",
                            marginBottom: "15px",
                          }
                        : {
                            ...styles.theme_button_2,
                            width: "100%",
                            marginBottom: "15px",
                          }
                    }
                    onClick={() => {
                      set_current_editor("crop");
                    }}
                  >
                    Crop Tool
                  </button>
                </Grid.Cell>
                {/*  */}
                <Grid.Cell columnSpan={{ xs: 8, sm: 8, md: 8, lg: 8, xl: 8 }}>
                  <div
                    style={{
                      background: "#E6E1D2",
                      width: "300px",
                      height: "450px",
                      padding: "30px",
                    }}
                  >
                    {/* <button onClick={()=>{
                                      textNodeRef.current.setPosition({x: 0,y:0})
                                    }}>
                                        Reset
                                    </button> */}

                    <Stage ref={stageRef} width={250} height={400}>
                      <Layer height={450} width={250}>
                        <Group x={position.x} y={position.y}>
                          {/*  */}
                          <Rect
                            ref={rectRef}
                            width={textProperties.rectWidth}
                            height={textProperties.rectHeight}
                            fill={pin_style?.rect_bg}
                            stroke="black"
                            strokeWidth={0}
                            cornerRadius={0}
                          />

                          {/* Text Inside Rectangle */}
                          {!isEditing ? (
                            <Konva.Text
                              ref={textNodeRef}
                              x={pin_style?.text_x}
                              y={pin_style?.text_x}
                              scaleX={pin_style?.text_scaleX}
                              scaleY={pin_style?.text_scaleY}
                              text={pin_style?.text}
                              fontSize={pin_style?.text_font_size}
                              fontFamily={pin_style?.text_font_family}
                              fontStyle={`${pin_style?.text_italic} ${pin_style?.text_wieght}`}
                              fill={pin_style?.text_color}
                              textDecoration={pin_style?.text_underline}
                              //width={textProperties.rectWidth - 20} // Text width slightly smaller than rectangle width
                              align={textProperties.align}
                              verticalAlign="middle"
                              padding={0}
                              draggable
                              onClick={handleSelect}
                              onTap={handleSelect}
                              onDblClick={handleEdit} // Switch to editing mode
                              dragBoundFunc={(pos) => {
                                let { x, y } = pos;
                                let newX = x;
                                let newY = y;
                                let TextWidth =
                                  textNodeRef.current.getTextWidth();
                                let TextHeight =
                                  textNodeRef.current.getHeight();
                                let rectWidth = textProperties.rectWidth;
                                if (x < 0) {
                                  newX = 0;
                                }
                                if (y < 0) {
                                  newY = 0;
                                }
                                if (x + TextWidth > rectWidth) {
                                  // console.log('rectWidth',rectWidth -(TextWidth*2))
                                  // newX = rectWidth - (TextWidth*2)
                                }

                                //newX = 116.6015625

                                return { x: newX, y: newY };
                              }}
                              onDragEnd={(pos) => {
                                // dispatch(setData({...pin , style : {...pin_style,
                                //   text_x: pos.target?.attrs?.x,
                                //   text_y : pos.target?.attrs?.y,
                                //   text_scaleX : pos.target?.attrs?.scaleX,
                                //   text_scaleY : pos.target?.attrs?.scaleY,
                                // }}))
                              }}
                            />
                          ) : (
                            <Html
                              groupProps={{
                                x: inputPosition?.x,
                                y: inputPosition?.y,
                              }}
                              ref={inputContainerRef}
                            >
                              <input
                                ref={inputRef}
                                type="text"
                                defaultValue={pin_style?.text}
                                onBlur={saveText}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveText();
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  fontSize: `${pin_style?.text_font_size}px`,
                                  fontFamily: pin_style?.text_font_family,
                                  fontWeight: pin_style?.text_wieght,
                                  fontStyle: pin_style?.text_italic,
                                  textDecoration: pin_style?.text_underline,
                                  color: pin_style?.text_color,
                                  border: "none",
                                  outline: "none",
                                  background: "transparent",
                                }}
                              />
                            </Html>
                          )}
                        </Group>
                        <Group
                          x={0}
                          y={100}
                          //draggable
                          ref={imageGroupRef}
                          clipFunc={(ctx) => {
                            ctx.beginPath();
                            ctx.rect(0, 0, 250, 300); // Create a rectangle clip
                            ctx.closePath();
                          }}
                        >
                          <Rect
                            width={250} // Initial width of the rectangle
                            height={300} // Initial height of the rectangle
                            fill="white" // Background color
                            // Optional: to round the corners
                          />

                          {image ? (
                            <Image
                              image={image}
                              width={250}
                              height={300}
                              draggable
                              ref={imageRef}
                            />
                          ) : null}
                        </Group>
                        {/* Add a transformer to the group to allow resizing */}

                        {/* Transformer for the Text Node */}
                        <Transformer
                          ref={transformerRef}
                          enabledAnchors={[
                            "top-left",
                            "top-right",
                            "bottom-left",
                            "bottom-right",
                          ]}
                          boundBoxFunc={(oldBox, newBox) => {
                            newBox.width = Math.max(0, newBox.width);
                            return newBox;
                          }}
                          rotateEnabled={false}
                        />
                      </Layer>
                    </Stage>

                    {/* <div style={{width:'100%',height:'100px',background:'#C0B5B3',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                      <Text as="h1" variant="heading2xl" fontWeight="bold">Title</Text>
                                    </div>
                                    <div style={{width:'100%',height:'240px'}}>
                                      <img style={{width:'100%',height:'100%',objectFit:'cover'}} src="https://cdn.shopify.com/s/files/1/0754/5772/4450/files/theme_cover_image.jpg?v=1726210533"/>
                                    </div> */}
                  </div>

                  <div style={{ marginTop: "15px" }}>
                    <ShowTools />
                  </div>

                  <div style={{ marginTop: "30px" }}>
                    <button
                      to="select_product"
                      style={{
                        ...styles.theme_button_2,
                        margin: "auto",
                        marginRight: "10px",
                      }}
                      type="button"
                      onClick={() => {
                        navigate("/app/create_pin");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      to="select_product"
                      style={{ ...styles.theme_button, margin: "auto" }}
                      type="button"
                      onClick={() => {
                        handleSave();
                      }}
                    >
                      Save
                    </button>
                  </div>
                </Grid.Cell>
              </Grid>
            </div>
          </div>
        </Card>
      </Page>
    </div>
  );
}
