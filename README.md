# Novel Scraper

A Python-based web scraper that extracts novel information and chapter content from CrushNovels and saves the collected data in a structured JSON file.

## Features

* Extracts novel title
* Extracts author
* Extracts genre
* Extracts status
* Extracts synopsis
* Extracts cover image URL
* Extracts all available chapters
* Extracts chapter number, title, date, views, and lock status
* Scrapes chapter content
* Saves complete novel data in JSON format
* Automatically generates a dynamic JSON filename
* Includes JSON verification after scraping

## Technologies Used

* Python
* Requests
* BeautifulSoup
* JSON

## Output

The scraper generates a JSON file containing:

* Novel information
* Cover image URL
* Total chapter count
* Chapter metadata
* Chapter URLs
* Full chapter content

Example output:

`novel_i-ll-make-the-playboy-heir-pay.json`

## How to Run

Install the required libraries:

```bash
pip install requests beautifulsoup4
```

Run the scraper:

```bash
python novel_scraper.py
```

Enter the novel URL when prompted:

```text
Enter Novel URL:
```

The scraper will collect the novel information and save it as a JSON file.

## Project Status

Completed and tested successfully.
