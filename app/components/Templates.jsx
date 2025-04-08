import React, { useState, useRef, useEffect } from "react";
import { BlockStack, Button, InlineStack, Page } from "@shopify/polaris";
import ComponentsBar from "./Components";
import SideBar from "./SideBar";
import Uploads from "./Uploads";
import { EditableTextBox } from "./EditableTextBox";
import { Html } from "react-konva-utils";
import "../style.css";
import { useLocation, useNavigate } from "@remix-run/react";
import { useSelector, useDispatch } from "react-redux";
import { setData } from "../redux/slices/pin/create.jsx";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image,
  Transformer,
  Circle,
  Line,
  Group,
  Arrow,
  Star,
  Ellipse,
} from "react-konva";
import Toolbar from "./Toolbar";
import Photos from "./Photos";
import Shapes from "./Shapes";
import { templates } from "../components/templatesData";
import "./styles.css";
const generateShortId = () => Math.random().toString(36).substr(2, 6);
const useImage = (src) => {
  const [image, setImage] = useState(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
  }, [src]);

  return image;
};

// Predefined templates

const TemplateSelector = ({
  onSelectTemplate,
  setIsEditingTemplate,
  setCurrentTab,
}) => (
  <div
    style={{
      padding: "30px",
      width: "80%",
      background: "#ffffff", // Set background to white
      overflowY: "auto",
      borderRadius: "20px",
      height: "80%",
      justifyContent: "center",
      flexDirection: "column",
      margin: "0 auto",
    }}
  >
    <h2 style={{ fontSize: "16px", marginBottom: "10px", textAlign: "center" }}>
      Select a Template
    </h2>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
        gap: "20px",
        placeItems: "center",
      }}
    >
      {templates.map((template) => (
        <div
          key={template.id}
          style={{
            height: "auto",

            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            onSelectTemplate(template);
            setIsEditingTemplate(true);
            setCurrentTab("text");
          }}
        >
          {template.src ? (
            <img
              src={template.src}
              alt={template.name}
              style={{ width: "100px", height: "150px", objectFit: "contain" }}
            />
          ) : (
            <>{template?.name}</>
          )}
        </div>
      ))}
    </div>
  </div>
);
const EditableShape = ({
  shape,
  isSelected,
  onSelect,
  onChange,
  onDragMove,
}) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const handleTransform = () => {
    const node = shapeRef.current;
    const newAttrs = {
      x: node.x(),
      y: node.y(),
      scaleX: 1,
      scaleY: 1,
    };

    // Preserve shape-specific attributes
    if (shape.subType === "rect") {
      newAttrs.width = Math.max(5, node.width() * node.scaleX());
      newAttrs.height = Math.max(5, node.height() * node.scaleY());
    } else if (shape.subType === "circle") {
      newAttrs.radius = Math.max(5, (node.width() * node.scaleX()) / 2);
    } else if (shape.subType === "ellipse") {
      newAttrs.radiusX = Math.max(5, (node.width() * node.scaleX()) / 2);
      newAttrs.radiusY = Math.max(5, (node.height() * node.scaleY()) / 2);
    } else if (
      shape.subType === "line" ||
      shape.subType === "arrow" ||
      shape.subType === "curved-arrow"
    ) {
      newAttrs.points = node.points();
    } else if (shape.subType === "star") {
      newAttrs.numPoints = shape.numPoints;
      newAttrs.innerRadius = Math.max(5, shape.innerRadius * node.scaleX());
      newAttrs.outerRadius = Math.max(5, shape.outerRadius * node.scaleY());
    }

    onChange(newAttrs);
  };

  // Common Props for Shapes
  const shapeProps = {
    ...shape,
    ref: shapeRef,
    id: shape.id,
    draggable: isSelected,
    onClick: onSelect,
    onTap: onSelect,
    onTransformEnd: handleTransform,
    onDragMove: onDragMove,
  };

  let ShapeComponent;
  switch (shape.subType) {
    case "rect":
      ShapeComponent = <Rect {...shapeProps} />;
      break;
    case "circle":
      ShapeComponent = <Circle {...shapeProps} />;
      break;
    case "ellipse":
      ShapeComponent = <Ellipse {...shapeProps} />;
      break;
    case "line":
      ShapeComponent = <Line {...shapeProps} />;
      break;
    case "arrow":
    case "curved-arrow":
      ShapeComponent = <Arrow {...shapeProps} />;
      break;
    case "star":
      ShapeComponent = <Star {...shapeProps} />;
      break;
    default:
      return null;
  }

  return (
    <>
      {ShapeComponent}
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
};

