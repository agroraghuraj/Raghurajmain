import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  getBillsByCustomer,
  getRecentBills,
} from "./routes/billing";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Billing API routes
  app.post("/api/newbill", createBill);
  app.get("/getBills", getAllBills);
  app.get("/getBillsbyid/:id", getBillById);
  app.put("/updateBills/:id", updateBill);
  app.delete("/deleteBills/:id", deleteBill);
  
  // New billing API routes
  app.post("/api/newBill/register", createBill);
  app.get("/api/newBill/getBills", getAllBills);
  app.get("/api/newBill/customer/:customerId", getBillsByCustomer);
  app.get("/api/newBill/recent", getRecentBills);
  app.put("/api/newBill/updateBills/:id", updateBill);
  app.delete("/api/newBill/deleteBills/:id", deleteBill);

  // Proxy remote images from API origin to avoid CORP blocking in dev
  app.get("/proxy/image", async (req, res) => {
    try {
      const url = String(req.query.url || "");
      if (!url) {
        res.status(400).json({ error: "Missing url" });
        return;
      }

      const target = new URL(url);
      const allowed = new URL("https://saveraelectronic-backend.onrender.com");
      if (target.origin !== allowed.origin) {
        res.status(400).json({ error: "Disallowed origin" });
        return;
      }

      const r = await fetch(target);
      if (!r.ok) {
        res.status(r.status).end();
        return;
      }

      const contentType = r.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      const ab = await r.arrayBuffer();
      res.send(Buffer.from(ab));
    } catch (e) {
      res.status(500).json({ error: "Proxy failed" });
    }
  });

  return app;
}
