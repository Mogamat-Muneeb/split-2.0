/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import FloatingNav from "@/components/floating-nav";
import { AnimatePresence } from "framer-motion";

import { Outlet } from "react-router-dom";

const Dashboard = () => {
  return (
    <AnimatePresence>
      <div className="min-h-screen relative  ">
        <FloatingNav />

        <div className="px-3 py-3">
          <Outlet />
        </div>
      </div>
    </AnimatePresence>
  );
};

export default Dashboard;
