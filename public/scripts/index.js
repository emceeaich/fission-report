/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 "use strict";

var graphs;

document.onreadystatechange = () => {
    if (document.readyState === 'interactive') {
      graphs = document.querySelector('.graphs');
      renderGraphs();
    }
  };

function renderGraphs() {
  fetch('/data')
  .then(response => {
    if(response.ok) {
      response.json()
        .then(body => {
            Object.keys(body).forEach(
                chart => {
                    let data = {
                        labels: Object.keys(body[chart]),
                        values: Object.values(body[chart])
                    };
                    doughnut(graphs, chart, data);
                }
            );
        });
    }
  });
}

function doughnut(parent, canvasId, data) {
    // build container
    let container = document.createElement('div');
    container.className = 'donut';
    parent.appendChild(container);

    // build container's title and canvas
    let title = document.createElement('div');
    title.innerText = `Bugs by ${canvasId}`;
    container.appendChild(title);
    let canvas = document.createElement('canvas');
    canvas.id = `chart-${canvasId}`;
    container.appendChild(canvas);
    let ctx = canvas.getContext("2d");

    console.log(data);

    new Chart(ctx, {
       type: "doughnut",
       data: {
         datasets: [{
           data: data.values,
           backgroundColor:["rgb(16, 97, 195)","rgb(234, 53, 46)","rgb(255, 141, 0)", "rgb(64, 177, 75)", "rgb(146, 16, 173)"]
         }],
         labels: data.labels,
       },
       options: {
         legend: {
           display: true,
           position: "right",
         },
         tooltips: {
           callbacks: {
             label: function(tooltipItem, data) {
               const numbers = data.datasets[tooltipItem.datasetIndex].data;
               const total = numbers.reduce((pv, cv) => pv + cv, 0);
               const percent = Math.round(100.0 * (numbers[tooltipItem.index] / total));
               const label = data.labels[tooltipItem.index];
               return label + ": " + percent + "%";
             },
           }
         },
         plugins: {
           labels: {
             render: "value",
             fontSize: 14,
             fontColor: "black",
             fontFamily: "sans-serif",
           }
         },
       },
     });
}


