from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from generate_samples import SAMPLES, _make_flow_image, add_table, base_document


def revision_table(doc, rows):
    doc.add_heading("Revision History", level=1)
    add_table(doc, ["Version", "Date", "Change", "Owner"], rows)


def make_cell_docx() -> Path:
    flow = _make_flow_image(
        "cell-el-flow.png",
        "PV CELL IQC FLOW",
        "Incoming inspection process for mono PERC / TOPCon solar cells",
        ["Visual\ncheck", "EL\ntest", "Grade &\nsort", "Release to\nstringing"],
    )
    doc = base_document(
        "Mono Solar Cell Incoming Inspection Specification",
        "PV IQC WORK INSTRUCTION · PV-IQC-WI-001 · REV A2",
        "Document No.: PV-IQC-WI-001          Effective: 2026-10-01          Revision: A2",
        "Scope: incoming visual, EL, dimensional and electrical inspection for 182 mm / 210 mm mono PERC and TOPCon cells.",
    )
    doc.add_heading("1. Purpose", level=1)
    doc.add_paragraph(
        "Define unified inspection conditions, sampling rules and acceptance criteria for solar cells, "
        "prevent micro-cracks, edge chips, broken fingers, power-class mixing and electrical failures "
        "from entering stringing and lamination."
    )
    doc.add_heading("2. Reference Documents", level=1)
    for item in [
        "GB/T 2828.1 Sampling procedures for inspection by attributes",
        "IEC 61215-1 Terrestrial photovoltaic modules - design qualification",
        "PV-IQC-SP-002 PV Glass AQL Sampling Plan",
        "Supplier technical agreement and power-class approval sheet",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    doc.add_heading("3. Inspection Conditions", level=1)
    doc.add_heading("3.1 Visual Inspection", level=2)
    doc.add_paragraph(
        "Perform visual inspection under 1,000–1,500 lux white LED light on a black anti-static mat. "
        "Viewing distance 300–400 mm; inspect each cell for at least 8 seconds."
    )
    doc.add_heading("3.2 EL Inspection", level=2)
    doc.add_paragraph(
        "EL inspection shall be performed in a dark room or light-tight fixture. Test current shall follow "
        "the supplier agreement, typically 1/10 Isc. The image must clearly show busbars, fingers and edges."
    )
    doc.add_heading("3.3 Dimensions and Electrical Performance", level=2)
    doc.add_paragraph(
        "Measure dimensions with an image measuring system or dedicated gauges; measure thickness with a micrometer. "
        "Pull 3 cells per lot for efficiency, FF, Voc and Isc at 25 ±2°C."
    )

    doc.add_heading("4. Inspection Items and Acceptance Criteria", level=1)
    add_table(
        doc,
        ["Item", "Requirement", "Class", "Method"],
        [
            ("Edge chip", "Depth ≤0.5 mm; cumulative length ≤1.0 mm per edge", "MAJ", "Visual + caliper"),
            ("Corner chip", "≤0.8 mm; must not affect busbar or finger", "MAJ", "Visual + caliper"),
            ("Crack", "No visible crack permitted", "CR", "Visual + EL"),
            ("Stain / color", "No finger marks, oil, water marks or lot-level color deviation", "MIN", "Visual"),
            ("EL micro-crack", "No through micro-crack; others per technical agreement", "MAJ", "EL"),
            ("Broken finger", "≤2 broken fingers; no broken busbar", "MAJ", "EL"),
            ("Black spot / mix", "No black spot or power-class mixing", "MAJ", "EL + sorter"),
            ("Cell size", "182.0 ±0.2 mm / 210.0 ±0.2 mm", "MAJ", "Image measurement"),
            ("Diagonal", "Diagonal difference ≤0.5 mm", "MAJ", "Image measurement"),
            ("Thickness", "130 ±10 μm per agreement", "MIN", "Micrometer"),
            ("Electrical", "Efficiency, FF, Voc and Isc meet approved class", "CR", "IV tester"),
            ("Packaging", "Moisture-proof and shock-proof; clear lot and class labels", "MIN", "Visual"),
        ],
    )
    doc.add_picture(str(flow), width=Cm(15.2))
    caption = doc.add_paragraph("Figure 1  Cell incoming inspection flow: visual → EL → grade → release")
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in caption.runs:
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor(0x86, 0x94, 0x90)

    doc.add_heading("5. Sampling and Lot Disposition", level=1)
    doc.add_paragraph(
        "One inspection lot consists of the same supplier, model, power class and production lot. "
        "Visual and dimensional inspection follow AQL sampling; EL sample at least 5% and no fewer than 10 cells; "
        "electrical performance sample 3 cells per lot."
    )
    doc.add_paragraph(
        "Any critical defect rejects the lot. If major defects reach the rejection number, the lot is rejected. "
        "Minor defects may be accepted by deviation with quality and process engineering approval."
    )
    doc.add_heading("6. Packaging and Storage", level=1)
    for item in [
        "Use anti-static and moisture-barrier packaging with separators between cells.",
        "Labels must show supplier, model, power class, quantity, lot, date and RoHS status.",
        "Complete inspection and release within 24 hours after opening; reseal unused cells.",
    ]:
        doc.add_paragraph(item, style="List Bullet")
    doc.add_heading("7. Nonconformance", level=1)
    doc.add_paragraph(
        "Isolate the lot and notify purchasing, SQE and the supplier when a through crack, power-class mix or "
        "repeated lot rejection is found. The supplier shall provide containment within 24 hours and an 8D report "
        "within 5 working days."
    )
    revision_table(
        doc,
        [
            ("A0", "2024-05-10", "Initial release", "PV Quality"),
            ("A1", "2025-08-01", "Add TOPCon EL criteria", "PV Quality"),
            ("A2", "2026-10-01", "Update 210 mm dimensions and sampling", "PV Quality"),
        ],
    )
    out = SAMPLES / "PV-IQC-WI-001_Solar_Cell_Incoming_Inspection_Specification.docx"
    doc.save(out)
    return out


def make_film_docx() -> Path:
    doc = base_document(
        "EVA / POE Encapsulation Film Inspection Guideline",
        "PV IQC WORK INSTRUCTION · PV-IQC-WI-004 · REV B0",
        "Document No.: PV-IQC-WI-004          Effective: 2026-09-20          Revision: B0",
        "Scope: incoming inspection and storage control for EVA, POE and co-extruded photovoltaic encapsulants.",
    )
    doc.add_heading("1. Purpose", level=1)
    doc.add_paragraph(
        "Standardise gram weight, thickness, gel content, peel strength, shrinkage and visual inspection to prevent "
        "bubbles, delamination, yellowing and power loss after lamination."
    )
    doc.add_heading("2. Inspection Conditions", level=1)
    doc.add_paragraph(
        "Open and inspect film at 23 ±2°C and 45%–65% RH. Condition rolls flat for at least 2 hours before sampling "
        "to avoid false folds caused by low temperature."
    )
    doc.add_heading("3. Inspection Items", level=1)
    add_table(
        doc,
        ["Item", "Typical Requirement", "Method", "Class"],
        [
            ("Gram weight", "420 ±20 g/m² (per model)", "Balance + die cut", "MAJ"),
            ("Thickness", "0.45 ±0.03 mm", "Micrometer, 9 points", "MAJ"),
            ("Width", "Per order, +20/-0 mm", "Tape / image measurement", "MAJ"),
            ("Gel content", "≥75% for EVA; POE per agreement", "Extraction / DSC", "CR"),
            ("Peel strength", "Glass ≥60 N/cm; backsheet ≥40 N/cm", "Tensile tester", "MAJ"),
            ("Shrinkage", "MD / TD ≤3%", "Oven", "MAJ"),
            ("Transmittance", "≥91% at 380–1,100 nm", "Spectrophotometer", "MAJ"),
            ("Appearance", "No bubbles, contamination, wrinkles, moisture or blocking", "Visual / touch", "MIN"),
        ],
    )
    doc.add_heading("4. Sampling and Storage", level=1)
    doc.add_paragraph(
        "One lot is the same supplier, model and batch. Sample 3 rolls per lot, at least 1 m from the roll end. "
        "Test one set of gel content and peel strength per lot."
    )
    doc.add_paragraph(
        "Store at 5–30°C, dry and away from light and heat. Use EVA within 24 hours after opening. "
        "POE follows the supplier shelf life; retest after expiry."
    )
    doc.add_heading("5. Nonconformance", level=1)
    doc.add_paragraph(
        "Stop the lot if gel content, peel strength or bubble performance fails. Trace laminated modules and request "
        "batch records, formulation and cross-linking curve from the supplier."
    )
    revision_table(
        doc,
        [
            ("A0", "2024-06-01", "Initial release", "PV Quality"),
            ("B0", "2026-09-20", "Add POE co-extruded film requirements", "PV Quality"),
        ],
    )
    out = SAMPLES / "PV-IQC-WI-004_EVA_POE_Encapsulation_Film_Inspection_Guideline.docx"
    doc.save(out)
    return out


def make_frame_docx() -> Path:
    doc = base_document(
        "Solar Aluminum Frame Incoming Inspection Specification",
        "PV IQC INSPECTION SPEC · PV-IQC-WI-005 · REV A1",
        "Document No.: PV-IQC-WI-005          Effective: 2026-08-15          Revision: A1",
        "Scope: aluminum frame profiles, corner keys and fasteners used in photovoltaic modules.",
    )
    doc.add_heading("1. Inspection Items", level=1)
    add_table(
        doc,
        ["Item", "Requirement", "Method", "Class"],
        [
            ("Length", "Per drawing, ±1.0 mm", "Tape / measuring table", "MAJ"),
            ("Cross-section", "Critical mating dimensions ±0.3 mm", "Caliper / projector", "MAJ"),
            ("Straightness", "≤1.0 mm per meter; ≤2.0 mm total", "Platform + feeler gauge", "MAJ"),
            ("Anodizing thickness", "≥10 μm", "Coating gauge, 5 points", "MAJ"),
            ("Salt spray", "48 h neutral salt spray, no base corrosion", "Salt spray chamber", "MAJ"),
            ("Color", "ΔE ≤1.5 within lot; match approval sample", "Colorimeter / visual", "MIN"),
            ("Surface", "No scratch, dent, burr, exposed base or poor anodizing", "Visual / touch", "MAJ"),
            ("Punch / ground hole", "Position and diameter per drawing; no burr", "Caliper / gauge", "MAJ"),
            ("Corner key", "Smooth insertion; no looseness after assembly", "Trial assembly", "MAJ"),
            ("Packaging", "Separators, corner protection, moisture-proof", "Visual", "MIN"),
        ],
    )
    doc.add_heading("2. Sampling and Disposition", level=1)
    doc.add_paragraph(
        "One lot is the same supplier, model and surface-treatment batch. Sample 5 profiles per lot for dimensions "
        "and coating thickness. Salt spray is tested quarterly or when the anodizing supplier changes. Visual "
        "inspection follows AQL 1.5."
    )
    doc.add_paragraph(
        "Length, cross-section, hole position or coating thickness out of tolerance is MAJ. Deep scratches exposed "
        "to base metal, exposed base or obvious color difference are MAJ. Minor handling marks may be accepted by "
        "deviation."
    )
    doc.add_heading("3. Assembly and Storage", level=1)
    doc.add_paragraph(
        "Frames and corner keys must assemble without sticking or gaps. Ground holes must match the junction box. "
        "Store profiles horizontally; use corner protectors and stretch film during transport."
    )
    revision_table(
        doc,
        [
            ("A0", "2024-08-01", "Initial release", "PV Quality"),
            ("A1", "2026-08-15", "Add 210 module frame and salt spray requirements", "PV Quality"),
        ],
    )
    out = SAMPLES / "PV-IQC-WI-005_Solar_Aluminum_Frame_Incoming_Inspection_Specification.docx"
    doc.save(out)
    return out


def make_ribbon_docx() -> Path:
    doc = base_document(
        "Ribbon and Busbar Incoming Inspection Specification",
        "PV IQC INSPECTION SPEC · PV-IQC-WI-006 · REV A0",
        "Document No.: PV-IQC-WI-006          Effective: 2026-07-01          Revision: A0",
        "Scope: interconnection ribbons, busbars, round wire and flux used in photovoltaic module assembly.",
    )
    doc.add_heading("1. Inspection Items", level=1)
    add_table(
        doc,
        ["Item", "Requirement", "Method", "Class"],
        [
            ("Width", "Per order, ±0.10 mm", "Image measurement / caliper", "MAJ"),
            ("Thickness", "Per order, ±0.01 mm", "Micrometer", "MAJ"),
            ("Tensile strength", "≥180 MPa for copper base", "Tensile tester", "MAJ"),
            ("Elongation", "≥25%", "Tensile tester", "MAJ"),
            ("Coating thickness", "Per agreement, ±10%", "XRF / coating gauge", "MAJ"),
            ("Solderability", "245°C / 3 s, good wetting, no dewetting", "Solderability test", "CR"),
            ("Peel force", "≥1.5 N/mm to cell busbar", "Tensile tester", "MAJ"),
            ("Appearance", "No oxidation, oil, burr, kink or coating loss", "Visual / touch", "MIN"),
            ("Winding", "Neat winding; no flattened section or mixed joint", "Visual", "MAJ"),
        ],
    )
    doc.add_heading("2. Sampling and Storage", level=1)
    doc.add_paragraph(
        "One lot is the same supplier, specification and batch. Sample 3 rolls and 1 m from each roll. "
        "Test one set of solderability and peel force per lot. Store in a dry, non-corrosive environment."
    )
    doc.add_heading("3. Nonconformance", level=1)
    doc.add_paragraph(
        "Stop the lot on poor solderability, low peel force, width deviation or coating loss. Trace the affected "
        "strings and request coating reports and batch traceability from the supplier."
    )
    revision_table(doc, [("A0", "2026-07-01", "Initial release", "PV Quality")])
    out = SAMPLES / "PV-IQC-WI-006_Ribbon_and_Busbar_Incoming_Inspection_Specification.docx"
    doc.save(out)
    return out


def make_glass_xlsx() -> Path:
    flow = _make_flow_image(
        "glass-aql-flow.png",
        "PV GLASS IQC SAMPLING",
        "AQL sampling and inspection flow for solar photovoltaic glass",
        ["Receive\nlot", "AQL\nsampling", "Optical &\nsize test", "Disposition"],
    )
    wb = Workbook()
    ws = wb.active
    ws.title = "Sampling Plan"
    title = ws.cell(row=1, column=1, value="PV Glass AQL Sampling and Inspection Plan")
    title.font = Font(name="Arial", size=16, bold=True, color="0F3D3A")
    ws.merge_cells("A1:F1")
    meta = ws.cell(
        row=2,
        column=1,
        value="Document No.: PV-IQC-SP-002    Revision: B1    Effective: 2026-09-15    Inspection level: General II",
    )
    ws.merge_cells("A2:F2")
    meta.font = Font(name="Arial", size=9, color="677772")

    headers = ["Lot size", "Sample size", "AQL 0.65 Ac", "AQL 0.65 Re", "AQL 1.5 Ac", "AQL 1.5 Re"]
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col, value=header)
        cell.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
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
            cell.font = Font(name="Arial", size=10)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
            if row_index % 2 == 0:
                cell.fill = PatternFill("solid", fgColor="F3FAF8")
    note = ws.cell(
        row=16,
        column=1,
        value="Note: visual and dimensional inspection follow AQL sampling. Transmittance, bow and coating adhesion: 3 pcs per lot. Critical defects: zero acceptance.",
    )
    note.font = Font(name="Arial", size=9, color="B45309")
    ws.merge_cells("A16:F16")
    ws.cell(row=16, column=1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[16].height = 32
    ws.freeze_panes = "A5"
    ws.row_dimensions[4].height = 38
    for index, width in enumerate([18, 12, 22, 22, 22, 22], start=1):
        ws.column_dimensions[get_column_letter(index)].width = width

    ws2 = wb.create_sheet("Inspection Items")
    ws2.append(["Item", "Technical Requirement", "Method", "Class"])
    for cell in ws2[1]:
        cell.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0F3D3A")
        cell.alignment = Alignment(horizontal="center")
    items = [
        ("Transmittance", "≥93.5% average at 380–1,100 nm", "Spectrophotometer", "MAJ"),
        ("Thickness", "3.2 ±0.2 mm per order", "Micrometer, 9 points", "MAJ"),
        ("Length / width", "Per drawing, ±1.0 mm", "Tape / measuring table", "MAJ"),
        ("Diagonal difference", "≤2.0 mm", "Tape / image measurement", "MAJ"),
        ("Bow", "≤0.3%", "Platform + feeler gauge", "MAJ"),
        ("Coating adhesion", "Cross-cut ≥4B, no large-area removal", "Cross-cut + tape", "MAJ"),
        ("Bubbles / inclusions", "No bubble >2 mm in visible area; limit sample elsewhere", "Visual + limit sample", "MIN"),
        ("Scratch", "No obvious scratch in visible area; limit sample elsewhere", "Visual", "MIN"),
        ("Edge quality", "Chip ≤1.0 mm; no corner break", "Visual + caliper", "MAJ"),
        ("Packaging", "Strong crate, separators, moisture and impact protection", "Visual", "MIN"),
    ]
    for row in items:
        ws2.append(row)
    for row in ws2.iter_rows(min_row=2, max_row=len(items) + 1):
        for cell in row:
            cell.font = Font(name="Arial", size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for index, width in enumerate([20, 52, 28, 14], start=1):
        ws2.column_dimensions[get_column_letter(index)].width = width
    ws2.freeze_panes = "A2"

    ws3 = wb.create_sheet("Defect Classes")
    ws3.append(["Class", "Definition", "Typical Defect", "Disposition"])
    for cell in ws3[1]:
        cell.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0F3D3A")
        cell.alignment = Alignment(horizontal="center")
    for row in [
        ("CR", "Safety impact or functional failure", "Through crack, poor tempering, serious corner break", "Reject lot and issue SCAR"),
        ("MAJ", "Affects lamination, assembly or reliability", "Low transmittance, thickness, coating loss", "Reject or sort and re-inspect"),
        ("MIN", "Minor visual issue without functional impact", "Minor scratch or small bubble outside visible area", "Deviation approval by quality engineer"),
    ]:
        ws3.append(row)
    for row in ws3.iter_rows(min_row=2, max_row=4):
        for cell in row:
            cell.font = Font(name="Arial", size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for index, width in enumerate([14, 38, 42, 36], start=1):
        ws3.column_dimensions[get_column_letter(index)].width = width
    ws3.freeze_panes = "A2"

    ws4 = wb.create_sheet("Sampling Flow")
    ws4["A1"] = "PV Glass IQC Sampling and Inspection Flow"
    ws4["A1"].font = Font(name="Arial", size=14, bold=True, color="0F3D3A")
    ws4.merge_cells("A1:H1")
    ws4["A3"] = "Receive lot → AQL sampling → optical and dimensional inspection → lot disposition"
    ws4["A3"].font = Font(name="Arial", size=9, color="677772")
    ws4.merge_cells("A3:H3")
    chart = XLImage(str(flow))
    chart.width = 760
    chart.height = 271
    ws4.add_image(chart, "A5")
    ws4.sheet_view.showGridLines = False

    out = SAMPLES / "PV-IQC-SP-002_PV_Glass_AQL_Sampling_Plan.xlsx"
    wb.save(out)
    return out


def make_junction_pdf() -> Path:
    out = SAMPLES / "PV-IQC-FM-003_PV_Junction_Box_Incoming_Inspection_Record.pdf"
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleEn", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=17,
        textColor=colors.HexColor("#0F3D3A"), spaceAfter=4, alignment=TA_CENTER,
    )
    small = ParagraphStyle("Small", parent=styles["Normal"], fontName="Helvetica", fontSize=7.5, textColor=colors.HexColor("#677772"))
    cell_style = ParagraphStyle("Cell", parent=styles["Normal"], fontName="Helvetica", fontSize=7.2, leading=9)
    head_style = ParagraphStyle("Head", parent=cell_style, fontName="Helvetica-Bold", textColor=colors.white)
    doc = SimpleDocTemplate(str(out), pagesize=A4, leftMargin=13 * mm, rightMargin=13 * mm, topMargin=12 * mm, bottomMargin=12 * mm)
    story = [
        Paragraph("PV Junction Box Incoming Inspection Record", title_style),
        Paragraph("PV IQC INCOMING INSPECTION RECORD · PV-IQC-FM-003 · REV A1", small),
        Spacer(1, 6),
    ]
    meta = Table(
        [[
            Paragraph("<b>Document No.</b><br/>PV-IQC-FM-003", cell_style),
            Paragraph("<b>Revision</b><br/>A1", cell_style),
            Paragraph("<b>Effective</b><br/>2026-10-01", cell_style),
            Paragraph("<b>Retention</b><br/>3 years", cell_style),
        ]],
        colWidths=[48 * mm, 34 * mm, 40 * mm, 34 * mm],
    )
    meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFFAF7")),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#D6F3EB")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D6F3EB")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [meta, Spacer(1, 8)]

    def section(title):
        return Paragraph(f"<b>{title}</b>", ParagraphStyle("H", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=9.5, textColor=colors.HexColor("#17645A"), spaceBefore=6, spaceAfter=4))

    story.append(section("1. Incoming Information"))
    info = Table(
        [
            ["Supplier:", "", "Material:", "PV Junction Box"],
            ["Model:", "", "Lot No.:", ""],
            ["Quantity:", "", "Inspection Date:", ""],
            ["Inspector:", "", "Reference:", "PV-IQC-WI-003"],
        ],
        colWidths=[25 * mm, 58 * mm, 30 * mm, 43 * mm],
    )
    info.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#677772")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#677772")),
        ("LINEBELOW", (1, 0), (1, -1), 0.4, colors.HexColor("#9AA6A3")),
        ("LINEBELOW", (3, 0), (3, -1), 0.4, colors.HexColor("#9AA6A3")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story += [info, Spacer(1, 6)]

    story.append(section("2. Sampling"))
    story.append(Paragraph("Lot size: __________    Sample size: __________    AQL: Major 0.65 / Minor 1.5    Inspection level: General II", cell_style))
    story.append(Spacer(1, 6))

    story.append(section("3. Inspection Items and Results"))
    data = [[
        Paragraph("Item", head_style), Paragraph("Requirement", head_style),
        Paragraph("Measured", head_style), Paragraph("Result", head_style),
    ]]
    rows = [
        ("Appearance", "No deformation, crack, burr or obvious color difference", "", "Pass / Fail"),
        ("Dimensions", "Length, width, height and mounting holes per drawing ±0.5 mm", "", "Pass / Fail"),
        ("Diode forward voltage", "≤0.45 V at 1 A", "______ V", "Pass / Fail"),
        ("Diode reverse leakage", "≤10 μA at rated reverse voltage", "______ μA", "Pass / Fail"),
        ("Terminal pull force", "≥40 N, no pull-out or looseness", "______ N", "Pass / Fail"),
        ("Insulation resistance", "≥100 MΩ at 500 VDC", "______ MΩ", "Pass / Fail"),
        ("Dielectric withstand", "2.5 kV AC / 1 min, no breakdown or flashover", "", "Pass / Fail"),
        ("Ingress protection", "IP68 per technical agreement", "", "Pass / Fail"),
        ("Flame retardancy", "750°C glow wire, no sustained flame", "", "Pass / Fail"),
        ("Marking / packaging", "Model, polarity and lot clear; moisture and impact protection", "", "Pass / Fail"),
    ]
    for row in rows:
        data.append([Paragraph(row[0], cell_style), Paragraph(row[1], cell_style), Paragraph(row[2], cell_style), Paragraph(row[3], cell_style)])
    table = Table(data, colWidths=[33 * mm, 83 * mm, 26 * mm, 31 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17645A")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D7DCDA")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FBFA")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story += [table, Spacer(1, 6)]

    story.append(section("4. Defect Record"))
    story.append(Paragraph("Location: ______________________________    Description: ______________________________________________    Quantity: ______    Class: □ CR  □ MAJ  □ MIN", cell_style))
    story.append(Spacer(1, 5))

    story.append(section("5. Lot Disposition"))
    story.append(Paragraph("□ Accept    □ Accept by deviation    □ Reject and return    □ Sort and re-inspect", cell_style))
    story.append(Paragraph("Disposition note: ____________________________________________________________________________________________", cell_style))
    story.append(Spacer(1, 10))
    sign = Table(
        [["Quality Engineer:", "", "Date:", ""], ["Supplier Representative:", "", "Date:", ""]],
        colWidths=[36 * mm, 62 * mm, 16 * mm, 42 * mm],
    )
    sign.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (1, 0), (1, -1), 0.4, colors.HexColor("#9AA6A3")),
        ("LINEBELOW", (3, 0), (3, -1), 0.4, colors.HexColor("#9AA6A3")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [sign, Spacer(1, 8)]
    story.append(Paragraph(
        "Note: file this record with the diode datasheet, IP test report, flame-retardancy report and defect photos. "
        "Isolate the lot immediately if a critical defect is found.",
        small,
    ))
    doc.build(story)
    return out


if __name__ == "__main__":
    for path in [
        make_cell_docx(),
        make_film_docx(),
        make_frame_docx(),
        make_ribbon_docx(),
        make_glass_xlsx(),
        make_junction_pdf(),
    ]:
        print(path)
