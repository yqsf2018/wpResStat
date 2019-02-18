Genreate posts for predefined counters at a WorkPress webiste with Restful and JWT Auth enabled

Server Side
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


Cilent Side:
1. Before start, set rootPath in the sample code first.

2. Require NodeJS (Ver > 8) in order to support util.promisify.

3. Supported API enums

Counter Types:

Vendors

Callers:

In order to add new enums, please write an email to xxx@yyy.zzz.

