@echo off
cd C:\Dev\spiel-franzen

VAR1="$1"
VAR2="$2"

MOREF=`sudo run command against "$VAR1" | grep name | cut -c7-`

echo "$MOREF"
git add .
git commit -am "a52"
git push
pause