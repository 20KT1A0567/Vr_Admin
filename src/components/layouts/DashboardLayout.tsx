import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { cn } from "utils/cn";

export interface DashboardLayoutProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
  /** Applied to the column beside the fixed sidebar (desktop offset). */
  contentColumnClassName?: string;
}

/**
 * VR Technologies admin shell: mesh workspace + aligned 1600px editorial grid.
 */
export function DashboardLayout({ sidebar, topbar, children, contentColumnClassName }: DashboardLayoutProps) {
  return (
    <Box className="admin-panel-shell relative min-h-screen w-full overflow-x-hidden text-[color:var(--color-text)]">
      {sidebar}

      <Box className={cn("app-main admin-content-rail min-h-screen", contentColumnClassName)}>
        <Box className="admin-shell-topbar sticky top-0 z-30 px-4 py-4 md:px-6 md:py-6">
          {topbar}
        </Box>

        <Box component="main" className="page-content admin-page-content admin-fade-in pb-8 md:pb-10">
          <Box className="admin-page-stage mx-auto w-full max-w-[1600px]">
            <div className="admin-page-canvas relative space-y-6 bg-transparent shadow-none lg:space-y-8">
              {children}
            </div>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
