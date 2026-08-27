@echo off

set SRC=C:\Users\josep\source\repos\HP_Search
set OUT=%SRC%\Release

rmdir /s /q "%OUT%"
mkdir "%OUT%"

robocopy "%SRC%" "%OUT%" *.js *.json *.html *.png *.md /NJH /NJS /NFL /NDL

tar -z -cf "%SRC%\HP_Search.tar" -C "%OUT%" .
rmdir /s /q "%OUT%"