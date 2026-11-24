#!/usr/bin/env python3
"""Generate branded, automatically updated EHSAAN PLAY star-history SVGs."""
from __future__ import annotations

import datetime as dt
import json
import os
import urllib.request
import xml.sax.saxutils as xml
from collections import Counter
from pathlib import Path

OWNER = "ehsaanullah0"
REPO = "ehsaanplay"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"
OUT = Path("assets/star-history")
WIDTH, HEIGHT = 1500, 720
LEFT, RIGHT, TOP, BOTTOM = 118, 86, 205, 625
PLOT_W, PLOT_H = WIDTH - LEFT - RIGHT, BOTTOM - TOP
PALETTES = {
    "dark": {"bg": "#2b1715", "fg": "#ffe0d9", "muted": "#d9aaa2", "grid": "#57302b", "line": "#ff4938", "area": "#a52c20"},
    "light": {"bg": "#fff3ef", "fg": "#321b18", "muted": "#80534d", "grid": "#ead2cc", "line": "#e93628", "area": "#f3a59a"},
}

def request(url: str, accept: str = "application/vnd.github+json"):
    headers = {"Accept": accept, "User-Agent": "ehsaanplay-star-history"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

def collect_stars():
    stars = []
    page = 1
    while True:
        batch = request(f"{API}/stargazers?per_page=100&page={page}", "application/vnd.github.star+json")
        if not batch:
            break
        for item in batch:
            stamp = item.get("starred_at")
            if stamp:
                stars.append(dt.datetime.fromisoformat(stamp.replace("Z", "+00:00")))
        if len(batch) < 100:
            break
        page += 1
    return sorted(stars)

def make_svg(theme: str, stars, current_count: int, updated: dt.datetime):
    c = PALETTES[theme]
    today = updated.date()
    first = min((s.date() for s in stars), default=today)
    # Keep a useful, non-flat timeline for a brand-new repository.
    if first == today:
        first = today - dt.timedelta(days=30)
    start = dt.datetime.combine(first, dt.time.min, tzinfo=dt.timezone.utc)
    end = dt.datetime.combine(today, dt.time.max, tzinfo=dt.timezone.utc)
    if end <= start:
        end = start + dt.timedelta(days=1)
    span = (end - start).total_seconds()

    daily = Counter(s.date() for s in stars)
    dates = [start.date() + dt.timedelta(days=i) for i in range((today - start.date()).days + 1)]
    cumulative = []
    count = 0
    for day in dates:
        count += daily[day]
        cumulative.append(count)
    if not cumulative:
        cumulative = [0]
        dates = [today]
    # Reconcile the API's current count if a star event lands between requests.
    if cumulative[-1] != current_count:
        cumulative[-1] = current_count

    ymax = max(10, ((current_count + 9) // 10) * 10)
    if ymax > 100:
        step = 10 ** max(1, len(str(ymax)) - 2)
        ymax = ((current_count + step - 1) // step) * step
    def xy(day, value):
        stamp = dt.datetime.combine(day, dt.time(12), tzinfo=dt.timezone.utc)
        x = LEFT + ((stamp - start).total_seconds() / span) * PLOT_W
        y = BOTTOM - (value / ymax) * PLOT_H
        return x, y
    points = [xy(day, val) for day, val in zip(dates, cumulative)]
    if len(points) == 1:
        points = [ (LEFT, BOTTOM), points[0] ]
    path = " ".join((f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}") for i, (x,y) in enumerate(points))
    area = f"{path} L{points[-1][0]:.1f},{BOTTOM} L{points[0][0]:.1f},{BOTTOM} Z"

    esc = xml.escape
    chunks = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">',
        f'<title id="title">EHSAAN PLAY GitHub star history</title><desc id="desc">{current_count} GitHub stars, updated {updated:%d %b %Y}. Daily cumulative star history.</desc>',
        f'<rect width="{WIDTH}" height="{HEIGHT}" rx="42" fill="{c["bg"]}"/>',
        f'<g font-family="Inter, ui-rounded, system-ui, -apple-system, Segoe UI, sans-serif" fill="{c["fg"]}">',
        f'<text x="160" y="96" font-size="43" font-weight="750">Star history</text>',
        f'<text x="160" y="133" font-size="21" fill="{c["muted"]}">EHSAAN PLAY · Your watchlist. Your taste. Your space.</text>',
        f'<text x="{WIDTH-85}" y="100" font-size="66" font-weight="800" text-anchor="end">{current_count:,}</text>',
        f'<text x="{WIDTH-85}" y="136" font-size="20" text-anchor="end" fill="{c["muted"]}">stars on GitHub</text>',
        f'<text x="{WIDTH-85}" y="165" font-size="17" text-anchor="end" fill="{c["muted"]}">Updated {updated:%d %b %Y}</text>',
    ]
    ticks = 4
    for i in range(ticks + 1):
        value = ymax * i / ticks
        y = BOTTOM - (value / ymax) * PLOT_H
        label = f"{int(value):,}" if ymax < 1000 else (f"{value/1000:g}k" if value >= 1000 else f"{int(value)}")
        chunks.append(f'<line x1="{LEFT}" y1="{y:.1f}" x2="{WIDTH-RIGHT}" y2="{y:.1f}" stroke="{c["grid"]}" stroke-width="1.5"/>')
        chunks.append(f'<text x="{LEFT-22}" y="{y+7:.1f}" font-size="18" font-weight="600" text-anchor="end" fill="{c["muted"]}">{label}</text>')
    # Month labels, spaced evenly over the observed history.
    months = []
    cursor = dt.date(first.year, first.month, 1)
    while cursor <= today:
        months.append(cursor)
        cursor = dt.date(cursor.year + (cursor.month == 12), 1 if cursor.month == 12 else cursor.month + 1, 1)
    if len(months) > 7:
        months = months[::2]
    for month in months:
        x, _ = xy(month, 0)
        chunks.append(f'<text x="{x:.1f}" y="{BOTTOM+35}" font-size="18" fill="{c["muted"]}" text-anchor="middle">{month:%b %y}</text>')
    chunks += [
        f'<path d="{area}" fill="{c["area"]}" opacity=".22"/>',
        f'<path d="{path}" fill="none" stroke="{c["line"]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    ]
    # Milestone badges at each 25-star step for early growth; 1k steps thereafter.
    interval = 25 if current_count < 250 else 1000
    milestones = list(range(interval, current_count + 1, interval))
    for milestone in milestones:
        idx = next((i for i,v in enumerate(cumulative) if v >= milestone), len(cumulative)-1)
        x,y = points[idx]
        chunks.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="10" fill="{c["line"]}" stroke="{c["bg"]}" stroke-width="4"/>')
        chunks.append(f'<text x="{x:.1f}" y="{y-19:.1f}" font-size="17" font-weight="750" text-anchor="middle" fill="{c["fg"]}">{milestone:,}</text>')
    x,y = points[-1]
    chunks.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="17" fill="{c["line"]}" stroke="{c["bg"]}" stroke-width="5"/>')
    chunks.append(f'<path d="M{x:.1f},{y-9:.1f} l2.8,6 6.6,.9 -4.8,4.7 1.1,6.6 -5.7,-3.1 -5.7,3.1 1.1,-6.6 -4.8,-4.7 6.6,-.9 Z" fill="#fff"/>')
    chunks += ['</g></svg>']
    return "\n".join(chunks)

def main():
    repo = request(API)
    stars = collect_stars()
    updated = dt.datetime.now(dt.timezone.utc)
    OUT.mkdir(parents=True, exist_ok=True)
    for theme in ("dark", "light"):
        (OUT / f"star-history-{theme}.svg").write_text(make_svg(theme, stars, repo["stargazers_count"], updated), encoding="utf-8")
    print(f"Updated star history: {repo['stargazers_count']} stars from {len(stars)} timestamped records.")

if __name__ == "__main__":
    main()
