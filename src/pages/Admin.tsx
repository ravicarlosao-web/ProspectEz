import { useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Outlet } from "react-router-dom";

const Admin = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Acesso restrito a administradores");
    }
  }, [isAdmin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return <Outlet />;
};

export default Admin;
