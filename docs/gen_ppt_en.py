from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

import os

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
BLUE = RGBColor(0x34, 0x98, 0xDB)
IMG_BG = RGBColor(0x20, 0x2A, 0x44)

# Project base
BASE = r"C:\Users\HUAWEI\Desktop\openclaw\FocusBuddy_v3"


def set_slide_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape


def add_pic_frame(slide, left, top, width, height, label="Screenshot"):
    """Add an image placeholder with label"""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = IMG_BG
    shape.line.color.rgb = MUTED
    shape.line.width = Pt(1.5)
    shape.shadow.inherit = False
    txBox = slide.shapes.add_textbox(left, top + height / 2 - Inches(0.3), width, Inches(0.6))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = label
    p.font.size = Pt(14)
    p.font.color.rgb = MUTED
    p.alignment = PP_ALIGN.CENTER
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


def add_bullets(slide, items, left=Inches(0.8), top=Inches(2.2), width=Inches(11.5), height=Inches(5.0), font_size=15):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = item
        p.font.size = Pt(font_size)
        p.font.color.rgb = LIGHT
        p.space_after = Pt(6)
    return txBox


def add_img(slide, path, left, top, width, height):
    """Add image if exists and format is supported, otherwise add placeholder"""
    if os.path.exists(path) and path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
        slide.shapes.add_picture(path, left, top, width, height)
        return True
    return False


# =========================================
# Slide 1: Cover
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(6.2), Inches(12.3), Inches(0.04), ORANGE)
add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11), Inches(1.5),
             "FocusBuddy", font_size=54, color=ORANGE, bold=True)
add_text_box(slide, Inches(0.8), Inches(3.0), Inches(11), Inches(1),
             "Your Learning Focus Companion", font_size=28, color=MUTED)
add_text_box(slide, Inches(0.8), Inches(4.0), Inches(11), Inches(0.8),
             "Webcam Detection + Pomodoro Timer + ESP32 Pixel Pet", font_size=18, color=LIGHT)
add_text_box(slide, Inches(0.8), Inches(5.0), Inches(11), Inches(0.8),
             "Dream Team — HHCC 2026", font_size=16, color=MUTED)
add_text_box(slide, Inches(0.8), Inches(5.5), Inches(11), Inches(0.8),
             "Ryan (Frontend) · Vickie (Hardware & Vision)", font_size=14, color=MUTED)

# =========================================
# Slide 2: Problem
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "The Problem", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.5), Inches(11.5), Inches(1),
             "Do you know how long you've been distracted?", font_size=32, color=ORANGE, bold=True)
add_bullets(slide, [
    "We get distracted without realizing it — pick up phone, lose 30 min",
    "Pomodoro timers only count time, they don't check if you're focused",
    "No data feedback — no idea how much you actually studied today",
    "Phone reminders are annoying; we ignore or dismiss them",
    "",
    "Average: 1 distraction every 15 minutes during self-study",
    "Solution: A focus companion that gives REAL-TIME FEEDBACK"
], top=Inches(2.6), font_size=15)

# =========================================
# Slide 3: Solution
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Our Solution", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.4), Inches(11.5), Inches(0.8),
             "FocusBuddy — a 3-in-1 closed loop: Detect + Timer + Feedback",
             font_size=26, color=ORANGE, bold=True)

flow_data = [
    (Inches(0.5), Inches(2.4), Inches(3.8), Inches(1.4), "Camera Detection",
     "MediaPipe FaceMesh 468 landmarks\nFace orientation + Eye closure + Head turn", RGBColor(0xF3, 0x9C, 0x12)),
    (Inches(4.8), Inches(2.4), Inches(3.8), Inches(1.4), "Status Engine",
     "Focused / Distracted / Away", RGBColor(0x34, 0x98, 0xDB)),
    (Inches(9.1), Inches(2.4), Inches(3.8), Inches(1.4), "Triple Feedback",
     "Pomodoro Timer + Pet Expression + Data Charts", RGBColor(0x27, 0xAE, 0x60)),
]
for (l, t, w, h, title, desc, color) in flow_data:
    add_rect(slide, l, t, w, h, color)
    add_text_box(slide, l + Inches(0.2), t + Inches(0.15), w - Inches(0.4), Inches(0.4),
                 title, font_size=17, color=color, bold=True)
    add_text_box(slide, l + Inches(0.2), t + Inches(0.55), w - Inches(0.4), Inches(0.7),
                 desc, font_size=13, color=LIGHT)

