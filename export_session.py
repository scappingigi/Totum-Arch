import json
import os
import re
import shutil

SRC_DIR = "/Users/scappin/Src/ACE"
BRAIN_LOGS_DIR = "/Users/scappin/.gemini/jetski/brain/0af399ec-70d2-4b22-961b-dc060ad6b26d/.system_generated/logs"
DEST_LOGS_DIR = os.path.join(SRC_DIR, "session_logs")
OUTPUT_MD = os.path.join(SRC_DIR, "SESSION_HISTORY.md")

os.makedirs(DEST_LOGS_DIR, exist_ok=True)

# 1. Copy JSONL logs
for filename in ["transcript.jsonl", "transcript_full.jsonl"]:
    src_file = os.path.join(BRAIN_LOGS_DIR, filename)
    if os.path.exists(src_file):
        dst_file = os.path.join(DEST_LOGS_DIR, filename)
        shutil.copy2(src_file, dst_file)
        print(f"Copied {src_file} -> {dst_file}")

# 2. Parse transcript to create clean Markdown Session History
transcript_path = os.path.join(BRAIN_LOGS_DIR, "transcript_full.jsonl")
if not os.path.exists(transcript_path):
    transcript_path = os.path.join(BRAIN_LOGS_DIR, "transcript.jsonl")

turns = []
current_user_request = None
current_model_response = []

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except Exception:
            continue

        step_type = entry.get("type")
        source = entry.get("source")
        content = entry.get("content", "")

        if step_type == "USER_INPUT":
            if current_user_request is not None:
                turns.append({
                    "user": current_user_request,
                    "response": "\n\n".join(current_model_response).strip()
                })
                current_model_response = []
            
            # Clean content tags
            req_text = content
            m = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", content, re.DOTALL)
            if m:
                req_text = m.group(1).strip()
            current_user_request = {
                "text": req_text,
                "created_at": entry.get("created_at", "")
            }

        elif step_type == "PLANNER_RESPONSE" and source == "MODEL":
            if content and not entry.get("tool_calls"):
                # Clean any markdown or system tags
                clean_content = content.strip()
                if clean_content:
                    current_model_response.append(clean_content)

if current_user_request is not None:
    turns.append({
        "user": current_user_request,
        "response": "\n\n".join(current_model_response).strip()
    })

# Write SESSION_HISTORY.md
with open(OUTPUT_MD, "w", encoding="utf-8") as out:
    out.write("# 🏛️ Totum-Arch & ACE Mechanical Simulation — Full Session History\n\n")
    out.write("**Conversation ID**: `0af399ec-70d2-4b22-961b-dc060ad6b26d`  \n")
    out.write("**Repository**: [scappingigi/Totum-Arch](https://github.com/scappingigi/Totum-Arch)  \n")
    out.write("**Project**: Dynamic Belt & Pulley Mechanical Engine, Totum Curators, Dual Data Circuits & Layout Sync  \n\n")
    out.write("---\n\n")
    out.write("## 📋 Table of Contents\n\n")
    out.write("1. [Architecture & System Overview](#architecture--system-overview)\n")
    out.write("2. [Key Milestones & Implemented Features](#key-milestones--implemented-features)\n")
    out.write("3. [Chronological Session Log](#chronological-session-log)\n\n")
    out.write("---\n\n")
    out.write("## 🛠️ Architecture & System Overview\n\n")
    out.write("- **Kinematic Simulation (`app.js`)**:\n")
    out.write("  - 1 Large Central Drive Wheel (*Central Totum*) + 2 Small Driven Wheels (*Personal Totum*).\n")
    out.write("  - Dual curved return & outward belt transmission with photon pulse particles.\n")
    out.write("  - Triangular support chassis + wide rectangular cybernetic basement with 10 internal tool assets (`go/demos`, `moma`, `Prod Docs`, `Cloud WAF`, `github`, `horizon`, `buganizer`, `Cloud Plat.`, `Qwiklabs`).\n")
    out.write("- **Curved Data Conduits & Specular Circuits**:\n")
    out.write("  - Dual Jetski Skills modules (Left & Right) with 4 curved conduits each (`OTHER SKILLS AND MCP`, `TOTUM RETRIEVER`, `TOTUM LOCAL CURATOR`, `GOOGLE WORKSPACE`).\n")
    out.write("  - Dual Marina Stepping Wheels (Left & Right) stepping 90° every 4 seconds.\n")
    out.write("  - Floating ACE, GCP, Spanner, Google Drive, and Central Curator items.\n")
    out.write("- **Anchor-Aware Proportional Positioning Engine**:\n")
    out.write("  - Center, Left, and Right zone anchors preserving exact aspect ratio and alignment on Retina, 4K, and Ultrawide displays.\n")
    out.write("  - Explicit synchronization API (`server.py` + `default_positions.json`) for multi-browser and incognito consistency.\n\n")
    out.write("---\n\n")
    out.write("## ⏱️ Chronological Session Log\n\n")

    for i, t in enumerate(turns, 1):
        user_info = t["user"]
        created = user_info.get("created_at", "")
        out.write(f"### Turn {i} — {created}\n\n")
        out.write(f"#### 👤 User Request\n> {user_info['text']}\n\n")
        if t["response"]:
            out.write("#### 🤖 Assistant Response & Actions\n")
            out.write(t["response"] + "\n\n")
        else:
            out.write("#### 🤖 Assistant Response & Actions\n*Executed tool calls and applied code updates.*\n\n")
        out.write("---\n\n")

print(f"Generated {OUTPUT_MD} with {len(turns)} turns.")
