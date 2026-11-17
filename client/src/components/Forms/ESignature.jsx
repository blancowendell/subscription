import React, { useRef, useEffect, useState, useCallback } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import ClearIcon from "@mui/icons-material/Clear";

/**
 * Responsive ESignature component
 *
 * - value: "" | base64 data URL | plain text
 * - onChange: (base64String) => void
 *
 * This version measures the parent container and sizes the canvas to fit,
 * avoiding overflow and keeping the drawing area inside the card.
 */
const ESignature = ({ value = "", onChange = () => {} }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef({ x: null, y: null });
  const [typed, setTyped] = useState("");

  // function to resize canvas to fit container and set DPR scaling
  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const style = getComputedStyle(container);
    // compute width available inside container's padding box
    const width = container.clientWidth;
    // desired height in CSS pixels
    const height = 140;

    const dpr = window.devicePixelRatio || 1;

    // set CSS size (inline styles) so element fits container
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // set pixel buffer size for crisp rendering on HiDPI displays
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing operations
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#000";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // initial resize + on window resize
  useEffect(() => {
    resizeCanvas();
    const onResize = () => {
      // preserve existing image by converting to dataURL and reloading after resize
      const canvas = canvasRef.current;
      if (!canvas) return;
      const prevData = canvas.toDataURL();
      resizeCanvas();
      // small timeout to allow size to update, then load previous drawing centered
      setTimeout(() => {
        if (prevData) loadImageToCanvas(prevData);
      }, 20);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvas]);

  // Load value on mount / when value changes
  useEffect(() => {
    if (!value) {
      clearCanvas(false);
      setTyped("");
      return;
    }
    if (typeof value === "string" && value.startsWith("data:")) {
      // base64 image
      loadImageToCanvas(value);
      setTyped("");
    } else if (typeof value === "string") {
      // typed text
      setTyped(value);
      // render typed text onto the (possibly resized) canvas
      renderTextToCanvasAndEmit(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  };

  const posFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const evt = e.touches ? e.touches[0] : e;
    const x = (evt.clientX || evt.pageX) - rect.left;
    const y = (evt.clientY || evt.pageY) - rect.top;
    return { x, y };
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = posFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    lastPoint.current = { x, y };
  };

  const draw = (e) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = posFromEvent(e);
    const lp = lastPoint.current;
    if (lp.x === null) {
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPoint.current = { x, y };
      return;
    }
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    const midX = (lp.x + x) / 2;
    const midY = (lp.y + y) / 2;
    ctx.quadraticCurveTo(lp.x, lp.y, midX, midY);
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  const stop = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = { x: null, y: null };
    saveCanvasAndEmit();
  };

  const saveCanvasAndEmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // export scaled PNG (canvas already has DPR scaling)
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const clearCanvas = (emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (emit) onChange("");
  };

  const loadImageToCanvas = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      // clear first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // compute dims in CSS pixels (canvas drawing is DPR-scaled)
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const scale = Math.min(cw / img.width, ch / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    };
    img.src = dataUrl;
  };

  const renderTextToCanvasAndEmit = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fontSize = Math.max(16, Math.min(30, Math.floor(ch / 6)));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";

    const maxWidth = cw - 16;
    const words = String(text).split(" ");
    let line = "";
    const lines = [];
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      const metrics = ctx.measureText(test);
      if (metrics.width > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);

    const totalHeight = lines.length * fontSize + (lines.length - 1) * 4;
    let startY = ch / 2 - totalHeight / 2 + fontSize / 2;
    lines.forEach((ln) => {
      const m = ctx.measureText(ln);
      const x = (cw - m.width) / 2;
      ctx.fillText(ln, x, startY);
      startY += fontSize + 4;
    });

    // emit base64 PNG
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const onTypedChange = (e) => {
    const txt = e.target.value;
    setTyped(txt);
    if (!txt) {
      clearCanvas(true);
      return;
    }
    renderTextToCanvasAndEmit(txt);
  };

  return (
    <div
      ref={containerRef}
      className="p-4 border rounded-md bg-white shadow-sm"
      style={{ width: "100%", boxSizing: "border-box" }}
    >
      <h3 className="font-semibold mb-2">E-Signature</h3>

      <div style={{ width: "100%", overflow: "hidden", borderRadius: 6 }}>
        <canvas
          ref={canvasRef}
          // no Tailwind width classes here — sizing handled via resizeCanvas
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
          style={{ display: "block", width: "100%", height: 140, background: "white" }}
        />
      </div>

      <TextField
        id="esig-typed"
        label="Type signature instead"
        variant="outlined"
        size="small"
        value={typed}
        onChange={onTypedChange}
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {typed ? (
                <IconButton
                  onClick={() => {
                    setTyped("");
                    clearCanvas(true);
                  }}
                  edge="end"
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
          sx: { borderRadius: "8px" },
        }}
        sx={{ mb: 1 }}
      />

      <button
        type="button"
        onClick={() => {
          clearCanvas(true);
          setTyped("");
        }}
        className="px-3 py-1 bg-gray-200 rounded w-full"
      >
        Clear
      </button>
    </div>
  );
};

export default ESignature;
