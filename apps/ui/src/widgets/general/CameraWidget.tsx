import { useEffect, useRef, useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import Hls from "hls.js";
import { api, type WidgetInstance } from "../../api";
import { generalWidgetHeading, parseCameraConfig } from "./config";

export function CameraWidget({ widget }: { widget: WidgetInstance }) {
  const { cameraId } = parseCameraConfig(widget.config);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState(generalWidgetHeading(widget, "Camera"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTitle(generalWidgetHeading(widget, "Camera"));
  }, [widget.title, widget.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraId || !video) {
      setLoading(false);
      setError(cameraId ? null : "Select a camera in Edit");
      return;
    }

    let hls: Hls | null = null;
    let cancelled = false;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const { play } = await api.cameraPlay(cameraId);
        if (cancelled) return;
        setTitle(generalWidgetHeading(widget, play.name));

        const src = play.hlsUrl;
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        } else if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_ev, data) => {
            if (data.fatal) {
              setError("Stream unavailable — check go2rtc and the camera RTSP URL");
            }
          });
        } else {
          // Fallback: try MSE mp4 endpoint
          video.src = play.mseUrl;
        }
        await video.play().catch(() => {
          /* autoplay may be blocked until muted — we are muted */
        });
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stream");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [cameraId, widget.id]);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        gap: 0.5,
      }}
    >
      <Typography variant="subtitle2" noWrap title={title} sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {error ? (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      ) : null}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "common.black",
          position: "relative",
        }}
      >
        {loading && !error && (
          <Typography
            variant="caption"
            color="grey.400"
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Connecting…
          </Typography>
        )}
        <Box
          component="video"
          ref={videoRef}
          muted
          autoPlay
          playsInline
          controls
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: error ? "none" : "block",
          }}
        />
      </Box>
    </Box>
  );
}
