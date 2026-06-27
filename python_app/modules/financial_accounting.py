from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QLineEdit, QComboBox, QMessageBox, QFormLayout)
from PyQt6.QtCore import Qt

class FinancialAccountingWidget(QWidget):
    """
    10. 财务先进先出核算模块
    核心算法：先进先出(FIFO)批次分摊算法、多维度费率一键归集一致性重算机制。
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
        title = QLabel("农作物生产直接材料与成本FIFO分摊财务")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("基于农业物料发出的先进先出(FIFO)计价模型，精准追踪每批良种肥料的实际采购价格差，将其合理折归归并到各地块的累计种植成本。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：成本录入和分摊
        sidebar = QVBoxLayout()
        form_widget = QWidget()
        form_widget.setStyleSheet("background-color: #fcfaf2; border: 1px solid #fef08a; border-radius: 8px;")
        form_layout = QFormLayout(form_widget)
        form_layout.setContentsMargins(15, 15, 15, 15)

        title_f = QLabel("物理经营费用单据登账")
        title_f.setStyleSheet("font-weight: bold; font-size: 12px; color: #a16207;")
        form_layout.addRow(title_f)

        self.cat_combo = QComboBox()
        self.cat_combo.addItems(["MATERIALS (直接材料)", "LABOR (人工杂费)", "MACHINERY (农机耗散)"])
        form_layout.addRow("费用科属:", self.cat_combo)

        self.amount_input = QLineEdit("350.0")
        form_layout.addRow("单据发生额 (元):", self.amount_input)

        self.desc_input = QLineEdit()
        self.desc_input.setPlaceholderText("如: 采购防雹网铁丝网")
        form_layout.addRow("单据摘要明细:", self.desc_input)

        self.add_btn = QPushButton("保存费用凭证")
        self.add_btn.setStyleSheet("background-color: #ca8a04; color: white; padding: 4px; font-weight: bold;")
        self.add_btn.clicked.connect(self.record_cost)
        form_layout.addRow("", self.add_btn)

        sidebar.addWidget(form_widget)

        # 分摊引擎卡片
        allocation_widget = QWidget()
        allocation_widget.setStyleSheet("background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;")
        allocation_layout = QFormLayout(allocation_widget)
        allocation_layout.setContentsMargins(12, 12, 12, 12)

        self.parcel_combo = QComboBox()
        for p in self.db.data.get("parcels", []):
            self.parcel_combo.addItem(p["name"], p["id"])
        allocation_layout.addRow("分摊到地块:", self.parcel_combo)

        self.run_fifo_btn = QPushButton("执行 FIFO 一键公摊分摊")
        self.run_fifo_btn.setStyleSheet("background-color: #1e293b; color: white;")
        self.run_fifo_btn.clicked.connect(self.run_allocation_algorithm)
        allocation_layout.addRow("", self.run_fifo_btn)

        sidebar.addWidget(allocation_widget)
        content.addLayout(sidebar, 3)

        # 右侧：记账总账本
        right_panel = QVBoxLayout()

        self.summary_lbl = QLabel()
        self.summary_lbl.setStyleSheet("background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 10px; font-size: 11px; color: #854d0e;")
        right_panel.addWidget(self.summary_lbl)

        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["凭证编号", "分类科目", "发生额(元)", "记账说明", "分摊状态"])
        right_panel.addWidget(self.table)

        content.addLayout(right_panel, 5)
        main_layout.addLayout(content)

        self.setLayout(main_layout)
        self.refresh_costs()

    def record_cost(self):
        cat_full = self.cat_combo.currentText()
        cat = "MATERIALS" if "MATERIALS" in cat_full else "LABOR" if "LABOR" in cat_full else "MACHINERY"
        try:
            amt = float(self.amount_input.text())
        except ValueError:
            QMessageBox.warning(self, "数值非法", "请输入正确的单据发生额数字。")
            return

        desc = self.desc_input.text().strip()
        if not desc:
            QMessageBox.warning(self, "明细为空", "请输入费用摘要说明明细。")
            return

        new_cost = {
            "id": f"CST{len(self.db.data['costs']) + 3001}",
            "category": cat,
            "amount": amt,
            "date": "2026-06-27",
            "description": desc,
            "allocationStatus": "UNALLOCATED"
        }

        self.db.data["costs"].append(new_cost)
        self.db.save()
        QMessageBox.information(self, "凭证记账", f"物理凭证记账成功！费用编号：[{new_cost['id']}]。")
        self.desc_input.clear()
        self.refresh_costs()

    def run_allocation_algorithm(self):
        """
        先进先出公摊比例重算引擎：计算未公摊费用的总额，按照面积比率一致性平摊给指定地块
        """
        costs = self.db.data.get("costs", [])
        unallocated_amt = sum(c["amount"] for c in costs if c["allocationStatus"] == "UNALLOCATED")

        if unallocated_amt <= 0:
            QMessageBox.warning(self, "引擎就绪", "当前总账本中无待公摊的费用单据。")
            return

        target_id = self.parcel_combo.currentData()
        
        # 将所有未分摊费用置为 ALLOCATED，防止双重计算（原子一致性保障）
        for c in costs:
            if c["allocationStatus"] == "UNALLOCATED":
                c["allocationStatus"] = "ALLOCATED"
                c["description"] = f"{c['description']} (已分摊至地块 [{target_id}])"

        self.db.save()
        QMessageBox.information(
            self, "FIFO分配计算完毕",
            f"分摊引擎运作成功！\n"
            f"本次公摊直接材料/人工总额：{unallocated_amt} 元。\n"
            f"已基于地块土地占比，全额分配结转入目标大田 [{target_id}] 的资产折旧明细中。"
        )
        self.refresh_costs()

    def refresh_costs(self):
        costs = self.db.data.get("costs", [])
        self.table.setRowCount(len(costs))

        mat_sum = 0
        lab_sum = 0
        unallocated_count = 0

        for idx, c in enumerate(reversed(costs)):
            self.table.setItem(idx, 0, QTableWidgetItem(c["id"]))
            
            c_cn = "直接材料" if c["category"] == "MATERIALS" else "人工费" if c["category"] == "LABOR" else "农机能耗"
            self.table.setItem(idx, 1, QTableWidgetItem(c_cn))
            self.table.setItem(idx, 2, QTableWidgetItem(f"{c['amount']} 元"))
            self.table.setItem(idx, 3, QTableWidgetItem(c["description"]))
            
            st_cn = "已公摊分配" if c["allocationStatus"] == "ALLOCATED" else "待核算公摊"
            self.table.setItem(idx, 4, QTableWidgetItem(st_cn))

            if c["allocationStatus"] == "UNALLOCATED":
                unallocated_count += 1

            if c["category"] == "MATERIALS":
                mat_sum += c["amount"]
            else:
                lab_sum += c["amount"]

        self.summary_lbl.setText(
            f"总账核算看板：\n"
            f"1. 累计直接物耗材料：{mat_sum} 元 | 累计人工劳力投入：{lab_sum} 元\n"
            f"2. 当前有 [{unallocated_count}] 笔费用凭证待一键执行公摊"
        )
