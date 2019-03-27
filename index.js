#! /usr/local/bin/node

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
const asTable = require('as-table').configure ({ right: true });

const max = 10000; // max records we can read from Bugzilla

var last = 0; // last bug id we saw
var count = 0; // number of records we got in a GET
var done = false;

var URLbase = `https://bugzilla.mozilla.org/buglist.cgi?columnlist=triage_owner%2Cproduct%2Ccomponent%2Ccf_fx_iteration%2Ccf_fission_milestone%2Cbug_status%2Cresolution%2Cpriority%2Ckeywords%2Creporter%2Cassigned_to%2Cshort_desc%2Copendate%2Cchangeddate&f1=cf_fission_milestone&o1=notequals&query_format=advanced&v1=---&ctype=csv&human=1&namedcmd=All%20Fission%20Bugs`;

// create array to store data read
var data = [];

// create data structure to hold results
var report = {
    milestones: {},
    components: {},
    statuses: {}
};

// current date
var now = moment.utc();

function get_parser() {
    return parse({
        delimiter: ',', 
        columns: true
    })
    .on('readable', function() {
        let record;
        while (record = parser.read()) {
            let milestone = record['Fission Milestone'];
            let component = record.Product + '::' + record.Component;
            let status = record.Status;

            data.push(record);
            count++;

            if (report.milestones[milestone]) {
                report.milestones[milestone] ++;
            } else {
                report.milestones[milestone] = 1;
            }

            if (report.components[component]) {
                report.components[component] ++;
            } else {
                report.components[component] = 1;
            }

            if (report.statuses[status]) {
                report.statuses[status] ++;
            } else {
                report.statuses[status] = 1;
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

            // table of milestones
            var milestones = Object.keys(report.milestones).map(milestone => {
                return {
                    'Milestone': milestone,
                    'Count': report.milestones[milestone]
                };
            }).sort((a, b) => { return (b.Count - a.Count); });
            console.log(asTable(milestones), '\n\n');

            // table of components
            var components = Object.keys(report.components).map(component => {
                return {
                    'Component': component,
                    'Count': report.components[component]
                };
            }).sort((a, b) => { return (b.Count - a.Count); });
            console.log(asTable(components), '\n\n');

            // table of statuses
            var statuses = Object.keys(report.statuses).map(status => {
                return {
                    'Status': status,
                    'Count': report.statuses[status]
                };
            }).sort((a, b) => { return (b.Count - a.Count); });
            console.log(asTable(statuses), '\n\n');

            // group bugs by milestone
            Object.keys(report.milestones).forEach(milestone => {
                console.log(milestone, 'Breakdown');
                let section = data.filter(record => {return (record['Fission Milestone'] === milestone); })
                .map(record => {
                    return {
                        'Priority': record.Priority,
                        'Summary': record.Summary,
                        'Resolution': record.Resolution,
                        'Assignee': record.Assignee,
                        'Bug ID': record['Bug ID'],
                        'Milestone': record['Fission Milestone']
                    };
                });
                console.log(asTable(section), '\n\n');
            });

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

function write_report(data) {
    fs.exists('./out', (exists) => {
        if (!exists) {
            fs.mkdir('./out', (err) => {
                if (err) {
                    console.error(err);
                } else {
                    write_report(data);
                }
            });
        } else {
            var file = fs.openSync('./out/report.csv', 'w');
            stringify(data, {
                header: true
            }, (err, output) => {
                if (err) {
                    console.error(err);
                } else {
                    fs.writeFile(file, output, (err) => {
                        if (err) {
                            console.error(err);
                        } else {
                            console.log('saved data in ./out/report.csv');
                        }
                    });
                }
            });


        }
    });
}


var bug_stream, parser;

start_stream(last);
