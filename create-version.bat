@echo off
set timestamp=202508121409
copy public\app.js public\app-%timestamp%.js
copy public\app.css public\app-%timestamp%.css
echo %timestamp% > public\version.txt
echo Created versioned files: app-%timestamp%.js and app-%timestamp%.css