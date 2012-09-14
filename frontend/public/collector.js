var context = cubism.context()
        .serverDelay(300 * 1000)
        .clientDelay(0)
        .step(6e5)
        .size($("#content").width());

var c1 = d3.select("#c1");
var c2 = d3.select("#c2");
var c3 = d3.select("#c3");
var c4 = d3.select("#c4");

function fetchdata(view, field) {
    return context.metric(function(start, stop, step, callback) {
    start = +start;
    stop = +stop;
    var values = [];
    var count = 0;
    for(i = start; i < stop; i += step) {
        values[count++] = 0;
    }

    var sd = JSON.stringify([new Date(start)]);
    var ed = JSON.stringify([new Date(stop),{}]);
        d3.json("/ts/" + view + "?group=true&group_level=1" +
                "&startkey=" + sd + "&endkey=" + ed, function(json) {
                    _.each(json.rows, function(r) {
                        var dstring = r.key[0];
                        var dms = new Date(dstring);
                        var dims = dms - start;
                        var bucket = Math.floor(dims/step);
                        if(field != undefined) {
                            values[bucket] = r.value[field];
                        } else {
                            values[bucket] = r.value;
                        }
                    });
                    callback(null, values);
        });
    });
}


function setup(data, max, title, extra) {
    return function(d) {
        if(!extra) extra = _.identity;
        d.selectAll(".horizon")
                .data([data])
            .enter().append("div")
                .attr("class", "horizon")
                .call(extra(context.horizon()
                    .extent([0, max])
                    .height(40)
                    .title(title)));

        d.append("div")
            .attr("class", "rule")
            .call(context.rule());
    }
};

var pane = d3.select("#content");

pane.append("div")
       .attr("class", "axis")
       .call(context.axis().orient("bottom"));

pane.append("div")
       .attr("class", "rule")
       .call(context.rule());

var Rd = colorbrewer.Reds[4];
var Bu = colorbrewer.Blues[4];
Bu.reverse();
var BuRd = Bu.concat(Rd);

c1.call(setup(fetchdata("posts_created_10m"), 900, "Post Count"));
c2.call(setup(fetchdata("cumulative_karma_10m", 0), 40000, "Karma Total"));
c3.call(setup(fetchdata("cumulative_karma_10m", 1), 60000, "Up votes", function(h) { return h.colors(BuRd); }));
c4.call(setup(fetchdata("cumulative_karma_10m", 2).multiply(-1), 60000, "Down votes", function(h) { return h.colors(BuRd); }));
// On mousemove, reposition the chart values to match the rule.
context.on("focus", function(i) {
  d3.selectAll(".value").style("right", i == null ? null : context.size() - i + "px");
});

