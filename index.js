/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
/*
    Read all bugs marked for the Fission project in CSV format.

    Create a report bugs by milestone, status, and component.
*/

// modules
const got = require('got');
const moment = require('moment');
const parse = require('csv-parse');
const stringify = require('csv-stringify');
const fs = require('fs');
const tableify = require('tableify');
const express = require('express');
const app = express();

const max = 10000; // max records we can read from Bugzilla

var last = 0; // last bug id we saw
var count = 0; // number of records we got in a GET
var done = false;

var URLbase = `https://bugzilla.mozilla.org/buglist.cgi?columnlist=triage_owner%2Cproduct%2Ccomponent%2Ccf_fx_iteration%2Ccf_fission_milestone%2Cbug_status%2Cresolution%2Cpriority%2Ckeywords%2Creporter%2Cassigned_to%2Cshort_desc%2Copendate%2Cchangeddate&f1=cf_fission_milestone&o1=notequals&query_format=advanced&v1=---&ctype=csv&human=1&namedcmd=All%20Fission%20Bugs`;

// create array to store data read
var data = [];

// create data structure to hold results
var report = {
    milestone: {},
    product: {},
    status: {}
};

// string for temp results
var s;

// current date
var now = moment.utc();

// create string to hold report
var result = now.toISOString(true);

function get_parser() {
    return parse({
        delimiter: ',', 
        columns: true
    })
    .on('readable', function() {
        let record;
        while (record = parser.read()) {
            let milestone = record['Fission Milestone'];
            let product = record.Product; 
            let status = record.Status;

            data.push(record);
            count++;

            if (report.milestone[milestone]) {
                report.milestone[milestone] ++;
            } else {
                report.milestone[milestone] = 1;
            }

            if (report.product[product]) {
                report.product[product] ++;
            } else {
                report.product[product] = 1;
            }

            if (report.status[status]) {
                report.status[status] ++;
            } else {
                report.status[status] = 1;
            }

            if(record["Bug ID"] > last) {
                last = record["Bug ID"];
            }
        }

    })
    .on('error', function(err) {
        console.error(err.message);
    })
    .on('end', function() {
        console.info('got', count, 'records');
        console.info('last id', last);
        // check for boundary
        if (count < max) {
            done = true;
            console.log('read last batch');

            // group bugs by milestone
            Object.keys(report.milestone).forEach(milestone => {

                result = result + `<p><strong>Milestone ${milestone}</p><strong>`;

                let section = data.filter(record => {return (record['Fission Milestone'] === milestone); })
                .map(record => {
                    return {
                        'Priority': record.Priority,
                        'Summary': record.Summary,
                        'Resolution': record.Resolution,
                        'Assignee': record.Assignee,
                        'Bug ID': `<a href="https://bugzilla.mozilla.org/bug/${record['Bug ID']}">${record['Bug ID']}</a>`,
                        'Milestone': record['Fission Milestone']
                    };
                });
                s = tableify(section);
                result = result + s;
            });

            console.log('done');

        } else {
            start_stream(last);
        }

    });
}

function start_stream(last) {
    var URL = URLbase + last;
    count = 0;
    console.info('fetching', URL);
    parser = get_parser();
    bug_stream = got.stream(URL).pipe(parser);
}

var bug_stream, parser;

start_stream(last);

var timeout = setInterval(start_stream, 60*5*1000, 0); // update every five minutes

// express handlers

app.use(express.static('./public'));
app.set('views', './views');
app.set('view engine', 'pug');

app.get('/', (request, response) => {
    if (done) {
        response.render('index', {title: 'Project Report', result: result});
    }
    else {
        response.sendFile(__dirname + '/views/wait.html');
    }
});

app.get('/data', (request, response) => {
    response.send(report);
});

var listener = app.listen(process.env.PORT, () => {
    console.log('Your application is listening for requests on port', listener.address().port);
});