from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QSlider, QComboBox, QFormLayout, QMessageBox)
from PyQt6.QtCore import Qt

class GreenhouseControlWidget(QWidget):
    """
    8. 温室大棚环控与状态流转模块
    核心算法：滞后死区(Hysteresis)抗起停振荡调节回路、环控离合器阀门状态机跃迁。
    """
    def __init__(self, db):
        super().__init__()
        self.db = db
        # 预设恒定阈值
        self.target_temp = 24.0
        self.target_humidity = 65.0
        self.target_co2 = 800
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # 标题
        title = QLabel("连栋温室生境微电网与物理继电器状态机")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("监管高精度农业日光温室。采用滞后滞纳（Hysteresis）死区隔离控制核心，抗环境噪声，杜绝高功率机电频繁无效触点拉合。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：传感器数值滑块（输入端）
        input_box = QWidget()
        input_box.setStyleSheet("background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px;")
        input_layout = QFormLayout(input_box)
        input_layout.setContentsMargins(15, 15, 15, 15)

        title_i = QLabel("温室物联网传感器仿真输入")
        title_i.setStyleSheet("font-weight: bold; font-size: 12px; color: #db2777;")
        input_layout.addRow(title_i)

        self.gh_combo = QComboBox()
        for g in self.db.data.get("greenhouses", []):
            self.gh_combo.addItem(g["name"], g["id"])
        self.gh_combo.currentIndexChanged.connect(self.sync_gh_sensors)
        input_layout.addRow("受控大棚:", self.gh_combo)

        # 传感器1：温度
        self.temp_lbl = QLabel("当前温室温度: 22.0 °C")
        self.temp_slider = QSlider(Qt.Orientation.Horizontal)
        self.temp_slider.setRange(100, 350) # 代表 10.0°C - 35.0°C
        self.temp_slider.setValue(220)
        self.temp_slider.valueChanged.connect(self.process_climate)
        input_layout.addRow(self.temp_lbl, self.temp_slider)

        # 传感器2：湿度
        self.hum_lbl = QLabel("当前温室湿度: 60 %")
        self.hum_slider = QSlider(Qt.Orientation.Horizontal)
        self.hum_slider.setRange(30, 95)
        self.hum_slider.setValue(60)
        self.hum_slider.valueChanged.connect(self.process_climate)
        input_layout.addRow(self.hum_lbl, self.hum_slider)

        # 传感器3：CO2
        self.co2_lbl = QLabel("当前二氧化碳: 550 ppm")
        self.co2_slider = QSlider(Qt.Orientation.Horizontal)
        self.co2_slider.setRange(300, 1500)
        self.co2_slider.setValue(550)
        self.co2_slider.valueChanged.connect(self.process_climate)
        input_layout.addRow(self.co2_lbl, self.co2_slider)

        content.addWidget(input_box, 3)

        # 右侧：继电器闭合和状态变迁
        right_panel = QVBoxLayout()

        self.state_lbl = QLabel("当前环控模式: 状态测定中")
        self.state_lbl.setStyleSheet("font-size: 14px; font-weight: bold; color: #1e293b;")
        right_panel.addWidget(self.state_lbl)

        # 物理继电器面板
        relay_box = QWidget()
        relay_box.setStyleSheet("background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;")
        relay_layout = QVBoxLayout(relay_box)

        self.r1_lbl = QLabel("1# 加热继电器: [断开]")
        self.r2_lbl = QLabel("2# 排风机继电器: [断开]")
        self.r3_lbl = QLabel("3# 雾化加湿离合器: [断开]")
        self.r4_lbl = QLabel("4# 二氧化碳释放阀: [断开]")

        relay_layout.addWidget(self.r1_lbl)
        relay_layout.addWidget(self.r2_lbl)
        relay_layout.addWidget(self.r3_lbl)
        relay_layout.addWidget(self.r4_lbl)
        
        right_panel.addWidget(relay_box)

        # 滞后变迁日志
        self.log_lbl = QLabel("离合自控回路加载...")
        self.log_lbl.setStyleSheet("background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px; font-size: 11px; color: #be123c; line-height: 1.4;")
        right_panel.addWidget(self.log_lbl)

        content.addLayout(right_panel, 5)
        main_layout.addLayout(content)

        self.setLayout(main_layout)
        self.sync_gh_sensors()

    def sync_gh_sensors(self):
        gh_id = self.gh_combo.currentData()
        g_list = self.db.data.get("greenhouses", [])
        g = next((gh for gh in g_list if gh["id"] == gh_id), None)
        if g:
            self.temp_slider.setValue(int(g["currentTemp"] * 10))
            self.hum_slider.setValue(int(g["currentHumidity"]))
            self.co2_slider.setValue(g["co2Level"])
        self.process_climate()

    def process_climate(self):
        """
        双滞后(Hysteresis)防触点抖动保护规则算法
        """
        temp = self.temp_slider.value() / 10.0
        humidity = float(self.hum_slider.value())
        co2 = self.co2_slider.value()

        self.temp_lbl.setText(f"当前温室温度: {temp} °C")
        self.hum_lbl.setText(f"当前温室湿度: {humidity} %")
        self.co2_lbl.setText(f"当前二氧化碳: {co2} ppm")

        # 滞后区间死区阈值
        temp_deadband = 1.5
        hum_deadband = 5.0
        co2_deadband = 80

        # 初始化继电器
        heater = False
        ventilation = False
        humidifier = False
        co2_valve = False
        state_str = "均衡保温"
        log = "传感器温标在滞后死区平稳带内，保护启动，维持原有工作离合状态。"

        # 1. 温度调控 (滞后环判断)
        if temp < (self.target_temp - temp_deadband):
            heater = True
            state_str = "主炉补热中"
            log = f"物联网感应温度跌破死区下限 ({temp}°C < {self.target_temp - temp_deadband}°C)。加热炉继电器瞬间闭合，风门关闭。"
        elif temp > (self.target_temp + temp_deadband):
            ventilation = True
            state_str = "通风降温排温"
            log = f"温室感温过热超出死区上限 ({temp}°C > {self.target_temp + temp_deadband}°C)。关闭加热，启动大棚通风电机。"
        else:
            # 处在稳定平稳带，关闭强力调温
            heater = False
            ventilation = False

        # 2. 湿度调节 (当大棚属于平稳或加湿状态)
        if not heater and not ventilation:
            if humidity < (self.target_humidity - hum_deadband):
                humidifier = True
                state_str = "微雾加湿调节"
                log = f"棚内传感器空气湿度严重偏低 ({humidity}% < {self.target_humidity - hum_deadband}%)。高压离心加湿离合闭合。"
            elif humidity > (self.target_humidity + hum_deadband):
                humidifier = False

        # 3. 气肥调控 (CO2 环)
        if not heater and not ventilation and not humidifier:
            if co2 < (self.target_co2 - co2_deadband):
                co2_valve = True
                state_str = "二氧化碳补充"
                log = f"棚内植物进行强烈光合作用，CO2浓度亏空严重。开启电磁气阀补施二氧化碳气肥。"

        # 刷新视图继电器外观
        self.state_lbl.setText(f"大棚自控状态机模式: [{state_str}]")
        self.r1_lbl.setText(f"1# 加热继电器: [{'闭合' if heater else '断开'}]")
        self.r1_lbl.setStyleSheet(f"font-weight: bold; color: {'#ea580c' if heater else '#64748b'};")
        
        self.r2_lbl.setText(f"2# 排风机继电器: [{'闭合' if ventilation else '断开'}]")
        self.r2_lbl.setStyleSheet(f"font-weight: bold; color: {'#0284c7' if ventilation else '#64748b'};")
        
        self.r3_lbl.setText(f"3# 雾化加湿离合器: [{'闭合' if humidifier else '断开'}]")
        self.r3_lbl.setStyleSheet(f"font-weight: bold; color: {'#2563eb' if humidifier else '#64748b'};")
        
        self.r4_lbl.setText(f"4# 二氧化碳释放阀: [{'闭合' if co2_valve else '断开'}]")
        self.r4_lbl.setStyleSheet(f"font-weight: bold; color: {'#0d9488' if co2_valve else '#64748b'};")

        self.log_lbl.setText(f"滞后状态链追踪报告:\n{log}")

        # 同步回 JSON 本地缓存
        gh_id = self.gh_combo.currentData()
        g_list = self.db.data["greenhouses"]
        g = next((gh for gh in g_list if gh["id"] == gh_id), None)
        if g:
            g["currentTemp"] = temp
            g["currentHumidity"] = humidity
            g["co2Level"] = co2
            g["state"] = "IDLE" if state_str == "均衡保温" else "HEATING" if heater else "VENTING" if ventilation else "HUMIDIFYING" if humidifier else "CO2_DOSING"
            g["actuators"] = {"heater": heater, "ventilation": ventilation, "humidifier": humidifier, "co2Valve": co2_valve}
            self.db.save()
