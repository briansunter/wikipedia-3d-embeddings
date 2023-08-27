import asyncio
import sqlite3
import mwxml
import bz2
import mwparserfromhell
from tqdm import tqdm
import csv
import sqlite3
import json
from sentence_transformers import SentenceTransformer
import numpy as np
from nltk.tokenize import sent_tokenize

MAX_WORD_COUNT = 400

model = SentenceTransformer('all-MiniLM-L6-v2')

def split_content_into_subdocs(content: str):
    """
    Split content into subdocuments based on word count.
    """
    sentences = sent_tokenize(content)
    subdoc_content = []
    word_count = 0

    for sentence in sentences:
        sentence_word_count = len(sentence.split())
        if word_count + sentence_word_count > MAX_WORD_COUNT:
            if subdoc_content:
                yield ' '.join(subdoc_content)
            subdoc_content = [sentence]
            word_count = sentence_word_count
        else:
            subdoc_content.append(sentence)
            word_count += sentence_word_count

    if subdoc_content:
        yield ' '.join(subdoc_content)

def execute_query(conn, query, params):
    try:
        conn.execute(query, params)
    except Exception as e:
        print(f"Error occurred: {e}")

def process_subdocs(conn, doc, content):
    """
    Process subdocuments and update database.
    """
    subdocs_contents = list(split_content_into_subdocs(content))
    embeddings = model.encode(subdocs_contents)
    avg_embedding = np.mean(embeddings, axis=0)

    for k, subdoc_content in enumerate(subdocs_contents):
        if subdoc_content:
            query = "INSERT INTO subdocs (doc_id, value, embeddings, chunk_idx) VALUES (?, ?, ?, ?)"
            params = (doc, subdoc_content, json.dumps(embeddings[k].tolist()), k)
            execute_query(conn, query, params)

    query = "UPDATE docs SET embeddings = ? WHERE id = ?"
    params = (json.dumps(avg_embedding.tolist()), doc)
    execute_query(conn, query, params)
    conn.commit()

async def create_doc_and_subdocs_from_string(conn, doc_title, content):
    """
    Create document and subdocuments from given string.
    """
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO docs (value) VALUES (?)", (doc_title,))
        doc_id = cursor.lastrowid
        process_subdocs(conn, doc_id, content)
    except Exception as e:
        print(f"Error occurred: {e}")

    return doc_id

def parse_wikitext_to_html(wikitext):
    return mwparserfromhell.parse(wikitext).strip_code()

def page_generator(file_path):
    with bz2.open(file_path, 'rt') as f:
        dump = mwxml.Dump.from_file(f)
        for page in dump:
            yield get_latest_revision(page)

def get_latest_revision(page):
    latest_revision = None
    for revision in page:
        latest_revision = revision
    if latest_revision:
        return page.id, page.title, latest_revision.text
    else:
        return None, None, None

def load_vital_articles(file_path):
    try:
        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            next(reader)  # skip header
            return {int(row[0]) for row in reader}
    except FileNotFoundError:
        print("Vital articles file not found. Processing all articles.")
        return None

async def main():
    vital_articles = load_vital_articles('10000vital.csv')
    file_path = 'enwiki-latest-pages-articles-multistream.xml.bz2'

    with sqlite3.connect('wiki_docs_10k.db') as conn:
        create_tables(conn)
        await process_articles(conn, file_path, vital_articles)

def create_tables(conn):
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS docs
                 (id INTEGER PRIMARY KEY, value TEXT, embeddings BLOB)''')
    c.execute('''CREATE TABLE IF NOT EXISTS subdocs
                 (id INTEGER PRIMARY KEY, doc_id INTEGER, value TEXT, embeddings BLOB, chunk_idx INTEGER)''')
    conn.commit()

async def process_articles(conn, file_path, vital_articles):
    processed_vital_articles = set()
    for page_id, title, text in tqdm(page_generator(file_path)):
        if page_id is None or (vital_articles and (page_id not in vital_articles or text is None)):
            continue
        converted_text = parse_wikitext_to_html(text)
        await create_doc_and_subdocs_from_string(conn, title, converted_text)
        processed_vital_articles.add(page_id)
        if vital_articles and processed_vital_articles == vital_articles:
            break
asyncio.run(main())
