import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WorkIcon from "@mui/icons-material/Work";
import EventIcon from "@mui/icons-material/Event";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupsIcon from "@mui/icons-material/Groups";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";

import { useAuth } from "../auth/AuthProvider";

const drawerWidth = 240;

type MenuLink = {
  label: string;
  to: string;
  icon: ReactNode;
  show?: boolean;
};

type UserRole = "USER" | "MANAGER" | "ADMIN";

export default function Shell() {
  const nav = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { logout, session } = useAuth();

  const role = useMemo<UserRole>(() => {
    const r = (session as any)?.role;
    if (r === "ADMIN" || r === "MANAGER" || r === "USER") return r;
    return "USER";
  }, [session]);

  const isAdmin = role === "ADMIN";
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";

  // Drawer state
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobileDrawer = () => setMobileOpen((v) => !v);
  const closeMobileDrawer = () => setMobileOpen(false);

  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchor);
  const openUserMenu = (e: React.MouseEvent<HTMLElement>) => setUserMenuAnchor(e.currentTarget);
  const closeUserMenu = () => setUserMenuAnchor(null);

  const doLogout = async () => {
    try {
      await logout();
    } finally {
      closeUserMenu();
      closeMobileDrawer();
      nav("/login", { replace: true });
    }
  };

  const menuItems: MenuLink[] = [
    { label: "Patients", to: "/patients", icon: <PeopleIcon /> },
    { label: "Doctors", to: "/doctors", icon: <LocalHospitalIcon /> },
    { label: "Projects", to: "/projects", icon: <WorkIcon /> },
    { label: "Appointments", to: "/appointments", icon: <EventIcon /> },
    { label: "Calendar", to: "/calendar", icon: <CalendarMonthIcon /> },

    // Staff management (MANAGER or ADMIN)
    { label: "Staff", to: "/staff", icon: <GroupsIcon />, show: isManagerOrAdmin },
    

    // Admin page (ADMIN only)
    { label: "Gebruikers", to: "/users", icon: <GroupsIcon />, show: isAdmin },
    { label: "Admin", to: "/admin", icon: <AdminPanelSettingsIcon />, show: isAdmin },
  ];

  const drawerContent = (
    <Box sx={{ overflow: "auto" }}>
      <List>
        {menuItems
          .filter((m) => m.show !== false)
          .map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              end
              onClick={() => {
                if (!isDesktop) closeMobileDrawer();
              }}
              sx={{
                "&.active": {
                  bgcolor: "action.selected",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
      </List>

      <Divider />

      <List>
        <ListItemButton onClick={doLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  const username = ((session as any)?.username ?? "User") as string;
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleMobileDrawer}
              aria-label="open drawer"
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" noWrap component="div">
            PatientenAdmin
          </Typography>

          {/* User chip on the right */}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Account">
              <Chip
                clickable
                onClick={openUserMenu}
                avatar={<Avatar sx={{ width: 28, height: 28 }}>{initial}</Avatar>}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {username}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {role}
                    </Typography>
                  </Box>
                }
                variant="outlined"
                sx={{
                  color: "common.white",
                  borderColor: "rgba(255,255,255,0.35)",
                  "&:hover": { borderColor: "rgba(255,255,255,0.6)" },
                  "& .MuiChip-label": { py: 0.25 },
                }}
                deleteIcon={<ExpandMoreIcon sx={{ color: "rgba(255,255,255,0.85) !important" }} />}
                onDelete={openUserMenu as any}
              />
            </Tooltip>

            <Menu
              anchorEl={userMenuAnchor}
              open={userMenuOpen}
              onClose={closeUserMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem disabled>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rol: {role}
                  </Typography>
                </Box>
              </MenuItem>

              <Divider />

              <MenuItem
                onClick={() => {
                  closeUserMenu();
                  nav("/staff");
                }}
                disabled={!isManagerOrAdmin}
              >
                Staff beheer
              </MenuItem>

              <MenuItem
                onClick={() => {
                  closeUserMenu();
                  nav("/admin");
                }}
                disabled={!isAdmin}
              >
                Admin
              </MenuItem>

              <Divider />

              <MenuItem onClick={doLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={closeMobileDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, minHeight: "100vh", bgcolor: "background.default" }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
