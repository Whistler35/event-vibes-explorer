import { ReactNode } from "react";
import BottomNavigation from "./BottomNavigation";

interface LayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

const Layout = ({ children, showBottomNav = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={showBottomNav ? "pb-24" : ""}>
        {children}
      </main>
      {showBottomNav && <BottomNavigation />}
    </div>
  );
};

export default Layout;