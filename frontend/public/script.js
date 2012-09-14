//Set up the chart

var chartheight = $("#chart").height() - 30,
    chartwidth = $("#chart").width() + 3;

var UTCOffset = new Date().getTimezoneOffset() / 60;
var HourShift = -UTCOffset;

var chartsvg = d3.select("#chart")
               .append("svg")
               .attr("width", chartwidth)
               .attr("height", chartheight + 30);

// Keep the last data we retrieved so we can redraw the chart without requesting it again
// (for resize)
var last_data = undefined;

var colors = colorbrewer.RdYlBu[9];
colors.reverse();

// Hour of day axis
var hrax = d3.svg.axis()
    .scale(d3.scale.linear().range([0, chartwidth - 3]).domain([0,24]))
    .tickValues([1, 6, 11, 17, 22])
    .tickFormat(function(t) {
        var end = "am";
        if(t >= 12) { t-=12; end = "pm"; }
        return t + end;
    }).orient("bottom");

// <g> container for hour axis
var axg = chartsvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + chartheight + ")")
    .call(hrax);

// Karma score color legend
var legend = chartsvg.append("g");

legend.append("rect")
      .attr("width", 305)
      .attr("height", 20)
      .attr("rx", 10)
      .attr("ry", 10)
      .style("fill", "#444");

legend.attr("class", "legend")
      .attr("transform", "translate(0, 0)")
      .selectAll("rect").data(colors)
      .enter().append("rect")
          .style("fill", function(d) { return d3.rgb(d).darker(0.25).toString(); })
          .attr("x", function(d,i) { return 190 + i * 12 })
          .attr("y", 5)
          .attr("width", 10)
          .attr("height", 10);

legend.append("text")
      .attr("x", 10)
      .attr("y", 15)
      .text("Karma score, low to high:")
      .style("fill", "#fff");

// Redraw the chart. Transition duration also specified here so it can be
// set to 0 for redrawing on resize.
function show_freqs(row, dur) {
    var toppad = 25; // Pad the top of the char to leave room for the legend and stuff
    last_data = row;
    if(!row) {
        row = { value: { freqs: [], score: [] }}
    }

    $("#dpnbr").html(_.reduce(row.value.freqs,
                     function(acc, n) { return acc + n}, 0));

    //Loop the data around a bit so we can slide it
    //to do the timezone transition animation
    var ringed = _.last(row.value.freqs, 12)
                 .concat(row.value.freqs)
                 .concat(_.first(row.value.freqs, 12));

    var freqdata = _.map(ringed, function(d, i) {
        var u = Math.abs(i - 12);
        return {posts: d, utchour: u % 24, disphour: (i - 12) + HourShift};
    });
    var maxscore = _.max(row.value.score);
    var minscore = _.min(row.value.score);
    var domain = [0, _.max(row.value.freqs)];
    var scorescale = d3.scale.quantile()
                        .domain([maxscore, minscore])
                        .range(colors);
    var scale = d3.scale.linear().range([0, chartheight - toppad]).domain(domain).nice();

    var bars = chartsvg.selectAll(".bar").data(freqdata);

    function updatebar(el) {
        return el.attr("width", (chartwidth/24) - 3)
                 .attr("x", function(d) {
                     return d.disphour * (chartwidth/24);
                 })
                 .attr("y", function(d) { return chartheight - scale(d.posts); } )
                 .attr("class", "bar")
                 .style("fill", function(d) {
                     var scaled = scorescale(row.value.score[d.utchour]);
                     return d3.rgb(scaled).darker(0.25).toString();
                 })
                 .transition()
                 .duration(dur)
                 .attr("height", function(d) { return scale(d.posts); });
    }

    updatebar(bars.enter().append("rect"));
    updatebar(bars.transition().duration(dur));
    bars.exit().remove();
}

// Resize the chart to fill the window
function doresize() {
    var dw = $(window).width();
    var cw;
    if(dw <= 990) {
        cw = dw - 80;
    } else {
        cw = dw - 380;
    }

    var ch = $(window).height() - 140;
    $("#content").width(cw)
    $("#content").height(ch)
    $("#chart").width(cw);
    $("#chart").height(ch);
    chartsvg.attr("width", cw);
    chartsvg.attr("height", ch);
    chartheight = ch - 30;
    chartwidth = cw + 3;

    hrax.scale(d3.scale.linear().range([0, chartwidth - 3]).domain([0,24]))
    axg.attr("transform", "translate(0," + chartheight + ")").call(hrax);

    if(last_data) {
        show_freqs(last_data, 0);
    }
}

$(window).resize(doresize);
$(doresize());

// Data fetching

function showrdt(reddit, st, en) {
    var viewquery = { stale: "update_after" };

    if(reddit != 'all') {
        viewquery.startkey = JSON.stringify([reddit, st]);
        viewquery.endkey = JSON.stringify([reddit, en, {}]);
    }

    $("#rname").html("r/" + reddit);

    $.ajax("/api/posthours", {
        dataType: "json",
        data: viewquery,
        success: function (data, e) {
            if(data) {
                show_freqs(data.rows[0], 500);
            }
        }
    });
}

// UI/Controls

var routes = {
    '/:reddit/:start/:end': function(rdt, st, en) {
        $("#reddits .selected").removeClass("selected");
        $("#r-" + rdt).addClass("selected");
        showrdt(rdt, parseInt(st), parseInt(en));
    },
    '/all': function() {
        $("#reddits .selected").removeClass("selected");
        $("#r-all").addClass("selected");
        showrdt('all');
    },
}

var router = Router(routes);

// Fetch list of reddits and display sorted by amount of
// data points.
$.ajax("/api/subrcount", {
    data: { group_level: 1, stale: "update_after" },
    dataType: "json",
    success: function (data, e) {
        if(data) {
            $("#reddits ul").html();
            $("#reddits ul").append(
                "<li><span><a id='r-all' href='#/all'>all reddits</a></span></li>");
            // Don't show reddits with < 20 data points. There are a lot of them.
            var reddits = _.sortBy(_.filter(data.rows,function(r) { return r.value >= 20 }), function(r) { return -r.value; });

            _.each(reddits, function(r, i) {
                $("#reddits ul").append(
                    "<li><span><a id='r-" + r.key[0] +
                    "' href='#/" + r.key[0] + "/0/6'>" + r.key[0] +
                    "</a> (" + r.value + ")</span></li>");
            });

            // Don't process the hash route until the reddit list has been diplayed, so that
            // we can highlight the one we're showing.
            router.init('/all');
        }
    }
});

// Timezone control
$("#tzctl a").click(function() {
    var tz = $(this).text();
    $("#tzctl .selected").removeClass("selected");
    $(this).addClass("selected");
    if(tz == 'UTC') {
        HourShift = 0;
    } else {
        HourShift = -UTCOffset;
    }
    if(last_data) {
        show_freqs(last_data, 500);
    }
});

