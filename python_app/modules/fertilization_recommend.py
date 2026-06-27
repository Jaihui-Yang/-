from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QTableWidget, QTableWidgetItem, 
                             QFormLayout, QComboBox, QSlider, QMessageBox)
from PyQt6.QtCore import Qt
import datetime

class FertilizationRecommendWidget(QWidget):
    """
    5. 智能施肥与配方推荐模块
    核心算法：土肥差值补偿测算公式、地块养分一致性重计算更新。
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
        title = QLabel("测土配方施肥与物理纯养分化验")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;")
        main_layout.addWidget(title)

        desc = QLabel("采集地块碱解氮、有效磷、速效钾三项核心化验浓度，结合吸收指数自动输出补施配料卡，严防化肥过量面源污染。")
        desc.setStyleSheet("font-size: 11px; color: #64748b; margin-bottom: 5px;")
        main_layout.addWidget(desc)

        content = QHBoxLayout()

        # 左侧：微调测试
        sidebar = QVBoxLayout()
        form_widget = QWidget()
        form_widget.setStyleSheet("background-color: #f2fbf9; border: 1px solid #ccfbf1; border-radius: 8px;")
        form_layout = QFormLayout(form_widget)
        form_layout.setContentsMargins(15, 15, 15, 15)

        title_f = QLabel("测土速测理化指标录入")
        title_f.setStyleSheet("font-weight: bold; font-size: 12px; color: #0d9488;")
        form_layout.addRow(title_f)

        self.parcel_combo = QComboBox()
        for p in self.db.data.get("parcels", []):
            self.parcel_combo.addItem(p["name"], p["id"])
        self.parcel_combo.currentIndexChanged.connect(self.sync_parcel_nutrients)
        form_layout.addRow("测试地块:", self.parcel_combo)

        self.crop_combo = QComboBox()
        self.crop_combo.addItems(["番茄", "小麦", "大豆", "白菜"])
        self.crop_combo.currentIndexChanged.connect(self.calculate_formula)
        form_layout.addRow("拟补给作物:", self.crop_combo)

        # 氮
        self.n_lbl = QLabel("碱解氮 N: 85 mg/kg")
        self.n_slider = QSlider(Qt.Orientation.Horizontal)
        self.n_slider.setRange(20, 200)
        self.n_slider.setValue(85)
        self.n_slider.valueChanged.connect(self.calculate_formula)
        form_layout.addRow(self.n_lbl, self.n_slider)

        # 磷
        self.p_lbl = QLabel("有效磷 P: 30 mg/kg")
        self.p_slider = QSlider(Qt.Orientation.Horizontal)
        self.p_slider.setRange(10, 100)
        self.p_slider.setValue(30)
        self.p_slider.valueChanged.connect(self.calculate_formula)
        form_layout.addRow(self.p_lbl, self.p_slider)

        # 钾
        self.k_lbl = QLabel("速效钾 K: 70 mg/kg")
        self.k_slider = QSlider(Qt.Orientation.Horizontal)
        self.k_slider.setRange(30, 250)
        self.k_slider.setValue(70)
        self.k_slider.valueChanged.connect(self.calculate_formula)
        form_layout.addRow(self.k_lbl, self.k_slider)

        self.calc_btn = QPushButton("生成测土化学施肥配方")
        self.calc_btn.setStyleSheet("background-color: #0d9488; color: white; padding: 6px; font-weight: bold;")
        self.calc_btn.clicked.connect(self.generate_recipe)
        form_layout.addRow("", self.calc_btn)

        sidebar.addWidget(form_widget)
        content.addLayout(sidebar, 3)

        # 右侧：输出诊断和列表
        right = QVBoxLayout()
        self.diag_lbl = QLabel("化验中...")
        self.diag_lbl.setStyleSheet("background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 10px; font-size: 11px; color: #0f766e;")
        right.addWidget(self.diag_lbl)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["配方编号", "地块", "对应作物", "纯养分配比推荐", "状态", "控制"])
        right.addWidget(self.table)

        content.addLayout(right, 5)
        main_layout.addLayout(content)

        self.setLayout(main_layout)
        self.sync_parcel_nutrients()
        self.refresh_recipes()

    def sync_parcel_nutrients(self):
        parcel_id = self.parcel_combo.currentData()
        parcels = self.db.data.get("parcels", [])
        p = next((pa for pa in parcels if pa["id"] == parcel_id), None)
        if p:
            self.n_slider.setValue(p["nutrientLevel"]["n"])
            self.p_slider.setValue(p["nutrientLevel"]["p"])
            self.k_slider.setValue(p["nutrientLevel"]["k"])
        self.calculate_formula()

    def calculate_formula(self):
        n = self.n_slider.value()
        p = self.p_slider.value()
        k = self.k_slider.value()

        self.n_lbl.setText(f"碱解氮 N: {n} mg/kg")
        self.p_lbl.setText(f"有效磷 P: {p} mg/kg")
        self.k_lbl.setText(f"速效钾 K: {k} mg/kg")

        target_crop = self.crop_combo.currentText()
        crop_reqs = {
            "番茄": {"n": 140, "p": 60, "k": 150},
            "小麦": {"n": 120, "p": 45, "k": 90},
            "大豆": {"n": 60, "p": 55, "k": 110},
            "白菜": {"n": 110, "p": 40, "k": 100}
        }
        req = crop_reqs.get(target_crop, {"n": 100, "p": 50, "k": 100})

        # 差值缺口折纯养分公斤数（系数 0.15 * 每亩）
        self.n_weight = round(max(0, req["n"] - n) * 0.15, 1)
        self.p_weight = round(max(0, req["p"] - p) * 0.15, 1)
        self.k_weight = round(max(0, req["k"] - k) * 0.15, 1)

        self.diag_lbl.setText(
            f"目标作物 [{target_crop}] 饱和常量所需: N:{req['n']} P:{req['p']} K:{req['k']} mg/kg。\n"
            f"当前土壤实测存在缺口。每亩地块建议追施：\n"
            f"尿素(含氮折纯): {self.n_weight} 公斤/亩 | 过磷酸钙(折纯磷): {self.p_weight} 公斤/亩 | 硫酸钾(折纯钾): {self.k_weight} 公斤/亩。"
        )

    def generate_recipe(self):
        parcel_id = self.parcel_combo.currentData()
        crop = self.crop_combo.currentText()

        new_recipe = {
            "id": f"RC{len(self.db.data['recipes']) + 701}",
            "parcelId": parcel_id,
            "cropName": crop,
            "recommendationNPK": {"n": self.n_weight, "p": self.p_weight, "k": self.k_weight},
            "appliedStatus": "RECOMMENDED",
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d")
        }

        self.db.data["recipes"].append(new_recipe)
        self.db.save()
        QMessageBox.information(self, "施肥建议归档", f"测土化学配方卡 [{new_recipe['id']}] 已录入并同步至配料端。")
        self.refresh_recipes()

    def refresh_recipes(self):
        recipes = self.db.data.get("recipes", [])
        self.table.setRowCount(len(recipes))
        for idx, r in enumerate(reversed(recipes)):
            self.table.setItem(idx, 0, QTableWidgetItem(r["id"]))
            self.table.setItem(idx, 1, QTableWidgetItem(r["parcelId"]))
            self.table.setItem(idx, 2, QTableWidgetItem(r["cropName"]))
            
            rec_str = f"N:{r['recommendationNPK']['n']}kg P:{r['recommendationNPK']['p']}kg K:{r['recommendationNPK']['k']}kg"
            self.table.setItem(idx, 3, QTableWidgetItem(rec_str))
            
            st_cn = "待施用" if r["appliedStatus"] == "RECOMMENDED" else "已完工"
            self.table.setItem(idx, 4, QTableWidgetItem(st_cn))

            if r["appliedStatus"] == "RECOMMENDED":
                btn = QPushButton("确认施肥")
                btn.setStyleSheet("font-size: 10px;")
                btn.clicked.connect(lambda checked, rec_id=r["id"]: self.apply_fertilizer(rec_id))
                self.table.setCellWidget(idx, 5, btn)
            else:
                self.table.setItem(idx, 5, QTableWidgetItem("已吸收"))

    def apply_fertilizer(self, recipe_id):
        recipes = self.db.data["recipes"]
        r = next((rc for rc in recipes if rc["id"] == recipe_id), None)
        if not r:
            return

        r["appliedStatus"] = "APPLIED"

        # 状态一致性：施肥必然转化增加地块养分含量数值
        parcels = self.db.data["parcels"]
        parcel = next((pa for pa in parcels if pa["id"] == r["parcelId"]), None)
        if parcel:
            parcel["nutrientLevel"]["n"] = min(250, parcel["nutrientLevel"]["n"] + int(r["recommendationNPK"]["n"] * 0.5))
            parcel["nutrientLevel"]["p"] = min(150, parcel["nutrientLevel"]["p"] + int(r["recommendationNPK"]["p"] * 0.5))
            parcel["nutrientLevel"]["k"] = min(250, parcel["nutrientLevel"]["k"] + int(r["recommendationNPK"]["k"] * 0.5))

        self.db.save()
        QMessageBox.information(self, "施肥完成", f"施肥作业确认！地块土壤碱解理化养分已同步写回。")
        self.refresh_recipes()
        self.sync_parcel_nutrients()
