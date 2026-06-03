import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar />

      <div className="flex-1 ml-72">
        <Header />

        <main className="px-12 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}