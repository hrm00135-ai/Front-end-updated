import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { apiCall } from "../../utils/api";
import AdminTopBar from "../../components/AdminTopBar";

const MetalPrices = () => {
  const [tab, setTab] = useState("current");
  const [prices, setPrices] = useState([]);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Set prices form
  const [priceForm, setPriceForm] = useState([
    { metal: "gold", purity: "24K", price_per_gram: "" },
    { metal: "gold", purity: "22K", price_per_gram: "" },
    { metal: "gold", purity: "18K", price_per_gram: "" },
    { metal: "silver", purity: "999", price_per_gram: "" },
    { metal: "platinum", purity: "950", price_per_gram: "" },
    { metal: "palladium", purity: "999", price_per_gram: "" },
  ]);

  // History filters
  const [histMetal, setHistMetal] = useState("gold");
  const [histPurity, setHistPurity] = useState("24K");
  const [histDays, setHistDays] = useState(30);

  // Calculator
  const [calcForm, setCalcForm] = useState({ metal: "gold", purity: "22K", weight_grams: "" });
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => { fetchPrices(); }, []);

  const fetchPrices = async () => {
    try {
      const res = await apiCall("/metals/prices");
      const data = await res.json();
      if (data.status === "success") {
        setPrices(data.data || []);
        // Pre-fill form with current prices
        const updated = priceForm.map(p => {
          const match = (data.data || []).find(d => d.metal === p.metal && d.purity === p.purity);
          return match ? { ...p, price_per_gram: match.price_per_gram } : p;
        });
        setPriceForm(updated);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await apiCall(`/metals/history?metal=${histMetal}&purity=${histPurity}&days=${histDays}`);
      const data = await res.json();
      if (data.status === "success") setHistory(data.data || []);
    } catch {}
  };

  const handleSetPrices = async () => {
    const valid = priceForm.filter(p => p.price_per_gram);
    if (valid.length === 0) { setMsg({ text: "Enter at least one price", type: "error" }); return; }
    try {
      const res = await apiCall("/metals/prices", {
        method: "POST",
        body: JSON.stringify({ prices: valid.map(p => ({ ...p, price_per_gram: parseFloat(p.price_per_gram) })) }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg({ text: "Prices updated", type: "success" });
        fetchPrices();
      } else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const handleCalculate = async () => {
    if (!calcForm.weight_grams) { setMsg({ text: "Enter weight", type: "error" }); return; }
    try {
      const res = await apiCall("/metals/calculate", {
        method: "POST",
        body: JSON.stringify({ ...calcForm, weight_grams: parseFloat(calcForm.weight_grams) }),
      });
      const data = await res.json();
      if (data.status === "success") setCalcResult(data.data);
      else { setMsg({ text: data.message, type: "error" }); }
    } catch { setMsg({ text: "Network error", type: "error" }); }
  };

  const metalColor = (m) => {
    const c = { gold: "#f59e0b", silver: "#94a3b8", platinum: "#6b7280", palladium: "#8b5cf6" };
    return c[m] || "#64748b";
  };

  return (
    <Layout topBar={<AdminTopBar />} >
      <h1 className="text-2xl font-bold mb-6">Metal Prices</h1>

      {msg.text && (
        <div style={{ background: msg.type === "error" ? "#fee2e2" : "#dcfce7", color: msg.type === "error" ? "#dc2626" : "#16a34a", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {msg.text}
          <button onClick={() => setMsg({ text: "", type: "" })} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["current", "set prices", "history", "calculator"].map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === "history") fetchHistory(); }} style={{
            padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
            background: tab === t ? "#1e293b" : "white", color: tab === t ? "white" : "#1e293b",
          }}>{t}</button>
        ))}
      </div>

      {/* CURRENT PRICES */}
      {tab === "current" && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {prices.length === 0 ? (
            <div className="col-span-full bg-white p-10 rounded-xl shadow text-center" style={{ color: "#94a3b8" }}>No prices set yet</div>
          ) : prices.map((p, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow text-center">
              <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>{p.metal} {p.purity}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: metalColor(p.metal), marginTop: "8px" }}>₹{p.price_per_gram}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>/gram</div>
              {p.price_per_10gram && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>₹{p.price_per_10gram}/10g</div>}
              {p.fetched_at && <div style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "8px" }}>Updated: {new Date(p.fetched_at).toLocaleString()}</div>}
            </div>
          ))}
        </div>
      )}

      {/* SET PRICES */}
      {tab === "set prices" && (
        <div className="bg-white p-6 rounded-xl shadow" style={{ maxWidth: "600px" }}>
          <h3 style={{ fontWeight: "600", marginBottom: "16px" }}>Update Metal Prices (₹/gram)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {priceForm.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "140px", fontSize: "14px", fontWeight: "500", color: metalColor(p.metal), textTransform: "capitalize" }}>
                  {p.metal} {p.purity}
                </span>
                <input type="number" placeholder="Price per gram" value={p.price_per_gram}
                  onChange={e => {
                    const updated = [...priceForm];
                    updated[i].price_per_gram = e.target.value;
                    setPriceForm(updated);
                  }}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }} />
              </div>
            ))}
            <button onClick={handleSetPrices} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", marginTop: "8px" }}>
              Save Prices
            </button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <>
          <div className="bg-white p-4 rounded-xl shadow mb-6" style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={lbl}>Metal</label>
              <select value={histMetal} onChange={e => setHistMetal(e.target.value)} style={inp}>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="platinum">Platinum</option>
                <option value="palladium">Palladium</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Purity</label>
              <input value={histPurity} onChange={e => setHistPurity(e.target.value)} style={{ ...inp, width: "100px" }} />
            </div>
            <div>
              <label style={lbl}>Days</label>
              <input type="number" value={histDays} onChange={e => setHistDays(e.target.value)} style={{ ...inp, width: "80px" }} />
            </div>
            <button onClick={fetchHistory} style={{ background: "#1e293b", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              Load
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={thS}>Date</th>
                  <th style={thS}>Metal</th>
                  <th style={thS}>Purity</th>
                  <th style={thS}>Price/gram</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No history data</td></tr>
                ) : history.map((h, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={tdS}>{h.date}</td>
                    <td style={{ ...tdS, textTransform: "capitalize" }}>{h.metal}</td>
                    <td style={tdS}>{h.purity}</td>
                    <td style={{ ...tdS, fontWeight: "600", color: metalColor(h.metal) }}>₹{h.price_per_gram}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CALCULATOR */}
      {tab === "calculator" && (
        <div className="bg-white p-6 rounded-xl shadow" style={{ maxWidth: "400px" }}>
          <h3 style={{ fontWeight: "600", marginBottom: "16px" }}>Metal Value Calculator</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={lbl}>Metal</label>
              <select value={calcForm.metal} onChange={e => setCalcForm({ ...calcForm, metal: e.target.value })} style={inp}>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="platinum">Platinum</option>
                <option value="palladium">Palladium</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Purity</label>
              <input value={calcForm.purity} onChange={e => setCalcForm({ ...calcForm, purity: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Weight (grams)</label>
              <input type="number" step="0.01" value={calcForm.weight_grams} onChange={e => setCalcForm({ ...calcForm, weight_grams: e.target.value })} style={inp} />
            </div>
            <button onClick={handleCalculate} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
              Calculate
            </button>
          </div>

          {calcResult && (
            <div style={{ marginTop: "20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px" }}>
              <div style={{ fontSize: "13px", color: "#64748b" }}>
                {calcResult.weight_grams}g of {calcResult.metal} ({calcResult.purity}) @ ₹{calcResult.price_per_gram}/g
              </div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#16a34a", marginTop: "8px" }}>
                ₹{calcResult.total_value?.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

const lbl = { fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" };
const inp = { width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" };
const thS = { padding: "10px 12px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b" };
const tdS = { padding: "10px 12px" };

export default MetalPrices;
