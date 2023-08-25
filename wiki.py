import asyncio
import sqlite3
import mwxml
import bz2
import mwparserfromhell
from tqdm import tqdm
from parse_wikipedia import create_doc_and_subdocs_from_string

# Define a generator that yields rows as it parses the Wikipedia dump
def parse_wikitext_to_html(wikitext):
    wikicode = mwparserfromhell.parse(wikitext)
    html = wikicode.strip_code()
    return html

def page_generator(file_path):
    with bz2.open(file_path, 'rt') as f:
        dump = mwxml.Dump.from_file(f)
        for page in dump:
            latest_revision = None
            for revision in page:
                latest_revision = revision
            if latest_revision is not None:
                yield (page.id, page.title, latest_revision.text)

# Define the main function
import csv

def load_vital_articles(file_path):
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        next(reader, None)  # skip header
        # parse number to int
        return {int(row[2]) for row in reader}

vital_articles = set(load_vital_articles('1000vital.csv'))
async def main():
    with sqlite3.connect('wiki_docs.db') as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS docs
                     (id INTEGER PRIMARY KEY, value TEXT, embeddings BLOB)''')
        c.execute('''CREATE TABLE IF NOT EXISTS subdocs
                     (id INTEGER PRIMARY KEY, doc_id INTEGER, value TEXT, embeddings BLOB, chunk_idx INTEGER)''')
        conn.commit()

    # Parse the Wikipedia dump and insert rows into the database
    file = 'enwiki-latest-pages-articles-multistream.xml.bz2'
    for row in tqdm(page_generator(file)):
        if row[0] not in vital_articles:
            continue
        text = row[2]
        if text is not None:
            converted = parse_wikitext_to_html(text)
            await create_doc_and_subdocs_from_string(conn, row[1], converted)
asyncio.run(main())
