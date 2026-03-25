import { ReactNode } from "react";

interface ResponsiveShellProps {
  children: ReactNode;
  /** If true, the shell takes full viewport with no max-width (for session screens) */
  fullscreen?: boolean;
}

/**
 * Responsive container that replaces the old fixed 375×812 phone frame.
 * - Mobile: full screen
 * - Desktop: centered with max-width, min-height 100vh
 * - fullscreen mode: no max-width constraint (for recording/feedback screens)
 */
const ResponsiveShell = ({ children, fullscreen = false }: ResponsiveShellProps) => {
  if (fullscreen) {
    return (
      <div className="session-dark min-h-[100dvh] w-full bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center bg-background md:items-center md:py-6">
      <div className="relative w-full min-h-[100dvh] md:min-h-0 md:max-w-[480px] lg:max-w-[540px] md:rounded-3xl md:border md:border-border md:shadow-2xl md:h-auto bg-background overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveShell;
