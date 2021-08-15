# pkg-reader

A web application to parse and present the contents of the Debian dpkg package information file in a user-friendly manner.

No external dependencies required.

## Files included:

1. app.js - main software logic, back-end functionality
2. index.html - data presentation / DOM manipulation, parses data dynamically for the front-end
3. app.css - style definitions
4. README.md - this file

## Requirements:

1. Debian-based system
2. Node.js (latest LTS version is fine)
3. Existing /var/lib/dpkg/status file

## Usage:

1. Clone the repository / copy included files into a directory.
2. Start web server from said directory with 'node app.js'.
3. Open browser at 'localhost:8080'.

## External dependencies:

none

## Compromises:

1. bloated app.js - all major back-end functions are located in one file.

2. bloated index.html - Javascript functions are located between the <script> tags.

3. missing error handling and input validation - the program assumes a friendly user providing valid data
