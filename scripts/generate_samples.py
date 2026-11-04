from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
IMAGES = SAMPLES / "pv-images"
SAMPLES.mkdir(exist_ok=True)
IMAGES.mkdir(exist_ok=True)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _make_flow_image(name: str, title: str, subtitle: str, steps: list[str]) -> Path:
    width, height = 1400, 500
    image = Image.new("RGB", (width, height), "#f7fbf9")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 28, width - 28, height - 28), radius=24, outline="#cfe9e2", width=3)
    draw.rectangle((28, 28, width - 28, 108), fill="#0f3d3a")
    draw.text((58, 48), title, font=_font(34), fill="#ffffff")
    draw.text((58, 126), subtitle, font=_font(19), fill="#677772")

    colors = ["#17645a", "#269b87", "#42b7a1", "#f59e0b"]
    start_x = 60
    box_w = 290
    gap = 42
    for index, step in enumerate(steps):
        x = start_x + index * (box_w + gap)
        y = 225
        draw.rounded_rectangle((x, y, x + box_w, y + 150), radius=16, fill="#ffffff", outline=colors[index], width=3)
        draw.rounded_rectangle((x, y, x + box_w, y + 10), radius=5, fill=colors[index])
        draw.text((x + 22, y + 42), f"{index + 1:02d}", font=_font(20), fill=colors[index])
        draw.multiline_text(
            (x + 22, y + 78), step, font=_font(23), fill="#212a28", spacing=6
        )
        if index < len(steps) - 1:
            ax = x + box_w + 7
            ay = y + 75
            draw.line((ax, ay, ax + gap - 16, ay), fill="#869490", width=3)
            draw.polygon([(ax + gap - 16, ay), (ax + gap - 28, ay - 7), (ax + gap - 28, ay + 7)], fill="#869490")

    draw.text((60, 415), "PV IQC  ·  INSPECTION STANDARD  ·  CONTROLLED", font=_font(16), fill="#869490")
    target = IMAGES / name
    image.save(target)
    return target


def base_document(title: str, subtitle: str, meta: str, scope: str) -> Document:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.4)
    section.right_margin = Cm(2.4)

    normal = doc.styles["Normal"]
    normal.font.name = "PingFang SC"
    normal.font.size = Pt(10.5)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.35

    for style_name, size, color in (
        ("Title", 22, "0F3D3A"),
        ("Heading 1", 15, "17645A"),
        ("Heading 2", 12, "1A7D6E"),
    ):
        style = doc.styles[style_name]
        style.font.name = "PingFang SC"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.font.bold = True

    title_paragraph = doc.add_paragraph(style="Title")
    title_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_paragraph.add_run(title)

    subtitle_paragraph = doc.add_paragraph()
    subtitle_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle_paragraph.add_run(subtitle)
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x67, 0x77, 0x72)

    doc.add_paragraph(meta)
    doc.add_paragraph(scope)
    doc.core_properties.title = title
    doc.core_properties.subject = "太阳能光伏 IQC 检验标准"
    doc.core_properties.author = "光伏质量部"
    return doc


def add_table(doc: Document, headers: list[str], rows: list[tuple], font_size: int = 9) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    for index, text in enumerate(headers):
        cell = table.rows[0].cells[index]
        cell.text = text
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.bold = True
                run.font.size = Pt(font_size)
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            cells[index].text = str(value)
            for paragraph in cells[index].paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(font_size)


def add_revision_history(doc: Document, rows: list[tuple]) -> None:
    doc.add_heading("修订记录", level=1)
    add_table(doc, ["版本", "日期", "修订内容", "修订人"], rows)