add_bullets(slide, [
    "Not just a timer — it knows if you're actually watching the screen",
    "Not just a camera — the pixel pet reacts when you get distracted",
    "Detection + Feedback + Motivation — in one closed loop"
], top=Inches(4.1), font_size=14)

# Solution diagram placeholder
add_pic_frame(slide, Inches(0.8), Inches(4.8), Inches(11.5), Inches(2.2),
              "System Flow (Detection -> Judgment -> Feedback -> Motivation)")

# =========================================
# Slide 4: Web Dashboard
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Web Dashboard", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.6),
             "Live Demo: Full flow from open to pomodoro complete", font_size=20, color=ORANGE)
add_bullets(slide, [
    "Open page -> camera permission -> FaceMesh loads automatically",
    "Click Start Focus -> Pomodoro timer 25:00 begins counting down",
    "Status indicator: Focused / Distracted / Away / Idle",
    "Real-time stats: focus time, distraction count, completed pomodoros",
    "Chart.js pie chart (Focus vs Distraction) + 7-day bar chart",
    "Daily Plan: type prompts, auto-generate todo list with time estimates",
    "Pomodoro complete -> celebration animation + desktop notification"
], top=Inches(1.8), width=Inches(6.5), font_size=13)

# Right side: screenshot placeholders
add_pic_frame(slide, Inches(7.8), Inches(1.2), Inches(5), Inches(2.9),
              "Main UI Screenshot\n(Camera + Timer + Pet)")
add_pic_frame(slide, Inches(7.8), Inches(4.3), Inches(5), Inches(2.8),
              "Statistics Screenshot\n(Charts + Daily Plan)")

# =========================================
# Slide 5: ESP32 Hardware
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "ESP32 Pixel Pet", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.1), Inches(11), Inches(0.6),
             "Waveshare ESP32-S3-Matrix + 8x8 NeoPixel LED", font_size=20, color=ORANGE)

# Left: emoji images grid
emoji_top = Inches(1.8)
emoji_size = Inches(1.5)
add_img(slide, os.path.join(BASE, "dream-emoji", "happy.png"), Inches(0.8), emoji_top, emoji_size, emoji_size)
add_img(slide, os.path.join(BASE, "dream-emoji", "angry.png"), Inches(2.6), emoji_top, emoji_size, emoji_size)
add_pic_frame(slide, Inches(4.4), emoji_top, emoji_size, emoji_size,
              "😊 happy")
# Pet picture frame
add_pic_frame(slide, Inches(0.8), Inches(3.6), Inches(3.8), Inches(1.8),
              "ESP32 Device Photo")
add_pic_frame(slide, Inches(4.8), Inches(3.6), Inches(2.0), Inches(3.4),
              "8x8 Matrix\nPixel Expression")

# Right: bullet list
add_bullets(slide, [
    "Happy (Green) — Focused -> occasional blink animation",
    "Worried (Yellow) — Distracted/head turned -> gentle reminder",
    "Angry (Red) — Warning -> away > 10 seconds, red flashing",
    "Sleeping (Blue) — Away/Idle -> quiet waiting",
    "Celebrate (Orange) — Pomodoro complete -> 3-frame loop (5s)",
    "",
    "Digital countdown display — custom 5x3 pixel font",
    "WiFi AP mode — SSID: FocusBuddy / IP: 10.10.10.1",
    "   HTTP API: /pet /timer /alert /status"
], left=Inches(7.2), top=Inches(1.6), width=Inches(5.5), font_size=13)

# =========================================
# Slide 6: Technology
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Technology Stack", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.1), Inches(11), Inches(0.6),
             "Native JS + MediaPipe + ESP32 — Zero framework, Zero backend",
             font_size=20, color=ORANGE)

