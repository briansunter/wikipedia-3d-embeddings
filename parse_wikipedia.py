import sqlite3
import json
from sentence_transformers import SentenceTransformer
import numpy as np
from nltk.tokenize import sent_tokenize

MAX_WORD_COUNT = 400

model = SentenceTransformer('all-MiniLM-L6-v2')

def process_subdocs(conn, doc, content):
    """
    Process subdocuments and update database.
    """
    subdocs_contents = split_content_into_subdocs(content)
    embeddings = model.encode(subdocs_contents)
    avg_embedding = np.mean(embeddings, axis=0)  

    for k, subdoc_content in enumerate(subdocs_contents):
        if subdoc_content:
            try:
                conn.execute("INSERT INTO subdocs (doc_id, value, embeddings, chunk_idx) VALUES (?, ?, ?, ?)",
                          (doc, subdoc_content, json.dumps(embeddings[k].tolist()), k,))
            except Exception as e:
                print(f"Error occurred: {e}")

    try:
        conn.execute("UPDATE docs SET embeddings = ? WHERE id = ?", (json.dumps(avg_embedding.tolist()), doc))
        conn.commit()
    except Exception as e:
        print(f"Error occurred: {e}")

def split_content_into_subdocs(content: str):
    """
    Split content into subdocuments based on word count.
    """
    sentences = sent_tokenize(content)
    subdoc_content = ""
    subdocs_contents = []
    word_count = 0

    for sentence in sentences:
        sentence_word_count = len(sentence.split())
        if word_count + sentence_word_count > MAX_WORD_COUNT:
            if subdoc_content.strip():  
                subdocs_contents.append(subdoc_content.strip())
            subdoc_content = sentence
            word_count = sentence_word_count
        else:
            subdoc_content += " " + sentence
            word_count += sentence_word_count

    if subdoc_content.strip():
        subdocs_contents.append(subdoc_content.strip())

    return subdocs_contents

async def create_doc_and_subdocs_from_string(doc_title, content):
    """
    Create document and subdocuments from given string.
    """
    doc_id = None
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO docs (value) VALUES (?)", (doc_title,))
            doc_id = cursor.lastrowid
            process_subdocs(conn, doc_id, content)
        except Exception as e:
            print(f"Error occurred: {e}")
    return doc_id
