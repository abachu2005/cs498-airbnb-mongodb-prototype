#!/usr/bin/env python3
"""Generate high-quality model and ETL diagrams for Task 3 report using drawsvg."""

import drawsvg as draw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

COLORS = {
    "bg": "#FAFBFE",
    "listings": "#2563EB",
    "listings_fill": "#EEF4FF",
    "listings_fill2": "#DBEAFE",
    "calendar": "#0891B2",
    "calendar_fill": "#ECFEFF",
    "calendar_fill2": "#CFFAFE",
    "reviews": "#7C3AED",
    "reviews_fill": "#F5F3FF",
    "reviews_fill2": "#EDE9FE",
    "neighborhoods": "#059669",
    "neighborhoods_fill": "#ECFDF5",
    "neighborhoods_fill2": "#D1FAE5",
    "arrow": "#94A3B8",
    "arrow_label": "#64748B",
    "idx_bg": "#F1F5F9",
    "idx_border": "#CBD5E1",
    "text": "#1E293B",
    "subtext": "#64748B",
    "divider": "#E2E8F0",
}


def rounded_rect(d, x, y, w, h, r, fill, stroke, stroke_width=2):
    d.append(draw.Rectangle(x, y, w, h, rx=r, ry=r,
                            fill=fill, stroke=stroke, stroke_width=stroke_width))


def draw_collection_box(d, x, y, w, h, title, fields, indexes, color, fill, fill2):
    rounded_rect(d, x, y, w, h, 10, fill, color, 2.5)

    header_h = 42
    d.append(draw.Rectangle(x, y, w, header_h, rx=10, ry=10, fill=color))
    d.append(draw.Rectangle(x, y + header_h - 10, w, 10, fill=color))

    d.append(draw.Text(title, 17, x + w / 2, y + header_h / 2 + 1,
                       fill="white", text_anchor="middle", dominant_baseline="central",
                       font_weight="bold", font_family="Helvetica, Arial, sans-serif"))

    field_y = y + header_h + 18
    for f in fields:
        d.append(draw.Text(f, 12.5, x + 18, field_y,
                           fill=COLORS["text"], text_anchor="start",
                           dominant_baseline="central",
                           font_family="'SF Mono', 'Menlo', 'Consolas', monospace"))
        field_y += 22

    sep_y = field_y + 6
    d.append(draw.Line(x + 12, sep_y, x + w - 12, sep_y,
                       stroke=COLORS["divider"], stroke_width=1))

    idx_y = sep_y + 14
    for idx in indexes:
        idx_w = w - 32
        idx_h = 26
        ix = x + 16
        rounded_rect(d, ix, idx_y - 1, idx_w, idx_h, 5, fill2, COLORS["idx_border"], 1)
        d.append(draw.Text(f"IDX: {idx}", 10.5, ix + 10, idx_y + idx_h / 2,
                           fill=COLORS["subtext"], text_anchor="start",
                           dominant_baseline="central",
                           font_family="'SF Mono', 'Menlo', monospace"))
        idx_y += idx_h + 6


def draw_arrow(d, x1, y1, x2, y2, label, label_offset_x=0, label_offset_y=-10):
    mid_x = (x1 + x2) / 2 + label_offset_x
    mid_y = (y1 + y2) / 2 + label_offset_y

    marker = draw.Marker(-0.8, -3, 5, 3, orient="auto")
    marker.append(draw.Lines(-0.8, -3, -0.8, 3, 5, 0, close=True,
                             fill=COLORS["arrow"]))

    d.append(draw.Line(x1, y1, x2, y2,
                       stroke=COLORS["arrow"], stroke_width=1.8,
                       stroke_dasharray="6,4",
                       marker_end=marker))

    d.append(draw.Text(label, 11, mid_x, mid_y,
                       fill=COLORS["arrow_label"], text_anchor="middle",
                       dominant_baseline="central",
                       font_family="Helvetica, Arial, sans-serif",
                       font_style="italic"))


