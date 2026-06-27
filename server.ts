import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// API: 获取所有的 python 文件树及内容
app.get("/api/files", (req, res) => {
  const pythonAppDir = path.join(process.cwd(), "python_app");
  
  function readDirRecursive(dirPath: string, relativePath = ""): any[] {
    const list: any[] = [];
    if (!fs.existsSync(dirPath)) return list;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file === "venv" || file === "__pycache__" || file.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(dirPath, file);
      const relPath = relativePath ? `${relativePath}/${file}` : file;
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        list.push({
          name: file,
          path: relPath,
          isDirectory: true,
          children: readDirRecursive(fullPath, relPath),
        });
      } else if (file.endsWith(".py") || file.endsWith(".txt") || file.endsWith(".md")) {
        let content = "";
        try {
          content = fs.readFileSync(fullPath, "utf-8");
        } catch (e) {
          content = "无法读取文件内容";
        }
        list.push({
          name: file,
          path: relPath,
          isDirectory: false,
          content: content,
        });
      }
    }
    return list;
  }

  try {
    const files = readDirRecursive(pythonAppDir);
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: 保存文件修改
app.post("/api/save", (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: "Missing filePath or content" });
  }

  try {
    const pythonAppDir = path.join(process.cwd(), "python_app");
    const safePath = path.normalize(path.join(pythonAppDir, filePath));
    
    // 确保写操作不会脱离 python_app 目录
    if (!safePath.startsWith(pythonAppDir)) {
      return res.status(403).json({ error: "Access denied. Path is out of bounds." });
    }

    // 确保父目录存在
    const parentDir = path.dirname(safePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(safePath, content, "utf-8");
    res.json({ success: true, message: `File saved successfully to ${filePath}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: 获取/初始化本地 agri_db.json
app.get("/api/db", (req, res) => {
  const dbPath = path.join(process.cwd(), "agri_db.json");
  if (!fs.existsSync(dbPath)) {
    // 如果没有，直接返回默认的空或从 python_app 中生成
    try {
      const mockDbFile = path.join(process.cwd(), "python_app", "db_mock.py");
      if (fs.existsSync(mockDbFile)) {
        // 读取 python_app/db_mock.py 来获取默认的 seed_initial_data
        // 这里提供一个坚固的兜底数据
        const fallbackDb = {
          users: {
            admin: { pass: "123456", role: "ADMIN" },
            manager: { pass: "123456", role: "MANAGER" },
            operator: { pass: "123456", role: "OPERATOR" }
          },
          parcels: [
            { id: "P001", name: "一号高标准大田", area: 120.0, soilType: "LOAM", currentCrop: "小麦", nutrientLevel: { n: 110, p: 42, k: 95 }, history: ["番茄", "白菜"] },
            { id: "P002", name: "二号沙壤土大田", area: 85.0, soilType: "SAND", currentCrop: "大豆", nutrientLevel: { n: 55, p: 50, k: 105 }, history: ["小麦"] },
            { id: "P003", name: "三号粘性壤土试验区", area: 40.0, soilType: "CLAY", currentCrop: null, nutrientLevel: { n: 130, p: 35, k: 80 }, history: ["玉米"] }
          ],
          crop_plans: [
            { id: "CP1001", parcelId: "P001", cropName: "小麦", category: "CEREAL", sowDate: "2026-03-01", expectedHarvest: "2026-07-15", status: "GROWING" },
            { id: "CP1002", parcelId: "P002", cropName: "大豆", category: "LEGUME", sowDate: "2026-05-10", expectedHarvest: "2026-09-01", status: "GROWING" }
          ],
          weather: {
            temperature: 28.5,
            humidity: 58.0,
            solarRadiation: 650.0,
            forecastRainProbability: 15.0,
            soilMoisture: 42.0
          },
          irrigation_logs: [],
          inventory: [
            { id: "INV101", name: "高活性磷酸二铵", category: "FERTILIZER", quantity: 2400.0, unit: "kg", safetyStock: 500.0, pricePerUnit: 4.8, leadTimeDays: 4 },
            { id: "INV102", name: "阿维菌素生物杀虫剂", category: "PESTICIDE", quantity: 180.0, unit: "L", safetyStock: 200.0, pricePerUnit: 18.5, leadTimeDays: 7 },
            { id: "INV103", name: "秋实九号高产番茄良种", category: "SEED", quantity: 45.0, unit: "kg", safetyStock: 10.0, pricePerUnit: 125.0, leadTimeDays: 10 }
          ],
          drone_missions: [
            { id: "DRN501", droneId: "UAV-ALPHA-09", parcelId: "P001", taskType: "SPRAYING", waypoints: [{ x: 10, y: 15 }, { x: 50, y: 70 }], batteryRequired: 18, status: "COMPLETED" }
          ],
          recipes: [
            { id: "RC701", parcelId: "P001", cropName: "小麦", recommendationNPK: { n: 15.0, p: 5.0, k: 8.0 }, appliedStatus: "APPLIED", timestamp: "2026-06-25" }
          ],
          pest_alerts: [
            { id: "AL301", parcelId: "P001", cropName: "小麦", pestName: "棉铃虫", cumulativeGDD: 110, riskLevel: "MEDIUM", status: "MONITORING" }
          ],
          harvest_batches: [
            { id: "BAT-2001", cropName: "番茄", quantity: 4500.0, harvestDate: "2026-06-24", parcelId: "P001", sugarAcidRatio: 14.8, qualityGrade: "A", traceHash: "AGRI-BLOCK-7F2A3D1C-20260624" }
          ],
          greenhouses: [
            { id: "GH01", name: "一号智能蔬菜温室大棚", currentTemp: 22.5, currentHumidity: 60.0, co2Level: 550, state: "IDLE", actuators: { heater: false, ventilation: false, humidifier: false, co2Valve: false } },
            { id: "GH02", name: "二号草莓立体高架温室", currentTemp: 19.0, currentHumidity: 72.0, co2Level: 720, state: "IDLE", actuators: { heater: false, ventilation: false, humidifier: false, co2Valve: false } }
          ],
          tasks: [
            { id: "TSK901", title: "小麦叶面追肥作业", assignedTo: "徐利民 (机耕组)", parcelId: "P001", priority: "MEDIUM", status: "DISPATCHED" }
          ],
          costs: [
            { id: "CST3001", category: "MATERIALS", amount: 840.0, date: "2026-06-24", description: "直接材料：采购番茄底施复合肥料费用", allocationStatus: "ALLOCATED" },
            { id: "CST3002", category: "LABOR", amount: 1200.0, date: "2026-06-25", description: "人工费用：采收工人工时结算费用", allocationStatus: "UNALLOCATED" }
          ]
        };
        fs.writeFileSync(dbPath, JSON.stringify(fallbackDb, null, 4), "utf-8");
      }
    } catch (e) {
      // Ignore
    }
  }

  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf-8");
      return res.json(JSON.parse(data));
    }
    return res.status(404).json({ error: "Database file not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: 写入本地 agri_db.json
app.post("/api/db", (req, res) => {
  const dbPath = path.join(process.cwd(), "agri_db.json");
  try {
    fs.writeFileSync(dbPath, JSON.stringify(req.body, null, 4), "utf-8");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite & Static file handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
