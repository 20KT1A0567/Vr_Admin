import { alpha, createTheme } from "@mui/material/styles";

export type AdminColorMode = "light" | "dark";

export function createAdminTheme(mode: AdminColorMode) {
  const isDark = mode === "dark";
  const surface = isDark ? "rgba(15, 23, 42, 0.82)" : "rgba(255, 255, 255, 0.86)";
  const elevated = isDark ? "#111827" : "#f1f5f9";
  const border = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(148, 163, 184, 0.25)";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#64748b";
  const primary = isDark ? "#06b6d4" : "#2563eb"; // Cyan
  const primaryDark = isDark ? "#0891b2" : "#1d4ed8";
  const secondary = isDark ? "#8b5cf6" : "#22c55e"; // Purple
  const teal = "#10b981"; // Green
  const cardShadow = isDark
    ? "0 18px 45px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.05)"
    : "0 18px 45px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.92)";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary,
        dark: primaryDark,
        light: isDark ? "#93c5fd" : "#dbeafe",
        contrastText: "#ffffff"
      },
      secondary: {
        main: secondary,
        dark: isDark ? "#7c3aed" : "#16a34a",
        light: isDark ? "#a78bfa" : "#dcfce7",
        contrastText: "#ffffff"
      },
      warning: {
        main: "#f59e0b",
        dark: "#b45309",
        light: "#fef3c7"
      },
      error: {
        main: "#ef4444",
        dark: "#dc2626",
        light: isDark ? "rgba(239, 68, 68, 0.18)" : "#fee2e2"
      },
      background: {
        default: isDark ? "#0b1120" : "#f8fafc",
        paper: surface
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary
      },
      divider: border
    },
    shape: {
      borderRadius: 16
    },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: {
        fontFamily: '"Inter", system-ui, sans-serif',
        letterSpacing: 0,
        fontWeight: 800
      },
      h2: {
        fontFamily: '"Inter", system-ui, sans-serif',
        letterSpacing: 0,
        fontWeight: 700
      },
      button: {
        letterSpacing: 0,
        fontWeight: 700,
        textTransform: "none"
      },
      subtitle2: {
        fontWeight: 800
      },
      caption: {
        color: textSecondary,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase"
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? "#020617" : "#f8fafc",
            color: textPrimary,
            scrollbarColor: isDark ? "rgba(129, 140, 248, 0.45) transparent" : "rgba(99, 102, 241, 0.42) transparent"
          },
          "*": {
            boxSizing: "border-box"
          }
        }
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false
        },
        styleOverrides: {
          root: {
            fontFamily: '"Inter", system-ui, sans-serif'
          }
        }
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: surface,
            color: textPrimary,
            borderColor: border
          }
        }
      },
      MuiCard: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            border: `1px solid ${border}`,
            borderRadius: 22,
            backgroundImage: `linear-gradient(180deg, ${alpha(surface, 0.98)}, ${alpha(elevated, 0.9)})`,
            boxShadow: cardShadow
          }
        }
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 24,
            "&:last-child": {
              paddingBottom: 24
            }
          }
        }
      },
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
          color: "transparent"
        },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: "transparent",
            color: textPrimary,
            boxShadow: "none"
          }
        }
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: "auto",
            height: 72,
            paddingLeft: 0,
            paddingRight: 0
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        variants: [
          {
            props: { variant: "contained", color: "primary" },
            style: {
              background: `radial-gradient(110% 120% at 18% 0%, ${alpha("#ffffff", 0.35)}, transparent 52%), linear-gradient(135deg, ${primary} 0%, ${primaryDark} 58%, ${teal} 100%)`,
              color: "#ffffff",
              boxShadow: `0 16px 34px ${alpha(primary, 0.22)}`,
              "&:hover": {
                background: `radial-gradient(110% 120% at 18% 0%, ${alpha("#ffffff", 0.38)}, transparent 52%), linear-gradient(135deg, ${primary} 0%, ${primaryDark} 58%, ${teal} 100%)`,
                boxShadow: `0 20px 40px ${alpha(primary, 0.28)}`,
                transform: "translateY(-1px)"
              }
            }
          },
          {
            props: { variant: "outlined" },
            style: {
              borderColor: border,
              color: textPrimary,
              backgroundColor: alpha(surface, 0.72),
              "&:hover": {
                borderColor: alpha(primary, 0.42),
                backgroundColor: alpha(surface, 0.96),
                transform: "translateY(-1px)"
              }
            }
          }
        ],
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 14,
            boxShadow: "none",
            fontWeight: 800,
            transition: "transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease"
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            border: `1px solid ${border}`,
            borderRadius: 14,
            color: textSecondary,
            backgroundColor: alpha(surface, 0.78),
            transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease",
            "&:hover": {
              color: textPrimary,
              borderColor: alpha(primary, 0.38),
              backgroundColor: alpha(surface, 0.96),
              transform: "translateY(-1px)"
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 800
          },
          outlined: {
            borderColor: border
          },
          filled: {
            backgroundColor: isDark ? alpha(primary, 0.16) : alpha(primary, 0.1),
            color: isDark ? "#bfdbfe" : "#1d4ed8"
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            color: textPrimary,
            borderRadius: 14
          },
          input: {
            "&::placeholder": {
              color: textSecondary,
              opacity: 1
            }
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: isDark ? alpha("#020617", 0.3) : alpha("#ffffff", 0.88),
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: border
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(primary, 0.38)
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(primary, 0.68),
              borderWidth: 1
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 4px ${alpha(primary, isDark ? 0.22 : 0.12)}`
            }
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: textSecondary,
            fontWeight: 700,
            "&.Mui-focused": {
              color: primary
            }
          }
        }
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${border}`,
            backgroundColor: alpha(surface, 0.88)
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha("#020617", 0.32) : alpha("#f8fafc", 0.95)
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: border,
            color: textPrimary
          },
          head: {
            color: textSecondary,
            fontSize: "0.72rem",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase"
          }
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background 160ms ease, box-shadow 160ms ease",
            "&:hover": {
              backgroundColor: isDark ? alpha(primary, 0.1) : alpha(primary, 0.055)
            }
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            border: `1px solid ${border}`,
            backgroundImage: `linear-gradient(180deg, ${alpha(surface, 0.98)}, ${alpha(elevated, 0.94)})`,
            backgroundColor: surface,
            color: textPrimary,
            boxShadow: isDark ? "0 28px 80px rgba(0,0,0,0.55)" : "0 28px 80px rgba(15,23,42,0.22)"
          }
        }
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontWeight: 900,
            letterSpacing: "-0.02em"
          }
        }
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "18px 24px 24px"
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            color: textPrimary,
            borderColor: border
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            border: `1px solid ${border}`,
            borderRadius: 16,
            boxShadow: isDark ? "0 18px 54px rgba(0,0,0,0.45)" : "0 18px 54px rgba(15,23,42,0.12)"
          }
        }
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            margin: "2px 6px",
            fontWeight: 700
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 42,
            fontWeight: 800,
            textTransform: "none"
          }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": {
              color: "#ffffff"
            },
            "&.Mui-checked + .MuiSwitch-track": {
              background: `linear-gradient(135deg, ${primary}, ${teal})`,
              opacity: 1
            }
          },
          track: {
            opacity: 1,
            backgroundColor: isDark ? "#334155" : "#cbd5e1"
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: isDark ? "#1e293b" : "#0f172a"
          },
          arrow: {
            color: isDark ? "#1e293b" : "#0f172a"
          }
        }
      }
    }
  });
}

/** Default export for tests or Storybook that expect a static theme instance. */
export const adminTheme = createAdminTheme("light");