const EditableText = ({
  element,
  selected,
  onSelect,
  updateElement,
  onDragMove,
}) => {
  const shapeRef = useRef(null);
  const trRef = useRef(null);
  const textInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.text);
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    setText(element.text);
  }, [element.text]);

  useEffect(() => {
    if (selected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, text]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("webfontloader").then((WebFont) => {
        WebFont.load({
          google: {
            families: [element.fontFamily],
          },
          active: () => {
            setFontLoaded(true);
            setTimeout(() => {
              window.dispatchEvent(new Event("resize")); // Force repaint
            }, 100);
          },
          inactive: () => setFontLoaded(false),
        });
      });
    }
  }, [element.fontFamily]);

  const handleTextChange = ({ target: { value } }) => setText(value);

  const handleBlur = () => {
    if (text !== element.text) {
      updateElement(element.id, "text", text);
    }
    setIsEditing(false);
  };

  const inputStyles = {
    position: "absolute",
    top: element.y,
    left: element.x,
    fontFamily: element.fontFamily || "Roboto",
    fontWeight: element.fontWeight,
    color: element.fill,
    background: "transparent",
    border: "1px solid gray",
    outline: "none",
    resize: "both",
    padding: "2px",
    width: `${element.width || Math.max(text.length * element.fontSize * 0.6, 50)}px`,
    height: `${element.height || element.fontSize * 1.5}px`,

    ...element,
  };
  useEffect(() => {
    console.log("fontLoaded", fontLoaded);
  }, [fontLoaded]);
  const isCornerAnchor = (transformer) => {
    const anchor = transformer.findOne(
      "top-left, top-right, bottom-left, bottom-right"
    );
    return anchor && anchor.isDragging();
  };
  console.log(`${element.fontStyle} ${element.fontWeight}`);
  let fontStyle = "";
  if (element.fontStyle === "italic" && element.fontWeight === "bold") {
    fontStyle = "italic bold";
  } else if (element.fontStyle === "italic") {
    fontStyle = "italic";
  } else if (element.fontWeight === "bold") {
    fontStyle = "bold";
  } else {
    fontStyle = "normal";
  }
  return (
    <>
      {element.type === "text" && isEditing ? (
        <Html>
          <input
            ref={textInputRef}
            value={text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            style={inputStyles}
            autoFocus
          />
        </Html>
      ) : (
        <Text
          {...element}
          text={text}
          ref={shapeRef}
          onClick={onSelect}
          fontStyle={fontStyle}
          fontSize={element.fontSize}
          width={element.width}
          onDblClick={() => setIsEditing(true)}
          draggable={selected}
          height={element.height}
          align={element.align}
          fontFamily={fontLoaded ? element.fontFamily : element.fontFamily} // Fallback if font fails
          onTransform={() => {
            const node = shapeRef.current;
            const transformer = trRef.current;

            if (node && transformer) {
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              console.log("current transformer", transformer);

              // Update width and fontSize dynamically during transform
              const newWidth = node.width() * scaleX;
              const newFontSize = Math.max(12, element.fontSize * scaleY); // Minimum font size
              const newHeight = node.height() * scaleY;
              node.width(newWidth);
              node.height(newHeight);
              node.fontSize(newFontSize);
              node.scaleX(1); // Reset scale to avoid compounding
              node.scaleY(1);
            }
          }}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (node) {
              updateElement(element.id, {
                x: node.x(),
                y: node.y(),
                width: node.width(),
                height: node.height(),
                fontSize: node.fontSize(),
              });
            }
          }}
          onDragMove={onDragMove}
        />
      )}
      {selected && shapeRef.current && (
        <Transformer
          ref={trRef}
          anchorSize={16}
          enabledAnchors={[
            "top-left",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-right",
            "bottom-center",
          ]}
        />
      )}
    </>
  );
};

