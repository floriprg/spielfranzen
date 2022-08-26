@echo off
cd C:\Dev\spiel-franzen
set message=git show -1
echo %message%
git add .
git commit -am "a52"
git push
pause