left_items = [
    "Vision Detection",
    "  MediaPipe FaceMesh 468 pts",
    "  EAR < 0.22 + >800ms -> eyes closed",
    "  headRatio < 0.38 -> looking down",
    "  turnRatio < 0.62 -> looking away",
    "  Focus score system (0-100)",
    "",
    "Pomodoro + Statistics",
    "  PomodoroTimer state machine",
    "  localStorage persistence",
    "  Chart.js pie + bar charts",
]
right_items = [
    "ESP32 Firmware",
    "  WiFi AP: FocusBuddy",
    "  HTTP Server (port 80)",
    "  4 pet expressions (8x8 bitmap)",
    "  5x3 digit countdown renderer",
    "  Alarm blink animation",
    "",
    "Communication Protocol",
    "  GET /pet?state=happy",
    "  GET /timer?m=25&s=00",
    "  GET /alert (3s blinking)",
    "  GET /status (JSON)",
]

for col_data in [(left_items, Inches(0.8)), (right_items, Inches(7.0))]:
    items, left_pos = col_data
    txBox = slide.shapes.add_textbox(left_pos, Inches(1.8), Inches(5.8), Inches(5))
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = item
        p.font.size = Pt(13)
        p.font.color.rgb = LIGHT if item.startswith("  ") else ORANGE
        p.font.bold = not item.startswith("  ")
        p.space_after = Pt(2)

# Architecture diagram placeholder
add_pic_frame(slide, Inches(0.8), Inches(4.6), Inches(11.7), Inches(2.4),
              "System Architecture Diagram (Browser -> FaceMesh -> ESP32 -> WebSocket)")

# =========================================
# Slide 7: Innovation Comparison
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Why Different?", font_size=22, color=WHITE, bold=True)

headers = ["Dimension", "Traditional Timer", "FocusBuddy"]
rows = [
    ["Detection", "None", "FaceMesh 468-pt face tracking"],
    ["Feedback", "Phone alarm", "LED pet + color status indicator"],
    ["Data Logging", "None", "Focus rate + stats + 7-day trends"],
    ["Integration", "Standalone", "Detect + Timer + Pet linked"],
    ["Hardware", "None", "ESP32-S3 8x8 LED Matrix"],
    ["Planning", "None", "Prompt -> auto todo list"],
]
for ci, h in enumerate(headers):
    x = Inches(0.8 + ci * 4)
    add_rect(slide, x, Inches(1.5), Inches(3.8), Inches(0.6), ORANGE)
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
             "Demo Video", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.7),
             "Full Usage Walkthrough (2 minutes)", font_size=28, color=ORANGE, bold=True)
add_bullets(slide, [
    "00:00  Open page -> Allow camera -> FaceMesh loading",
    "00:15  Click Start Focus -> Pomodoro countdown + Happy pet",
    "00:35  Look away -> Pet turns Worried + Status turns yellow",
    "00:50  Leave desk -> Timer pauses + Pet sleeps + Red flash",
    "01:10  Return -> Auto-resume focus mode",
    "01:25  Pomodoro complete -> Celebration + Notification + Star",
    "01:40  View stats -> Pie chart / Bar chart / Daily Plan",
    "",
    "Backup: Pre-recorded screen capture in case of network issues"
], left=Inches(0.8), top=Inches(1.9), width=Inches(7.0), font_size=14)

# Right side: video screenshot placeholder
add_pic_frame(slide, Inches(8.2), Inches(1.8), Inches(4.6), Inches(2.8),
              "Demo Video Screenshot")
add_pic_frame(slide, Inches(8.2), Inches(4.8), Inches(4.6), Inches(2.2),
              "Statistics Page Screenshot")

# =========================================
# Slide 9: Data Dashboard (NEW!)
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Data Insights", font_size=22, color=WHITE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.6),
             "Your focus data is more intuitive than you think", font_size=24, color=ORANGE, bold=True)