const EditableImage = ({
  imageProps,
  isSelected,
  onSelect,
  onChange,
  onDragMove,
}) => {
  const img = useImage(imageProps.src);
  const shapeRef = useRef(null);
  const trRef = useRef(null);

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Image
        // {...imageProps}
        width={imageProps.width}
        height={imageProps.height}
        x={imageProps.x}
        y={imageProps.y}
        rotation={imageProps.rotation}
        borderColor={imageProps?.borderColor}
        borderSize={imageProps?.borderSize}
        image={img}
        ref={shapeRef}
        opacity={imageProps.opacity}
        shadowBlur={imageProps.shadowBlur}
        shadowColor={imageProps.shadowColor}
        draggable={isSelected}
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={onDragMove}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          onChange({
            ...imageProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            scaleX: 1,
            scaleY: 1,
          });
        }}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
};
const CircleWithImage = ({ el, index, selectedId, handleSelectElement }) => {
  const image = useImage(el.src);

  console.log(el.src, "image");
  const isSelected = selectedId === el.id;

  return (
    <Group
      key={el.id}
      x={el.x}
      y={el.y}
      onClick={() => handleSelectElement(el.id)}
      clipFunc={(ctx) => {
        ctx.beginPath();
        ctx.arc(el.radius, el.radius, el.radius, 0, Math.PI * 2, false);
        ctx.closePath();
      }}
    >
      <Circle
        radius={el.radius}
        fill="transparent"
        stroke={isSelected ? "black" : "white"}
        draggable
        strokeWidth={5}
      />

      {/* Image element */}
      {image && (
        <Image
          image={image}
          width={el.radius * 2} // Image width equal to the diameter of the circle
          height={el.radius * 2} // Image height equal to the diameter of the circle
          x={0}
          y={0}
          listening={false} // Prevent the image from interfering with other interactions
        />
      )}
    </Group>
  );
};

const SvgElement = ({ props, isSelected, onSelect, onDragMove }) => {
  console.log("isSelected", isSelected);
  const [image, setImage] = useState(null);
  const trRef = useRef(null);
  const shapeRef = useRef(null);

  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  useEffect(() => {
    if (!props.src || !props.colorsReplace) return;

    let svgString = atob(props.src.split(",")[1]);
    console.log(svgString, "svgString");
    Object.entries(props.colorsReplace).forEach(([oldColor, newColor]) => {
      console.log(oldColor, "-->", newColor);
      const colorRegex = new RegExp(
        oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );

      svgString = svgString.replace(colorRegex, newColor);
    });

    const updatedBase64 = `data:image/svg+xml;base64,${btoa(svgString)}`;

    const img = new window.Image();
    img.src = updatedBase64;
    img.onload = () => setImage(img);
  }, [props.src, props.colorsReplace]);

  return (
    image && (
      <>
        <Image
          image={image}
          x={props.x}
          y={props.y}
          ref={shapeRef}
          width={props.width}
          height={props.height}
          opacity={props.opacity}
          rotation={props.rotation}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={onDragMove}
        />
        {isSelected && <Transformer ref={trRef} />}
      </>
    )
  );
};
/* 

const onDragMove = (e) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedId ? { ...el, x: e.target.x(), y: e.target.y() } : el
      )
    );
  };
  
  */
