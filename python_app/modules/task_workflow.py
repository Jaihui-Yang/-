from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QLineEdit, QComboBox, QMessageBox, QFormLayout)
from PyQt6.QtCore import Qt

class TaskWorkflowWidget(QWidget):
    """
    9. 农事任务审批链模块
    核心算法：RBAC多级安全审核控制阀门、农事派单生命周期跃迁。
    """
    def __init__(self, db, username="admin", role="ADMIN"):
        super().__init__()
        self.db = db
        self.username = username
        self.role = role
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # 标题
        title = QLabel("农事指令多级派发与安全审批工作流")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel(f"当前作业者: {self.username} (角色权限: {self.role})。通过RBAC锁机制，严格规范一线的施药、除草作业立案与执行监督。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：指令下达
        form_widget = QWidget()
        form_widget.setStyleSheet("background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;")
        form_layout = QFormLayout(form_widget)
        form_layout.setContentsMargins(15, 15, 15, 15)

        title_f = QLabel("下达新农事作业指令")
        title_f.setStyleSheet("font-weight: bold; font-size: 12px; color: #1e293b;")
        form_layout.addRow(title_f)

        self.title_input = QLineEdit()
        self.title_input.setPlaceholderText("如: 马铃薯收获前杀秧作业")
        form_layout.addRow("任务主题:", self.title_input)

        self.worker_input = QLineEdit()
        self.worker_input.setPlaceholderText("如: 王大明 (植保组)")
        form_layout.addRow("承接人:", self.worker_input)

        self.parcel_combo = QComboBox()
        for p in self.db.data.get("parcels", []):
            self.parcel_combo.addItem(p["name"], p["id"])
        form_layout.addRow("作业范围:", self.parcel_combo)

        self.prio_combo = QComboBox()
        self.prio_combo.addItems(["LOW", "MEDIUM", "HIGH"])
        form_layout.addRow("紧急系数:", self.prio_combo)

        self.add_btn = QPushButton("保存指令草稿")
        self.add_btn.setStyleSheet("background-color: #0284c7; color: white; padding: 4px;")
        self.add_btn.clicked.connect(self.create_task)
        form_layout.addRow("", self.add_btn)

        content.addWidget(form_widget, 3)

        # 右侧：工作流管控表
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["指令编号", "任务名", "执行人", "紧急度", "审批执行状态", "流转锁操作"])
        content.addWidget(self.table, 5)

        main_layout.addLayout(content)
        self.setLayout(main_layout)
        self.refresh_tasks()

    def create_task(self):
        title = self.title_input.text().strip()
        worker = self.worker_input.text().strip()
        parcel_id = self.parcel_combo.currentData()
        prio = self.prio_combo.currentText()

        if not title or not worker:
            QMessageBox.warning(self, "输入未完", "请填写完整的任务和执行人。")
            return

        new_task = {
            "id": f"TSK{len(self.db.data['tasks']) + 901}",
            "title": title,
            "assignedTo": worker,
            "parcelId": parcel_id,
            "priority": prio,
            "status": "DRAFT"
        }

        self.db.data["tasks"].append(new_task)
        self.db.save()
        QMessageBox.information(self, "指令立案", f"农事单据 [{new_task['id']}] 已录入。当前状态为：[草稿/待派发]。")
        
        self.title_input.clear()
        self.worker_input.clear()
        self.refresh_tasks()

    def refresh_tasks(self):
        tasks = self.db.data.get("tasks", [])
        self.table.setRowCount(len(tasks))
        for idx, t in enumerate(reversed(tasks)):
            self.table.setItem(idx, 0, QTableWidgetItem(t["id"]))
            self.table.setItem(idx, 1, QTableWidgetItem(t["title"]))
            self.table.setItem(idx, 2, QTableWidgetItem(t["assignedTo"]))
            self.table.setItem(idx, 3, QTableWidgetItem(t["priority"]))
            self.table.setItem(idx, 4, QTableWidgetItem(self.translate_status(t["status"])))

            # 流程审批按钮
            if t["status"] == "DRAFT":
                btn = QPushButton("审核并签发")
                btn.setStyleSheet("font-size: 10px; background-color: #d97706; color: white;")
                btn.clicked.connect(lambda checked, t_id=t["id"]: self.dispatch_task(t_id))
                self.table.setCellWidget(idx, 5, btn)
            elif t["status"] == "DISPATCHED":
                btn = QPushButton("确认现场完工")
                btn.setStyleSheet("font-size: 10px; background-color: #059669; color: white;")
                btn.clicked.connect(lambda checked, t_id=t["id"]: self.complete_task(t_id))
                self.table.setCellWidget(idx, 5, btn)
            else:
                self.table.setItem(idx, 5, QTableWidgetItem("流程已归档"))

    def translate_status(self, status):
        mapping = {"DRAFT": "草稿/待签发", "DISPATCHED": "作业员执行中", "COMPLETED": "流程结束结案"}
        return mapping.get(status, status)

    def dispatch_task(self, task_id):
        # 严格权限校验：只有 ADMIN 或 MANAGER 角色可以执行签发（RBAC锁）
        if self.role not in ["ADMIN", "MANAGER"]:
            QMessageBox.critical(self, "越权拦截", "指令审核失败！当前登录账户不具备 [主管/经理级] 业务签发授权权限。")
            return

        tasks = self.db.data["tasks"]
        t = next((tk for tk in tasks if tk["id"] == task_id), None)
        if t:
            t["status"] = "DISPATCHED"
            self.db.save()
            QMessageBox.information(self, "审核放行", f"派单审批成功！指令 [{task_id}] 已进入派发流转，推送短信提醒一线作业员现场处理。")
            self.refresh_tasks()

    def complete_task(self, task_id):
        # 任何授信角色皆可提交现场完工单
        tasks = self.db.data["tasks"]
        t = next((tk for tk in tasks if tk["id"] == task_id), None)
        if t:
            t["status"] = "COMPLETED"
            self.db.save()
            QMessageBox.information(self, "指令结案", f"工单核销完成！单据 [{task_id}] 已归入历史账簿中。")
            self.refresh_tasks()
