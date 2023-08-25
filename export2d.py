import sqlite3
import umap
import numpy as np
import json

def fetch_data_from_db():
    conn = sqlite3.connect("simple_wiki_docs.db")
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM docs")
    documents = [{"id": row[0], "value": row[1], "embeddings": json.loads(row[2] or [])} for row in cursor.fetchmany(200000)]

    # cursor.execute("SELECT * FROM subdocs")
    # subdocuments = [{"id": row[0], "doc_id": row[1], "value": row[2], "embeddings": json.loads(row[3]), "chunk_idx": row[4]} for row in cursor.fetchall()]

    conn.close()
    subdocuments = None

    return documents, subdocuments

def apply_umap_3d(embeddings, min_dist=0.2):
    umap_3d = umap.UMAP(n_components=2,min_dist=min_dist, metric='cosine')
    return umap_3d.fit_transform(embeddings)
def export_data_to_json(documents, xyz_coords):
    data = []
    for doc, coord in zip(documents, xyz_coords):
        data.append({"id": doc["id"], "value": doc["value"], "x": float(coord[0]), "y": float(coord[1]) })
    with open("premapdocuments2d.json", "w") as f:
        json.dump(data, f, indent=2)

    # with open("subdocuments.json", "w") as f:
    #     json.dump(subdocuments, f, indent=2)

if __name__ == "__main__":
    documents, subdocuments = fetch_data_from_db()
    max_len = max([len(doc["embeddings"]) if isinstance(doc["embeddings"], list) else 0 for doc in documents])
    embeddings = np.array([np.pad(doc["embeddings"], (0, max_len - len(doc["embeddings"])), 'constant') if isinstance(doc["embeddings"], list) else np.zeros(max_len) for doc in documents])
    xyz_coords = apply_umap_3d(embeddings, min_dist=0.3)
    export_data_to_json(documents, xyz_coords)
normalizationFactor = 30000 / max(max(x, y) for x, y in premapDocuments2D)