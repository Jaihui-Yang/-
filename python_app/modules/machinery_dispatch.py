from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QFormLayout, QComboBox, QLineEdit, QMessageBox)
from PyQt6.QtCore import Qt
import math

class MachineryDispatchWidget(QWidget):
    """
    4. 智能农机与无人机调度模块
    核心算法：多靶点植保TSP路径优化、荷电安全限飞拦截算法。
    """
    def __init__(self, db):
        super().__init__()
        self.db = db
        self.drone_battery = 85.0  # 遥测机载电量
        self.points = [
            {"x": 10, "y": 20},
            {"x": 45, "y": 80},
            {"x": 90, "y": 35},
            {"x": 30, "y": 60}
        ]
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # 标题
        title = QLabel("农机自动作业导航与遥测调度心")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("监管植保GPS无人机群及无人播种车。内置航点TSP贪心求优路径，严防低电量失联炸机。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：航点配比表单和计算
        sidebar = QVBoxLayout()
        form_widget = QWidget()
        form_widget.setStyleSheet("background-color: #f0f9ff; border-radius: 8px;")
        form_layout = QFormLayout(form_widget)
        form_layout.setContentsMargins(15, 15, 15, 15)

        title_f = QLabel("航向靶标物理坐标录入")
        title_f.setStyleSheet("font-weight: bold; font-size: 12px; color: #0369a1;")
        form_layout.addRow(title_f)

        self.x_input = QLineEdit("50")
        form_layout.addRow("靶标 X 坐标(米):", self.x_input)

        self.y_input = QLineEdit("50")
        form_layout.addRow("靶标 Y 坐标(米):", self.y_input)

        self.add_pt_btn = QPushButton("追加航迹靶点")
        self.add_pt_btn.setStyleSheet("background-color: #0284c7; color: white;")
        self.add_pt_btn.clicked.connect(self.add_point)
        form_layout.addRow("", self.add_pt_btn)

        self.clear_btn = QPushButton("重置航点")
        self.clear_btn.setStyleSheet("background-color: #64748b; color: white;")
        self.clear_btn.clicked.connect(self.clear_points)
        form_layout.addRow("", self.clear_btn)

        sidebar.addWidget(form_widget)

        # 排产选项
        opts_widget = QWidget()
        opts_layout = QFormLayout(opts_widget)
        
        self.parcel_combo = QComboBox()
        for p in self.db.data.get("parcels", []):
            self.parcel_combo.addItem(p["name"], p["id"])
        opts_layout.addRow("作业大田:", self.parcel_combo)

        self.type_combo = QComboBox()
        self.type_combo.addItems(["植保喷药 (SPRAYING)", "光谱测绘 (SURVEY)"])
        opts_layout.addRow("作业模式:", self.type_combo)

        self.dispatch_btn = QPushButton("计算TSP路径起飞")
        self.dispatch_btn.setStyleSheet("background-color: #0369a1; color: white; padding: 6px; font-weight: bold;")
        self.dispatch_btn.clicked.connect(self.dispatch_flight)
        opts_layout.addRow("", self.dispatch_btn)

        sidebar.addWidget(opts_widget)
        content.addLayout(sidebar, 3)

        # 右侧：性能报告及任务表
        right_panel = QVBoxLayout()
        
        # 航迹计算诊断
        self.diag_lbl = QLabel()
        self.diag_lbl.setStyleSheet("background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 11px; font-family: 'Courier New';")
        right_panel.addWidget(self.diag_lbl)

        # 任务列表
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["任务编号", "设备", "类型", "航线点数", "能耗预估", "作业状态"])
        right_panel.addWidget(self.table)

        content.addLayout(right_panel, 5)
        main_layout.addLayout(content)

        self.setLayout(main_layout)
        self.recalc_route()
        self.refresh_missions()

    def add_point(self):
        try:
            x = float(self.x_input.text())
            y = float(self.y_input.text())
        except ValueError:
            return
        self.points.append({"x": x, "y": y})
        self.recalc_route()

    def clear_points(self):
        self.points = []
        self.recalc_route()

    def recalc_route(self):
        """
        贪心贪吃蛇算法求解简单多点 TSP，返回总飞行里程。
        """
        if not self.points:
            self.total_dist = 0
            self.battery_req = 0
            self.diag_lbl.setText("航迹遥测：等待配置坐标靶点...")
            return

        visited = set()
        curr_x, curr_y = 0.0, 0.0  # 基地起飞
        self.total_dist = 0.0
        route_str = "基地"

        while len(visited) < len(self.points):
            nearest_idx = -1
            min_d = float('inf')
            for idx, pt in enumerate(self.points):
                if idx not in visited:
                    d = math.sqrt((pt["x"] - curr_x)**2 + (pt["y"] - curr_y)**2)
                    if d < min_d:
                        min_d = d
                        nearest_idx = idx
            
            if nearest_idx != -1:
                visited.add(nearest_idx)
                self.total_dist += min_d
                pt = self.points[nearest_idx]
                curr_x, curr_y = pt["x"], pt["y"]
                route_str += f" → P{nearest_idx+1}"

        # 环回基地
        self.total_dist += math.sqrt(curr_x**2 + curr_y**2)
        route_str += " → 返回基地"

        # 每10米耗电 0.35%，起降损耗5%
        self.battery_req = round(self.total_dist * 0.035 + 5)
        self.diag_lbl.setText(
            f"航线TSP优化排程引擎：\n"
            f"1. 规划路径: {route_str}\n"
            f"2. 预计巡航总里程: {round(self.total_dist, 1)} 米\n"
            f"3. 遥测预计荷电能耗: {self.battery_req}%\n"
            f"4. 机载电能状态: {self.drone_battery}%"
        )

    def dispatch_flight(self):
        if not self.points:
            QMessageBox.warning(self, "调度拦截", "请至少配置一个飞控航迹点！")
            return

        # 能量一致性熔断算法：电量不足禁止起飞
        if self.drone_battery < self.battery_req:
            QMessageBox.critical(self, "起飞控制锁熔断", 
                                 f"安全红线：飞行预估消耗电量为 {self.battery_req}%，"
                                 f"已超出无人机当前荷电限制 ({self.drone_battery}%)。强制锁机并呼叫补充地能。")
            return

        parcel_id = self.parcel_combo.currentData()
        task_type = "SPRAYING" if "植保" in self.type_combo.currentText() else "SURVEY"

        new_mission = {
            "id": f"DRN{len(self.db.data['drone_missions']) + 501}",
            "droneId": "UAV-ALPHA-09",
            "parcelId": parcel_id,
            "taskType": task_type,
            "waypoints": self.points,
            "batteryRequired": self.battery_req,
            "status": "PENDING"
        }

        self.db.data["drone_missions"].append(new_mission)
        self.drone_battery = max(10.0, self.drone_battery - self.battery_req) # 消耗电量
        self.db.save()

        QMessageBox.information(self, "塔台放行", f"飞控微码包注入成功！无人机已升空，电量核减至 {self.drone_battery}%。")
        
        self.refresh_missions()
        self.recalc_route()

    def refresh_missions(self):
        missions = self.db.data.get("drone_missions", [])
        self.table.setRowCount(len(missions))
        for idx, m in enumerate(reversed(missions)):
            self.table.setItem(idx, 0, QTableWidgetItem(m["id"]))
            self.table.setItem(idx, 1, QTableWidgetItem(m["droneId"]))
            
            t_cn = "植保超低空喷药" if m["taskType"] == "SPRAYING" else "高光谱航测"
            self.table.setItem(idx, 2, QTableWidgetItem(t_cn))
            self.table.setItem(idx, 3, QTableWidgetItem(f"{len(m['waypoints'])} 点"))
            self.table.setItem(idx, 4, QTableWidgetItem(f"-{m['batteryRequired']}%"))
            
            st_cn = "排队升空" if m["status"] == "PENDING" else "巡航作业" if m["status"] == "ACTIVE" else "作业成功"
            self.table.setItem(idx, 5, QTableWidgetItem(st_cn))