const CanvasEditor = () => {
  const stageRef = useRef(null);
  const textNodeRef = useRef(null);
  const location = useLocation();
  const pin_style = useSelector((state) => state.new_pin.data.style);
  console.log(pin_style, "pin style");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProduct = location.state?.product;
  const featuredImage = selectedProduct?.node?.featuredImage;
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [elements, setElements] = useState(pin_style || []);
  const [selectedId, setSelectedId] = useState(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [images, setImages] = useState([{ preview: featuredImage?.url }]);
  const [currentTab, setCurrentTab] = useState("template");
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setElements(template.elements);
    setSelectedId(null);
  };
  const pin = useSelector((state) => state.new_pin.data);
  console.log(pin, "pin");
  const handleSelectElement = (id) => {
    console.log("clicked");
    selectedId === id ? setSelectedId(null) : setSelectedId(id);
  };

  const addElement = (type, url) => {
    const newElement = {
      id: generateShortId(),
      type,
      x: 175,
      y: 300,
      ...(type === "text"
        ? {
            text: "New Text",
            fontSize: 100,
            fontFamily: "Arial",
            fill: "#fff",
          }
        : { src: url }), // Ensure width & height
    };

    setElements((prevElements) => [...prevElements, newElement]);

    setTimeout(() => handleSelectElement(newElement.id), 0);
  };
  const addShape = (type, shape) => {
    const newElement = {
      id: generateShortId(),
      type,
      ...shape,
    };
    setElements((prevElements) => [...prevElements, newElement]);
    setTimeout(() => handleSelectElement(newElement.id), 0);
  };
  const deleteElement = () => {
    setElements((prevElements) =>
      prevElements?.filter((el) => el.id !== selectedId)
    );
  };

  const updateElement = (id, key, value) => {
    setElements((prev) =>
      prev.map((el) => {
        if (id === el.id) {
          return { ...el, [key]: value };
        }
        return el;
      })
    );
  };

  const onDragMove = (e) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedId ? { ...el, x: e.target.x(), y: e.target.y() } : el
      )
    );
  };
  const onDragEnd = () => {
    setSelectedId(null);
  };

  //set 1st template on load
  useEffect(() => {
    !pin_style && handleSelectTemplate(templates[0]);
  }, []);

  const handleSave = () => {
    setSelectedId(null);
    if (stageRef.current) {
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
          style: elements,
        })
      );
      // transformerRef.current.show();
      navigate("/app/create_pin");
    }
  };
  useEffect(() => {
    console.log(selectedTemplate, "selected template");
  }, [selectedTemplate]);
  return (
    <div>
      <SideBar
        setCurrentTab={setCurrentTab}
        selectedTemplate={selectedTemplate}
      />
      <Page
        title="Canvas Editor"
        primaryAction={{
          content: "Save",

          onAction: handleSave,
        }}
      ></Page>
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "80%",
          margin: "0 auto",
        }}
      >
        {currentTab === "template" ? (
          <TemplateSelector
            onSelectTemplate={handleSelectTemplate}
            setIsEditingTemplate={setIsEditingTemplate}
            setCurrentTab={setCurrentTab}
          />
        ) : currentTab === "uploads" ? (
          <Uploads setImages={setImages} images={images} />
        ) : (
          <>
            {currentTab === "text" && (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <ComponentsBar
                    addElement={addElement}
                    deleteElement={deleteElement}
                  />
                  <Toolbar
                    updateElement={updateElement}
                    id={selectedId}
                    element={elements?.find((el) => el.id === selectedId)}
                  />
                </div>
              </>
            )}
            {currentTab === "photos" && (
              <Photos images={images} addElement={addElement} />
            )}
            {currentTab === "shapes" && <Shapes addShape={addShape} />}
            <Editor
              selectedTemplate={selectedTemplate}
              elements={elements}
              setElements={setElements}
              selectedId={selectedId}
              handleSelectElement={handleSelectElement}
              updateElement={updateElement}
              onDragMove={onDragMove}
              stageRef={stageRef}
              images={images}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CanvasEditor;

const Editor = ({
  selectedTemplate,
  elements,
  setElements,
  selectedId,
  handleSelectElement,
  updateElement,
  onDragMove,
  stageRef,
  images,
}) => {
  const featuredImage = images[0];
  const [isEditing, setIsEditing] = useState();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Delete" && selectedId) {
        setElements((prevElements) =>
          prevElements?.filter((el) => el.id !== selectedId)
        );
        handleSelectElement(null); // Deselect after deletion
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedId, setElements, handleSelectElement]);

  return (
    <div className="canvas-editor">
      <Stage width={1080} height={1080} ref={stageRef}>
        <Layer>
          {selectedTemplate && (
            <Rect
              fill={selectedTemplate.background}
              width={1080}
              height={1080}
              draggable={true}
              onDragMove={onDragMove}
            />
          )}
          {elements?.map((el) => {
            switch (el.type) {
              case "text":
                return (
                  <EditableText
                    key={el.id}
                    id={el.id}
                    element={el}
                    selected={selectedId === el.id}
                    onSelect={() => handleSelectElement(el.id)}
                    updateElement={() => updateElement(el.id)}
                    onDragMove={onDragMove}
                  />
                );
              case "image":
                return (
                  /*  */
                  <EditableImage
                    key={el.id}
                    id={el.id}
                    // imageProps={el}
                    imageProps={{ ...el }}
                    isSelected={selectedId === el.id}
                    onSelect={() => handleSelectElement(el.id)}
                    onChange={(newAttrs) => updateElement(el.id, newAttrs)}
                    onDragMove={onDragMove}
                  />
                );
              case "rect":
                return (
                  <Rect
                    key={el.id}
                    id={el.id}
                    {...el}
                    onClick={() => handleSelectElement(el.id)}
                    isSelected={selectedId === el.id}
                    onSelect={() => handleSelectElement(el.id)}
                    onDragMove={onDragMove}
                    draggable={selectedId === el.id}
                  />
                );
              case "circle":
                return (
                  <CircleWithImage
                    id={el.id}
                    key={el.id}
                    el={el}
                    index={el.id}
                    selectedId={selectedId}
                    handleSelectElement={handleSelectElement}
                    onDragMove={onDragMove}
                  />
                );
              case "shape":
                return (
                  <EditableShape
                    isSelected={selectedId === el.id}
                    onSelect={() => handleSelectElement(el.id)}
                    shape={el}
                    key={el.id}
                    onDragMove={onDragMove}
                  />
                );
              case "svg":
                return (
                  <SvgElement
                    props={el}
                    isSelected={selectedId === el.id}
                    onDragMove={onDragMove}
                    key={el.id}
                    onSelect={() => handleSelectElement(el.id)}
                  />
                );
            }
          })}
        </Layer>
      </Stage>
    </div>
  );
};
