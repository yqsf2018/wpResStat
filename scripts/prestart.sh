#!/bin/bash
# this script must run at the server root
subdirs=("../logs" "../cert")
files=("../cert/snakeoil.key" "../cert/snakeoil.crt")

echo "WP Agent Prestart: Check or Create"

# check folder list
for i in "${subdirs[@]}"
do
    ./scripts/checkDir.sh $i
done

# check file list
for i in "${files[@]}"
do
    ./scripts/checkFile.sh $i
done
