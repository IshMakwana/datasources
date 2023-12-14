import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = await d3.csv("https://raw.githubusercontent.com/IshMakwana/datasources/main/AI%20Industry_2010-2022.csv", d3.autoType);
let el = document.querySelector("#area-chart");

render(el, data);
window.addEventListener("resize", (x) => {
    render(el, data);
});

function aggregateData(data, key, features){
    let keystore = {};
    let agg = [];
    data.forEach((v, i) => {
        if(keystore[v[key]] === undefined){
            let r = {};
            r[key] = v[key];
            features.forEach(f => {
                r[f] = v[f];
            });
            agg.push(r);
            keystore[v[key]] = agg.length;
        }
        else{
            let ki = keystore[v[key]] - 1;
            features.forEach(f => {
                agg[ki][f] += v[f];
            });
        }
    });

    return agg;
}

function render(element, data) {
    element.innerHTML = "";
    let dimensions = element.getBoundingClientRect();

    const win_width = Math.max(dimensions.width, 450);
    const win_height = 500

    let margin = { top: 0, right: 20, bottom: 25, left: 60 }
    let width = win_width - margin.left - margin.right;
    let height = win_height - margin.top - margin.bottom;
    let legend_x = margin.left - 25;

    let keys = ["Banking and finance",
        "Industry and manufacturing",
        "Energy management",
        "Physical sciences and engineering",
        "Security",
        "Life sciences",
        "Transportation",
        "Business",
        "Telecommunications",
        "Personal devices and computing"
    ];

    let keyToClass = {};

    keys.forEach((v, i) => {
        keyToClass[v] = 'key_' + i.toString();
    });

    let svg = d3.select(element)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // color palette
    var color = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemePaired);

    data = aggregateData(data, 'Year', keys);

    //stack the data?
    var stackedData = d3.stack()
        .keys(keys)
        (data);

    // Add X axis
    var x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => +d.Year))
        .range([0, width]);

    var xAxis = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));

    const lastRow = [];
    stackedData[stackedData.length - 1].forEach(v => {
        lastRow.push(v[1]);
    });
    const ymax = d3.max(lastRow);
    // Add Y axis
    var y = d3
        .scaleLinear()
        .domain([0, ymax])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y).ticks(10));

    // Add a clipPath: everything out of this area won't be drawn.
    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);

    // Add brushing
    var brush = d3.brushX()                 
        .extent([[0, 0], [width, height]]) 
        .on("end", updateChart)

    // Create the scatter variable: where both the circles and the brush take place
    var areaChart = svg.append('g')
        .attr("clip-path", "url(#clip)")

    // Area generator
    var area = d3.area()
        .x(function (d) { return x(d.data.Year); })
        .y0(function (d) {
            return y(d[0]);
        })
        .y1(function (d) {
            return y(d[1]);
        });

    // Show the areas
    areaChart
        .selectAll("mylayers")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", function (d) { 
            return "myArea " + keyToClass[d.key] 
        })
        .style("fill", function (d) { 
            return color(d.key); 
        })
        .attr("d", area)

    // Add the brushing
    areaChart
        .append("g")
        .attr("class", "brush")
        .call(brush);

    var idleTimeout
    function idled() { idleTimeout = null; }

    // A function that update the chart for given boundaries
    function updateChart() {
        extent = d3.event.selection

        // If no selection, back to initial coordinate. Otherwise, update X axis domain
        if (!extent) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
            x.domain(d3.extent(data, function (d) { return d.year; }))
        } else {
            x.domain([x.invert(extent[0]), x.invert(extent[1])])
            areaChart.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
        }

        // Update axis and area position
        xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5))
        areaChart
            .selectAll("path")
            .transition().duration(1000)
            .attr("d", area);
    }

    // What to do when one group is hovered
    var highlight = function (event, d) {
        // reduce opacity of all groups
        d3.selectAll(".myArea").style("opacity", .1);
        // expect the one that is hovered
        d3.select("." + keyToClass[d]).style("opacity", 1);
    }

    // And when it is not hovered anymore
    var noHighlight = function (d) {
        d3.selectAll(".myArea").style("opacity", 1);
    }

    // Add one dot in the legend for each name.
    var size = 14;
    svg.selectAll("myrect")
        .data(keys.toReversed())
        .enter()
        .append("rect")
        .attr("x", legend_x)
        .attr("y", function (d, i) { return 10 + i * (size + 5) })
        .attr("width", size)
        .attr("height", size)
        .style("fill", function (d) { return color(d) })
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);

    // Add one dot in the legend for each name.
    svg.selectAll("mylabels")
        .data(keys.toReversed())
        .enter()
        .append("text")
        .attr("x", legend_x + size * 1.2)
        .attr("y", function (d, i) { return 10 + i * (size + 5) + (size / 2) })
        // .style("fill", function (d) { return color(d) })
        .text(function (d) { return d; })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);
}