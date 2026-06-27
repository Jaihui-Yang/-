export type Role = "ADMIN" | "MANAGER" | "OPERATOR";

export interface UserSession {
  username: string;
  role: Role;
}

export interface Parcel {
  id: string;
  name: string;
  area: number;
  soilType: "LOAM" | "SAND" | "CLAY";
  currentCrop: string | null;
  nutrientLevel: {
    n: number;
    p: number;
    k: number;
  };
  history: string[];
}

export interface CropPlan {
  id: string;
  parcelId: string;
  cropName: string;
  category: "CEREAL" | "LEGUME" | "SOLANACEOUS" | "CRUCIFEROUS";
  sowDate: string;
  expectedHarvest: string;
  status: "PLANNING" | "SOWN" | "GROWING" | "HARVESTED";
}

export interface Weather {
  temperature: number;
  humidity: number;
  solarRadiation: number;
  forecastRainProbability: number;
  soilMoisture: number;
}

export interface IrrigationLog {
  id: string;
  parcelId: string;
  timestamp: string;
  waterVolume: number;
  duration: number;
  mode: "AUTO" | "MANUAL";
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "FERTILIZER" | "PESTICIDE" | "SEED";
  quantity: number;
  unit: string;
  safetyStock: number;
  pricePerUnit: number;
  leadTimeDays: number;
}

export interface DroneWaypoint {
  x: number;
  y: number;
}

export interface DroneMission {
  id: string;
  droneId: string;
  parcelId: string;
  taskType: "SPRAYING" | "MAPPING" | "PATROL";
  waypoints: DroneWaypoint[];
  batteryRequired: number;
  status: "PLANNING" | "EXECUTING" | "COMPLETED" | "LOW_BATTERY_ABORTED";
}

export interface Recipe {
  id: string;
  parcelId: string;
  cropName: string;
  recommendationNPK: {
    n: number;
    p: number;
    k: number;
  };
  appliedStatus: "PLANNING" | "APPLIED";
  timestamp: string;
}

export interface PestAlert {
  id: string;
  parcelId: string;
  cropName: string;
  pestName: string;
  cumulativeGDD: number;
  riskLevel: "NORMAL" | "SENSITIVE" | "MEDIUM" | "HIGH";
  status: "MONITORING" | "TREATED" | "OUTBREAK";
}

export interface HarvestBatch {
  id: string;
  cropName: string;
  quantity: number;
  harvestDate: string;
  parcelId: string;
  sugarAcidRatio: number;
  qualityGrade: "A" | "B" | "C";
  traceHash: string;
}

export interface GreenhouseActuators {
  heater: boolean;
  ventilation: boolean;
  humidifier: boolean;
  co2Valve: boolean;
}

export interface Greenhouse {
  id: string;
  name: string;
  currentTemp: number;
  currentHumidity: number;
  co2Level: number;
  state: "IDLE" | "HEATING" | "VENTILATING" | "HUMIDIFYING" | "FERTILIZING";
  actuators: GreenhouseActuators;
}

export interface TaskItem {
  id: string;
  title: string;
  assignedTo: string;
  parcelId: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "EXECUTING" | "COMPLETED";
}

export interface CostRecord {
  id: string;
  category: "MATERIALS" | "LABOR" | "MACHINERY" | "OTHER";
  amount: number;
  date: string;
  description: string;
  allocationStatus: "UNALLOCATED" | "ALLOCATED";
}

export interface DatabaseState {
  users: Record<string, { pass: string; role: Role }>;
  parcels: Parcel[];
  crop_plans: CropPlan[];
  weather: Weather;
  irrigation_logs: IrrigationLog[];
  inventory: InventoryItem[];
  drone_missions: DroneMission[];
  recipes: Recipe[];
  pest_alerts: PestAlert[];
  harvest_batches: HarvestBatch[];
  greenhouses: Greenhouse[];
  tasks: TaskItem[];
  costs: CostRecord[];
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  children?: FileItem[];
}