def generate_model_diagram():
    W, H = 920, 710
    d = draw.Drawing(W, H)

    d.append(draw.Rectangle(0, 0, W, H, fill=COLORS["bg"]))

    d.append(draw.Text("MongoDB Data Model Architecture", 22, W / 2, 36,
                       fill=COLORS["text"], text_anchor="middle",
                       dominant_baseline="central",
                       font_weight="bold",
                       font_family="Helvetica, Arial, sans-serif"))
    d.append(draw.Text("Collection boundaries, index strategy, and query relationships", 12,
                       W / 2, 58,
                       fill=COLORS["subtext"], text_anchor="middle",
                       dominant_baseline="central",
                       font_family="Helvetica, Arial, sans-serif"))

    col_w = 340
    left_x = 40
    right_x = W - col_w - 40

    listings_h = 330
    listings_y = 82
    draw_collection_box(d, left_x, listings_y, col_w, listings_h,
                        "listings",
                        ["city, listing_id (PK)", "name, neighborhood",
                         "room_type, property_type", "accommodates, price",
                         "host_id, host_name", "review_scores_rating",
                         "listing_url, description, amenities"],
                        ["{city, listing_id} unique",
                         "{city, neighborhood, room_type}",
                         "{host_id, city}"],
                        COLORS["listings"], COLORS["listings_fill"], COLORS["listings_fill2"])

    calendar_h = 240
    calendar_y = 82
    draw_collection_box(d, right_x, calendar_y, col_w, calendar_h,
                        "calendar",
                        ["city, listing_id, date",
                         "available (boolean)",
                         "price, adjusted_price",
                         "minimum_nights, maximum_nights"],
                        ["{city, listing_id, date}",
                         "{city, date, available}"],
                        COLORS["calendar"], COLORS["calendar_fill"], COLORS["calendar_fill2"])

    reviews_h = 250
    reviews_y = H - reviews_h - 24
    draw_collection_box(d, left_x, reviews_y, col_w, reviews_h,
                        "reviews",
                        ["city, listing_id, date",
                         "review_id, reviewer_id",
                         "reviewer_name",
                         "comments (truncated)"],
                        ["{city, listing_id, date}",
                         "{reviewer_id, listing_id, date}"],
                        COLORS["reviews"], COLORS["reviews_fill"], COLORS["reviews_fill2"])

    neigh_h = 175
    neigh_y = H - neigh_h - 24
    draw_collection_box(d, right_x, neigh_y, col_w, neigh_h,
                        "neighborhoods",
                        ["city", "neighborhood"],
                        ["{city, neighborhood} unique"],
                        COLORS["neighborhoods"], COLORS["neighborhoods_fill"],
                        COLORS["neighborhoods_fill2"])

    draw_arrow(d,
               left_x + col_w, listings_y + listings_h / 2 - 30,
               right_x, calendar_y + calendar_h / 2 - 10,
               "join on city + listing_id",
               label_offset_y=-14)

    draw_arrow(d,
               left_x + col_w / 2 + 20, listings_y + listings_h,
               left_x + col_w / 2 + 20, reviews_y,
               "lookup listing context",
               label_offset_x=80, label_offset_y=0)

    draw_arrow(d,
               left_x + col_w, reviews_y + reviews_h / 2 - 10,
               right_x, neigh_y + neigh_h / 2,
               "neighborhood analytics",
               label_offset_y=-14)

    path = os.path.join(OUT, "model_diagram_python.png")
    d.save_png(path)
    print(f"Saved {path}")


def generate_etl_diagram():
    W, H = 920, 280
    d = draw.Drawing(W, H)

    d.append(draw.Rectangle(0, 0, W, H, fill="#F0F5EF"))

    d.append(draw.Text("ETL Pipeline: Source Files → MongoDB Collections", 19,
                       W / 2, 30,
                       fill="#1B4332", text_anchor="middle",
                       dominant_baseline="central",
                       font_weight="bold",
                       font_family="Helvetica, Arial, sans-serif"))
    d.append(draw.Text("Data cleaning, reshaping, loading, and evidence capture", 11,
                       W / 2, 52,
                       fill="#52796F", text_anchor="middle",
                       dominant_baseline="central",
                       font_family="Helvetica, Arial, sans-serif"))

    steps = [
        ("1", "Raw Inputs", ["4 cities × 4 entities", "listings / calendar", "reviews / neighborhoods"]),
        ("2", "Cleaning", ["type coercion", "null handling", "price normalization"]),
        ("3", "Reshape", ["document modeling", "field selection", "city tagging"]),
        ("4", "Load", ["insertMany()", "index creation", "compound indexes"]),
        ("5", "Evidence", ["collection counts", "sample docs", "index metadata"]),
    ]

    greens_bg = ["#B7E4C7", "#95D5B2", "#74C69D", "#52B788", "#40916C"]
    greens_border = ["#2D6A4F", "#2D6A4F", "#1B4332", "#1B4332", "#1B4332"]
    text_colors = ["#1B4332", "#1B4332", "#1B4332", "#FFFFFF", "#FFFFFF"]

    n = len(steps)
    margin = 30
    gap = 18
    box_w = (W - 2 * margin - (n - 1) * gap) / n
    box_h = 160
    y0 = 75

    for i, (num, title, items) in enumerate(steps):
        x0 = margin + i * (box_w + gap)
        tc = text_colors[i]

        rounded_rect(d, x0, y0, box_w, box_h, 8, greens_bg[i], greens_border[i], 2)

        circle_r = 13
        cx, cy = x0 + 20, y0 + 20
        d.append(draw.Circle(cx, cy, circle_r, fill="#1B4332"))
        d.append(draw.Text(num, 12, cx, cy + 1, fill="white",
                           text_anchor="middle", dominant_baseline="central",
                           font_weight="bold", font_family="Helvetica, Arial, sans-serif"))

        d.append(draw.Text(title, 14, x0 + box_w / 2, y0 + 48,
                           fill=tc, text_anchor="middle",
                           dominant_baseline="central",
                           font_weight="bold",
                           font_family="Helvetica, Arial, sans-serif"))

        item_y = y0 + 76
        for item in items:
            d.append(draw.Text(item, 11, x0 + box_w / 2, item_y,
                               fill=tc, text_anchor="middle",
                               dominant_baseline="central",
                               font_family="Helvetica, Arial, sans-serif",
                               opacity=0.85))
            item_y += 20

        if i < n - 1:
            ax1 = x0 + box_w + 3
            ax2 = x0 + box_w + gap - 3
            ay = y0 + box_h / 2

            marker = draw.Marker(-0.8, -3, 5, 3, orient="auto")
            marker.append(draw.Lines(-0.8, -3, -0.8, 3, 5, 0, close=True,
                                     fill="#2D6A4F"))
            d.append(draw.Line(ax1, ay, ax2, ay,
                               stroke="#2D6A4F", stroke_width=2.5,
                               marker_end=marker))

    path = os.path.join(OUT, "etl_diagram_python.png")
    d.save_png(path)
    print(f"Saved {path}")


if __name__ == "__main__":
    generate_model_diagram()
    generate_etl_diagram()
