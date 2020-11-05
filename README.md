## pkg-reader

Files included:

1. app.js - main software logic, back-end functionality
2. index.html - data presentation / DOM manipulation, parses data dynamically for the front-end
3. app.css - style definitions
4. README.md - this file

Requirements:

1. Debian-based system
2. Node.js (latest LTS version is fine)
3. Existing /var/lib/dpkg/status file

Usage:

1. Copy included files into a directory.
2. Start web server from said directory with 'node app.js'.
3. Open browser at 'localhost:8080'.

External dependencies:

none

Tested on:

1. Google Chrome 81.0.x / Chrome Canary 84.0.x
2. Firefox 75.0 / Developer Edition 76.0bx
3. Brave 1.8.86
4. Vivaldi 3.0.1874.x

Compromises:

1. bloated app.js - all major back-end functions are located in one file. In other circumstances, the various functions would be split into their own modules (which, in turn, would be located in their own folders).

2. bloated index.html - Javascript functions are located between the <script> tags. In other circumstances, the Javascript code would reside in its own module or modules.

3. missing error handling and input validation - the program assumes a friendly user providing valid data
