import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QLineEdit, QPushButton, 
                             QListWidget, QStackedWidget, QMessageBox, QComboBox)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

from db_mock import DatabaseMock

# 动态载入 10 大核心模块视图
from modules.crop_management import CropManagementWidget
from modules.irrigation_control import IrrigationControlWidget
from modules.inventory_dispatch import InventoryDispatchWidget
from modules.machinery_dispatch import MachineryDispatchWidget
from modules.fertilization_recommend import FertilizationRecommendWidget
from modules.pest_disease_control import PestDiseaseControlWidget
from modules.harvest_traceability import HarvestTraceabilityWidget
from modules.greenhouse_control import GreenhouseControlWidget
from modules.task_workflow import TaskWorkflowWidget
from modules.financial_accounting import FinancialAccountingWidget

class LoginWindow(QWidget):
    """
    系统登录与新用户注册统一认证界面
    """
    def __init__(self, db, on_success_callback):
        super().__init__()
        self.db = db
        self.on_success = on_success_callback
        self.is_register_mode = False
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("农业智能安全管理平台 - 身份核验")
        self.resize(380, 420)
        self.setStyleSheet("""
            QWidget {
                background-color: #1e293b;
                color: #f8fafc;
                font-family: 'Segoe UI', Arial, sans-serif;
            }
            QLabel {
                font-size: 12px;
                color: #94a3b8;
            }
            QLineEdit {
                background-color: #334155;
                border: 1px solid #475569;
                border-radius: 6px;
                padding: 8px;
                color: #f8fafc;
                font-size: 13px;
            }
            QLineEdit:focus {
                border-color: #059669;
            }
            QPushButton {
                background-color: #059669;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px;
                font-weight: bold;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #047857;
            }
            QComboBox {
                background-color: #334155;
                border: 1px solid #475569;
                border-radius: 6px;
                padding: 6px;
                color: #f8fafc;
            }
        """)

        layout = QVBoxLayout()
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(12)

        # 头部 Logo 和标题
        self.logo_lbl = QLabel("农")
        self.logo_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.logo_lbl.setStyleSheet("font-size: 36px; font-weight: bold; color: #10b981;")
        layout.addWidget(self.logo_lbl)

        self.title_lbl = QLabel("农业智能安全管理平台")
        self.title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.title_lbl.setStyleSheet("font-size: 16px; font-weight: bold; color: white;")
        layout.addWidget(self.title_lbl)

        self.sub_lbl = QLabel("基于边缘流控状态机与先进先出成本分析引擎")
        self.sub_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.sub_lbl.setStyleSheet("font-size: 10px; color: #64748b; margin-bottom: 10px;")
        layout.addWidget(self.sub_lbl)

        # 用户名
        layout.addWidget(QLabel("登录账号"))
        self.user_input = QLineEdit()
        self.user_input.setPlaceholderText("请输入用户名")
        self.user_input.setText("admin")
        layout.addWidget(self.user_input)

        # 密码
        layout.addWidget(QLabel("安全密码"))
        self.pass_input = QLineEdit()
        self.pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.pass_input.setPlaceholderText("请输入登录密码")
        self.pass_input.setText("123456")
        layout.addWidget(self.pass_input)

        # 角色选择 (仅在注册模式下可见)
        self.role_lbl = QLabel("授信系统角色 (RBAC)")
        self.role_lbl.setVisible(False)
        layout.addWidget(self.role_lbl)

        self.role_combo = QComboBox()
        self.role_combo.addItems(["ADMIN", "MANAGER", "OPERATOR"])
        self.role_combo.setVisible(False)
        layout.addWidget(self.role_combo)

        # 登录/注册按钮
        self.submit_btn = QPushButton("确 认 登 录")
        self.submit_btn.clicked.connect(self.handle_submit)
        layout.addWidget(self.submit_btn)

        # 模式切换
        self.switch_btn = QPushButton("没有账号？申请新账号建档注册")
        self.switch_btn.setStyleSheet("background-color: transparent; color: #10b981; font-size: 11px; text-decoration: underline;")
        self.switch_btn.clicked.connect(self.toggle_mode)
        layout.addWidget(self.switch_btn)

        self.setLayout(layout)

    def toggle_mode(self):
        self.is_register_mode = not self.is_register_mode
        self.role_lbl.setVisible(self.is_register_mode)
        self.role_combo.setVisible(self.is_register_mode)
        if self.is_register_mode:
            self.submit_btn.setText("提 交 注 册")
            self.switch_btn.setText("已有账号？返回登录面")
        else:
            self.submit_btn.setText("确 认 登 录")
            self.switch_btn.setText("没有账号？申请新账号建档注册")

    def handle_submit(self):
        user = self.user_input.text().strip()
        pwd = self.pass_input.text().strip()

        if not user or not pwd:
            QMessageBox.warning(self, "核验失败", "请填写完整的账号及密码")
            return

        users = self.db.data.get("users", {})

        if self.is_register_mode:
            if user in users:
                QMessageBox.critical(self, "注册失败", "此用户名已被登记占用")
                return
            # 登记新用户
            role = self.role_combo.currentText()
            users[user] = {"pass": pwd, "role": role}
            self.db.data["users"] = users
            self.db.save()
            QMessageBox.information(self, "注册成功", "账户档案创建成功，请登录！")
            self.toggle_mode()
        else:
            if user not in users or users[user]["pass"] != pwd:
                QMessageBox.critical(self, "核验失败", "登录账号或安全密码不匹配")
                return
            # 登录成功
            self.on_success(user, users[user]["role"])