# Key metrics boxes
metrics = [
    (Inches(0.8), Inches(2.0), Inches(2.8), Inches(1.5), "Today Focus", "00:32:15", "+15% vs yesterday", GREEN),
    (Inches(3.8), Inches(2.0), Inches(2.8), Inches(1.5), "Distractions", "12 times", "Avg 2.7min each", RED),
    (Inches(6.8), Inches(2.0), Inches(2.8), Inches(1.5), "Pomodoros", "3/5 done", "60% completion", ORANGE),
    (Inches(9.8), Inches(2.0), Inches(2.8), Inches(1.5), "Focus Rate", "68%", "Week best 82%", BLUE),
]
for (l, t, w, h, label, value, sub, color) in metrics:
    box = add_rect(slide, l, t, w, h, RGBColor(0x1E, 0x2A, 0x44))
    add_text_box(slide, l + Inches(0.2), t + Inches(0.1), w - Inches(0.4), Inches(0.4),
                 label, font_size=14, color=MUTED)
    add_text_box(slide, l + Inches(0.2), t + Inches(0.45), w - Inches(0.4), Inches(0.5),
                 value, font_size=28, color=color, bold=True)
    add_text_box(slide, l + Inches(0.2), t + Inches(0.95), w - Inches(0.4), Inches(0.4),
                 sub, font_size=11, color=MUTED)

# Chart placeholder
add_pic_frame(slide, Inches(0.8), Inches(3.8), Inches(5.8), Inches(3.2),
              "Pie Chart: Focus vs Distraction vs Away")
add_pic_frame(slide, Inches(7.0), Inches(3.8), Inches(5.8), Inches(3.2),
              "Bar Chart: 7-Day Focus Trend")

# =========================================
# Slide 10: Future
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(0.3), Inches(3.2), Inches(0.6), ORANGE)
add_text_box(slide, Inches(0.7), Inches(0.35), Inches(3), Inches(0.5),
             "Future Plans", font_size=22, color=WHITE, bold=True)
add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.7),
             "From Personal Tool to Learning Ecosystem", font_size=28, color=ORANGE, bold=True)
add_bullets(slide, [
    "Multi-user study room — see friends focusing, motivate each other",
    "Fatigue detection (yawning via MAR) — suggest breaks",
    "AI daily report — auto-generated focus analysis + suggestions",
    "Mobile responsive — phone + tablet support",
    "More hardware integrations — vibration alerts, ambient lights",
    "",
    "Long-term: Smart schedule engine — recommend best study times",
    "",
    "Making FocusBuddy the desk companion for every learner"
], top=Inches(1.9), width=Inches(7.0), font_size=14)

# Right: future mockup placeholder
add_pic_frame(slide, Inches(8.2), Inches(1.5), Inches(4.6), Inches(5.5),
              "Multi-user Study Room\nConcept Design")

# =========================================
# Slide 11: Team + Thank You
# =========================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, DARK_BG)
add_rect(slide, Inches(0.5), Inches(6.8), Inches(12.3), Inches(0.04), ORANGE)

add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.8),
             "Dream Team", font_size=42, color=ORANGE, bold=True)

# Left: team info
add_text_box(slide, Inches(0.8), Inches(2.4), Inches(5), Inches(0.6),
             "Ryan", font_size=28, color=LIGHT, bold=True)
add_text_box(slide, Inches(0.8), Inches(3.0), Inches(5), Inches(0.5),
             "Frontend: Pomodoro, Statistics, Settings, UI",
             font_size=16, color=MUTED)

add_text_box(slide, Inches(0.8), Inches(3.8), Inches(5), Inches(0.6),
             "Vickie", font_size=28, color=LIGHT, bold=True)
add_text_box(slide, Inches(0.8), Inches(4.4), Inches(5), Inches(0.5),
             "Algorithm: FaceMesh, ESP32 firmware, State machine",
             font_size=16, color=MUTED)

# Right: project stats
add_pic_frame(slide, Inches(7.0), Inches(2.0), Inches(5.8), Inches(4.2),
              "Team Photo / Project Photo")

add_text_box(slide, Inches(0.8), Inches(5.4), Inches(11), Inches(0.5),
             "github.com/Sapnap67/FocusBuddy",
             font_size=14, color=MUTED)

add_text_box(slide, Inches(0.8), Inches(5.9), Inches(11), Inches(0.5),
             "Thank you, HHCC 2026 judges! 🐱",
             font_size=20, color=ORANGE, bold=True)

add_text_box(slide, Inches(0.8), Inches(6.3), Inches(11), Inches(0.4),
             "Made with ❤️ by Dream Team · 2026",
             font_size=12, color=MUTED)

# Save
output_path = r"C:\Users\HUAWEI\Desktop\openclaw\FocusBuddy_v3\docs\FocusBuddy_EN.pptx"
prs.save(output_path)
print(f"Saved: {output_path} ({len(prs.slides)} slides)")
