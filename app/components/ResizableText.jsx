import React, { useRef, useEffect, useState } from "react";
import { Text, Transformer } from "react-konva";

export function ResizableText({
  x,
  y,
  text,
  isSelected,
  width,
  onResize,
  onClick,
  onDoubleClick,
  props,
}) {
  const textRef = useRef(null);
  const transformerRef = useRef(null);
  const [fontLoaded, setFontLoaded] = useState(false);

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
  }, [props.fontFamily]);
  useEffect(() => {
    if (isSelected && transformerRef.current !== null) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  function handleResize() {
    if (textRef.current !== null) {
      const textNode = textRef.current;
      const newWidth = textNode.width() * textNode.scaleX();
      const newHeight = textNode.height() * textNode.scaleY();
      textNode.setAttrs({
        width: newWidth,
        scaleX: 1,
      });
      onResize(newWidth, newHeight);
    }
  }

  const transformer = isSelected ? (
    <Transformer
      ref={transformerRef}
      rotateEnabled={false}
      flipEnabled={false}
      enabledAnchors={[
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-right",
      ]}
      anchorCornerRadius={10}
      anchorFill="#fff"
      anchorStroke="#fff"
      anchorStrokeWidth={2}
      anchorSize={14}
      boundBoxFunc={(oldBox, newBox) => {
        newBox.width = Math.max(30, newBox.width);
        return newBox;
      }}
    />
  ) : null;

  return (
    <>
      <Text
        x={x}
        y={y}
        ref={textRef}
        text={text}
        perfectDrawEnabled={false}
        onTransform={handleResize}
        onClick={onClick}
        onTap={onClick}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        width={width}
        draggable
        fontFamily={props.fontFamily}
        {...props}
      />
      {transformer}
    </>
  );
}
