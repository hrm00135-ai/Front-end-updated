import { useEffect, useState } from "react";
import { apiCall } from "../utils/api";

const AdminTopBar = () => {
  const [metals, setMetals] = useState([]);

  useEffect(() => {
    const fetchMetals = async () => {
      try {
        const res = await apiCall("/metals/prices");
        const data = await res.json();
        if (data.status === "success") {
          setMetals(data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMetals();
  }, []);

  return (
    <div
      style={{
        background: "#1e293b",
        color: "white",
        padding: "10px 16px",
        borderRadius: "10px",
        display: "flex",
        gap: "20px",
        overflowX: "auto",
        fontSize: "13px",
      }}
    >
      {metals.length > 0 ? (
        metals.map((m, i) => (
          <div key={i} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: "#94a3b8" }}>
              {m.metal?.toUpperCase()} {m.purity}:
            </span>
            <span
              style={{ fontWeight: "bold", color: "#fbbf24" }}
            >
              Rs.{m.price_per_gram}/g
            </span>
          </div>
        ))
      ) : (
        <span style={{ color: "#94a3b8" }}>
          No metal prices set. Add from API.
        </span>
      )}
    </div>
  );
};

export default AdminTopBar;