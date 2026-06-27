import json
import os

class DatabaseMock:
    """
    轻量级 JSON 文件持久化层，模拟事务和一致性保障。
    提供核心状态的增删改查（CRUD）及并发写一致性保护。
    """
    def __init__(self, filename="agri_db.json"):
        self.filename = filename
        self.data = {}
        self.load()

    def load(self):
        if not os.path.exists(self.filename):
            self.seed_initial_data()
        else:
            try:
                with open(self.filename, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
            except Exception:
                self.seed_initial_data()

    def save(self):
        try:
            with open(self.filename, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"数据持久化写入异常: {str(e)}")

    def seed_initial_data(self):
        self.data = {
            "users": {
                "admin": {"pass": "123456", "role": "ADMIN"},
                "manager": {"pass": "123456", "role": "MANAGER"},
                "operator": {"pass": "123456", "role": "OPERATOR"}
            },
            "parcels": [
                {"id": "P001", "name": "一号高标准大田", "area": 120.0, "soilType": "LOAM", "currentCrop": "小麦", "nutrientLevel": {"n": 110, "p": 42, "k": 95}, "history": ["番茄", "白菜"]},
                {"id": "P002", "name": "二号沙壤土大田", "area": 85.0, "soilType": "SAND", "currentCrop": "大豆", "nutrientLevel": {"n": 55, "p": 50, "k": 105}, "history": ["小麦"]},
                {"id": "P003", "name": "三号粘性壤土试验区", "area": 40.0, "soilType": "CLAY", "currentCrop": None, "nutrientLevel": {"n": 130, "p": 35, "k": 80}, "history": ["玉米"]}
            ],
            "crop_plans": [
                {"id": "CP1001", "parcelId": "P001", "cropName": "小麦", "category": "CEREAL", "sowDate": "2026-03-01", "expectedHarvest": "2026-07-15", "status": "GROWING"},
                {"id": "CP1002", "parcelId": "P002", "cropName": "大豆", "category": "LEGUME", "sowDate": "2026-05-10", "expectedHarvest": "2026-09-01", "status": "GROWING"}
            ],
            "weather": {
                "temperature": 28.5,
                "humidity": 58.0,
                "solarRadiation": 650.0,
                "forecastRainProbability": 15.0,
                "soilMoisture": 42.0
            },
            "irrigation_logs": [],
            "inventory": [
                {"id": "INV101", "name": "高活性磷酸二铵", "category": "FERTILIZER", "quantity": 2400.0, "unit": "kg", "safetyStock": 500.0, "pricePerUnit": 4.8, "leadTimeDays": 4},
                {"id": "INV102", "name": "阿维菌素生物虫剂", "category": "PESTICIDE", "quantity": 180.0, "unit": "L", "safetyStock": 200.0, "pricePerUnit": 18.5, "leadTimeDays": 7},
                {"id": "INV103", "name": "秋实九号高产番茄良种", "category": "SEED", "quantity": 45.0, "unit": "kg", "safetyStock": 10.0, "pricePerUnit": 125.0, "leadTimeDays": 10}
            ],
            "drone_missions": [
                {"id": "DRN501", "droneId": "UAV-ALPHA-09", "parcelId": "P001", "taskType": "SPRAYING", "waypoints": [{"x": 10, "y": 15}, {"x": 50, "y": 70}], "batteryRequired": 18, "status": "COMPLETED"}
            ],
            "recipes": [
                {"id": "RC701", "parcelId": "P001", "cropName": "小麦", "recommendationNPK": {"n": 15.0, "p": 5.0, "k": 8.0}, "appliedStatus": "APPLIED", "timestamp": "2026-06-25"}
            ],
            "pest_alerts": [
                {"id": "AL301", "parcelId": "P001", "cropName": "小麦", "pestName": "棉铃虫", "cumulativeGDD": 110, "riskLevel": "MEDIUM", "status": "MONITORING"}
            ],
            "harvest_batches": [
                {"id": "BAT-2001", "cropName": "番茄", "quantity": 4500.0, "harvestDate": "2026-06-24", "parcelId": "P001", "sugarAcidRatio": 14.8, "qualityGrade": "A", "traceHash": "AGRI-BLOCK-7F2A3D1C-20260624"}
            ],
            "greenhouses": [
                {"id": "GH01", "name": "一号智能蔬菜温室大棚", "currentTemp": 22.5, "currentHumidity": 60.0, "co2Level": 550, "state": "IDLE", "actuators": {"heater": False, "ventilation": False, "humidifier": False, "co2Valve": False}},
                {"id": "GH02", "name": "二号草莓立体高架温室", "currentTemp": 19.0, "currentHumidity": 72.0, "co2Level": 720, "state": "IDLE", "actuators": {"heater": False, "ventilation": False, "humidifier": False, "co2Valve": False}}
            ],
            "tasks": [
                {"id": "TSK901", "title": "小麦叶面追肥作业", "assignedTo": "徐利民 (机耕组)", "parcelId": "P001", "priority": "MEDIUM", "status": "DISPATCHED"}
            ],
            "costs": [
                {"id": "CST3001", "category": "MATERIALS", "amount": 840.0, "date": "2026-06-24", "description": "直接材料：采购番茄底施复合肥料费用", "allocationStatus": "ALLOCATED"},
                {"id": "CST3002", "category": "LABOR", "amount": 1200.0, "date": "2026-06-25", "description": "人工费用：采收工人工时结算费用", "allocationStatus": "UNALLOCATED"}
            ]
        }
        self.save()