def make_cell_docx() -> Path:
    flow_image = _make_flow_image(
        "cell-el-flow.png",
        "PV CELL IQC FLOW",
        "Incoming inspection process for mono PERC / TOPCon solar cells",
        ["Visual\ncheck", "EL\ntest", "Grade &\nsort", "Release to\nstringing"],
    )
    doc = base_document(
        "单晶电池片来料检验规范",
        "PV IQC WORK INSTRUCTION · PV-IQC-WI-001 · REV A2",
        "文件编号：PV-IQC-WI-001          生效日期：2026-10-01          版本：A2",
        "适用范围：182mm / 210mm 单晶 PERC、TOPCon 电池片的来料外观、EL、尺寸与电性能检验。",
    )

    doc.add_heading("1. 目的", level=1)
    doc.add_paragraph(
        "统一光伏电池片来料的检验条件、抽样方法、检验项目与判定基准，及时发现隐裂、崩边、断栅、混档、"
        "效率异常等问题，避免不良电池片流入串焊与层压工序。"
    )

    doc.add_heading("2. 引用文件", level=1)
    for item in [
        "GB/T 2828.1-2012 计数抽样检验程序 第1部分：按接收质量限（AQL）检索的逐批检验抽样计划",
        "IEC 61215-1 地面用光伏组件设计鉴定和定型",
        "PV-IQC-SP-002 光伏玻璃 AQL 抽样检验计划",
        "电池片供应商技术协议与效率档位承认书",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    doc.add_heading("3. 检验条件", level=1)
    doc.add_heading("3.1 外观检验", level=2)
    doc.add_paragraph(
        "在照度 1000～1500 lux 的白色 LED 光源下进行，检验台面铺设黑色无尘垫。目视距离 300～400 mm，"
        "受检面与视线呈 45°～90°，单件检验时间不少于 8 秒。"
    )
    doc.add_heading("3.2 EL 检验", level=2)
    doc.add_paragraph(
        "EL 测试须在暗室或遮光工装内完成，测试电流按供应商技术协议设定，通常为 1/10 Isc。"
        "成像应清晰显示主栅、细栅与电池片边缘，避免过曝或欠曝导致隐裂漏判。"
    )
    doc.add_heading("3.3 尺寸与电性能", level=2)
    doc.add_paragraph(
        "尺寸测量使用影像测量仪或专用通止规，厚度使用千分尺；电性能按批次抽测效率、填充因子（FF）、"
        "开路电压（Voc）与短路电流（Isc），测试环境温度 25±2℃。"
    )

    doc.add_heading("4. 检验项目与判定", level=1)
    doc.add_paragraph(
        "致命缺陷（CR）零接收；严重缺陷（MAJ）AQL 取 0.65；轻微缺陷（MIN）AQL 取 1.5。"
        "EL 隐裂按严重缺陷处理，发现贯穿隐裂时整批隔离并加严抽检。"
    )
    add_table(
        doc,
        ["检验项目", "检验要求", "判定等级", "检验方式"],
        [
            ("外观-崩边", "崩边深度 ≤0.5 mm，单边累计 ≤1.0 mm", "MAJ", "目视 + 卡尺"),
            ("外观-缺角", "缺角 ≤0.8 mm，不允许影响栅线", "MAJ", "目视 + 卡尺"),
            ("外观-裂纹", "不允许存在任何可见裂纹", "CR", "目视 + EL"),
            ("外观-污渍/色差", "无明显 finger 印、油污、水痕及批次性色差", "MIN", "目视"),
            ("EL-隐裂", "不允许贯穿隐裂；非贯穿隐裂按技术协议加严", "MAJ", "EL 测试"),
            ("EL-断栅", "单根细栅断线 ≤2 处，主栅不允许断线", "MAJ", "EL 测试"),
            ("EL-黑斑/混档", "无黑斑、黑角；效率档与标签一致", "MAJ", "EL + 分选"),
            ("尺寸-边长", "182.0 ±0.2 mm / 210.0 ±0.2 mm", "MAJ", "影像测量"),
            ("尺寸-对角线", "对角线差值 ≤0.5 mm", "MAJ", "影像测量"),
            ("尺寸-厚度", "130 ±10 μm（按协议）", "MIN", "千分尺"),
            ("电性能", "效率、FF、Voc、Isc 符合承认书档位", "CR", "IV 测试"),
            ("包装标识", "防潮、防震包装；批次、效率档、数量标识清晰", "MIN", "目视"),
        ],
    )
    doc.add_picture(str(flow_image), width=Cm(15.2))
    caption = doc.add_paragraph("图 1 单晶电池片来料检验流程（外观 → EL → 分档 → 放行）")
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in caption.runs:
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor(0x86, 0x94, 0x90)

    doc.add_heading("5. 抽样与批判定", level=1)
    doc.add_paragraph(
        "以同一供应商、同一型号、同一效率档、同一生产批次为一个检验批。外观与尺寸按 AQL 抽样；"
        "EL 每批抽检不少于 5% 且不少于 10 片；电性能每批抽测 3 片。客户或技术协议另有规定时从其规定。"
    )
    doc.add_paragraph(
        "样本中发现致命缺陷即判整批拒收；严重缺陷数达到拒收数时判批退；轻微缺陷可按让步接收流程处理，"
        "但须经质量工程师与工艺工程师共同签核。"
    )

    doc.add_heading("6. 包装、标识与存储", level=1)
    for item in [
        "电池片应采用防静电、防潮包装，片间使用隔纸或泡棉，周转箱不得变形。",
        "外箱标签须包含供应商、型号、效率档、数量、批次、生产日期与 RoHS 标识。",
        "拆包后应在 24 小时内完成检验并投入生产，剩余电池片密封防潮保存。",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    doc.add_heading("7. 异常处理", level=1)
    doc.add_paragraph(
        "发现贯穿隐裂、混档、效率异常或连续两批外观批退时，立即隔离物料并通知采购、SQE 与供应商。"
        "供应商须在 24 小时内提交临时围堵措施，5 个工作日内提交 8D 报告。质量部负责验证措施有效性，"
        "并更新供应商绩效与加严检验等级。"
    )

    add_revision_history(
        doc,
        [
            ("A0", "2024-05-10", "首次发布", "光伏质量部"),
            ("A1", "2025-08-01", "补充 TOPCon 电池片 EL 判定要求", "光伏质量部"),
            ("A2", "2026-10-01", "更新 210mm 尺寸与效率档抽检要求", "光伏质量部"),
        ],
    )

    out = SAMPLES / "PV-IQC-WI-001_单晶电池片来料检验规范.docx"
    doc.save(out)
    return out


def make_film_docx() -> Path:
    doc = base_document(
        "EVA / POE 封装胶膜检验指导书",
        "PV IQC WORK INSTRUCTION · PV-IQC-WI-004 · REV B0",
        "文件编号：PV-IQC-WI-004          生效日期：2026-09-20          版本：B0",
        "适用范围：光伏组件用 EVA、POE 及共挤型封装胶膜的来料检验与存储管理。",
    )

    doc.add_heading("1. 目的", level=1)
    doc.add_paragraph(
        "规范封装胶膜的克重、厚度、交联度、剥离强度、收缩率与外观检验，确保层压后无气泡、脱层、"
        "黄变及功率衰减异常。"
    )

    doc.add_heading("2. 检验条件", level=1)
    doc.add_paragraph(
        "胶膜拆包应在温度 23±2℃、相对湿度 45%～65% 的环境中进行。检验前将成卷胶膜平放恢复至少 2 小时，"
        "避免低温脆化导致折痕误判。"
    )

    doc.add_heading("3. 检验项目与判定", level=1)
    add_table(
        doc,
        ["检验项目", "典型要求", "检验方法", "判定等级"],
        [
            ("克重", "420 ±20 g/m²（按型号协议）", "电子天平 + 裁样", "MAJ"),
            ("厚度", "0.45 ±0.03 mm", "千分尺，九点测量", "MAJ"),
            ("宽度", "按订单，偏差 +20/-0 mm", "卷尺 / 影像测量", "MAJ"),
            ("交联度", "≥75%（EVA）；POE 按协议", "萃取法 / DSC", "CR"),
            ("剥离强度", "与玻璃 ≥60 N/cm，与背板 ≥40 N/cm", "拉力试验机", "MAJ"),
            ("收缩率", "MD / TD 均 ≤3%", "恒温烘箱", "MAJ"),
            ("透光率", "≥91%（380～1100 nm）", "分光光度计", "MAJ"),
            ("外观", "无气泡、杂质、褶皱、受潮、粘边", "目视 + 手触", "MIN"),
        ],
    )

    doc.add_heading("4. 抽样与存储", level=1)
    doc.add_paragraph(
        "同一供应商、同一型号、同一批次为一个检验批。每批抽取 3 卷，每卷距端部 1 m 以上裁取样品；"
        "交联度与剥离强度每批至少各测 1 组。"
    )
    doc.add_paragraph(
        "胶膜应存放在 5～30℃、干燥、避光环境，远离热源与尖锐物。EVA 开封后 24 小时内用完；"
        "POE 按供应商有效期管理，超期复检合格后方可使用。"
    )

    doc.add_heading("5. 异常处理", level=1)
    doc.add_paragraph(
        "交联度不足、剥离强度不合格或出现批量气泡时，立即停用该批胶膜并追溯已层压组件。"
        "供应商需提供批次生产记录、配方与交联曲线，必要时进行小批层压验证。"
    )

    add_revision_history(
        doc,
        [
            ("A0", "2024-06-01", "首次发布", "光伏质量部"),
            ("B0", "2026-09-20", "增加 POE 共挤胶膜检验要求", "光伏质量部"),
        ],
    )
    out = SAMPLES / "PV-IQC-WI-004_EVA_POE封装胶膜检验指导书.docx"
    doc.save(out)
    return out


def make_frame_docx() -> Path:
    doc = base_document(
        "太阳能铝边框来料检验规范",
        "PV IQC INSPECTION SPEC · PV-IQC-WI-005 · REV A1",
        "文件编号：PV-IQC-WI-005          生效日期：2026-08-15          版本：A1",
        "适用范围：光伏组件用铝合金边框型材、角码及配套紧固件的来料检验。",
    )

    doc.add_heading("1. 检验项目", level=1)
    add_table(
        doc,
        ["检验项目", "检验要求", "检验方法", "判定等级"],
        [
            ("型材长度", "按图纸，偏差 ±1.0 mm", "卷尺 / 测长台", "MAJ"),
            ("截面尺寸", "关键配合尺寸符合图纸，偏差 ±0.3 mm", "卡尺 / 投影仪", "MAJ"),
            ("直线度", "每米 ≤1.0 mm，总长 ≤2.0 mm", "平台 + 塞尺", "MAJ"),
            ("氧化膜厚", "阳极氧化膜 ≥10 μm", "膜厚仪，五点测量", "MAJ"),
            ("盐雾性能", "48 h 中性盐雾，无基体腐蚀与明显白锈", "盐雾箱（抽检）", "MAJ"),
            ("色差", "同批次色差 ΔE ≤1.5，与封样一致", "色差仪 / 目视", "MIN"),
            ("表面缺陷", "无划伤、碰伤、毛刺、氧化不良、露底", "目视 + 手触", "MAJ"),
            ("冲孔/接地孔", "位置、孔径符合图纸，孔边无毛刺", "卡尺 / 通止规", "MAJ"),
            ("角码配合", "角码插入顺畅，铆接/螺丝连接无松动", "装配试装", "MAJ"),
            ("包装", "型材间有隔离，端部有护角，防潮防磕碰", "目视", "MIN"),
        ],
    )

    doc.add_heading("2. 抽样与判定", level=1)
    doc.add_paragraph(
        "同一供应商、同一型号、同一表面处理批次为一个检验批。尺寸、膜厚按每批 5 根抽检；"
        "盐雾试验每季度或更换表面处理供应商时抽检 1 次；外观按 AQL 1.5 抽样。"
    )
    doc.add_paragraph(
        "长度、截面、孔位超差或膜厚不足判 MAJ；划伤深度触及基体、露底、明显色差判 MAJ；"
        "轻微碰伤不影响装配与外观的，可按让步接收处理。"
    )

    doc.add_heading("3. 装配与包装", level=1)
    doc.add_paragraph(
        "边框与角码试装时应无卡滞、无间隙；接地孔位置须与接线盒安装孔匹配。"
        "型材应水平存放，避免重压变形；运输过程使用护角与缠绕膜，防止雨水和粉尘。"
    )

    add_revision_history(
        doc,
        [
            ("A0", "2024-08-01", "首次发布", "光伏质量部"),
            ("A1", "2026-08-15", "补充 210 组件边框与盐雾要求", "光伏质量部"),
        ],
    )
    out = SAMPLES / "PV-IQC-WI-005_太阳能铝边框来料检验规范.docx"
    doc.save(out)
    return out


def make_ribbon_docx() -> Path:
    doc = base_document(
        "焊带与汇流条来料检验规范",
        "PV IQC INSPECTION SPEC · PV-IQC-WI-006 · REV A0",
        "文件编号：PV-IQC-WI-006          生效日期：2026-07-01          版本：A0",
        "适用范围：光伏组件用互连焊带、汇流条、圆形焊带及配套助焊剂的来料检验。",
    )

    doc.add_heading("1. 检验项目", level=1)
    add_table(
        doc,
        ["检验项目", "检验要求", "检验方法", "判定等级"],
        [
            ("宽度", "按订单，偏差 ±0.10 mm", "影像测量 / 卡尺", "MAJ"),
            ("厚度", "按订单，偏差 ±0.01 mm", "千分尺", "MAJ"),
            ("抗拉强度", "≥180 MPa（铜基材）", "拉力试验机", "MAJ"),
            ("延伸率", "≥25%", "拉力试验机", "MAJ"),
            ("涂层厚度", "锡层 / 银层按协议，偏差 ±10%", "XRF / 膜厚仪", "MAJ"),
            ("可焊性", "245℃ 锡炉 3 s，润湿良好，无拒焊", "可焊性测试", "CR"),
            ("剥离力", "与电池片主栅 ≥1.5 N/mm", "拉力试验机", "MAJ"),
            ("外观", "无氧化、油污、毛刺、打结、涂层脱落", "目视 + 手触", "MIN"),
            ("卷绕", "卷绕整齐，无压扁、无接头混入", "目视", "MAJ"),
        ],
    )

    doc.add_heading("2. 抽样与存储", level=1)
    doc.add_paragraph(
        "同一供应商、同一规格、同一批次为一个检验批。每批抽取 3 卷，每卷取 1 m 样品；"
        "可焊性与剥离力每批各测 1 组。焊带应存放在干燥、无腐蚀性气体环境，开封后防止氧化。"
    )

    doc.add_heading("3. 异常处理", level=1)
    doc.add_paragraph(
        "出现拒焊、剥离力不足、宽度超差或涂层脱落时，立即停用并隔离该批焊带，追溯已串焊电池串。"
        "供应商需提供镀层检测报告与批次追溯信息。"
    )

    add_revision_history(doc, [("A0", "2026-07-01", "首次发布", "光伏质量部")])
    out = SAMPLES / "PV-IQC-WI-006_焊带与汇流条来料检验规范.docx"
    doc.save(out)
    return out


def make_glass_xlsx() -> Path:
    flow_image = _make_flow_image(
        "glass-aql-flow.png",
        "PV GLASS IQC SAMPLING",
        "AQL sampling and inspection flow for solar photovoltaic glass",
        ["Receive\nlot", "AQL\nsampling", "Optical &\nsize test", "Disposition"],
    )
    wb = Workbook()
    ws = wb.active
    ws.title = "抽样方案"

    title = ws.cell(row=1, column=1, value="光伏玻璃 AQL 抽样检验计划")
    title.font = Font(name="PingFang SC", size=16, bold=True, color="0F3D3A")
    ws.merge_cells("A1:F1")
    meta = ws.cell(
        row=2,
        column=1,
        value="文件编号：PV-IQC-SP-002    版本：B1    生效日期：2026-09-15    检验水平：一般检验水平 II",
    )
    ws.merge_cells("A2:F2")
    meta.font = Font(name="PingFang SC", size=9, color="677772")

    headers = [
        "批量范围",
        "样本量",
        "AQL 0.65 接收数 Ac",
        "AQL 0.65 拒收数 Re",
        "AQL 1.5 接收数 Ac",
        "AQL 1.5 拒收数 Re",
    ]
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col, value=header)
        cell.font = Font(name="PingFang SC", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="17645A")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    rows = [
        ("2 - 8", 2, 0, 1, 0, 1),
        ("9 - 15", 3, 0, 1, 0, 1),
        ("16 - 25", 5, 0, 1, 0, 1),
        ("26 - 50", 8, 0, 1, 0, 1),
        ("51 - 90", 13, 0, 1, 0, 1),
        ("91 - 150", 20, 0, 1, 1, 2),
        ("151 - 280", 32, 0, 1, 2, 3),
        ("281 - 500", 50, 0, 1, 3, 4),
        ("501 - 1200", 80, 1, 2, 5, 6),
        ("1201 - 3200", 125, 2, 3, 7, 8),
    ]
    thin = Side(style="thin", color="D7DCDA")
    for row_index, row in enumerate(rows, start=5):
        for col_index, value in enumerate(row, start=1):
            cell = ws.cell(row=row_index, column=col_index, value=value)
            cell.font = Font(name="PingFang SC", size=10)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
            if row_index % 2 == 0:
                cell.fill = PatternFill("solid", fgColor="F3FAF8")

    note = ws.cell(
        row=16,
        column=1,
        value="说明：光伏玻璃外观、尺寸按 AQL 抽样；透光率、弯曲度、镀膜附着力每批抽测 3 片。致命缺陷零接收。",
    )
    note.font = Font(name="PingFang SC", size=9, color="B45309")
    ws.merge_cells("A16:F16")
    ws.cell(row=16, column=1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[16].height = 32

    ws.freeze_panes = "A5"
    ws.row_dimensions[4].height = 38
    for index, width in enumerate([18, 12, 22, 22, 22, 22], start=1):
        ws.column_dimensions[get_column_letter(index)].width = width

    ws2 = wb.create_sheet("检验项目")
    ws2.append(["检验项目", "技术要求", "检验方法", "判定等级"])
    for cell in ws2[1]:
        cell.font = Font(name="PingFang SC", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0F3D3A")
        cell.alignment = Alignment(horizontal="center")
    items = [
        ("透光率", "380～1100 nm 平均透光率 ≥93.5%", "分光光度计", "MAJ"),
        ("厚度", "3.2 ±0.2 mm（按订单）", "千分尺，九点测量", "MAJ"),
        ("长宽尺寸", "按图纸，偏差 ±1.0 mm", "卷尺 / 测长台", "MAJ"),
        ("对角线差", "≤2.0 mm", "卷尺 / 影像测量", "MAJ"),
        ("弯曲度", "≤0.3%", "平台 + 塞尺", "MAJ"),
        ("镀膜附着力", "百格测试 ≥4B，无大面积脱落", "百格刀 + 胶带", "MAJ"),
        ("气泡/夹杂物", "可视区不允许长度 >2 mm 气泡；非可视区按限度样板", "目视 + 限度样板", "MIN"),
        ("划伤/擦伤", "可视区不允许明显划伤；非可视区按限度样板", "目视", "MIN"),
        ("边部质量", "崩边 ≤1.0 mm，边角无缺口", "目视 + 卡尺", "MAJ"),
        ("包装", "木箱/铁架牢固，片间隔离，防潮防磕碰", "目视", "MIN"),
    ]
    for row in items:
        ws2.append(row)
    for row in ws2.iter_rows(min_row=2, max_row=len(items) + 1):
        for cell in row:
            cell.font = Font(name="PingFang SC", size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for index, width in enumerate([18, 48, 28, 14], start=1):
        ws2.column_dimensions[get_column_letter(index)].width = width
    ws2.freeze_panes = "A2"

    ws3 = wb.create_sheet("缺陷分级")
    ws3.append(["缺陷等级", "定义", "典型缺陷", "处理方式"])
    for cell in ws3[1]:
        cell.font = Font(name="PingFang SC", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0F3D3A")
        cell.alignment = Alignment(horizontal="center")
    data3 = [
        ("致命 CR", "影响组件安全或导致功能失效", "贯穿裂纹、钢化不良、严重崩角", "整批拒收并开具 SCAR"),
        ("严重 MAJ", "影响层压、装配或长期可靠性", "透光率不足、厚度超差、镀膜脱落", "批退或挑选后重检"),
        ("轻微 MIN", "不影响性能的轻微外观问题", "非可视区轻微划伤、少量气泡", "让步接收需质量工程师签核"),
    ]
    for row in data3:
        ws3.append(row)
    for row in ws3.iter_rows(min_row=2, max_row=4):
        for cell in row:
            cell.font = Font(name="PingFang SC", size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for index, width in enumerate([16, 38, 40, 34], start=1):
        ws3.column_dimensions[get_column_letter(index)].width = width
    ws3.freeze_panes = "A2"

    ws4 = wb.create_sheet("抽样流程图")
    ws4["A1"] = "光伏玻璃 IQC 抽样与检验流程"
    ws4["A1"].font = Font(name="PingFang SC", size=14, bold=True, color="0F3D3A")
    ws4.merge_cells("A1:H1")
    ws4.row_dimensions[1].height = 28
    ws4["A3"] = "图示：来料接收 → AQL 抽样 → 光学/尺寸检验 → 批次判定"
    ws4["A3"].font = Font(name="PingFang SC", size=9, color="677772")
    ws4.merge_cells("A3:H3")
    chart = XLImage(str(flow_image))
    chart.width = 760
    chart.height = 271
    ws4.add_image(chart, "A5")
    ws4.sheet_view.showGridLines = False
    for index, width in enumerate([16, 16, 16, 16, 16, 16, 16, 16], start=1):
        ws4.column_dimensions[get_column_letter(index)].width = width

    out = SAMPLES / "PV-IQC-SP-002_光伏玻璃AQL抽样检验计划.xlsx"
    wb.save(out)
    return out


if __name__ == "__main__":
    for path in [
        make_cell_docx(),
        make_film_docx(),
        make_frame_docx(),
        make_ribbon_docx(),
        make_glass_xlsx(),
    ]:
        print(path)
