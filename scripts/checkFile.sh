#!/bin/bash
echo -n "Check the file $1 ..."
if [ ! -f $1 ]; then
    echo ' '
    echo "Create the placeholder for file $1"
    echo ' ' > $1
else
    echo " Done"
fi