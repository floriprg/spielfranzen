@echo off
cd C:\Dev\spiel-franzen
set OUTPUT=$(ls -1)
echo "${OUTPUT}"
git add .
git commit -am "a52"
git push
pause