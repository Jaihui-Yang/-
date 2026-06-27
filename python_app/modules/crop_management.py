from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QComboBox, QFormLayout, QLineEdit, QMessageBox)
from PyQt6.QtCore import Qt

class CropManagementWidget(QWidget):
    """
    1. 地块与作物管理模块
    核心算法：连作植物亲缘科属轮作校验、作物状态转移联动机制。
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
        title = QLabel("地块物理资产与作物轮作管理")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("监管全农地块种植周期，内置作物轮作约束，强制隔离植物病原，防范单一科作物连作耗空土壤基肥。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content_layout = QHBoxLayout()

        # 左侧：地块化验指标
        self.parcel_table = QTableWidget()
        self.parcel_table.setColumnCount(4)
        self.parcel_table.setHorizontalHeaderLabels(["地块编码", "名称", "测土NPK含量 (mg)", "当前作物"])
        self.parcel_table.horizontalHeader().setStretchLastSection(True)
        content_layout.addWidget(self.parcel_table, 4)

        # 右侧：新建种植规划
        form_widget = QWidget()
        form_widget.setStyleSheet("background-color: #f1f5f9; border-radius: 8px;")
        form_layout = QFormLayout(form_widget)
        form_layout.setContentsMargins(15, 15, 15, 15)

        form_title = QLabel("拟定新一茬作物规划")
        form_title.setStyleSheet("font-weight: bold; font-size: 13px; color: #1e293b; margin-bottom: 5px;")
        form_layout.addRow(form_title)

        self.parcel_combo = QComboBox()
        form_layout.addRow("选择地块:", self.parcel_combo)

        self.crop_combo = QComboBox()
        self.crop_combo.addItems(["番茄", "马铃薯", "大豆", "豌豆", "小麦", "玉米", "白菜", "西兰花"])
        form_layout.addRow("拟种作物:", self.crop_combo)

        self.sow_input = QLineEdit("2026-07-01")
        form_layout.addRow("播种日期:", self.sow_input)

        self.harvest_input = QLineEdit("2026-10-15")
        form_layout.addRow("收获日期:", self.harvest_input)

        self.add_btn = QPushButton("提交轮作校验并排产")
        self.add_btn.setStyleSheet("background-color: #059669; color: white; padding: 6px; font-weight: bold;")
        self.add_btn.clicked.connect(self.create_crop_plan)
        form_layout.addRow("", self.add_btn)

        content_layout.addWidget(form_widget, 3)
        main_layout.addLayout(content_layout)

        # 下方：现有种植排程追踪及流转
        self.plan_table = QTableWidget()
        self.plan_table.setColumnCount(6)
        self.plan_table.setHorizontalHeaderLabels(["方案编号", "地块", "规划作物", "计划周期", "状态", "控制操作"])
        main_layout.addWidget(self.plan_table)

        self.setLayout(main_layout)
        self.refresh_data()

    def refresh_data(self):
        # 1. 刷新地块信息
        parcels = self.db.data.get("parcels", [])
        self.parcel_table.setRowCount(len(parcels))
        self.parcel_combo.clear()

        for idx, p in enumerate(parcels):
            self.parcel_table.setItem(idx, 0, QTableWidgetItem(p["id"]))
            self.parcel_table.setItem(idx, 1, QTableWidgetItem(p["name"]))
            npk_str = f"N:{p['nutrientLevel']['n']} P:{p['nutrientLevel']['p']} K:{p['nutrientLevel']['k']}"
            self.parcel_table.setItem(idx, 2, QTableWidgetItem(npk_str))
            self.parcel_table.setItem(idx, 3, QTableWidgetItem(p["currentCrop"] or "闲置大田"))
            
            self.parcel_combo.addItem(f"{p['id']} - {p['name']}", p["id"])

        # 2. 刷新作物计划
        plans = self.db.data.get("crop_plans", [])
        self.plan_table.setRowCount(len(plans))
        for idx, plan in enumerate(plans):
            self.plan_table.setItem(idx, 0, QTableWidgetItem(plan["id"]))
            self.plan_table.setItem(idx, 1, QTableWidgetItem(plan["parcelId"]))
            self.plan_table.setItem(idx, 2, QTableWidgetItem(plan["cropName"]))
            self.plan_table.setItem(idx, 3, QTableWidgetItem(f"{plan['sowDate']} 至 {plan['expectedHarvest']}"))
            self.plan_table.setItem(idx, 4, QTableWidgetItem(self.translate_status(plan["status"])))

            # 流转按钮组
            btn = QPushButton("推进阶段")
            btn.setStyleSheet("font-size: 10px; padding: 2px;")
            btn.clicked.connect(lambda checked, p_id=plan["id"]: self.transit_state(p_id))
            self.plan_table.setCellWidget(idx, 5, btn)

    def translate_status(self, status):
        mapping = {"PLANNING": "待播种", "SOWN": "已播种", "GROWING": "成长生长期", "HARVESTED": "已收获结案"}
        return mapping.get(status, status)

    def validate_rotation(self, parcel, new_crop):
        """
        作物轮作隔离算法：判断上一茬作物的科属与拟种作物是否相同，以保护土壤养分平衡。
        """
        if not parcel["history"]:
            return True, ""
        
        last_crop = parcel["history"][-1]
        
        category_map = {
            "番茄": "SOLANACEOUS", "马铃薯": "SOLANACEOUS",
            "大豆": "LEGUME", "豌豆": "LEGUME",
            "小麦": "CEREAL", "玉米": "CEREAL",
            "白菜": "CRUCIFEROUS", "西兰花": "CRUCIFEROUS"
        }

        last_category = category_map.get(last_crop)
        new_category = category_map.get(new_crop)

        if last_category and last_category == new_category:
            names = {"SOLANACEOUS": "茄科类", "LEGUME": "豆科类", "CEREAL": "谷物类", "CRUCIFEROUS": "十字花科类"}
            return False, f"检测到科属连作冲突：地块上一茬为 [{last_crop}]，拟种的 [{new_crop}] 亦属于 [{names[new_category]}]，连作极易导致土壤特定作物害虫与真菌病害爆发。"
        
        return True, ""

    def create_crop_plan(self):
        parcel_id = self.parcel_combo.currentData()
        crop = self.crop_combo.currentText()
        sow_dt = self.sow_input.text()
        har_dt = self.harvest_input.text()

        parcels = self.db.data["parcels"]
        parcel = next((p for p in parcels if p["id"] == parcel_id), None)
        if not parcel:
            return

        # 执行轮作校验
        is_valid, msg = self.validate_rotation(parcel, crop)
        if not is_valid:
            QMessageBox.critical(self, "轮作冲突阻断", msg)
            return

        # 创建种植方案
        new_plan = {
            "id": f"CP{len(self.db.data['crop_plans']) + 1001}",
            "parcelId": parcel_id,
            "cropName": crop,
            "category": "CEREAL", # 简化处理
            "sowDate": sow_dt,
            "expectedHarvest": har_dt,
            "status": "PLANNING"
        }
        
        # 更新地块当前作物属性（保证数据一致性）
        parcel["currentCrop"] = crop

        self.db.data["crop_plans"].append(new_plan)
        self.db.save()
        
        QMessageBox.information(self, "规划确立", f"种植规划已成功建立！地块 [{parcel['name']}] 的种植作物已登记。")
        self.refresh_data()

    def transit_state(self, plan_id):
        plans = self.db.data["crop_plans"]
        plan = next((p for p in plans if p["id"] == plan_id), None)
        if not plan:
            return

        status_flow = ["PLANNING", "SOWN", "GROWING", "HARVESTED"]
        curr_idx = status_flow.index(plan["status"])
        
        if curr_idx >= len(status_flow) - 1:
            QMessageBox.warning(self, "无法流转", "该种植计划已收获并结案，状态无法再推进。")
            return

        next_status = status_flow[curr_idx + 1]
        plan["status"] = next_status

        # 如果进入 HARVESTED，联动将地块当前作物设为空，写入地块历史（一致性更新）
        if next_status == "HARVESTED":
            parcels = self.db.data["parcels"]
            parcel = next((p for p in parcels if p["id"] == plan["parcelId"]), None)
            if parcel:
                parcel["currentCrop"] = None
                parcel["history"].append(plan["cropName"])

        self.db.save()
        self.refresh_data()
