### Python Embeddings Generation

This Python project is designed to extract, process, and visualize Wikipedia articles. It uses Sentence Transformers for semantic encoding and UMAP for dimensionality reduction. All data is stored in an SQLite database, and the final 3D coordinates are exported as JSON.

#### Quick Start

1. **Download Dependencies**

    ```bash
    pip install asyncio sqlite3 mwxml bz2 mwparserfromhell tqdm csv json sentence_transformers numpy nltk umap-learn
    ```

2. **Download Wikipedia Dump**
   Download the latest Wikipedia dump from [here](https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles-multistream.xml.bz2) and place it in the root directory.

   ```bash
   wget https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles-multistream.xml.bz2
   ```
3. **Run Main Script**

    ```bash
    python load.py
    ```

4. **Run UMAP and Export**

    ```bash
    python export.py
    ```

#### Key Components

- **Data Extraction**: Functions like `page_generator` and `get_latest_revision` handle the initial data extraction from Wikipedia dumps and vital articles CSV.
  
- **Text Processing**: `split_content_into_subdocs` and `parse_wikitext_to_html` are responsible for breaking down and formatting the Wikipedia text.
  
- **Database Ops**: Functions such as `execute_query` and `create_tables` manage the SQLite database interactions.
  
- **Data Transformation and Export**: UMAP dimensionality reduction and JSON export are performed by `apply_umap_3d` and `export_data_to_json`.

#### Important Files and Constants

- **Wikipedia Dump**: Place the `.bz2` Wikipedia dump in the root directory.
  
- **Vital Articles CSV**: Ensure `10000vital.csv` is in the root directory.

- **Constants**: 
  - `MAX_WORD_COUNT` governs the word count for subdocuments.
  - `JSON_FILE_PATH` specifies the path for the final JSON file.

#### Database Schema

- **Docs Table**: Stores each document's ID, title (`value`), and averaged embeddings (`embeddings`).
  
- **Subdocs Table**: Stores subdocument ID, corresponding parent doc ID (`doc_id`), the subdocument content (`value`), embeddings (`embeddings`), and chunk index (`chunk_idx`).
