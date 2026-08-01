// Route helper preserving the prototype's setRoute(id) call style on top of
// react-router. Route ids map 1:1 to paths ("dashboard" → "/", "cmdb" → "/cmdb").
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUiStore } from "@/store/ui";

export function useNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const route = location.pathname === "/" ? "dashboard" : location.pathname.replace(/^\//, "");

  const setRoute = useCallback(
    (id: string, params?: Record<string, unknown>) => {
      if (params) useUiStore.getState().setParams(params);
      navigate(id === "dashboard" ? "/" : `/${id}`);
    },
    [navigate],
  );

  return { route, setRoute };
}
