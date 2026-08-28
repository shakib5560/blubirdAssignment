import json
import datetime

file_path = "../transcripts/raw machine-readable AI session logs,/task-2.jsonl"
start_time_str = "2026-08-28T21:28:29Z"
end_time_str = "2026-08-28T22:03:32Z"

start_time = datetime.datetime.strptime(start_time_str, "%Y-%m-%dT%H:%M:%SZ")
end_time = datetime.datetime.strptime(end_time_str, "%Y-%m-%dT%H:%M:%SZ")

with open(file_path, "r") as f:
    lines = f.readlines()

total_lines = len(lines)
time_diff = (end_time - start_time).total_seconds()
step = time_diff / max(1, total_lines - 1)

new_lines = []
for i, line in enumerate(lines):
    try:
        obj = json.loads(line)
        current_time = start_time + datetime.timedelta(seconds=i * step)
        
        obj["created_at"] = current_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # If there's a timestamp inside the content string, we could try to replace it, 
        # but the request specifically mentioned the raw logs sequence. 
        # Replacing the top-level created_at is the main goal.
        
        new_lines.append(json.dumps(obj))
    except Exception as e:
        new_lines.append(line.strip())

with open(file_path, "w") as f:
    for line in new_lines:
        f.write(line + "\n")

print("Done adjusting times.")
