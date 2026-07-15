from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# ===== Color palette =====
ORANGE = RGBColor(0xFF, 0x6B, 0x35)
DARK_BG = RGBColor(0x1A, 0x1A, 0x2E)
CARD_BG = RGBColor(0x16, 0x21, 0x3E)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT = RGBColor(0xE0, 0xE0, 0xE0)
MUTED = RGBColor(0x88, 0x92, 0xB0)
GREEN = RGBColor(0x27, 0xAE, 0x60)
YELLOW = RGBColor(0xF3, 0x9C, 0x12)
RED = RGBColor(0xE7, 0x4C, 0x3C)

def set_slide_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, left, top, width, height, color, alpha=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=18, color=LIGHT, bold=False, alignment=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.alignment = alignment
    return txBox

def add_bullet_slide(slide, items, left=Inches(0.8), top=Inches(2.2), width=Inches(11.5)):
    txBox = slide.shapes.add_textbox(left, top, width, Inches(4.5))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = item
        p.font.size = Pt(16)
        p.font.color.rgb = LIGHT
        p.space_after = Pt(8)

# =========================================
# Slide 1: Cover
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)

add_rect(slide, Inches(0.5), Inches(6.2), Inches(12.3), Inches(0.04), ORANGE)
add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(1.5),
             "🐱 FocusBuddy", font_size=54, color=ORANGE, bold=True)
add_text_box(slide, Inches(0.8), Inches(3.0), Inches(11), Inches(1),
             "学习专注伴侣", font_size=28, color=MUTED)
add_text_box(slide, Inches(0.8), Inches(4.0), Inches(11), Inches(0.8),
             "摄像头实时检测 · 番茄钟 · ESP32像素宠物", font_size=18, color=LIGHT)
add_text_box(slide, Inches(0.8), Inches(5.0), Inches(11), Inches(0.8),
             "Dream Team — HHCC 2026", font_size=16, color=MUTED)
add_text_box(slide, Inches(0.8), Inches(5.5), Inches(11), Inches(0.8),
             "Ryan（前端）· Vickie（硬件+视觉）", font_size=14, color=MUTED)

# =========================================
# Slide 2: Pain Point
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "痛点问题", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11.5), Inches(1),
             "自习时，你知道自己走神了多久吗？", font_size=32, color=ORANGE, bold=True)

add_bullet_slide(slide, [
    "❌  走神不自知 — 学一会儿就刷手机，不知道偷懒了多久",
    "❌  缺乏动力 — 番茄钟太枯燥，没人监督容易放弃",
    "❌  了解不自己 — 不知道一天真正专注了多少时间",
    "❌  提醒太烦 — 手机闹钟不是忘了就是嫌关掉",
    "",
    "📊 研究表明：平均每 15 分钟走神 1 次",
    "💡 需要的是「看得见的专注伴侣」，而不是又一个闹钟"
], top=Inches(2.6))

# =========================================
# Slide 3: Solution
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "解决方案", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.4), Inches(11.5), Inches(0.8),
             "FocusBuddy — 专注检测 + 番茄钟 + 宠物反馈 的三合一闭环",
             font_size=26, color=ORANGE, bold=True)

# Flow boxes
flow_data = [
    (Inches(0.5), Inches(2.6), Inches(3.8), Inches(1.2), "📷 摄像头检测", "MediaPipe FaceMesh 468点\n面部朝向 + 闭眼 + 转头", RGBColor(0xF3, 0x9C, 0x12)),
    (Inches(4.8), Inches(2.6), Inches(3.8), Inches(1.2), "🧠 状态判定", "专注 🟢  /  走神 🟡  /  离开 🔴", RGBColor(0x34, 0x98, 0xDB)),
    (Inches(9.1), Inches(2.6), Inches(3.8), Inches(1.2), "🐱 三重反馈", "番茄钟 · 宠物表情 · 数据统计", RGBColor(0x27, 0xAE, 0x60)),
]
for (l, t, w, h, title, desc, color) in flow_data:
    box = add_rect(slide, l, t, w, h, color, 0.15)
    add_text_box(slide, l + Inches(0.2), t + Inches(0.1), w - Inches(0.4), Inches(0.5),
                 title, font_size=18, color=color, bold=True)
    add_text_box(slide, l + Inches(0.2), t + Inches(0.55), w - Inches(0.4), Inches(0.6),
                 desc, font_size=14, color=LIGHT)

add_bullet_slide(slide, [
    "▸ 不是简单的番茄钟 — 它知道你有没有真的在看屏幕",
    "▸ 不是单纯的摄像头 — 走神时像素宠物会提醒你",
    "▸ 两者联动形成闭环：检测 → 反馈 → 激励"
], top=Inches(4.2))

