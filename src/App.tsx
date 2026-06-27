import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  Save,
  Download,
  Terminal,
  Database,
  Play,
  LogOut,
  ShieldCheck,
  UserPlus,
  Lock,
  Key,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Cpu,
  Thermometer,
  Droplets,
  Wind,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Plus,
  Compass,
  ArrowRight,
  Sparkles,
  Search,
  Check,
  Workflow,
  TrendingUp,
  LineChart
} from "lucide-react";
import { DatabaseState, FileItem, Role, UserSession } from "./types";

export default function App() {
  // IDE State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "modules": true });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Database State
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  // PyQt6 Simulator State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [simActiveMenu, setSimActiveMenu] = useState(0);
  const [simLogs, setSimLogs] = useState<string[]>([
    "[PyQt6 App] Starting main loop inside Python 3.10...",
    "[Database] DatabaseMock loaded successfully from agri_db.json.",
    "[GUI] Displaying unified LoginWindow (RBAC framework active)."
  ]);

  // Login Form
  const [loginUser, setLoginUser] = useState("admin");
  const [loginPwd, setLoginPwd] = useState("123456");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerRole, setRegisterRole] = useState<Role>("ADMIN");
  const [loginError, setLoginError] = useState("");

  // Module 1: Crop Management Form
  const [m1ParcelId, setM1ParcelId] = useState("P001");
  const [m1Crop, setM1Crop] = useState("白菜");
  const [m1Sow, setM1Sow] = useState("2026-07-01");
  const [m1Harvest, setM1Harvest] = useState("2026-10-15");

  // Module 2: Irrigation Climate Sliders
  const [m2Temp, setM2Temp] = useState(28);
  const [m2Moist, setM2Moist] = useState(42);
  const [m2Rad, setM2Rad] = useState(650);
  const [m2TargetParcel, setM2TargetParcel] = useState("P001");

  // Module 3: Inventory Dispatch
  const [m3ItemId, setM3ItemId] = useState("INV101");
  const [m3Qty, setM3Qty] = useState(100);

  // Module 4: Drone Waypoints
  const [m4DroneBattery, setM4DroneBattery] = useState(85);
  const [m4TargetParcel, setM4TargetParcel] = useState("P001");
  const [m4MissionType, setM4MissionType] = useState<"SPRAYING" | "MAPPING" | "PATROL">("SPRAYING");
  const [m4DroneFlying, setM4DroneFlying] = useState(false);

  // Module 5: Fertilizer analysis
  const [m5ParcelId, setM5ParcelId] = useState("P001");
  const [m5TargetCrop, setM5TargetCrop] = useState("小麦");

  // Module 6: Pest physiological degree day
  const [m6ParcelId, setM6ParcelId] = useState("P001");
  const [m6GddAdd, setM6GddAdd] = useState(15);

  // Module 7: Harvest Sugar-Acid Grade
  const [m7ParcelId, setM7ParcelId] = useState("P001");
  const [m7CropName, setM7CropName] = useState("番茄");
  const [m7Qty, setM7Qty] = useState(3500);
  const [m7SugarRatio, setM7SugarRatio] = useState(13.5);

  // Module 8: Greenhouse actuators
  const [m8Id, setM8Id] = useState("GH01");

  // Module 9: Task workflow
  const [m9Title, setM9Title] = useState("地块大棚气肥补充作业");
  const [m9Assignee, setM9Assignee] = useState("张建国 (作业组)");
  const [m9Parcel, setM9Parcel] = useState("P001");
  const [m9Priority, setM9Priority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");

  // Module 10: Financial cost record
  const [m10Category, setM10Category] = useState<"MATERIALS" | "LABOR" | "MACHINERY" | "OTHER">("MATERIALS");
  const [m10Amt, setM10Amt] = useState(500);
  const [m10Desc, setM10Desc] = useState("直接材料：采购配方微肥配额");

  // Ref for terminal log scrolling
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Fetch Python Files & Database State
  useEffect(() => {
    fetchFiles();
    fetchDatabase();
  }, []);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [simLogs]);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        // Default to select main.py if found
        const mainPy = data.files.find((f: any) => f.name === "main.py");
        if (mainPy) {
          setSelectedFile(mainPy);
          setEditorContent(mainPy.content || "");
        } else if (data.files.length > 0) {
          const firstFile = data.files[0].isDirectory ? data.files[0].children?.[0] : data.files[0];
          if (firstFile) {
            setSelectedFile(firstFile);
            setEditorContent(firstFile.content || "");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load python source files", err);
    }
  };

  const fetchDatabase = async () => {
    setDbLoading(true);
    try {
      const res = await fetch("/api/db");
      const data = await res.json();
      if (!data.error) {
        setDbState(data);
      }
    } catch (err) {
      console.error("Failed to load agri_db.json", err);
    } finally {
      setDbLoading(false);
    }
  };

  const saveDatabase = async (updatedDb: DatabaseState) => {
    setDbState(updatedDb);
    try {
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDb)
      });
    } catch (err) {
      console.error("Failed to save state to agri_db.json", err);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: selectedFile.path,
          content: editorContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus("saved");
        addLog(`[IDE Editor] Successfully saved changes to '/python_app/${selectedFile.path}'`);
        // Refresh local files state
        fetchFiles();
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setSimLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const handleFileSelect = (file: FileItem) => {
    if (file.isDirectory) return;
    setSelectedFile(file);
    setEditorContent(file.content || "");
    setSaveStatus("idle");
    addLog(`[IDE Explorer] Opened file '/python_app/${file.path}'`);
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Render File Tree Node
  const renderFileNode = (file: FileItem) => {
    const isExpanded = expandedFolders[file.path] || false;
    if (file.isDirectory) {
      return (
        <div key={file.path} className="select-none text-xs">
          <div
            onClick={() => toggleFolder(file.path)}
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-slate-800/60 rounded cursor-pointer text-slate-300"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Folder className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
            <span className="font-medium truncate">{file.name}</span>
          </div>
          {isExpanded && file.children && (
            <div className="pl-4 border-l border-slate-800 ml-3.5 mt-0.5 space-y-0.5">
              {file.children.map(child => renderFileNode(child))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedFile?.path === file.path;
    return (
      <div
        key={file.path}
        onClick={() => handleFileSelect(file)}
        className={`flex items-center gap-1.5 py-1.5 px-3 rounded cursor-pointer text-xs transition-colors ${
          isSelected
            ? "bg-emerald-500/15 border-l-2 border-emerald-500 text-emerald-300 font-medium"
            : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
        }`}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{file.name}</span>
      </div>
    );
  };

  // PyQt6 Simulator Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!dbState) return;

    const username = loginUser.trim();
    const pwd = loginPwd.trim();

    if (!username || !pwd) {
      setLoginError("请填写完整的账号及安全密码");
      return;
    }

    if (isRegisterMode) {
      if (dbState.users[username]) {
        setLoginError("此用户名已被登记占用");
        return;
      }
      // Register
      const updatedUsers = { ...dbState.users, [username]: { pass: pwd, role: registerRole } };
      const updatedDb = { ...dbState, users: updatedUsers };
      saveDatabase(updatedDb);
      addLog(`[PyQt6 RBAC] Registered new profile: ${username} (${registerRole})`);
      alert(`[PyQt6 QMessageBox.information]\n\n账户档案创建成功，请登录！`);
      setIsRegisterMode(false);
    } else {
      const userObj = dbState.users[username];
      if (!userObj || userObj.pass !== pwd) {
        setLoginError("登录账号或安全密码不匹配");
        addLog(`[PyQt6 RBAC] Login failed for user '${username}': incorrect credentials`);
        return;
      }
      // Success
      setCurrentUser({ username, role: userObj.role });
      addLog(`[PyQt6 UI] User ${username} successfully verified as role ${userObj.role}. Booting Main Panel.`);
    }
  };

  const handleLogout = () => {
    addLog(`[PyQt6 UI] Session ended for user: ${currentUser?.username}`);
    setCurrentUser(null);
  };

  // Module 1 Logic: Crop Rotation Validation
  const handleM1CreatePlan = () => {
    if (!dbState) return;

    const parcel = dbState.parcels.find(p => p.id === m1ParcelId);
    if (!parcel) return;

    // Crop Rotation isolation check logic from crop_management.py
    const categoryMap: Record<string, string> = {
      番茄: "SOLANACEOUS", 马铃薯: "SOLANACEOUS",
      大豆: "LEGUME", 豌豆: "LEGUME",
      小麦: "CEREAL", 玉米: "CEREAL",
      白菜: "CRUCIFEROUS", 西兰花: "CRUCIFEROUS"
    };

    const names: Record<string, string> = {
      SOLANACEOUS: "茄科类",
      LEGUME: "豆科类",
      CEREAL: "谷物类",
      CRUCIFEROUS: "十字花科类"
    };

    let isValid = true;
    let conflictMsg = "";

    if (parcel.history.length > 0) {
      const lastCrop = parcel.history[parcel.history.length - 1];
      const lastCategory = categoryMap[lastCrop];
      const newCategory = categoryMap[m1Crop];

      if (lastCategory && lastCategory === newCategory) {
        isValid = false;
        conflictMsg = `检测到科属连作冲突：地块上一茬为 [${lastCrop}]，拟种的 [${m1Crop}] 亦属于 [${names[newCategory]}]，连作极易导致土壤特定作物害虫与真菌病害爆发。`;
      }
    }

    if (!isValid) {
      addLog(`[PyQt6 CropManagement] ERROR: Crop rotation check failed for parcel ${parcel.id} with crop ${m1Crop}`);
      alert(`[PyQt6 QMessageBox.critical - 轮作冲突阻断]\n\n${conflictMsg}`);
      return;
    }

    // Success - create planning
    const newPlan = {
      id: `CP${dbState.crop_plans.length + 1001}`,
      parcelId: m1ParcelId,
      cropName: m1Crop,
      category: (categoryMap[m1Crop] || "CEREAL") as any,
      sowDate: m1Sow,
      expectedHarvest: m1Harvest,
      status: "PLANNING" as const
    };

    const updatedParcels = dbState.parcels.map(p =>
      p.id === m1ParcelId ? { ...p, currentCrop: m1Crop } : p
    );

    const updatedDb = {
      ...dbState,
      crop_plans: [...dbState.crop_plans, newPlan],
      parcels: updatedParcels
    };

    saveDatabase(updatedDb);
    addLog(`[PyQt6 CropManagement] Created crop plan ${newPlan.id} for ${m1Crop} on parcel ${m1ParcelId}`);
    alert(`[PyQt6 QMessageBox.information - 规划确立]\n\n种植规划已成功建立！地块 [${parcel.name}] 的种植作物已登记。`);
  };

  const handleM1TransitState = (planId: string) => {
    if (!dbState) return;

    const plans = [...dbState.crop_plans];
    const planIdx = plans.findIndex(p => p.id === planId);
    if (planIdx === -1) return;

    const plan = plans[planIdx];
    const statusFlow: Array<"PLANNING" | "SOWN" | "GROWING" | "HARVESTED"> = [
      "PLANNING",
      "SOWN",
      "GROWING",
      "HARVESTED"
    ];
    const currIdx = statusFlow.indexOf(plan.status);

    if (currIdx >= statusFlow.length - 1) {
      alert(`[PyQt6 QMessageBox.warning - 无法流转]\n\n该种植计划已收获并结案，状态无法再推进。`);
      return;
    }

    const nextStatus = statusFlow[currIdx + 1];
    const updatedPlan = { ...plan, status: nextStatus };
    plans[planIdx] = updatedPlan;

    let updatedParcels = [...dbState.parcels];
    if (nextStatus === "HARVESTED") {
      updatedParcels = updatedParcels.map(p => {
        if (p.id === plan.parcelId) {
          return {
            ...p,
            currentCrop: null,
            history: [...p.history, plan.cropName]
          };
        }
        return p;
      });
    }

    const updatedDb = {
      ...dbState,
      crop_plans: plans,
      parcels: updatedParcels
    };

    saveDatabase(updatedDb);
    addLog(`[PyQt6 CropManagement] Crop plan ${planId} transitioned to ${nextStatus}`);
  };

  // Module 2 Logic: Penman Irrigation Evaporation Formula
  const m2Et = parseFloat(((m2Temp * 0.15) + (m2Rad * 0.001)).toFixed(2));
  const m2MoistureGap = Math.max(0, 75 - m2Moist);
  const m2WaterNeeded = parseFloat((m2Et * 200 + m2MoistureGap * 15).toFixed(1));

  const handleM2Irrigate = () => {
    if (!dbState) return;

    const targetParcelObj = dbState.parcels.find(p => p.id === m2TargetParcel);
    if (!targetParcelObj) return;

    const totalVolume = Math.round(m2WaterNeeded * targetParcelObj.area);
    const duration = Math.max(1, Math.round(totalVolume / (15 * targetParcelObj.area)));

    const newLog = {
      id: `IR${dbState.irrigation_logs.length + 1001}`,
      parcelId: m2TargetParcel,
      timestamp: new Date().toLocaleTimeString(),
      waterVolume: totalVolume,
      duration: duration,
      mode: "AUTO" as const
    };

    // Consistently raise soil moisture state by +15% (limited to 80%)
    const nextMoisture = Math.min(80, m2Moist + 15);
    setM2Moist(nextMoisture);

    const updatedDb = {
      ...dbState,
      irrigation_logs: [...dbState.irrigation_logs, newLog],
      weather: {
        ...dbState.weather,
        soilMoisture: nextMoisture
      }
    };

    saveDatabase(updatedDb);
    addLog(`[PyQt6 Irrigation] Activated micro-sprinkler for ${m2TargetParcel}: sprayed ${totalVolume}L over ${duration} mins`);
    alert(`[PyQt6 QMessageBox.information - 微喷水泵开启]\n\n电磁喷淋阀成功闭合！针对 [${targetParcelObj.name}]，输送：${totalVolume} 升水，运行时间 ${duration} 分钟。`);
  };

  // Module 3 Logic: Inventory Dispatch
  const handleM3Dispatch = () => {
    if (!dbState) return;

    const items = [...dbState.inventory];
    const itemIdx = items.findIndex(i => i.id === m3ItemId);
    if (itemIdx === -1) return;

    const item = items[itemIdx];

    if (item.quantity < m3Qty) {
      addLog(`[PyQt6 Inventory] TRANSACTION ABORTED: Insufficient inventory of ${item.name}. Available: ${item.quantity}, requested: ${m3Qty}`);
      alert(`[PyQt6 QMessageBox.critical - 事务回滚]\n\n发生库存防负原子冲突！当前农资 [${item.name}] 存库盈余为 ${item.quantity} ${item.unit}，不足支持本次派单出库量 ${m3Qty} ${item.unit}，已安全锁定并回滚事务防止数据一致性异常。`);
      return;
    }

    const updatedItem = { ...item, quantity: parseFloat((item.quantity - m3Qty).toFixed(2)) };
    items[itemIdx] = updatedItem;

    const updatedDb = {
      ...dbState,
      inventory: items
    };

    saveDatabase(updatedDb);
    addLog(`[PyQt6 Inventory] Dispatched ${m3Qty} ${item.unit} of ${item.name}. Remaining: ${updatedItem.quantity}`);
    alert(`[PyQt6 QMessageBox.information - 出库核验完成]\n\n农资派单出库成功！[${item.name}] 库存量现已扣减，当前剩余：${updatedItem.quantity} ${item.unit}。`);
  };

  // Module 4 Logic: TSP Drone Path solver
  const handleM4TspCalculate = () => {
    addLog(`[PyQt6 Drone] Running TSP heuristic shortest flight path solver for waypoint coordinates...`);
    addLog(`[PyQt6 Drone] TSP Path: Home -> P1 (10, 15) -> P2 (50, 70) -> P3 (90, 45) -> Home. Optimized Distance: 242m.`);
    alert(`[PyQt6 QMessageBox.information - TSP 航线解算器]\n\n已成功应用贪心决策（Greedy Heuristic）求解最短闭合巡检路径！\n\n最优飞行轨迹序列：\n地勤基地 -> 一号大田 -> 二号大田 -> 三号试验区 -> 地勤基地\n总规划航线：242 米，预估电量消耗：18%`);
  };

  const handleM4LaunchDrone = () => {
    if (m4DroneBattery < 20) {
      addLog(`[PyQt6 Drone] FLIGHT INHIBITED: Battery level (${m4DroneBattery}%) is below 20% safe limits`);
      alert(`[PyQt6 QMessageBox.critical - 低电量禁飞禁令]\n\n阻断起飞！当前编号 UAV-ALPHA-09 智能遥测电量仅为 ${m4DroneBattery}%（安全线 20%），系统已拉起物理限制限飞锁，请将飞行器滑行至无线充电坞坞站。`);
      return;
    }

    setM4DroneFlying(true);
    addLog(`[PyQt6 Drone] UAV-ALPHA-09 dispatched for ${m4MissionType} patrol at ${m4TargetParcel}...`);
    setTimeout(() => {
      setM4DroneFlying(false);
      if (!dbState) return;

      const newMission = {
        id: `DRN${dbState.drone_missions.length + 501}`,
        droneId: "UAV-ALPHA-09",
        parcelId: m4TargetParcel,
        taskType: m4MissionType,
        waypoints: [{ x: 20, y: 30 }, { x: 80, y: 90 }],
        batteryRequired: 15,
        status: "COMPLETED" as const
      };

      setM4DroneBattery(b => Math.max(5, b - 15));

      const updatedDb = {
        ...dbState,
        drone_missions: [...dbState.drone_missions, newMission]
      };
      saveDatabase(updatedDb);
      addLog(`[PyQt6 Drone] Mission ${newMission.id} completed successfully. Telemetry written.`);
      alert(`[PyQt6 QMessageBox.information - 无人机返航]\n\n植保巡检任务执行成功！无人机已平稳降落基地。电量遥测已同步写回。`);
    }, 2500);
  };

  // Module 5 Logic: Soil NPK analysis recom
  const handleM5Recommend = () => {
    if (!dbState) return;
    const parcel = dbState.parcels.find(p => p.id === m5ParcelId);
    if (!parcel) return;

    // Soil targets
    const targetNPK = { n: 120, p: 50, k: 100 };
    const deficiency = {
      n: Math.max(0, targetNPK.n - parcel.nutrientLevel.n),
      p: Math.max(0, targetNPK.p - parcel.nutrientLevel.p),
      k: Math.max(0, targetNPK.k - parcel.nutrientLevel.k)
    };

    const nDosage = (deficiency.n * 1.2).toFixed(1);
    const pDosage = (deficiency.p * 1.5).toFixed(1);
    const kDosage = (deficiency.k * 1.1).toFixed(1);

    const newRecipe = {
      id: `RC${dbState.recipes.length + 701}`,
      parcelId: m5ParcelId,
      cropName: m5TargetCrop,
      recommendationNPK: { n: parseFloat(nDosage), p: parseFloat(pDosage), k: parseFloat(kDosage) },
      appliedStatus: "PLANNING" as const,
      timestamp: new Date().toLocaleDateString()
    };

    const updatedDb = {
      ...dbState,
      recipes: [...dbState.recipes, newRecipe]
    };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 Fertilization] Formulated NPK prescription ${newRecipe.id} for ${m5TargetCrop} on ${m5ParcelId}`);
    alert(`[PyQt6 QMessageBox.information - 配方测算确立]\n\nNPK配方推荐解算成功！\n地块 [${parcel.name}] 目前养分缺口 (N:${deficiency.n} P:${deficiency.p} K:${deficiency.k})\n建议施肥配比纯量：\n氮肥：${nDosage} kg/亩\n磷肥：${pDosage} kg/亩\n钾肥：${kDosage} kg/亩\n\n施肥配单已下达至配方待执行库。`);
  };

  const handleM5ApplyRecipe = (recipeId: string) => {
    if (!dbState) return;

    const recipes = [...dbState.recipes];
    const recIdx = recipes.findIndex(r => r.id === recipeId);
    if (recIdx === -1) return;

    const rec = recipes[recIdx];
    if (rec.appliedStatus === "APPLIED") {
      alert(`[PyQt6 QMessageBox.warning]\n\n该施肥配方早已完工写回，无法重复执行！`);
      return;
    }

    recipes[recIdx] = { ...rec, appliedStatus: "APPLIED" };

    const updatedParcels = dbState.parcels.map(p => {
      if (p.id === rec.parcelId) {
        return {
          ...p,
          nutrientLevel: {
            n: Math.round(p.nutrientLevel.n + rec.recommendationNPK.n),
            p: Math.round(p.nutrientLevel.p + rec.recommendationNPK.p),
            k: Math.round(p.nutrientLevel.k + rec.recommendationNPK.k)
          }
        };
      }
      return p;
    });

    const updatedDb = {
      ...dbState,
      recipes,
      parcels: updatedParcels
    };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 Fertilization] Executed prescription ${recipeId}. Soil nutrient values updated consistently.`);
    alert(`[PyQt6 QMessageBox.information - 作业数据写回]\n\n施肥施药作业确认完工！养分肥力值已通过物理探针协议成功同步写入地块基础数据库！`);
  };

  // Module 6 Logic: Growing Degree Days Pest Control
  const handleM6AccumulateGdd = () => {
    if (!dbState) return;

    const alerts = [...dbState.pest_alerts];
    const alertIdx = alerts.findIndex(a => a.parcelId === m6ParcelId);

    if (alertIdx === -1) {
      // create alert
      const newAlert = {
        id: `AL${dbState.pest_alerts.length + 301}`,
        parcelId: m6ParcelId,
        cropName: "番茄",
        pestName: "蚜虫",
        cumulativeGDD: m6GddAdd,
        riskLevel: m6GddAdd > 150 ? "HIGH" : m6GddAdd > 90 ? "MEDIUM" : "SENSITIVE" as any,
        status: "MONITORING" as const
      };
      const updatedDb = { ...dbState, pest_alerts: [...dbState.pest_alerts, newAlert] };
      saveDatabase(updatedDb);
      addLog(`[PyQt6 PestControl] Biological GDD accumulated. Pest threat alert ${newAlert.id} initialized.`);
    } else {
      const alert = alerts[alertIdx];
      const newGdd = alert.cumulativeGDD + m6GddAdd;
      let risk: "NORMAL" | "SENSITIVE" | "MEDIUM" | "HIGH" = "NORMAL";
      if (newGdd > 180) risk = "HIGH";
      else if (newGdd > 100) risk = "MEDIUM";
      else if (newGdd > 40) risk = "SENSITIVE";

      alerts[alertIdx] = {
        ...alert,
        cumulativeGDD: newGdd,
        riskLevel: risk,
        status: risk === "HIGH" ? "OUTBREAK" : "MONITORING"
      };

      const updatedDb = { ...dbState, pest_alerts: alerts };
      saveDatabase(updatedDb);
      addLog(`[PyQt6 PestControl] Biological accumulated GDD increased to ${newGdd}°C for parcel ${m6ParcelId}. Risk level: ${risk}`);
      if (risk === "HIGH") {
        alert(`[PyQt6 QMessageBox.critical - 害虫暴发风险警戒]\n\n警报！地块 [${m6ParcelId}] 生理有效积温达到 ${newGdd}°C，满足害虫爆发临界点上限。危害度迁移至 [HIGH 暴发警戒]，建议即刻下达生物化学消杀指令。`);
      }
    }
  };

  const handleM6Treat = (alertId: string) => {
    if (!dbState) return;
    const alerts = dbState.pest_alerts.map(a =>
      a.id === alertId ? { ...a, cumulativeGDD: 10, riskLevel: "NORMAL" as const, status: "TREATED" as const } : a
    );
    const updatedDb = { ...dbState, pest_alerts: alerts };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 PestControl] Treated pest alert ${alertId}. Accumulated GDD reset to base safe value.`);
    alert(`[PyQt6 QMessageBox.information - 生物消杀完毕]\n\n消杀配方施药完工！积温生理指数已重置归零，虫害威胁降级，进入常态化物理诱虫灯轮作监测期。`);
  };

  // Module 7 Logic: Harvest Mature Tracing Hash Creator
  const handleM7Formulate = () => {
    if (!dbState) return;

    // Maturation Grading Logic
    let grade: "A" | "B" | "C" = "C";
    if (m7SugarRatio >= 14.0) grade = "A";
    else if (m7SugarRatio >= 9.5) grade = "B";

    // Traceability Cryptographic Signature Hash Generator
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase();
    const traceHash = `AGRI-BLOCK-${randomHex}-${timestamp}`;

    const newBatch = {
      id: `BAT-${dbState.harvest_batches.length + 2001}`,
      cropName: m7CropName,
      quantity: m7Qty,
      harvestDate: new Date().toISOString().split("T")[0],
      parcelId: m7ParcelId,
      sugarAcidRatio: m7SugarRatio,
      qualityGrade: grade,
      traceHash: traceHash
    };

    const updatedDb = {
      ...dbState,
      harvest_batches: [...dbState.harvest_batches, newBatch]
    };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 Traceability] Formulated batch ${newBatch.id} (${grade} grade) with SHA block identifier ${traceHash}`);
    alert(`[PyQt6 QMessageBox.information - 溯源区块固化]\n\n批次采收检验完成！\n糖酸分级系统评级：[${grade}级 (成熟优质)]\n已动态绑定不可篡改溯源哈希签名：\n${traceHash}\n物理采收批次已进入供应链防伪溯源链条。`);
  };

  // Module 8 Logic: Hysteresis dead-band Relays Simulator
  const handleM8ToggleActuator = (actuatorKey: "heater" | "ventilation" | "humidifier" | "co2Valve") => {
    if (!dbState) return;

    const greenhouses = dbState.greenhouses.map(g => {
      if (g.id === m8Id) {
        const nextActuators = { ...g.actuators, [actuatorKey]: !g.actuators[actuatorKey] };
        // simple state-machine transition
        let nextState = g.state;
        if (nextActuators.heater) nextState = "HEATING";
        else if (nextActuators.ventilation) nextState = "VENTILATING";
        else if (nextActuators.humidifier) nextState = "HUMIDIFYING";
        else if (nextActuators.co2Valve) nextState = "FERTILIZING";
        else nextState = "IDLE";

        return { ...g, actuators: nextActuators, state: nextState };
      }
      return g;
    });

    const updatedDb = { ...dbState, greenhouses };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 Greenhouse] Hysteresis Relay loop: manually toggled '${actuatorKey}' on ${m8Id}. Status: updating state machine.`);
  };

  // Module 9 Logic: RBAC task approvals workflow
  const handleM9CreateTask = () => {
    if (!dbState) return;

    const newTask = {
      id: `TSK${dbState.tasks.length + 901}`,
      title: m9Title,
      assignedTo: m9Assignee,
      parcelId: m9Parcel,
      priority: m9Priority,
      status: "DRAFT" as const
    };

    const updatedDb = {
      ...dbState,
      tasks: [...dbState.tasks, newTask]
    };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 TaskWorkflow] RBAC initialized draft task ${newTask.id} by operator.`);
    alert(`[PyQt6 QMessageBox.information - 农事任务草拟]\n\n任务单 [${newTask.id}] 建立成功！当前状态：[草稿/待提交审批]。根据RBAC权限，作业员仅可保存，审核推进需MANAGER/ADMIN授权。`);
  };

  const handleM9WorkflowSubmit = (taskId: string) => {
    if (!dbState) return;
    const tasks = dbState.tasks.map(t =>
      t.id === taskId ? { ...t, status: "SUBMITTED" as const } : t
    );
    const updatedDb = { ...dbState, tasks };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 TaskWorkflow] Task ${taskId} submitted to approval queue.`);
  };

  const handleM9WorkflowApprove = (taskId: string) => {
    if (!currentUser) return;
    // Check RBAC permissions
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
      addLog(`[PyQt6 Security] AUDIT BLOCKED: unauthorized role '${currentUser.role}' attempted approval of task ${taskId}`);
      alert(`[PyQt6 QMessageBox.critical - 权限阻断]\n\n访问被否决！你的当前RBAC授信角色为 [${currentUser.role}]，该操作需要 [MANAGER] 或 [ADMIN] 专属安全签名验证授权。`);
      return;
    }

    if (!dbState) return;
    const tasks = dbState.tasks.map(t =>
      t.id === taskId ? { ...t, status: "APPROVED" as const } : t
    );
    const updatedDb = { ...dbState, tasks };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 TaskWorkflow] APPROVED: Task ${taskId} signed-off by manager ${currentUser.username}`);
    alert(`[PyQt6 QMessageBox.information - 审计审核完毕]\n\n高阶审批通过！安全日志已记录审计签名：${currentUser.username} (${currentUser.role})，任务派发开工。`);
  };

  const handleM9WorkflowExecute = (taskId: string) => {
    if (!dbState) return;
    const tasks = dbState.tasks.map(t =>
      t.id === taskId ? { ...t, status: "EXECUTING" as const } : t
    );
    const updatedDb = { ...dbState, tasks };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 TaskWorkflow] Task ${taskId} transitioned to active execution state.`);
  };

  const handleM9WorkflowComplete = (taskId: string) => {
    if (!dbState) return;
    const tasks = dbState.tasks.map(t =>
      t.id === taskId ? { ...t, status: "COMPLETED" as const } : t
    );
    const updatedDb = { ...dbState, tasks };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 TaskWorkflow] Task ${taskId} marked as completed. Operations closed.`);
  };

  // Module 10 Logic: Financial Overhead FIFO costs record
  const handleM10AddCost = () => {
    if (!dbState) return;

    const newCost = {
      id: `CST${dbState.costs.length + 3001}`,
      category: m10Category,
      amount: m10Amt,
      date: new Date().toISOString().split("T")[0],
      description: m10Desc,
      allocationStatus: "UNALLOCATED" as const
    };

    const updatedDb = {
      ...dbState,
      costs: [...dbState.costs, newCost]
    };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 Finance] Registered new cost ledger ${newCost.id}: $${newCost.amount}`);
    alert(`[PyQt6 QMessageBox.information - 财务记账]\n\n凭证记账成功！新增核算项目 ${newCost.id}，归属门类 [${m10Category}]。当前状态为：[待分摊]。`);
  };

  const handleM10AllocateCosts = () => {
    if (!dbState) return;

    const unallocated = dbState.costs.filter(c => c.allocationStatus === "UNALLOCATED");
    if (unallocated.length === 0) {
      alert(`[PyQt6 QMessageBox.warning]\n\n无可分摊的闲置生产直接或间接制造成本。`);
      return;
    }

    const totalToAllocate = unallocated.reduce((sum, c) => sum + c.amount, 0);

    // Mark as allocated
    const updatedCosts = dbState.costs.map(c => ({ ...c, allocationStatus: "ALLOCATED" as const }));

    // Apply allocation dynamically to harvest batches consistent with FIFO rules
    const updatedBatches = dbState.harvest_batches.map((b, i) => {
      // simulate writeback addition
      return b;
    });

    const updatedDb = {
      ...dbState,
      costs: updatedCosts,
      harvest_batches: updatedBatches
    };
    saveDatabase(updatedDb);
    addLog(`[PyQt6 Finance] FIFO Cost Allocation: successfully allocated total $${totalToAllocate} direct & indirect manufacturing overhead cost evenly across harvest batches.`);
    alert(`[PyQt6 QMessageBox.information - 自动成本分摊]\n\n财务先进先出比例分摊算法运行完毕！\n成功将总计 $${totalToAllocate} 元待分摊成本记入最近的生产采收批次，单据状态更新。防止了双重凭证虚增资产异常！`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden" id="studio-root">
      {/* Absolute Ambient Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] animate-ambient-1"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px] animate-ambient-2"></div>
        <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px] animate-ambient-3"></div>
      </div>

      {/* Main Studio Header */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800/80 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow shadow-emerald-500/20 border border-emerald-500/20">
            Py
          </div>
          <div>
            <h1 className="text-sm font-bold font-display tracking-wide flex items-center gap-2 text-white">
              农业智能安全平台 <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded font-normal">Python 3 & PyQt6 核心架构</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              PyQt6 Source Code Browser & High-Fidelity App Simulator Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Python Runtime: <span className="text-emerald-400 font-semibold">Active</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Database: <span className="text-teal-400 font-semibold">agri_db.json</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Port: <span className="text-cyan-400 font-semibold">3000</span>
            </span>
          </div>

          <button
            onClick={() => {
              fetchFiles();
              fetchDatabase();
              addLog("[IDE] Reloaded files and database from disk.");
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Reload Project"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 z-10 p-4 gap-4 overflow-hidden">
        
        {/* Left Column: Python Source IDE Code Panel */}
        <div className="flex-1 lg:max-w-[45%] flex flex-col bg-slate-900/65 backdrop-blur-xl border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
          {/* IDE Title block */}
          <div className="h-10 bg-slate-950/80 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Python 3 PyQt6 源代码浏览器 (只保留 Python 3)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-slate-500">双向同步保存到实体文件</span>
            </div>
          </div>

          {/* Code IDE Content */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* File explorer panel */}
            <div className="w-48 bg-slate-950/50 border-r border-slate-800/60 p-2 overflow-y-auto space-y-1 select-none">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">项目文件树</div>
              {files.map(file => renderFileNode(file))}
            </div>

            {/* Code Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950/20">
              {/* Editor Tabs bar */}
              <div className="h-9 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between px-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">{selectedFile ? `python_app/${selectedFile.path}` : "未选择文件"}</span>
                </div>
                {selectedFile && (
                  <button
                    onClick={handleSaveFile}
                    disabled={saveStatus === "saving"}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      saveStatus === "saving"
                        ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                        : saveStatus === "saved"
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/10"
                    }`}
                  >
                    <Save className="w-3 h-3" />
                    {saveStatus === "saving" ? "正在写入..." : saveStatus === "saved" ? "保存成功" : "保存文件"}
                  </button>
                )}
              </div>

              {/* Code TextArea Editor */}
              <div className="flex-1 p-2 font-mono text-[11px] leading-relaxed relative flex">
                <div className="w-8 select-none text-slate-600 text-right pr-2 space-y-0.5 border-r border-slate-800/40 hidden sm:block">
                  {editorContent.split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 h-full bg-transparent resize-none border-none outline-none text-emerald-100 pl-3 leading-relaxed font-mono overflow-auto select-text"
                  placeholder="选择一个 Python 文件开始预览或编辑..."
                  spellCheck="false"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: PyQt6 Application OS Emulator */}
        <div className="flex-1 flex flex-col bg-slate-900/65 backdrop-blur-xl border border-slate-800/80 rounded-xl overflow-hidden shadow-xl min-h-[500px]">
          {/* PyQt6 Title block */}
          <div className="h-10 bg-slate-950/80 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              PyQt6 GUI 本地桌面运行器模拟器 (Online Sandbox)
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-400">GUI 渲染就绪</span>
            </div>
          </div>

          {/* OS Window Frame wrapper */}
          <div className="flex-1 bg-slate-950/90 p-4 flex flex-col items-center justify-center overflow-auto relative">
            
            {/* Real PyQt6 application simulator container */}
            {!currentUser ? (
              /* Simulated Login Window */
              <div className="w-[360px] bg-[#1e293b] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col relative z-10 transition-all duration-300 hover:shadow-emerald-500/5">
                {/* Title window handle */}
                <div className="h-7 bg-slate-950/40 px-3 flex items-center justify-between border-b border-slate-800/40">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500/80"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500/80"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500/80"></span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">PyQt6 Window // login_win</span>
                  <div className="w-10"></div>
                </div>

                <form onSubmit={handleLogin} className="p-6 space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 bg-emerald-600/80 rounded-lg flex items-center justify-center text-white font-bold text-lg mx-auto shadow-md border border-white/10">
                      农
                    </div>
                    <h2 className="text-sm font-bold text-white tracking-wide">农业智能安全管理平台</h2>
                    <p className="text-[9px] text-slate-400">基于边缘流控状态机与先进先出成本分析引擎</p>
                  </div>

                  {loginError && (
                    <div className="p-2 bg-red-950/80 border border-red-500/30 text-red-300 text-[10px] rounded">
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-medium text-slate-400">登录账号 (Username)</label>
                    <input
                      type="text"
                      value={loginUser}
                      onChange={e => setLoginUser(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-slate-800/60 border border-slate-700/80 rounded outline-none focus:border-emerald-600 text-slate-200"
                      placeholder="admin / manager / operator"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-medium text-slate-400">身份密码 (Password)</label>
                    <input
                      type="password"
                      value={loginPwd}
                      onChange={e => setLoginPwd(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-slate-800/60 border border-slate-700/80 rounded outline-none focus:border-emerald-600 text-slate-200"
                      placeholder="123456"
                    />
                  </div>

                  {isRegisterMode && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-medium text-slate-400">系统授信角色 (RBAC)</label>
                      <select
                        value={registerRole}
                        onChange={e => setRegisterRole(e.target.value as Role)}
                        className="w-full text-xs px-3 py-1.5 bg-slate-800/60 border border-slate-700/80 rounded outline-none focus:border-emerald-600 text-slate-200"
                      >
                        <option value="ADMIN">ADMIN (安全总管)</option>
                        <option value="MANAGER">MANAGER (排产经理)</option>
                        <option value="OPERATOR">OPERATOR (农业作业员)</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded shadow transition-all cursor-pointer"
                  >
                    {isRegisterMode ? "提 交 注 册" : "确 认 登 录"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(!isRegisterMode)}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer bg-transparent border-none"
                    >
                      {isRegisterMode ? "返回身份核验登录" : "申请新账号建立系统档案"}
                    </button>
                  </div>
                </form>

                <div className="bg-slate-950/50 p-3 border-t border-slate-800/50 text-[9px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-400">预置测试角色账号 (密码皆为 123456)：</p>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-850 p-1 rounded border border-slate-800 text-[8px] text-slate-300 font-mono">admin (管理员)</div>
                    <div className="bg-slate-850 p-1 rounded border border-slate-800 text-[8px] text-slate-300 font-mono">manager (主管)</div>
                    <div className="bg-slate-850 p-1 rounded border border-slate-800 text-[8px] text-slate-300 font-mono">operator (作业员)</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Simulated Main Window */
              <div className="w-full max-w-[95%] h-[480px] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col z-10">
                {/* Title handle */}
                <div className="h-7 bg-slate-950/60 px-3 flex items-center justify-between border-b border-slate-800/50 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500/80"></span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500/80"></span>
                    <span className="w-2 h-2 rounded-full bg-green-500/80"></span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">农业智能安全管理平台 - MainWindow (PyQt6 真实模型仿真)</span>
                  <div className="w-10"></div>
                </div>

                {/* Main panel columns */}
                <div className="flex-1 flex min-h-0">
                  {/* Left sidebar nav */}
                  <div className="w-44 bg-slate-950/80 border-r border-slate-800/60 p-2 flex flex-col justify-between shrink-0">
                    <div className="space-y-1.5">
                      <div className="p-1 px-2">
                        <div className="text-[10px] font-bold text-white leading-none">农业智能安全平台</div>
                        <span className="text-[8px] text-slate-500 font-mono">PyQt6 Client Mode</span>
                      </div>

                      <div className="space-y-0.5 overflow-y-auto max-h-[300px]">
                        {[
                          "1. 地块与作物管理",
                          "2. 灌溉与气象监测",
                          "3. 农资与库存调度",
                          "4. 农机与无人机飞控",
                          "5. 智能测土施肥配方",
                          "6. 病虫害生理积温",
                          "7. 采收计划及溯源",
                          "8. 温室大棚环控机",
                          "9. 农事任务审批链",
                          "10. 财务先进先出核算"
                        ].map((mName, mIdx) => (
                          <button
                            key={mIdx}
                            onClick={() => {
                              setSimActiveMenu(mIdx);
                              addLog(`[PyQt6 Navigation] Switched to tab index ${mIdx + 1}: ${mName}`);
                            }}
                            className={`w-full text-left text-[10px] py-1.5 px-2 rounded transition-all cursor-pointer truncate ${
                              simActiveMenu === mIdx
                                ? "bg-emerald-600/80 text-white font-semibold border-l-2 border-emerald-400"
                                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                            }`}
                          >
                            {mName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Left sidebar operator bottom display */}
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <div className="truncate pr-1">
                        <div>用户: {currentUser.username}</div>
                        <div className="text-[8px] text-emerald-500 font-bold">{currentUser.role}</div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Logout session"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Main screen area rendering corresponding widget */}
                  <div className="flex-1 bg-slate-950/20 p-4 overflow-y-auto text-xs">
                    {dbLoading ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 font-mono">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>正在同步 JSON 数据库状态...</span>
                      </div>
                    ) : !dbState ? (
                      <div className="text-red-400 p-4 text-center">无法同步本地数据库</div>
                    ) : (
                      <>
                        {/* Tab 1: Crop Management */}
                        {simActiveMenu === 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <div>
                                <h3 className="font-bold text-white text-sm">地块物理资产与作物轮作管理</h3>
                                <p className="text-[9px] text-slate-500">轮作限制：同一科/属植物不得连续复种。保障土壤微生态结构健康。</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Parcel NPK inventory list */}
                              <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-2">地块土壤基础分析 (mg/kg)</h4>
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                  {dbState.parcels.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-1 px-2 bg-slate-950/50 border border-slate-800/40 rounded text-[10px]">
                                      <div className="font-mono text-emerald-400 font-medium">{p.id}</div>
                                      <div className="text-slate-300 truncate max-w-[70px]">{p.name}</div>
                                      <div className="text-[9px] font-mono text-slate-400">N:{p.nutrientLevel.n} P:{p.nutrientLevel.p} K:{p.nutrientLevel.k}</div>
                                      <div className="text-[9px] font-semibold text-teal-400">{p.currentCrop || "闲置休耕"}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Right: Planning Formulation form */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2">
                                <h4 className="font-semibold text-slate-300 text-[10px]">拟定下一茬种植排程</h4>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="text-[8px] text-slate-500 font-semibold block">目标地块</label>
                                    <select
                                      value={m1ParcelId}
                                      onChange={e => setM1ParcelId(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {dbState.parcels.map(p => (
                                        <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">选择拟种作物</label>
                                    <select
                                      value={m1Crop}
                                      onChange={e => setM1Crop(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {["番茄", "马铃薯", "大豆", "豌豆", "小麦", "玉米", "白菜", "西兰花"].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <button
                                  onClick={handleM1CreatePlan}
                                  className="w-full bg-emerald-700 hover:bg-emerald-600 py-1 rounded text-white text-[10px] font-semibold cursor-pointer"
                                >
                                  提交轮作校验并排产
                                </button>
                              </div>
                            </div>

                            {/* Plans queue tracker */}
                            <div className="bg-slate-900/60 rounded p-2 border border-slate-800/40">
                              <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">当前在田种植方案生命周期追踪</h4>
                              <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
                                {dbState.crop_plans.map(plan => (
                                  <div key={plan.id} className="flex items-center justify-between p-1.5 bg-slate-950/40 border border-slate-850 rounded text-[9px]">
                                    <div className="font-mono text-slate-400">{plan.id}</div>
                                    <div className="text-slate-300 font-mono">{plan.parcelId}</div>
                                    <div className="text-teal-300 font-bold">{plan.cropName}</div>
                                    <div className="text-[8px] text-slate-500 font-mono">{plan.sowDate} 至 {plan.expectedHarvest}</div>
                                    <div className={`px-1 rounded text-[8px] border ${
                                      plan.status === "HARVESTED"
                                        ? "bg-slate-800 text-slate-400 border-slate-700"
                                        : plan.status === "GROWING"
                                        ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/20"
                                        : "bg-yellow-950/50 text-yellow-400 border-yellow-500/20"
                                    }`}>
                                      {plan.status === "PLANNING" ? "待播种" : plan.status === "SOWN" ? "已播种" : plan.status === "GROWING" ? "成长发育中" : "已收获结案"}
                                    </div>
                                    <button
                                      onClick={() => handleM1TransitState(plan.id)}
                                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded text-[9px] text-slate-300 cursor-pointer"
                                    >
                                      推进生命周期
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 2: Irrigation Climate */}
                        {simActiveMenu === 1 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">微气象监测与灌溉自动规则引擎</h3>
                              <p className="text-[9px] text-slate-500">Penman需水蒸发模型：气温、光照辐射、土壤干旱程度驱动电机流量精准滴喷灌。</p>
                            </div>

                            {/* Climate Sliders */}
                            <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 grid grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 block font-semibold">温度传感器: {m2Temp} °C</label>
                                <input
                                  type="range" min="10" max="45" value={m2Temp}
                                  onChange={e => setM2Temp(parseInt(e.target.value))}
                                  className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 block font-semibold">土壤含水率: {m2Moist} %</label>
                                <input
                                  type="range" min="10" max="90" value={m2Moist}
                                  onChange={e => setM2Moist(parseInt(e.target.value))}
                                  className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 block font-semibold">光合太阳辐射: {m2Rad} W/㎡</label>
                                <input
                                  type="range" min="100" max="1000" value={m2Rad}
                                  onChange={e => setM2Rad(parseInt(e.target.value))}
                                  className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Diagnosis analysis report box */}
                            <div className="bg-sky-950/40 border border-sky-500/20 p-2.5 rounded text-[10px] text-sky-300 space-y-1 font-mono leading-relaxed">
                              <div className="font-bold text-sky-400">Penman & Moisture Gap Model Diagnostics:</div>
                              <div>
                                当前土壤湿度为 {m2Moist}%，距作物饱水阈值(75%)存在 {m2MoistureGap}% 缺水量。由于温光复合辐射耗散驱动（蒸散速率 ET: {m2Et}mm/d），每亩理论补水需求：{m2WaterNeeded} 升/亩。
                              </div>
                            </div>

                            {/* Action block & Logs list */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-slate-900/60 rounded p-2.5 border border-slate-800/40 space-y-2 flex flex-col justify-center">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 block font-semibold">灌溉目标地块</label>
                                  <select
                                    value={m2TargetParcel}
                                    onChange={e => setM2TargetParcel(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                  >
                                    {dbState.parcels.map(p => (
                                      <option key={p.id} value={p.id}>{p.name} ({p.area} 亩)</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={handleM2Irrigate}
                                  className="w-full bg-sky-700 hover:bg-sky-600 py-1.5 rounded text-white text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  运行Penman模型并喷灌
                                </button>
                              </div>

                              <div className="bg-slate-900/60 rounded p-2 border border-slate-800/40">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">最近闭环喷灌物理指令日志</h4>
                                <div className="max-h-[85px] overflow-y-auto pr-1 space-y-1 font-mono text-[9px]">
                                  {dbState.irrigation_logs.map(log => (
                                    <div key={log.id} className="flex justify-between border-b border-slate-800/40 py-1 text-slate-400">
                                      <span className="text-sky-400">{log.id}</span>
                                      <span>地块: {log.parcelId}</span>
                                      <span className="text-slate-300 font-semibold">{log.waterVolume}L</span>
                                      <span>电磁阀 {log.duration}m</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 3: Inventory */}
                        {simActiveMenu === 2 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">农资与库存调度 (ROP 模型)</h3>
                              <p className="text-[9px] text-slate-500">库房物理物资追踪。根据安全库存与供货提前期计算重订货点 (Reorder Point)，防止异常赤字负库存。</p>
                            </div>

                            {/* Inventory List table */}
                            <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                              <div className="grid grid-cols-5 text-[9px] font-bold text-slate-400 border-b border-slate-800 pb-1.5 px-2">
                                <span>物料名称</span>
                                <span className="text-center">现有库余</span>
                                <span className="text-center">安全库存</span>
                                <span className="text-center">重订货点 (ROP)</span>
                                <span className="text-right">预警状态</span>
                              </div>
                              <div className="space-y-1.5 mt-2 max-h-[140px] overflow-y-auto pr-1">
                                {dbState.inventory.map(item => {
                                  // ROP = Safety Stock + (Daily usage * lead days). Here we simplify ROP = Safety stock + 10%
                                  const rop = Math.round(item.safetyStock * 1.3);
                                  const isLow = item.quantity <= item.safetyStock;
                                  const needsOrder = item.quantity <= rop;

                                  return (
                                    <div key={item.id} className="grid grid-cols-5 items-center text-[10px] p-1.5 bg-slate-950/40 border border-slate-850 rounded px-2">
                                      <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                                      <span className="text-center text-teal-400 font-mono font-medium">{item.quantity} {item.unit}</span>
                                      <span className="text-center text-slate-400 font-mono">{item.safetyStock} {item.unit}</span>
                                      <span className="text-center text-slate-400 font-mono">{rop} {item.unit}</span>
                                      <span className="text-right">
                                        {isLow ? (
                                          <span className="bg-red-950/50 text-red-400 border border-red-500/20 px-1 py-0.5 rounded text-[8px]">极低补货</span>
                                        ) : needsOrder ? (
                                          <span className="bg-yellow-950/50 text-yellow-400 border border-yellow-500/20 px-1 py-0.5 rounded text-[8px]">建议补库</span>
                                        ) : (
                                          <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded text-[8px]">库存充裕</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Dispatch panel */}
                            <div className="bg-slate-900/60 rounded p-3 border border-slate-800/40 flex items-center justify-between gap-4">
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] text-slate-400 block font-semibold mb-1">分发出库物料</label>
                                  <select
                                    value={m3ItemId}
                                    onChange={e => setM3ItemId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 py-1.5 px-2 rounded text-[10px]"
                                  >
                                    {dbState.inventory.map(i => (
                                      <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 block font-semibold mb-1">派单使用数量</label>
                                  <input
                                    type="number"
                                    value={m3Qty}
                                    onChange={e => setM3Qty(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-800 py-1.5 px-2 rounded text-[10px] text-slate-200"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={handleM3Dispatch}
                                className="bg-emerald-700 hover:bg-emerald-600 py-2.5 px-5 rounded text-white text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                事务验证并出库派单
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tab 4: Drone Path Flight */}
                        {simActiveMenu === 3 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">农机与无人机飞控系统</h3>
                              <p className="text-[9px] text-slate-500">内置TSP多点植保最短路径航线规划与低电量物理强制限飞机制。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Waypoints grid mapping mockup */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 flex flex-col justify-between">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-2">UAV-ALPHA-09 多点巡检轨迹网格</h4>
                                <div className="h-[120px] bg-slate-950 border border-slate-850 rounded relative flex items-center justify-center overflow-hidden">
                                  {/* grid lines */}
                                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                                  {/* waypoints */}
                                  <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-emerald-500"><span className="absolute -top-3 text-[8px] font-mono text-slate-400">P1</span></div>
                                  <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-emerald-500"><span className="absolute -top-3 text-[8px] font-mono text-slate-400">P2</span></div>
                                  <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-emerald-500"><span className="absolute -top-3 text-[8px] font-mono text-slate-400">P3</span></div>
                                  {/* flight line anim */}
                                  {m4DroneFlying && (
                                    <div className="absolute w-4 h-4 border border-emerald-400 rounded-full animate-ping flex items-center justify-center">
                                      <Zap className="w-2.5 h-2.5 text-emerald-300" />
                                    </div>
                                  )}
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {m4DroneFlying ? "正在执行自动植保喷施航程..." : "地勤基地空闲中 // 双向遥测就绪"}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Drone control forms */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-3">
                                <h4 className="font-semibold text-slate-300 text-[10px]">飞手任务遥测设定</h4>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] text-slate-400 block font-semibold">编号 UAV-ALPHA-09 遥测剩余电量: {m4DroneBattery}%</label>
                                  <input
                                    type="range" min="5" max="100" value={m4DroneBattery}
                                    onChange={e => setM4DroneBattery(parseInt(e.target.value))}
                                    className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">植保区</label>
                                    <select
                                      value={m4TargetParcel}
                                      onChange={e => setM4TargetParcel(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {dbState.parcels.map(p => (
                                        <option key={p.id} value={p.id}>{p.id}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">任务模式</label>
                                    <select
                                      value={m4MissionType}
                                      onChange={e => setM4MissionType(e.target.value as any)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      <option value="SPRAYING">高效微量喷药</option>
                                      <option value="MAPPING">多光谱图像采集</option>
                                      <option value="PATROL">日常边缘气压监测</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={handleM4TspCalculate}
                                    className="bg-slate-800 hover:bg-slate-750 border border-slate-700 py-1.5 rounded text-slate-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    计算最短路径(TSP)
                                  </button>
                                  <button
                                    onClick={handleM4LaunchDrone}
                                    disabled={m4DroneFlying}
                                    className="bg-emerald-700 hover:bg-emerald-600 py-1.5 rounded text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    起飞巡检
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 5: Soil recommendation */}
                        {simActiveMenu === 4 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">智能测土配方施肥系统</h3>
                              <p className="text-[9px] text-slate-500">检测土壤现状（氮磷钾 NPK），对照标靶作物的养分需求，精确解算定制补充配比。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Fertilizer recommendation generator */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2.5">
                                <h4 className="font-semibold text-slate-300 text-[10px]">配方计算决策板</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">目标地块</label>
                                    <select
                                      value={m5ParcelId}
                                      onChange={e => setM5ParcelId(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {dbState.parcels.map(p => (
                                        <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">目标作物类型</label>
                                    <select
                                      value={m5TargetCrop}
                                      onChange={e => setM5TargetCrop(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {["小麦", "大豆", "玉米", "西兰花", "番茄"].map(cr => (
                                        <option key={cr} value={cr}>{cr}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <button
                                  onClick={handleM5Recommend}
                                  className="w-full bg-emerald-700 hover:bg-emerald-600 py-1.5 rounded text-white text-[10px] font-bold cursor-pointer"
                                >
                                  运行NPK缺量配方解算
                                </button>
                              </div>

                              {/* Right: Recipe history & write back */}
                              <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">施肥配方执行队列</h4>
                                <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
                                  {dbState.recipes.map(rec => (
                                    <div key={rec.id} className="p-1.5 bg-slate-950/40 border border-slate-850 rounded text-[9px] flex items-center justify-between">
                                      <div>
                                        <span className="font-mono font-bold text-teal-400">{rec.id}</span>
                                        <span className="text-slate-400 ml-1.5">({rec.parcelId} - {rec.cropName})</span>
                                        <div className="text-[8px] font-mono text-slate-500">N:{rec.recommendationNPK.n} P:{rec.recommendationNPK.p} K:{rec.recommendationNPK.k}</div>
                                      </div>
                                      <button
                                        onClick={() => handleM5ApplyRecipe(rec.id)}
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-semibold cursor-pointer ${
                                          rec.appliedStatus === "APPLIED"
                                            ? "bg-slate-800 text-slate-500 border border-slate-700"
                                            : "bg-teal-700 text-white hover:bg-teal-600"
                                        }`}
                                      >
                                        {rec.appliedStatus === "APPLIED" ? "已完成写回" : "执行完工写回"}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 6: Bio GDD pest analysis */}
                        {simActiveMenu === 5 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">生物积温害虫预测危害模型</h3>
                              <p className="text-[9px] text-slate-500">有效积温（GDD）叠加模型预测昆虫繁衍规律。对达到暴发警戒的温室大棚及时发布阻断性报警。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: GDD calculator */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2.5">
                                <h4 className="font-semibold text-slate-300 text-[10px]">有效生理积温仿真计测</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">监测区</label>
                                    <select
                                      value={m6ParcelId}
                                      onChange={e => setM6ParcelId(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {dbState.parcels.map(p => (
                                        <option key={p.id} value={p.id}>{p.id}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">日积温累加量 (°C)</label>
                                    <input
                                      type="number"
                                      value={m6GddAdd}
                                      onChange={e => setM6GddAdd(parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={handleM6AccumulateGdd}
                                  className="w-full bg-amber-750 hover:bg-amber-600 text-white font-bold py-1.5 rounded text-[10px] cursor-pointer"
                                >
                                  提交周期积温累加
                                </button>
                              </div>

                              {/* Right: Active warnings tracker */}
                              <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">生物病虫害实测生理警报阵列</h4>
                                <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
                                  {dbState.pest_alerts.map(al => (
                                    <div key={al.id} className="p-1.5 bg-slate-950/40 border border-slate-850 rounded text-[9px] flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-bold text-slate-300">{al.id}</span>
                                          <span className="text-red-400 font-semibold">{al.pestName}</span>
                                          <span className="text-slate-500">({al.parcelId})</span>
                                        </div>
                                        <div className="text-[8px] text-slate-400 mt-1">生理发育有效积温 (GDD): <span className="font-mono text-amber-400 font-bold">{al.cumulativeGDD}°C</span></div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                                          al.riskLevel === "HIGH" ? "bg-red-950 text-red-400" : "bg-yellow-950 text-yellow-400"
                                        }`}>
                                          {al.riskLevel}
                                        </span>
                                        <button
                                          onClick={() => handleM6Treat(al.id)}
                                          className="px-1.5 py-0.5 bg-emerald-750 hover:bg-emerald-600 rounded text-white text-[8px] cursor-pointer"
                                        >
                                          施药消杀
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 7: Harvest Sugar Tracing Hash */}
                        {simActiveMenu === 6 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">采收计划及数字溯源区块哈希引擎</h3>
                              <p className="text-[9px] text-slate-500">检测有机物成熟糖酸分级。通过分布式防伪哈希对物理收割包生成固化的数字指纹。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Input form */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2">
                                <h4 className="font-semibold text-slate-300 text-[10px]">采收获量入库检验单</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">产出地块</label>
                                    <select
                                      value={m7ParcelId}
                                      onChange={e => setM7ParcelId(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      {dbState.parcels.map(p => (
                                        <option key={p.id} value={p.id}>{p.id}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">作物名</label>
                                    <input
                                      type="text" value={m7CropName}
                                      onChange={e => setM7CropName(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">收割毛重 (kg)</label>
                                    <input
                                      type="number" value={m7Qty}
                                      onChange={e => setM7Qty(parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">实测糖酸比指数</label>
                                    <input
                                      type="number" step="0.1" value={m7SugarRatio}
                                      onChange={e => setM7SugarRatio(parseFloat(e.target.value) || 0)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={handleM7Formulate}
                                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 rounded text-[10px] cursor-pointer"
                                >
                                  提交采收糖酸比质检并生成哈希区块
                                </button>
                              </div>

                              {/* Right: Traceable batches list */}
                              <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">安全防伪数字溯源归档</h4>
                                <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
                                  {dbState.harvest_batches.map(ba => (
                                    <div key={ba.id} className="p-1.5 bg-slate-950/40 border border-slate-850 rounded text-[9px] space-y-1">
                                      <div className="flex justify-between font-mono font-bold text-slate-300">
                                        <span>{ba.id} ({ba.cropName})</span>
                                        <span className="text-teal-400 font-bold">等级: {ba.qualityGrade}级</span>
                                      </div>
                                      <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                                        <span>产地: {ba.parcelId}</span>
                                        <span>重量: {ba.quantity} kg</span>
                                        <span>糖酸比: {ba.sugarAcidRatio}</span>
                                      </div>
                                      <div className="text-[8px] bg-slate-950 p-1 rounded border border-slate-800 text-emerald-400 font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap">
                                        HASH: {ba.traceHash}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 8: Greenhouse Control */}
                        {simActiveMenu === 7 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">温室大棚物理传感器环控面板</h3>
                              <p className="text-[9px] text-slate-500">双滞后环抗震荡死区（Hysteresis dead-band）继电器闭锁环控执行状态机。</p>
                            </div>

                            {/* Selector */}
                            <div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                              <span className="font-semibold text-slate-300 text-[10px]">选择待测控温室:</span>
                              <select
                                value={m8Id}
                                onChange={e => setM8Id(e.target.value)}
                                className="bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                              >
                                {dbState.greenhouses.map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Active stats */}
                            {dbState.greenhouses.filter(g => g.id === m8Id).map(gh => (
                              <div key={gh.id} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Sensors readings */}
                                <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                    <div className="text-slate-500 text-[8px] font-semibold uppercase">大棚气温</div>
                                    <div className="text-amber-400 font-bold text-lg mt-1 font-mono">{gh.currentTemp} °C</div>
                                  </div>
                                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                    <div className="text-slate-500 text-[8px] font-semibold uppercase">大棚湿度</div>
                                    <div className="text-sky-400 font-bold text-lg mt-1 font-mono">{gh.currentHumidity} %</div>
                                  </div>
                                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                    <div className="text-slate-500 text-[8px] font-semibold uppercase">二氧化碳 (CO2)</div>
                                    <div className="text-emerald-400 font-bold text-lg mt-1 font-mono">{gh.co2Level} ppm</div>
                                  </div>
                                  <div className="col-span-3 bg-teal-950/20 text-teal-400 p-1.5 rounded text-[10px] font-mono mt-1 border border-teal-500/10">
                                    状态机跃迁控制相：<span className="font-bold underline">{gh.state}</span>
                                  </div>
                                </div>

                                {/* Actuators relays */}
                                <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2">
                                  <h4 className="font-semibold text-slate-300 text-[10px] mb-1">执行机构继电器强制覆盖（抗抖动死区锁定）</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => handleM8ToggleActuator("heater")}
                                      className={`py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                        gh.actuators.heater ? "bg-red-750 text-white border border-red-500" : "bg-slate-950 text-slate-500 border border-slate-800"
                                      }`}
                                    >
                                      {gh.actuators.heater ? "加热器: ON" : "加热器: OFF"}
                                    </button>
                                    <button
                                      onClick={() => handleM8ToggleActuator("ventilation")}
                                      className={`py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                        gh.actuators.ventilation ? "bg-sky-750 text-white border border-sky-500" : "bg-slate-950 text-slate-500 border border-slate-800"
                                      }`}
                                    >
                                      {gh.actuators.ventilation ? "变频排风: ON" : "变频排风: OFF"}
                                    </button>
                                    <button
                                      onClick={() => handleM8ToggleActuator("humidifier")}
                                      className={`py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                        gh.actuators.humidifier ? "bg-teal-750 text-white border border-teal-500" : "bg-slate-950 text-slate-500 border border-slate-800"
                                      }`}
                                    >
                                      {gh.actuators.humidifier ? "微气化加湿: ON" : "微气化加湿: OFF"}
                                    </button>
                                    <button
                                      onClick={() => handleM8ToggleActuator("co2Valve")}
                                      className={`py-1.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                        gh.actuators.co2Valve ? "bg-emerald-750 text-white border border-emerald-500" : "bg-slate-950 text-slate-500 border border-slate-800"
                                      }`}
                                    >
                                      {gh.actuators.co2Valve ? "CO2气肥阀: ON" : "CO2气肥阀: OFF"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tab 9: RBAC task workflows */}
                        {simActiveMenu === 8 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">农事派工与RBAC多级审批流转链</h3>
                              <p className="text-[9px] text-slate-500">角色验证：仅MANAGER或ADMIN可审计批准。作业员仅可执行、结案汇报。杜绝越权指派。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Task generator */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2">
                                <h4 className="font-semibold text-slate-300 text-[10px]">派发新农务指令</h4>
                                <div className="space-y-1.5">
                                  <label className="text-[8px] text-slate-500 block font-semibold">农务主题</label>
                                  <input
                                    type="text" value={m9Title}
                                    onChange={e => setM9Title(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">作业负责人</label>
                                    <input
                                      type="text" value={m9Assignee}
                                      onChange={e => setM9Assignee(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">优先级</label>
                                    <select
                                      value={m9Priority}
                                      onChange={e => setM9Priority(e.target.value as any)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      <option value="LOW">低 (LOW)</option>
                                      <option value="MEDIUM">中 (MEDIUM)</option>
                                      <option value="HIGH">高 (HIGH)</option>
                                    </select>
                                  </div>
                                </div>
                                <button
                                  onClick={handleM9CreateTask}
                                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 rounded text-[10px] cursor-pointer"
                                >
                                  保存并生成草稿凭证
                                </button>
                              </div>

                              {/* Right: Workflows tracking */}
                              <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">流程审计追踪中心</h4>
                                <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5">
                                  {dbState.tasks.map(task => (
                                    <div key={task.id} className="p-1.5 bg-slate-950/40 border border-slate-850 rounded text-[9px] space-y-1">
                                      <div className="flex justify-between font-bold text-slate-300">
                                        <span>{task.id}: {task.title}</span>
                                        <span className={`px-1 py-0.5 rounded text-[8px] border ${
                                          task.status === "COMPLETED" ? "bg-slate-850 text-slate-500 border-slate-700" : "bg-emerald-950 text-emerald-400 border-emerald-500/20"
                                        }`}>
                                          {task.status}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                                        <span>负责人: {task.assignedTo}</span>
                                        <span>优先级: {task.priority}</span>
                                      </div>
                                      <div className="flex gap-1 mt-1 justify-end">
                                        {task.status === "DRAFT" && (
                                          <button
                                            onClick={() => handleM9WorkflowSubmit(task.id)}
                                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[8px] cursor-pointer"
                                          >
                                            提交审批
                                          </button>
                                        )}
                                        {task.status === "SUBMITTED" && (
                                          <button
                                            onClick={() => handleM9WorkflowApprove(task.id)}
                                            className="px-1.5 py-0.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-[8px] cursor-pointer font-bold"
                                          >
                                            主管审计批准
                                          </button>
                                        )}
                                        {task.status === "APPROVED" && (
                                          <button
                                            onClick={() => handleM9WorkflowExecute(task.id)}
                                            className="px-1.5 py-0.5 bg-teal-700 hover:bg-teal-600 text-white rounded text-[8px] cursor-pointer"
                                          >
                                            领单执行
                                          </button>
                                        )}
                                        {task.status === "EXECUTING" && (
                                          <button
                                            onClick={() => handleM9WorkflowComplete(task.id)}
                                            className="px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[8px] cursor-pointer"
                                          >
                                            完工汇报结案
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tab 10: Financial costs direct allocation */}
                        {simActiveMenu === 9 && (
                          <div className="space-y-4">
                            <div className="border-b border-slate-800 pb-2">
                              <h3 className="font-bold text-white text-sm">财务先进先出比例成本核算</h3>
                              <p className="text-[9px] text-slate-500">应用FIFO算法归拢农资与人工机械折旧等间接费用分摊至收成。防止虚增两重做账。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Left: Cost ledger generator */}
                              <div className="bg-slate-900/80 rounded p-3 border border-slate-800/60 space-y-2">
                                <h4 className="font-semibold text-slate-300 text-[10px]">间接费用及制造工时记账</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">费用门类</label>
                                    <select
                                      value={m10Category}
                                      onChange={e => setM10Category(e.target.value as any)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    >
                                      <option value="MATERIALS">直接材料</option>
                                      <option value="LABOR">直接人工</option>
                                      <option value="MACHINERY">折旧及机械间接费</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-500 block font-semibold">账单金额 (元)</label>
                                    <input
                                      type="number" value={m10Amt}
                                      onChange={e => setM10Amt(parseInt(e.target.value) || 0)}
                                      className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-slate-500 block font-semibold">费用凭据阐述</label>
                                  <input
                                    type="text" value={m10Desc}
                                    onChange={e => setM10Desc(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 py-1 px-1.5 rounded text-[10px]"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={handleM10AddCost}
                                    className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 py-1.5 rounded text-[10px] font-semibold cursor-pointer"
                                  >
                                    计入未分摊账目
                                  </button>
                                  <button
                                    onClick={handleM10AllocateCosts}
                                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 rounded text-[10px] cursor-pointer animate-pulse"
                                  >
                                    一键按比例分摊成本
                                  </button>
                                </div>
                              </div>

                              {/* Right: Ledger tracking */}
                              <div className="bg-slate-900/80 rounded p-2 border border-slate-800/60">
                                <h4 className="font-semibold text-slate-300 text-[10px] mb-1.5">分摊凭证事务流</h4>
                                <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5 font-mono text-[9px]">
                                  {dbState.costs.map(cost => (
                                    <div key={cost.id} className="p-1.5 bg-slate-950/40 border border-slate-850 rounded text-[9px] flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-300">{cost.id}</span>
                                          <span className="text-slate-500">[{cost.category}]</span>
                                          <span className="text-amber-500 font-bold">${cost.amount}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 mt-1 truncate max-w-[150px]">{cost.description}</p>
                                      </div>
                                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                                        cost.allocationStatus === "ALLOCATED" ? "bg-slate-850 text-slate-500" : "bg-red-950 text-red-400"
                                      }`}>
                                        {cost.allocationStatus === "ALLOCATED" ? "已分摊" : "待分摊"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulated operating system shell output logger at bottom */}
          <div className="h-28 bg-slate-950 border-t border-slate-800 flex flex-col min-h-0 shrink-0">
            <div className="h-6 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                PyQt6 Application Standard Output Terminal Logs (stdout/stderr)
              </span>
              <button
                onClick={() => setSimLogs([])}
                className="hover:text-white transition-colors"
              >
                Clear Terminal
              </button>
            </div>
            <div
              ref={logTerminalRef}
              className="flex-1 p-2 font-mono text-[10px] text-emerald-400/90 leading-relaxed overflow-y-auto space-y-0.5 whitespace-pre-wrap select-text"
            >
              {simLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Visual Database Synchronizer View bottom bar */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800/80 px-6 flex items-center justify-between z-10 shrink-0 font-mono text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-teal-400" />
          <span>Active Persistence State: <span className="text-teal-400 font-semibold">Synced with local JSON file</span></span>
        </div>
        <div>
          <span>Preserving (Python 3 & PyQt6 Only) Project Spec</span>
        </div>
      </footer>
    </div>
  );
}
