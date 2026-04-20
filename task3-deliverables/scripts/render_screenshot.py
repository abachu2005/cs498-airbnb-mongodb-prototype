#!/usr/bin/env python3
"""Render mongosh evidence into a wide, readable dark-themed terminal screenshot."""

import os
from PIL import Image, ImageDraw, ImageFont

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
OUTPUT = os.path.join(ASSETS, "mongosh_evidence_screenshot.png")

BG = (30, 33, 46)
FG = (205, 214, 244)
GREEN = (166, 227, 161)
YELLOW = (249, 226, 175)
BLUE = (137, 180, 250)
MAGENTA = (203, 166, 247)
CYAN = (137, 220, 235)
TITLE_BAR = (49, 50, 68)
RED_DOT = (243, 87, 87)
YELLOW_DOT = (249, 226, 175)
GREEN_DOT = (166, 227, 161)
DIM = (108, 112, 134)

FONT_SIZE = 15
LINE_HEIGHT = 21
PAD_X = 24
PAD_Y = 16
TITLE_H = 34
WIDTH = 920

LINES = [
    ("green",  "$ mongosh <local-uri> --quiet --eval \"...\""),
    ("dim",    ""),
    ("green",  "Connected DB: airbnb_task3"),
    ("dim",    ""),
    ("yellow", "Collection counts:"),
    ("fg",     "  listings:       200"),
    ("fg",     "  reviews:        320"),
    ("fg",     "  neighborhoods:  98"),
    ("fg",     "  calendar:       480"),
    ("dim",    ""),
    ("yellow", "Sample listings (Portland):"),
    ("magenta", '{'),
    ("fg",     '  "city": "portland",  "listing_id": 37676,'),
    ("fg",     '  "name": "Mt. Hood View in the Pearl District",'),
    ("fg",     '  "neighborhood": "Pearl",  "room_type": "Entire home/apt",'),
    ("fg",     '  "accommodates": 2,  "host_name": "Paul",  "review_scores_rating": 4.89'),
    ("magenta", '}'),
    ("magenta", '{'),
    ("fg",     '  "city": "portland",  "listing_id": 61893,'),
    ("fg",     '  "name": "Perfect Portland Place",'),
    ("fg",     '  "neighborhood": "Goose Hollow",  "room_type": "Entire home/apt",'),
    ("fg",     '  "accommodates": 2,  "host_name": "Matt",  "review_scores_rating": 5'),
    ("magenta", '}'),
    ("dim",    ""),
    ("yellow", "Sample calendar rows (Salem):"),
    ("magenta", '{'),
    ("fg",     '  "city": "salem",  "listing_id": 199568,  "date": "2025-12-28",'),
    ("fg",     '  "available": false,  "minimum_nights": 4,  "maximum_nights": 120'),
    ("magenta", '}'),
    ("dim",    ""),
    ("yellow", "Sample reviews (San Diego):"),
    ("magenta", '{'),
    ("fg",     '  "city": "san_diego",  "listing_id": 6,  "date": "2008-06-22",'),
    ("fg",     '  "reviewer_id": 415,  "reviewer_name": "Terrence"'),
    ("magenta", '}'),
    ("dim",    ""),
    ("yellow", "Sample neighborhoods (Los Angeles):"),
    ("magenta", '{'),
    ("fg",     '  "city": "los_angeles",  "neighborhood": "Adams-Normandie"'),
    ("magenta", '}'),
    ("dim",    ""),
    ("yellow", "Indexes on listings:"),
    ("blue",   "  { city, listing_id } [unique]"),
    ("blue",   "  { city, neighborhood, room_type }"),
    ("blue",   "  { host_id, city }"),
    ("dim",    ""),
    ("yellow", "Indexes on calendar:"),
    ("blue",   "  { city, listing_id, date }"),
    ("blue",   "  { city, date, available }"),
    ("dim",    ""),
    ("yellow", "Indexes on reviews:"),
    ("blue",   "  { city, listing_id, date }"),
    ("blue",   "  { reviewer_id, listing_id, date }"),
    ("dim",    ""),
    ("yellow", "Indexes on neighborhoods:"),
    ("blue",   "  { city, neighborhood } [unique]"),
]

COLOR_MAP = {
    "fg": FG, "green": GREEN, "yellow": YELLOW,
    "blue": BLUE, "magenta": MAGENTA, "cyan": CYAN, "dim": DIM,
}


def get_font():
    candidates = [
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/SFMono-Regular.otf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, FONT_SIZE)
            except Exception:
                continue
    return ImageFont.load_default()


def render():
    font = get_font()
    img_h = TITLE_H + PAD_Y * 2 + len(LINES) * LINE_HEIGHT + 10
    img = Image.new("RGB", (WIDTH, img_h), BG)
    draw = ImageDraw.Draw(img)

    draw.rectangle([(0, 0), (WIDTH, TITLE_H)], fill=TITLE_BAR)
    cx = 18
    for dot_color in [RED_DOT, YELLOW_DOT, GREEN_DOT]:
        draw.ellipse([(cx - 6, TITLE_H // 2 - 6), (cx + 6, TITLE_H // 2 + 6)], fill=dot_color)
        cx += 22

    title = "mongosh session evidence"
    draw.text((WIDTH // 2, TITLE_H // 2), title, fill=FG, font=font, anchor="mm")

    y = TITLE_H + PAD_Y
    for color_key, text in LINES:
        color = COLOR_MAP.get(color_key, FG)
        draw.text((PAD_X, y), text, fill=color, font=font)
        y += LINE_HEIGHT

    img.save(OUTPUT, "PNG")
    print(f"Saved {OUTPUT} ({WIDTH}x{img_h})")


if __name__ == "__main__":
    render()
