import { styled } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";
import { APP_VERSION } from "../../../version";
import { MenuContent } from "./MenuContent";
import type { User } from "../../../api";

const drawerWidth = 240;

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: "border-box",
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: "border-box",
  },
});

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
  user: User | null;
  onLogout: () => void;
};

export function SideMenu({ signedIn, isAdmin, user, onLogout }: Props) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: "background.paper",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "999px",
            backgroundImage:
              "linear-gradient(135deg, hsl(210, 98%, 60%) 0%, hsl(210, 100%, 35%) 100%)",
            border: "1px solid",
            borderColor: "primary.main",
          }}
        />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Nexternel
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {APP_VERSION}
          </Typography>
        </Box>
      </Box>
      <Divider />
      <Box
        sx={{
          overflow: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent signedIn={signedIn} isAdmin={isAdmin} />
      </Box>
      <Stack
        direction="row"
        sx={{
          p: 2,
          gap: 1,
          alignItems: "center",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {signedIn ? (
          <>
            <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.dark" }}>
              {(user?.username ?? "?").slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ mr: "auto", minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, lineHeight: "16px" }}
                noWrap
              >
                {user?.username ?? "User"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.role ?? ""}
              </Typography>
            </Box>
            <Button size="small" onClick={onLogout}>
              Out
            </Button>
          </>
        ) : (
          <Button component={RouterLink} to="/login" size="small" fullWidth>
            Login
          </Button>
        )}
      </Stack>
    </Drawer>
  );
}
