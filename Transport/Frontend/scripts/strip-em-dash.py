import os

root = os.path.join(os.path.dirname(__file__), "..", "src")
em = "\u2014"
count = 0
for dirpath, _, files in os.walk(root):
    for f in files:
        if not f.endswith((".tsx", ".ts")):
            continue
        path = os.path.join(dirpath, f)
        with open(path, encoding="utf-8") as rf:
            text = rf.read()
        if em not in text:
            continue
        new = text.replace(f" ?? '{em}'", " ?? ''")
        new = new.replace(f' ?? "{em}"', ' ?? ""')
        new = new.replace(f"'{em}'", "''")
        new = new.replace(em, " - ")
        if new != text:
            with open(path, "w", encoding="utf-8", newline="\n") as wf:
                wf.write(new)
            count += 1
            print(os.path.relpath(path, root))
print("files", count)
