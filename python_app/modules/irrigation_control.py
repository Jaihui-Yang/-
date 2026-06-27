from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QSlider, QComboBox, QMessageBox)
from PyQt6.QtCore import Qt
import datetime

class IrrigationControlWidget(QWidget):
    """
    2. 灌溉与气象监测模块
    核心算法：Penman需水量规则引擎、土壤吸收一致性状态更新机制。
    """
    def __init__(self, db):
        super().__init__()
        self.db = db
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # 标题
        title = QLabel("微气象监测与灌溉自动规则引擎")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("采集农场物联网传感器温湿度、光合有效辐射，应用Penman等需水量物理公式智能触发微喷滴灌。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        # 传感器参数仿真 (横向滑块布局)
        sensor_box = QWidget()
        sensor_box.setStyleSheet("background-color: #f1f5f9; border-radius: 8px;")
        sensor_layout = QHBoxLayout(sensor_box)
        sensor_layout.setContentsMargins(15, 15, 15, 15)

        # 1. 温度
        v1 = QVBoxLayout()
        self.temp_lbl = QLabel("环境温度: 28 °C")
        v1.addWidget(self.temp_lbl)
        self.temp_slider = QSlider(Qt.Orientation.Horizontal)
        self.temp_slider.setRange(10, 45)
        self.temp_slider.setValue(28)
        self.temp_slider.valueChanged.connect(self.calculate_need)
        v1.addWidget(self.temp_slider)
        sensor_layout.addLayout(v1)

        # 2. 土壤湿度
        v2 = QVBoxLayout()
        self.moist_lbl = QLabel("土壤湿度: 42 %")
        v2.addWidget(self.moist_lbl)
        self.moist_slider = QSlider(Qt.Orientation.Horizontal)
        self.moist_slider.setRange(10, 90)
        self.moist_slider.setValue(42)
        self.moist_slider.valueChanged.connect(self.calculate_need)
        v2.addWidget(self.moist_slider)
        sensor_layout.addLayout(v2)

        # 3. 辐射
        v3 = QVBoxLayout()
        self.rad_lbl = QLabel("太阳辐射: 650 W/㎡")
        v3.addWidget(self.rad_lbl)
        self.rad_slider = QSlider(Qt.Orientation.Horizontal)
        self.rad_slider.setRange(100, 1000)
        self.rad_slider.setValue(650)
        self.rad_slider.valueChanged.connect(self.calculate_need)
        v3.addWidget(self.rad_slider)
        sensor_layout.addLayout(v3)

        main_layout.addWidget(sensor_box)

        # 中间：灌溉决策输出
        ctrl_box = QHBoxLayout()
        self.parcel_combo = QComboBox()
        parcels = self.db.data.get("parcels", [])
        for p in parcels:
            self.parcel_combo.addItem(f"{p['name']} ({p['area']}亩)", p["id"])
        ctrl_box.addWidget(QLabel("目标灌溉区:"))
        ctrl_box.addWidget(self.parcel_combo)

        self.calc_btn = QPushButton("运行Penman模型并喷灌")
        self.calc_btn.setStyleSheet("background-color: #0284c7; color: white; font-weight: bold; padding: 6px;")
        self.calc_btn.clicked.connect(self.trigger_irrigation)
        ctrl_box.addWidget(self.calc_btn)
        main_layout.addLayout(ctrl_box)

        # 诊断报告lbl
        self.diag_lbl = QLabel("模型分析中...")
        self.diag_lbl.setStyleSheet("background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px; font-size: 11px; color: #0369a1;")
        main_layout.addWidget(self.diag_lbl)

        # 下方：浇水历史
        self.log_table = QTableWidget()
        self.log_table.setColumnCount(5)
        self.log_table.setHorizontalHeaderLabels(["流水编号", "作业区", "累计喷洒水深 (L)", "电机工时 (分钟)", "作业时间"])
        main_layout.addWidget(self.log_table)

        self.setLayout(main_layout)
        self.calculate_need()
        self.refresh_logs()

    def calculate_need(self):
        temp = self.temp_slider.value()
        moist = self.moist_slider.value()
        rad = self.rad_slider.value()

        self.temp_lbl.setText(f"环境温度: {temp} °C")
        self.moist_lbl.setText(f"土壤湿度: {moist} %")
        self.rad_lbl.setText(f"太阳辐射: {rad} W/㎡")

        # 需水蒸发量公式
        et = (temp * 0.15) + (rad * 0.001)
        moisture_gap = max(0, 75 - moist)
        
        self.water_needed = round(et * 200 + moisture_gap * 15, 1)
        self.diag_lbl.setText(
            f"灌溉规则引擎诊断：当前土壤湿度为 {moist}%，距作物饱水阈值(75%)存在 {moisture_gap}% 缺水量。\n"
            f"由于气温与光照驱动蒸发消耗，估算该植物日耗水深。建议每亩灌溉深度：{self.water_needed} 升/亩。"
        )

    def trigger_irrigation(self):
        parcel_id = self.parcel_combo.currentData()
        parcels = self.db.data.get("parcels", [])
        p = next((pa for pa in parcels if pa["id"] == parcel_id), None)
        if not p:
            return

        total_volume = int(self.water_needed * p["area"])
        duration = max(1, round(total_volume / (15 * p["area"]))) # 假设水泵定额每分钟喷15升/亩

        # 记录灌溉事务日志
        new_log = {
            "id": f"IR{len(self.db.data['irrigation_logs']) + 1001}",
            "parcelId": p["id"],
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
            "waterVolume": total_volume,
            "duration": duration,
            "mode": "AUTO"
        }

        self.db.data["irrigation_logs"].append(new_log)

        # 状态转化：灌溉必然提升土壤含水率（数据一致性同步）
        self.db.data["weather"]["soilMoisture"] = min(80, self.db.data["weather"]["soilMoisture"] + 15)
        self.moist_slider.setValue(self.db.data["weather"]["soilMoisture"])

        self.db.save()
        QMessageBox.information(self, "微喷水泵开启", f"电磁喷淋阀成功闭合！针对 [{p['name']}]，输送：{total_volume} 升水，运行时间 {duration} 分钟。")
        
        self.refresh_logs()
        self.calculate_need()

    def refresh_logs(self):
        logs = self.db.data.get("irrigation_logs", [])
        self.log_table.setRowCount(len(logs))
        for idx, l in enumerate(reversed(logs)):
            self.log_table.setItem(idx, 0, QTableWidgetItem(l["id"]))
            self.log_table.setItem(idx, 1, QTableWidgetItem(l["parcelId"]))
            self.log_table.setItem(idx, 2, QTableWidgetItem(f"{l['waterVolume']} L"))
            self.log_table.setItem(idx, 3, QTableWidgetItem(f"{l['duration']} Min"))
            self.log_table.setItem(idx, 4, QTableWidgetItem(l["timestamp"]))
