if [ $# -ge 1 ]
then
    NODE_ENV=$1 npm start
else
    npm start
fi