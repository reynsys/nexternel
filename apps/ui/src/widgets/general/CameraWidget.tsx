import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import Hls from "hls.js";
import { api, type WidgetInstance } from "../../api";
import { generalWidgetHeading, parseCameraConfig } from "./config";

type PlayUrls = { hlsUrl: string; mseUrl: string; name: string };

export function CameraWidget({ widget }: { widget: WidgetInstance }) {
  const { cameraId } = parseCameraConfig(widget.config);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState(generalWidgetHeading(widget, "Camera"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);

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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let networkRetries = 0;

    setLoading(true);
    setError(null);

    function clearMedia() {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    }

    function attachMse(play: PlayUrls) {
      if (!video || cancelled) return;
      video.src = play.mseUrl;
      void video.play().catch(() => {
        /* muted autoplay */
      });
      if (!cancelled) setLoading(false);
    }

    function attachHls(play: PlayUrls) {
      if (!video || cancelled) return;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = play.hlsUrl;
        void video.play().catch(() => {
          /* muted autoplay */
        });
        if (!cancelled) setLoading(false);
        return;
      }

      if (!Hls.isSupported()) {
        attachMse(play);
        return;
      }

      hls = new Hls({
        enableWorker: true,
        // Low-latency mode is flaky with many NVRs / multi-widget dashboards
        lowLatencyMode: false,
        maxBufferLength: 20,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
      });
      hls.loadSource(play.hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        networkRetries = 0;
        void video.play().catch(() => {
          /* muted autoplay */
        });
        setLoading(false);
        setError(null);
      });

      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (cancelled || !data.fatal || !hls) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 4) {
          networkRetries += 1;
          setLoading(true);
          setError(null);
          retryTimer = setTimeout(() => {
            if (cancelled || !hls) return;
            hls.startLoad();
          }, 800 * networkRetries);
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try {
            hls.recoverMediaError();
            return;
          } catch {
            /* fall through */
          }
        }

        // Last resort: MSE endpoint
        clearMedia();
        attachMse(play);
        setError(null);
      });
    }

    void (async () => {
      try {
        const { play } = await api.cameraPlay(cameraId);
        if (cancelled) return;
        setTitle(generalWidgetHeading(widget, play.name));
        attachHls(play);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stream");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearMedia();
    };
  }, [cameraId, widget.id, retryToken]);

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
        <Stack direction="row" spacing={1} alignItems="center">
          <Alert severity="warning" sx={{ py: 0.5, flex: 1 }}>
            {error}
          </Alert>
          {cameraId ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setRetryToken((n) => n + 1);
              }}
            >
              Retry
            </Button>
          ) : null}
        </Stack>
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
              zIndex: 1,
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
