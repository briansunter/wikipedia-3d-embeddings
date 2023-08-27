import sqlite3
import umap
import numpy as np
import json

JSON_FILE_PATH = "../public/data/10k.json"

def fetch_data_from_db():
    with sqlite3.connect("wiki_docs_10k.db") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM docs")
        documents = [{"id": row[0], "value": row[1], "embeddings": json.loads(row[2] or [])} for row in cursor.fetchall()]
    return documents

def apply_umap_3d(embeddings):
    umap_3d = umap.UMAP(n_components=3)
    return umap_3d.fit_transform(embeddings)

def export_data_to_json(documents, xyz_coords):
    data = [{"id": doc["id"], "value": doc["value"], "x": float(coord[0]), "y": float(coord[1]), "z": float(coord[2])} for doc, coord in zip(documents, xyz_coords)]
    with open(JSON_FILE_PATH, "w") as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    documents = fetch_data_from_db()
    max_len = max(len(doc["embeddings"]) for doc in documents if isinstance(doc["embeddings"], list))
    embeddings = np.array([np.pad(doc["embeddings"], (0, max_len - len(doc["embeddings"])), 'constant') if isinstance(doc["embeddings"], list) else np.zeros(max_len) for doc in documents])
    xyz_coords = apply_umap_3d(embeddings)
    export_data_to_json(documents, xyz_coords)