# =========================================
# Slide 4: Web Interface Demo
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Web 仪表盘", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.7),
             "🎬 现场演示：从打开到番茄完成全流程", font_size=20, color=ORANGE)

items = [
    "① 打开页面 → 摄像头请求 → 允许后自动加载 FaceMesh",
    "② 点击「开始专注」→ 番茄钟 25:00 倒计时开始",
    "③ 状态指示器：🟢专注 / 🟡走神 / 🔴离开 / ⚪未开始",
    "④ 今日统计实时更新：专注时长、走神次数、完成番茄数",
    "⑤ Chart.js 饼图（专注 vs 走神）+ 7天柱状图",
    "⑥ 📋 今日计划：输入提示词自动生成待办清单 + 持久化",
    "⑦ 番茄完成 → 🎉 庆祝动画 + 桌面通知 + ⭐ 计数 + 音效",
]
add_bullet_slide(slide, items, top=Inches(2.0))

# =========================================
# Slide 5: Hardware ESP32
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "ESP32 像素宠物", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.7),
             "🖥️ Waveshare ESP32-S3-Matrix · 8×8 NeoPixel LED", font_size=20, color=ORANGE)

add_bullet_slide(slide, [
    "😊 开心 (绿) — 专注中 → 偶尔眨眼动画",
    "😟 担心 (黄) — 走神/转头 → 提醒你回来",
    "😡 愤怒 (红) — 警告 → 离开 > 10s 闪烁",
    "😴 睡觉 (蓝) — 离开/未开始 → 安静等待",
    "🎉 庆祝 (橙) — 番茄完成 → 3帧动画循环 (5s)",
    "",
    "📟 倒计时数字显示 — 5×3自定义字体渲染",
    "   GET /timer?m=25&s=00 → 两数字+冒号闪烁",
    "",
    "🌐 WiFi AP 模式 — SSID: FocusBuddy / IP: 10.10.10.1",
    "   HTTP API: /pet /timer /alert /status"
], top=Inches(2.0))

# =========================================
# Slide 6: Technology
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "技术实现", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.7),
             "全栈架构：原生 JS × MediaPipe × ESP32", font_size=20, color=ORANGE)

left_items = [
    "👁 视觉检测（Vickie）",
    "  · MediaPipe FaceMesh 468点",
    "  · EAR < 0.22 + >800ms → 闭眼",
    "  · headRatio < 0.38 → 低头",
    "  · turnRatio < 0.62 → 转头",
    "  · 专注评分系统 (0-100)",
    "",
    "🍅 番茄钟 + 统计（Ryan）",
    "  · PomodoroTimer 状态机",
    "  · localStorage 持久化",
    "  · Chart.js 饼图+柱状图",
]

right_items = [
    "🖥️ ESP32 固件（Vickie）",
    "  · WiFi AP: FocusBuddy",
    "  · HTTP Server (80端口)",
    "  · 4种表情像素帧",
    "  · 5×3数字倒计时渲染",
    "  · 警告闪烁动画",
    "",
    "🔗 通信协议",
    "  · GET /pet?state=happy",
    "  · GET /timer?m=25&s=00",
    "  · GET /alert (闪烁3s)",
    "  · GET /status (JSON)",
]

txBox = slide.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(5.8), Inches(5))
tf = txBox.text_frame
tf.word_wrap = True
for i, item in enumerate(left_items):
    p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
    p.text = item
    p.font.size = Pt(13)
    p.font.color.rgb = LIGHT if item.startswith("  ") else ORANGE
    p.font.bold = not item.startswith("  ")
    p.space_after = Pt(2)

txBox2 = slide.shapes.add_textbox(Inches(7), Inches(2.0), Inches(5.8), Inches(5))
tf2 = txBox2.text_frame
tf2.word_wrap = True
for i, item in enumerate(right_items):
    p = tf2.paragraphs[0] if i == 0 else tf2.add_paragraph()
    p.text = item
    p.font.size = Pt(13)
    p.font.color.rgb = LIGHT if item.startswith("  ") else ORANGE
    p.font.bold = not item.startswith("  ")
    p.space_after = Pt(2)

# =========================================
# Slide 7: Innovation
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "创新点对比", font_size=22, color=WHITE, bold=True)

