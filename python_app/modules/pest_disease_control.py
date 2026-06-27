from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QFormLayout, QComboBox, QLineEdit, QMessageBox)
from PyQt6.QtCore import Qt

class PestDiseaseControlWidget(QWidget):
    """
    6. 作物病虫害预警与诊断模块
    核心算法：GDD生理学积温模型、病原威胁状态机级跳。
    """
    def __init__(self, db):
        super().__init__()
        self.db = db
        # 5 天历史气温，用于测算积温
        self.temp_history = [
            {"max": 28.0, "min": 16.0},
            {"max": 30.0, "min": 18.0},
            {"max": 32.0, "min": 19.0},
            {"max": 29.0, "min": 17.0},
            {"max": 31.0, "min": 20.0}
        ]
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # 标题
        title = QLabel("田间微生境有害生物生理发育积温监控")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("通过物联网日间均温计算有效生理发育积温(GDD)，自动预警棉铃虫、红蜘蛛孵化高峰，实现早诊断早靶向处理。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：微生境GDD测算
        sidebar = QVBoxLayout()
        form_widget = QWidget()
        form_widget.setStyleSheet("background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;")
        form_layout = QFormLayout(form_widget)
        form_layout.setContentsMargins(15, 15, 15, 15)

        title_f = QLabel("生理有效积温靶点设置")
        title_f.setStyleSheet("font-weight: bold; font-size: 12px; color: #dc2626;")
        form_layout.addRow(title_f)

        self.parcel_combo = QComboBox()
        for p in self.db.data.get("parcels", []):
            self.parcel_combo.addItem(p["name"], p["id"])
        form_layout.addRow("受测大田:", self.parcel_combo)

        self.pest_combo = QComboBox()
        self.pest_combo.addItems(["红蜘蛛 (起征10°C)", "棉铃虫 (起征12°C)", "番茄疫病孢子 (起征7°C)"])
        self.pest_combo.currentIndexChanged.connect(self.calculate_gdd)
        form_layout.addRow("靶向害虫:", self.pest_combo)

        # 允许微调近5日累计均温，模拟气候突变
        self.offset_input = QLineEdit("0.0")
        self.offset_input.setPlaceholderText("温度偏移微调(°C)")
        self.offset_input.textChanged.connect(self.calculate_gdd)
        form_layout.addRow("5日均温微调:", self.offset_input)

        self.calc_btn = QPushButton("评估爆发风险建立哨位")
        self.calc_btn.setStyleSheet("background-color: #dc2626; color: white; padding: 6px; font-weight: bold;")
        self.calc_btn.clicked.connect(self.register_alert)
        form_layout.addRow("", self.calc_btn)

        sidebar.addWidget(form_widget)
        content.addLayout(sidebar, 3)

        # 右侧：预测诊断和哨所网
        right = QVBoxLayout()
        self.diag_lbl = QLabel()
        self.diag_lbl.setStyleSheet("background-color: #fff5f5; border: 1px solid #fed7d7; border-radius: 6px; padding: 10px; font-size: 11px; color: #991b1b; line-height: 1.5;")
        right.addWidget(self.diag_lbl)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["哨所编码", "地块", "作物", "有害生物", "累计GDD", "控制"])
        right.addWidget(self.table)

        content.addLayout(right, 5)
        main_layout.addLayout(content)

        self.setLayout(main_layout)
        self.calculate_gdd()
        self.refresh_alerts()

    def calculate_gdd(self):
        # 测算积温
        pest_text = self.pest_combo.currentText()
        base_temp = 10.0
        if "12°C" in pest_text:
            base_temp = 12.0
        elif "7°C" in pest_text:
            base_temp = 7.0

        try:
            offset = float(self.offset_input.text())
        except ValueError:
            offset = 0.0

        self.gdd_val = 0.0
        for day in self.temp_history:
            mean = ((day["max"] + offset) + (day["min"] + offset)) / 2.0
            eff_heat = max(0.0, mean - base_temp)
            self.gdd_val += eff_heat

        self.gdd_val = round(self.gdd_val, 1)
        
        # 威胁风险阈值级跳逻辑
        self.risk_lvl = "LOW"
        pred = "当前均温下生理积温热量不充沛，有害生物卵多处于休眠/不发育状态。"
        if self.gdd_val >= 70.0:
            self.risk_lvl = "HIGH"
            pred = "!!! 高危爆发预警：积温已冲破胚胎羽化红线（70.0°C-d），幼虫极大概率密集孵化。请迅速开启药剂喷洒作业。"
        elif self.gdd_val >= 45.0:
            self.risk_lvl = "MEDIUM"
            pred = "中危提示：生理有效发育热量正在累积（已超过45.0°C-d），害虫胚胎发育中，建议进行叶背抽样检查。"

        self.diag_lbl.setText(
            f"有害生物生长积温生理诊断：\n"
            f"1. 测定靶标发育起征点: {base_temp}°C | 5日累计有效积温值: {self.gdd_val}°C-d\n"
            f"2. 风险评定等级: {self.risk_lvl}\n"
            f"3. 植保决策建议: {pred}"
        )

    def register_alert(self):
        parcel_id = self.parcel_combo.currentData()
        parcels = self.db.data.get("parcels", [])
        p = next((pa for pa in parcels if pa["id"] == parcel_id), None)
        if not p:
            return

        pest_name = self.pest_combo.currentText().split(" ")[0]

        new_alert = {
            "id": f"AL{len(self.db.data['pest_alerts']) + 301}",
            "parcelId": parcel_id,
            "cropName": p["currentCrop"] or "白菜",
            "pestName": pest_name,
            "cumulativeGDD": self.gdd_val,
            "riskLevel": self.risk_lvl,
            "status": "MONITORING"
        }

        self.db.data["pest_alerts"].append(new_alert)
        self.db.save()
        QMessageBox.warning(self, "生物预警建档", f"预警监控哨位 [{new_alert['id']}] 部署成功，生理能耗积累已记档监控。")
        self.refresh_alerts()

    def refresh_alerts(self):
        alerts = self.db.data.get("pest_alerts", [])
        self.table.setRowCount(len(alerts))
        for idx, a in enumerate(reversed(alerts)):
            self.table.setItem(idx, 0, QTableWidgetItem(a["id"]))
            self.table.setItem(idx, 1, QTableWidgetItem(a["parcelId"]))
            self.table.setItem(idx, 2, QTableWidgetItem(a["cropName"]))
            self.table.setItem(idx, 3, QTableWidgetItem(a["pestName"]))
            self.table.setItem(idx, 4, QTableWidgetItem(f"{a['cumulativeGDD']} °C-d ({a['riskLevel']})"))

            if a["status"] == "MONITORING":
                btn = QPushButton("消退闭环")
                btn.setStyleSheet("font-size: 10px; background-color: #059669; color: white;")
                btn.clicked.connect(lambda checked, alert_id=a["id"]: self.close_mitigation(alert_id))
                self.table.setCellWidget(idx, 5, btn)
            else:
                self.table.setItem(idx, 5, QTableWidgetItem("已闭环"))

    def close_mitigation(self, alert_id):
        alerts = self.db.data["pest_alerts"]
        a = next((al for al in alerts if al["id"] == alert_id), None)
        if not a:
            return

        a["status"] = "TREATED"
        a["riskLevel"] = "LOW"
        self.db.save()
        QMessageBox.information(self, "预警消退", f"靶向施药消杀完成，物理预警警报降为 LOW 安全常态。")
        self.refresh_alerts()
