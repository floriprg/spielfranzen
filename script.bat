@echo off
cd C:\Dev\spiel-franzen
x=`git show -1`
echo x
git add .
git commit -am "a52"
git push
pause