class MainWindow(QMainWindow):
    """
    农业智能平台主窗体，左侧10大菜单导航，右侧动态QStackedWidget页面切分
    """
    def __init__(self, db, username, role):
        super().__init__()
        self.db = db
        self.username = username
        self.role = role
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle(f"农业智能安全管理平台 - 当前用户: {self.username} ({self.role})")
        self.resize(1100, 720)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f8fafc;
            }
            QListWidget {
                background-color: #0f172a;
                color: #cbd5e1;
                border: none;
                font-size: 12px;
                padding: 10px;
            }
            QListWidget::item {
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 4px;
            }
            QListWidget::item:hover {
                background-color: #1e293b;
                color: white;
            }
            QListWidget::item:selected {
                background-color: #065f46;
                color: #34d399;
                font-weight: bold;
            }
        """)

        # 核心主布局
        main_layout = QHBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 1. 左侧侧边栏布局
        sidebar_widget = QWidget()
        sidebar_widget.setStyleSheet("background-color: #0f172a;")
        sidebar_widget.setFixedWidth(240)
        sidebar_layout = QVBoxLayout(sidebar_widget)
        sidebar_layout.setContentsMargins(10, 20, 10, 15)

        # 平台标志
        title_lbl = QLabel("农业智能安全平台")
        title_lbl.setStyleSheet("color: white; font-size: 15px; font-weight: bold; padding-left: 10px;")
        subtitle_lbl = QLabel("QPyQt6 生产级业务系统")
        subtitle_lbl.setStyleSheet("color: #64748b; font-size: 10px; padding-left: 10px; margin-bottom: 15px;")
        sidebar_layout.addWidget(title_lbl)
        sidebar_layout.addWidget(subtitle_lbl)

        # 10 大农业核心菜单 (无系统配置相关的杂项，纯农业核心经营)
        self.nav_list = QListWidget()
        menus = [
            "1. 地块与作物管理",
            "2. 灌溉与气象监测",
            "3. 农资与库存调度",
            "4. 农机与无人机飞控",
            "5. 智能测土施肥配方",
            "6. 病虫害生理积温",
            "7. 采收计划及溯源",
            "8. 温室大棚环控机",
            "9. 农事任务审批链",
            "10. 财务先进先出核算"
        ]
        self.nav_list.addItems(menus)
        self.nav_list.currentRowChanged.connect(self.switch_tab)
        sidebar_layout.addWidget(self.nav_list)

        # 用户档案底栏
        user_lbl = QLabel(f"在线: {self.username}\n角色: {self.role}")
        user_lbl.setStyleSheet("color: #94a3b8; font-size: 11px; padding: 10px; background-color: #1e293b; border-radius: 6px;")
        sidebar_layout.addWidget(user_lbl)

        main_layout.addWidget(sidebar_widget)

        # 2. 右侧 StackedWidget 主视图区
        self.stack = QStackedWidget()
        
        # 实例化并添加 10 个独立菜单页组件
        self.stack.addWidget(CropManagementWidget(self.db))
        self.stack.addWidget(IrrigationControlWidget(self.db))
        self.stack.addWidget(InventoryDispatchWidget(self.db))
        self.stack.addWidget(MachineryDispatchWidget(self.db))
        self.stack.addWidget(FertilizationRecommendWidget(self.db))
        self.stack.addWidget(PestDiseaseControlWidget(self.db))
        self.stack.addWidget(HarvestTraceabilityWidget(self.db))
        self.stack.addWidget(GreenhouseControlWidget(self.db))
        self.stack.addWidget(TaskWorkflowWidget(self.db, self.username, self.role))
        self.stack.addWidget(FinancialAccountingWidget(self.db))

        main_layout.addWidget(self.stack)

        # 设置中心视图
        container = QWidget()
        container.setLayout(main_layout)
        self.setCentralWidget(container)
        
        self.nav_list.setCurrentRow(0)

    def switch_tab(self, index):
        self.stack.setCurrentIndex(index)


def main():
    app = QApplication(sys.argv)
    
    # 建立 JSON 数据模型
    db = DatabaseMock()
    
    login_win = []
    main_win = []

    def on_login_success(username, role):
        # 认证成功，关闭登录拉起主面板
        login_win[0].close()
        mw = MainWindow(db, username, role)
        main_win.append(mw)
        mw.show()

    lw = LoginWindow(db, on_login_success)
    login_win.append(lw)
    lw.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