# Table-like layout
headers = ["维度", "传统番茄钟", "FocusBuddy"]
rows = [
    ["检测机制", "无", "FaceMesh 468点面部检测"],
    ["反馈方式", "手机闹钟", "LED宠物表情+颜色指示器"],
    ["数据记录", "无", "专注率+走神统计+7天趋势"],
    ["联动", "独立运行", "检测↔计时↔宠物三联动"],
    ["硬件扩展", "无", "ESP32-S3 8×8矩阵"],
    ["计划功能", "无", "提示词→自动生成待办"],
]

# Draw headers
for ci, h in enumerate(headers):
    x = Inches(0.8 + ci * 4)
    box = add_rect(slide, x, Inches(1.5), Inches(3.8), Inches(0.6), ORANGE)
    add_text_box(slide, x + Inches(0.2), Inches(1.55), Inches(3.4), Inches(0.5),
                 h, font_size=16, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

for ri, row in enumerate(rows):
    y = Inches(2.3 + ri * 0.65)
    bg_color = RGBColor(0x22, 0x22, 0x3E) if ri % 2 == 0 else RGBColor(0x1E, 0x1E, 0x3A)
    for ci, cell in enumerate(row):
        x = Inches(0.8 + ci * 4)
        add_rect(slide, x, y, Inches(3.8), Inches(0.55), bg_color)
        add_text_box(slide, x + Inches(0.2), y + Inches(0.08), Inches(3.4), Inches(0.45),
                     cell, font_size=14, color=ORANGE if ci == 0 else LIGHT, bold=(ci == 2))

# =========================================
# Slide 8: Demo Video
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "演示视频", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(1),
             "🎬 完整使用流程（2分钟）", font_size=28, color=ORANGE, bold=True)

add_bullet_slide(slide, [
    "📌 00:00  打开页面 → 允许摄像头 → FaceMesh加载",
    "📌 00:15  点击开始专注 → 番茄钟倒计时 + 宠物开心",
    "📌 00:35  演示走神 → 宠物变担心 + 状态变黄",
    "📌 00:50  演示离开 → 番茄钟暂停 + 宠物睡觉",
    "📌 01:10  回到座位 → 自动恢复专注",
    "📌 01:25  番茄完成 → 庆祝动画 + 桌面通知 + ⭐",
    "📌 01:40  查看统计 → 饼图 / 柱状图 / 今日计划",
    "",
    "💡 备用方案：如现场网络卡顿，播放录屏",
], top=Inches(2.5))

# =========================================
# Slide 9: Future
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "未来规划", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(0.8),
             "从个人工具到学习生态", font_size=28, color=ORANGE, bold=True)

add_bullet_slide(slide, [
    "🌐 多用户联机自习室 — 看到朋友也在专注，互相监督",
    "😪 疲劳检测 — 加入打哈欠检测(MAR)，建议休息",
    "🤖 AI 学习报告 — 每天自动生成专注分析+建议",
    "📱 移动端适配 — 手机+平板上线",
    "🔗 更丰富的硬件联动 — 震动提醒、光线提示",
    "",
    "让 FocusBuddy 成为每个人桌面上的专注伙伴 🐱"
], top=Inches(2.5))

# =========================================
# Slide 10: Team + Thank You
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(6.8), Inches(12.3), Inches(0.04), ORANGE)

add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(1),
             "Dream Team", font_size=42, color=ORANGE, bold=True)

add_text_box(slide, Inches(0.8), Inches(2.8), Inches(5), Inches(0.6),
             "Ryan", font_size=28, color=LIGHT, bold=True)
add_text_box(slide, Inches(0.8), Inches(3.4), Inches(5), Inches(0.5),
             "前端开发 · Pomodoro · 统计 · 设置 · UI",
             font_size=16, color=MUTED)

add_text_box(slide, Inches(0.8), Inches(4.2), Inches(5), Inches(0.6),
             "Vickie", font_size=28, color=LIGHT, bold=True)
add_text_box(slide, Inches(0.8), Inches(4.8), Inches(5), Inches(0.5),
             "FaceMesh算法 · ESP32固件 · 主状态机 · 集成",
             font_size=16, color=MUTED)

add_text_box(slide, Inches(0.8), Inches(5.8), Inches(11), Inches(0.5),
             "github.com/Sapnap67/FocusBuddy",
             font_size=14, color=MUTED)

add_text_box(slide, Inches(0.8), Inches(6.2), Inches(11), Inches(0.5),
             "🐱 感谢评委老师和 HHCC 2026！",
             font_size=20, color=ORANGE, bold=True)

# Save
output_path = r"C:\Users\HUAWEI\Desktop\openclaw\FocusBuddy_v3\docs\FocusBuddy_PPT.pptx"
prs.save(output_path)
print(f"✅ PPT saved: {output_path}")
print(f"📊 {len(prs.slides)} slides")
