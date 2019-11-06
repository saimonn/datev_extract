# datev_extract

Downloads salary PDFs from DATEV ANO https://www.datev.de/ano/

It uses puppeteer for downloading and readline-sync for getting the user input from the CLI.

**Notice:** Only smsTAN is supported as login-method.

## Setup

1. Clone the repository:

> git clone https://github.com/nurtext/datev_extract.git

2. Navigate to the chosen directory, open a CLI and install the dependencies using:

> npm ci

## Usage

Just open a CLI and type:

> npm start

Enter username, password and smsTAN when asked. Your document(s) can then be found within folder `download/`.

If you want to see what the script is actually doing, open `lohn.js` with a editor of your choice and set `headless` to `false` (line 26).
