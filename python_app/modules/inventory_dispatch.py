from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QLineEdit, QComboBox, QMessageBox, QFormLayout)
from PyQt6.QtCore import Qt

class InventoryDispatchWidget(QWidget):
    """
    3. 农资与库存调度模块
    核心算法：库存储备安全ROP公式、出库负值异常拦截。
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
        title = QLabel("良种农药肥料库存与重订货预警")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("监控种子、农肥、植保防卫物资的仓容占用，应用动态重订货算法分析供应链运输滞后期并拦截断货。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：现有库存和报警
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["物料编号", "品名", "品类", "当前数量", "安全底线", "预警状态"])
        content.addWidget(self.table, 5)

        # 右侧：库存提取派发和采购
        sidebar = QVBoxLayout()

        # 出库提取
        out_widget = QWidget()
        out_widget.setStyleSheet("background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;")
        out_layout = QFormLayout(out_widget)
        out_layout.setContentsMargins(12, 12, 12, 12)

        title_out = QLabel("物料调配分发 (出库事务)")
        title_out.setStyleSheet("font-weight: bold; font-size: 12px; color: #b45309;")
        out_layout.addRow(title_out)

        self.item_combo = QComboBox()
        out_layout.addRow("选择农资:", self.item_combo)

        self.parcel_combo = QComboBox()
        out_layout.addRow("分派地块:", self.parcel_combo)

        self.qty_input = QLineEdit("50")
        out_layout.addRow("出库数量:", self.qty_input)

        self.dispatch_btn = QPushButton("扣减并分拨到地块")
        self.dispatch_btn.setStyleSheet("background-color: #d97706; color: white; padding: 4px; font-weight: bold;")
        self.dispatch_btn.clicked.connect(self.dispatch_materials)
        out_layout.addRow("", self.dispatch_btn)

        sidebar.addWidget(out_widget)

        # 入库申报
        in_widget = QWidget()
        in_widget.setStyleSheet("background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;")
        in_layout = QFormLayout(in_widget)
        in_layout.setContentsMargins(12, 12, 12, 12)

        title_in = QLabel("入库登记建档 (采购事务)")
        title_in.setStyleSheet("font-weight: bold; font-size: 12px; color: #1e293b;")
        in_layout.addRow(title_in)

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("如: 进口高钾肥")
        in_layout.addRow("物料品名:", self.name_input)

        self.cat_combo = QComboBox()
        self.cat_combo.addItems(["FERTILIZER", "SEED", "PESTICIDE"])
        in_layout.addRow("物资科属:", self.cat_combo)

        self.stock_input = QLineEdit("500")
        in_layout.addRow("到货数量:", self.stock_input)

        self.safety_input = QLineEdit("100")
        in_layout.addRow("安全库存:", self.safety_input)

        self.add_btn = QPushButton("入库登记登记")
        self.add_btn.setStyleSheet("background-color: #334155; color: white; padding: 4px;")
        self.add_btn.clicked.connect(self.add_inventory_item)
        in_layout.addRow("", self.add_btn)

        sidebar.addWidget(in_widget)
        content.addLayout(sidebar, 3)
        main_layout.addLayout(content)

        self.setLayout(main_layout)
        self.refresh_data()

    def refresh_data(self):
        inventory = self.db.data.get("inventory", [])
        self.table.setRowCount(len(inventory))
        self.item_combo.clear()

        for idx, item in enumerate(inventory):
            self.table.setItem(idx, 0, QTableWidgetItem(item["id"]))
            self.table.setItem(idx, 1, QTableWidgetItem(item["name"]))
            
            cat_cn = "化肥" if item["category"] == "FERTILIZER" else "良种" if item["category"] == "SEED" else "农药"
            self.table.setItem(idx, 2, QTableWidgetItem(cat_cn))
            self.table.setItem(idx, 3, QTableWidgetItem(f"{item['quantity']} {item['unit']}"))
            self.table.setItem(idx, 4, QTableWidgetItem(f"{item['safetyStock']} {item['unit']}"))

            # ROP 警报
            daily_usage = item["safetyStock"] * 0.05
            rop_point = (daily_usage * item["leadTimeDays"]) + item["safetyStock"]

            if item["quantity"] <= item["safetyStock"]:
                status_item = QTableWidgetItem("低于安全线！")
                status_item.setForeground(Qt.GlobalColor.red)
            elif item["quantity"] <= rop_point:
                status_item = QTableWidgetItem("建议备货")
                status_item.setForeground(Qt.GlobalColor.darkYellow)
            else:
                status_item = QTableWidgetItem("充足")
                status_item.setForeground(Qt.GlobalColor.darkGreen)

            self.table.setItem(idx, 5, status_item)

            # 填充下拉列表
            self.item_combo.addItem(f"{item['name']} ({item['quantity']}{item['unit']})", item["id"])

        self.parcel_combo.clear()
        for p in self.db.data.get("parcels", []):
            self.parcel_combo.addItem(p["name"], p["id"])

    def dispatch_materials(self):
        item_id = self.item_combo.currentData()
        parcel_id = self.parcel_combo.currentData()
        
        try:
            qty = float(self.qty_input.text())
        except ValueError:
            QMessageBox.warning(self, "输入错误", "请输入有效的数字数量。")
            return

        inventory = self.db.data["inventory"]
        item = next((i for i in inventory if i["id"] == item_id), None)
        if not item:
            return

        # 一致性拦截校验：库存下溢（不允许负数库存，原子一致性拦截）
        if item["quantity"] < qty:
            QMessageBox.critical(self, "出库事务熔断", 
                                 f"扣减异常：物料 [{item['name']}] 在库量为 {item['quantity']}{item['unit']}，"
                                 f"无法完成本次拟领用 {qty}{item['unit']} 的调度提取申请。")
            return

        # 扣减库存并保存
        item["quantity"] -= qty
        self.db.save()
        
        QMessageBox.information(self, "调配完成", 
                                 f"出库登记成功！提取物料 [{item['name']}] 共 {qty}{item['unit']}，"
                                 f"已安全下达交付目标地块 [{parcel_id}]。")
        self.refresh_data()

    def add_inventory_item(self):
        name = self.name_input.text().strip()
        cat = self.cat_combo.currentText()
        try:
            qty = float(self.stock_input.text())
            safety = float(self.safety_input.text())
        except ValueError:
            QMessageBox.warning(self, "格式错误", "请输入正确的数值。")
            return

        if not name:
            QMessageBox.warning(self, "输入未完", "请输入物资品名。")
            return

        new_item = {
            "id": f"INV{len(self.db.data['inventory']) + 101}",
            "name": name,
            "category": cat,
            "quantity": qty,
            "unit": "kg",
            "safetyStock": safety,
            "pricePerUnit": 15.0,
            "leadTimeDays": 5
        }

        self.db.data["inventory"].append(new_item)
        self.db.save()
        
        QMessageBox.information(self, "入库登记完成", f"物资 [{name}] 已正式入库建档并处于供应链监控中。")
        self.name_input.clear()
        self.refresh_data()
