#!/bin/bash
echo -n "Check the folder $1 ..."
if [ ! -d $1 ]; then
    echo ' '
    echo "Create $1 folder"
    mkdir $1
else
    echo " Done"
fi