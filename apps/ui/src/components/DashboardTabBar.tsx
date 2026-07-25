import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { api, type DashboardSummary } from "../api";
import { getDashboardIcon } from "../lib/dashboard-icons";

type Props = {
  activeId?: string;
  /** Bump to reload after create/delete/rename elsewhere */
  refreshKey?: number;
  editMode?: boolean;
  onEdit?: () => void;
};

export function DashboardTabBar({
  activeId,
  refreshKey = 0,
  editMode = false,
  onEdit,
}: Props) {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await api.dashboards();
        if (!cancelled) {
          setDashboards(res.dashboards);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tabs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function closeMenu() {
    setMenuAnchor(null);
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        minWidth: 0,
        pb: 0.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          minWidth: 0,
          flex: 1,
          overflowX: "auto",
          py: 0.5,
        }}
      >
        {loading && (
          <Typography variant="caption" color="text.secondary">
            Loading tabs…
          </Typography>
        )}
        {!loading && error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
        {!loading && !error && dashboards.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No dashboards — open Manage to create one.
          </Typography>
        )}
        {!loading &&
          dashboards.map((d) => {
            const Icon = getDashboardIcon(d.tabIcon);
            const active = d.id === activeId;
            const showLabel = d.showTabLabel !== false;
            const tab = (
              <Button
                key={d.id}
                size="small"
                variant={active ? "contained" : "text"}
                color={active ? "primary" : "inherit"}
                onClick={() => navigate(`/dashboards/${d.id}`)}
                startIcon={<Icon fontSize="small" />}
                sx={{
                  flexShrink: 0,
                  textTransform: "none",
                  minWidth: showLabel ? undefined : 40,
                  px: showLabel ? 1.5 : 1,
                  ...(showLabel
                    ? {}
                    : { "& .MuiButton-startIcon": { mr: 0 } }),
                }}
              >
                {showLabel ? (
                  <Box
                    component="span"
                    sx={{
                      maxWidth: 128,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.name}
                  </Box>
                ) : null}
              </Button>
            );
            return showLabel ? (
              tab
            ) : (
              <Tooltip key={d.id} title={d.name}>
                <span>{tab}</span>
              </Tooltip>
            );
          })}
      </Box>
      <Tooltip title="Dashboard options">
        <IconButton
          size="small"
          aria-label="Dashboard options"
          aria-controls={menuAnchor ? "dashboard-options-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={menuAnchor ? "true" : undefined}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <SettingsOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="dashboard-options-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            navigate("/dashboards");
          }}
        >
          <ListItemIcon>
            <FolderOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Manage dashboards" />
        </MenuItem>
        <MenuItem
          disabled={editMode || !onEdit}
          onClick={() => {
            closeMenu();
            onEdit?.();
          }}
        >
          <ListItemIcon>
            <TuneIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={editMode ? "Editing…" : "Edit dashboard"}
          />
        </MenuItem>
      </Menu>
    </Stack>
  );
}
