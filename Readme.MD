Genreate posts for predefined counters at a WorkPress webiste with Restful and JWT Auth enabled


Prerequisites:

    1. a working WordPress site, with Restful API enabled and JWT Auth plug-in installed
    2. Agent requires NodeJS version > 10

Installation
    $npm install

Setup
    Edit config/default.json for
        1. log location
        2. SSL key location
        3. WP website address, username and password

Start the Stat server
    $ npm start

Agent
    Provide NodeJS API to integrate with another program for counting certain events.

Test ( requiring NodeJS version supporting util.promisfy )
    $ cd test
    $ node testWpCntAgent.js  // generate random counts and post to the WP site
